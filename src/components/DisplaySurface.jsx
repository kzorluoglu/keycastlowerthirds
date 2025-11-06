import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import LowerThird from "./LowerThird.jsx";
import AnimatedLogo from "./AnimatedLogo.jsx";
import { buildEmbedUrl } from "../utils/remoteSources.js";

const FullscreenVideoOverlay = ({ state }) => {
  const {
    fullscreenVideos = [],
    fullscreenVideoActiveId,
    fullscreenVideoVisible,
    fullscreenVideoTrigger = 0,
    fullscreenVideoFadeMs = 600
  } = state;

  const activeClip = useMemo(
    () => fullscreenVideos.find((item) => item.id === fullscreenVideoActiveId),
    [fullscreenVideos, fullscreenVideoActiveId]
  );

  const [phase, setPhase] = useState("hidden");
  const exitTimerRef = useRef(null);
  const fadeDuration = Math.max(100, Number(fullscreenVideoFadeMs) || 600);

  useEffect(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (!activeClip) {
      setPhase("hidden");
      return () => {};
    }

    if (fullscreenVideoVisible) {
      setPhase("visible");
      return () => {};
    }

    if (phase !== "hidden") {
      setPhase("exiting");
      exitTimerRef.current = setTimeout(() => {
        setPhase("hidden");
        exitTimerRef.current = null;
      }, fadeDuration);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [activeClip, fullscreenVideoVisible, fadeDuration, phase, fullscreenVideoTrigger]);

  const handleVideoEnded = () => {
    const patch = {
      fullscreenVideoVisible: false,
      fullscreenVideoPlaying: false
    };
    window?.electronAPI?.updateLowerThird?.(patch);
  };

  const phaseClassName =
    phase === "visible"
      ? "fullscreen-video is-visible"
      : phase === "exiting"
        ? "fullscreen-video is-visible is-exiting"
        : "fullscreen-video";

  if (!activeClip || phase === "hidden") {
    return null;
  }

  return (
    <div
      className={phaseClassName}
      style={{ "--fullscreen-fade": `${fadeDuration}ms` }}
    >
      <video
        key={`${activeClip.id}-${fullscreenVideoTrigger}`}
        src={activeClip.src}
        autoPlay
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
      />
    </div>
  );
};

FullscreenVideoOverlay.propTypes = {
  state: PropTypes.shape({
    fullscreenVideos: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        src: PropTypes.string.isRequired
      })
    ),
    fullscreenVideoActiveId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.oneOf([null])
    ]),
    fullscreenVideoVisible: PropTypes.bool,
    fullscreenVideoPlaying: PropTypes.bool,
    fullscreenVideoTrigger: PropTypes.number,
    fullscreenVideoFadeMs: PropTypes.number
  }).isRequired
};

const RemoteSourceOverlay = ({ state }) => {
  const {
    remoteSourceActiveId,
    remoteSourceVisible,
    remoteSourceTrigger = 0,
    remoteSources = []
  } = state;

  const activeSource = useMemo(
    () => remoteSources.find((item) => item.id === remoteSourceActiveId) || null,
    [remoteSourceActiveId, remoteSources]
  );

  if (!remoteSourceVisible || !activeSource) {
    return null;
  }

  const embedUrl = buildEmbedUrl(activeSource.url);
  const overlayKey = `${activeSource.id}-${remoteSourceTrigger}`;

  return (
    <div className="remote-source-overlay is-visible">
      <iframe
        key={overlayKey}
        src={embedUrl}
        title={activeSource.label || "Remote Source"}
        allow="autoplay; fullscreen; clipboard-read; clipboard-write"
        allowFullScreen
      />
    </div>
  );
};

RemoteSourceOverlay.propTypes = {
  state: PropTypes.shape({
    remoteSourceActiveId: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    remoteSourceVisible: PropTypes.bool,
    remoteSourceTrigger: PropTypes.number,
    remoteSources: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        url: PropTypes.string.isRequired
      })
    )
  }).isRequired
};

