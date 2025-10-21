import { useEffect, useMemo, useState } from "react";
import ControlPanel from "./components/ControlPanel.jsx";
import DisplaySurface from "./components/DisplaySurface.jsx";

const fallbackState = {
  primaryText: "Live News Update",
  secondaryText: "Breaking details go here",
  primaryBg: "#FF2E63",
  secondaryBg: "#252A34",
  position: "bottom-left",
  visible: false,
  lowerThirdMode: "text",
  lowerThirdVideoSrc: "",
  lowerThirdVideoLoop: false,
  fullscreenVideos: [],
  fullscreenVideoSelectedId: null,
  fullscreenVideoActiveId: null,
  fullscreenVideoVisible: false,
  fullscreenVideoPlaying: false,
  fullscreenVideoTrigger: 0,
  fullscreenVideoFadeMs: 600,
  logoEnabled: false,
  logoSrc: "",
  logoPosition: "top-right",
  logoLoop: true,
  displayId: null,
  outputActive: false,
  backgroundColor: "#00FF00"
};

const getMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") ?? "control";
};

function App() {
  const [state, setState] = useState(fallbackState);
  const [displays, setDisplays] = useState([]);
  const [outputBusy, setOutputBusy] = useState(false);
  const mode = useMemo(getMode, []);

  useEffect(() => {
    let unsubState;
    let unsubDisplay;
    let mounted = true;

    const bootstrap = async () => {
      try {
        const remoteState = await window?.electronAPI?.requestLowerThirdState?.();
        if (remoteState && mounted) {
          setState(remoteState);
          setOutputBusy(false);
        }
        const displayList = await window?.electronAPI?.listDisplays?.();
        if (displayList && mounted) {
          setDisplays(displayList);
        }
      } catch (error) {
        console.warn("Unable to fetch initial state from Electron", error);
      }
    };

    bootstrap();

    if (window?.electronAPI?.onLowerThirdUpdate) {
      unsubState = window.electronAPI.onLowerThirdUpdate((nextState) => {
        setState(nextState);
        setOutputBusy(false);
      });
    }

    if (window?.electronAPI?.onDisplayList) {
      unsubDisplay = window.electronAPI.onDisplayList((nextDisplays) => {
        setDisplays(nextDisplays);
      });
    }

    return () => {
      mounted = false;
      unsubState?.();
      unsubDisplay?.();
    };
  }, []);

  const handleStateChange = (nextState) => {
    setState(nextState);
    window?.electronAPI?.updateLowerThird?.(nextState);
  };

  const handleDisplayChange = async (displayId) => {
    try {
      const updatedState = await window?.electronAPI?.setDisplay?.(displayId);
      if (updatedState) {
        setState(updatedState);
      } else {
        setState((prev) => ({ ...prev, displayId }));
      }
    } catch (error) {
      console.warn("Unable to switch display", error);
    }
  };

  const handleOutputStart = async () => {
    if (!window?.electronAPI?.startOutput) return;
    setOutputBusy(true);
    try {
      const updatedState = await window.electronAPI.startOutput();
      if (updatedState) {
        setState(updatedState);
      }
    } catch (error) {
      console.warn("Unable to start output", error);
    } finally {
      setOutputBusy(false);
    }
  };

  const handleOutputStop = async () => {
    if (!window?.electronAPI?.stopOutput) return;
    setOutputBusy(true);
    try {
      const updatedState = await window.electronAPI.stopOutput();
      if (updatedState) {
        setState(updatedState);
      }
    } catch (error) {
      console.warn("Unable to stop output", error);
    } finally {
      setOutputBusy(false);
    }
  };

  if (mode === "display") {
    return <DisplaySurface state={state} />;
  }

  return (
    <ControlPanel
      state={state}
      displays={displays}
      onChange={handleStateChange}
      onDisplayChange={handleDisplayChange}
      onOutputStart={handleOutputStart}
      onOutputStop={handleOutputStop}
      outputBusy={outputBusy}
    />
  );
}

export default App;