const DisplaySurface = ({
  state,
  lowerThirdPreviewControls = undefined,
  logoPreviewControls = undefined
}) => {
  const backgroundColor =
    state.backgroundColor === "transparent"
      ? "transparent"
      : state.backgroundColor || "#000000";

  useEffect(() => {
    if (lowerThirdPreviewControls || logoPreviewControls) {
      return undefined;
    }
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) {
      return undefined;
    }
    const previousBody = body.style.backgroundColor;
    const previousHtml = html.style.backgroundColor;

    if (state.backgroundColor === "transparent") {
      body.style.backgroundColor = "transparent";
      html.style.backgroundColor = "transparent";
    } else {
      body.style.backgroundColor = "";
      html.style.backgroundColor = "";
    }

    return () => {
      body.style.backgroundColor = previousBody;
      html.style.backgroundColor = previousHtml;
    };
  }, [lowerThirdPreviewControls, logoPreviewControls, state.backgroundColor]);

  return (
    <div
      className="display-surface"
      style={{ backgroundColor }}
    >
      <RemoteSourceOverlay state={state} />
      <LowerThird
        {...state}
        {...(lowerThirdPreviewControls || {})}
      />
      <AnimatedLogo
        src={state.logoSrc}
        position={state.logoPosition}
        enabled={state.logoEnabled}
        loop={state.logoLoop ?? true}
        logoPositionCustomEnabled={state.logoPositionCustomEnabled}
        logoPositionOffsetX={state.logoPositionOffsetX}
        logoPositionOffsetY={state.logoPositionOffsetY}
        {...(logoPreviewControls || {})}
      />
      <FullscreenVideoOverlay state={state} />
    </div>
  );
};

DisplaySurface.propTypes = {
  state: PropTypes.shape({
    primaryText: PropTypes.string,
    secondaryText: PropTypes.string,
    primaryBg: PropTypes.string,
    secondaryBg: PropTypes.string,
    position: PropTypes.string,
    visible: PropTypes.bool,
    lowerThirdMode: PropTypes.oneOf(["text", "video"]),
    lowerThirdVideoSrc: PropTypes.string,
    lowerThirdVideoLoop: PropTypes.bool,
    lowerThirdPositionCustomEnabled: PropTypes.bool,
    lowerThirdPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    lowerThirdPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    logoSrc: PropTypes.string,
    logoPosition: PropTypes.string,
    logoEnabled: PropTypes.bool,
    logoLoop: PropTypes.bool,
    logoPositionCustomEnabled: PropTypes.bool,
    logoPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    logoPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fullscreenVideos: PropTypes.array,
    fullscreenVideoSelectedId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.oneOf([null])
    ]),
    fullscreenVideoActiveId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.oneOf([null])
    ]),
    fullscreenVideoVisible: PropTypes.bool,
    fullscreenVideoPlaying: PropTypes.bool,
    fullscreenVideoTrigger: PropTypes.number,
    fullscreenVideoFadeMs: PropTypes.number,
    remoteSources: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        url: PropTypes.string.isRequired
      })
    ),
    remoteSourceActiveId: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    remoteSourceVisible: PropTypes.bool,
    remoteSourceTrigger: PropTypes.number,
    displayId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    outputActive: PropTypes.bool,
    backgroundColor: PropTypes.string
  }).isRequired,
  lowerThirdPreviewControls: PropTypes.shape({
    isDraggable: PropTypes.bool,
    isDragging: PropTypes.bool,
    onManualDragStart: PropTypes.func,
    onManualDragMove: PropTypes.func,
    onManualDragEnd: PropTypes.func,
    onManualDragCancel: PropTypes.func
  }),
  logoPreviewControls: PropTypes.shape({
    isDraggable: PropTypes.bool,
    isDragging: PropTypes.bool,
    onManualDragStart: PropTypes.func,
    onManualDragMove: PropTypes.func,
    onManualDragEnd: PropTypes.func,
    onManualDragCancel: PropTypes.func
  })
};

export default DisplaySurface;
