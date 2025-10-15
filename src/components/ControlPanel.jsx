import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import LowerThird from "./LowerThird.jsx";
import AnimatedLogo from "./AnimatedLogo.jsx";

const presetThemes = {
  news: {
    primaryBg: "#D62828",
    secondaryBg: "#003049"
  },
  event: {
    primaryBg: "#00A8E8",
    secondaryBg: "#007EA7"
  },
  alert: {
    primaryBg: "#FF9F1C",
    secondaryBg: "#2EC4B6"
  }
};

const tabs = [
  { id: "lowerthird", label: "Lower Third" },
  { id: "logo", label: "Logo" },
  { id: "system", label: "System" }
];

const ControlPanel = ({
  state,
  onChange,
  displays = [],
  onDisplayChange,
  onOutputStart,
  onOutputStop,
  outputBusy
}) => {
  const previewState = useMemo(
    () => ({
      ...state
    }),
    [state]
  );
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const applyPatch = (patch) => {
    const next = { ...state, ...patch };
    onChange(next);
  };

  const handlePreset = (presetKey) => {
    const palette = presetThemes[presetKey];
    if (!palette) return;
    applyPatch(palette);
  };

  const handleLogoBrowse = async () => {
    try {
      const fileUrl = await window?.electronAPI?.chooseLogoFile?.();
      if (!fileUrl) return;
      applyPatch({
        logoSrc: fileUrl,
        logoEnabled: false
      });
    } catch (error) {
      console.warn("Logo selection failed", error);
    }
  };

  const handleLogoClear = () => {
    applyPatch({
      logoSrc: "",
      logoEnabled: false
    });
  };

  const handleDisplaySelect = (event) => {
    const value = event.target.value;
    let nextDisplayId = null;
    if (value !== "auto") {
      const parsed = Number(value);
      nextDisplayId = Number.isNaN(parsed) ? null : parsed;
    }
    applyPatch({ displayId: nextDisplayId });
    onDisplayChange?.(nextDisplayId);
  };

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
  };

  const handleOutputToggle = () => {
    if (state.outputActive) {
      onOutputStop?.();
    } else {
      onOutputStart?.();
    }
  };

  const outputButtonLabel = state.outputActive ? "Stop Output" : "Start Output";
  const outputButtonClass = state.outputActive ? "button button--danger" : "button";
  const outputStatusClass = `status-pill ${state.outputActive ? "is-on" : "is-off"}`;
  const outputStatusLabel = state.outputActive ? "Active" : "Stopped";

  return (
    <div className="control-panel">
      <header className="control-panel__header">
        <h1>Lower Third Designer</h1>
        <p>Tweak text, colors, placement. Updates fly instantly.</p>
      </header>

      <div className="control-panel__layout">
        <div className="control-panel__stack">
          <nav className="tab-nav" aria-label="Control sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab-nav__button ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => handleTabSelect(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-panels tab-panels--fill">
            {activeTab === "lowerthird" && (
              <div className="panel-group">
                <section className="control-panel__section control-panel__section--grid">
                  <label className="field">
                    <span className="field__label">Primary Title</span>
                    <input
                      className="field__input"
                      type="text"
                      value={state.primaryText}
                      onChange={(event) =>
                        applyPatch({ primaryText: event.target.value })
                      }
                      placeholder="e.g. Live from the newsroom"
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Secondary Title</span>
                    <input
                      className="field__input"
                      type="text"
                      value={state.secondaryText}
                      onChange={(event) =>
                        applyPatch({ secondaryText: event.target.value })
                      }
                      placeholder="e.g. Updates every hour"
                    />
                  </label>

                  <div className="field field--inline">
                    <span className="field__label">Primary Background</span>
                    <input
                      type="color"
                      value={state.primaryBg}
                      onChange={(event) => applyPatch({ primaryBg: event.target.value })}
                    />
                  </div>

                  <div className="field field--inline">
                    <span className="field__label">Secondary Background</span>
                    <input
                      type="color"
                      value={state.secondaryBg}
                      onChange={(event) =>
                        applyPatch({ secondaryBg: event.target.value })
                      }
                    />
                  </div>

                  <label className="field">
                    <span className="field__label">Placement</span>
                    <select
                      className="field__input"
                      value={state.position}
                      onChange={(event) => applyPatch({ position: event.target.value })}
                    >
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className={`toggle-button ${state.visible ? "is-active" : ""}`}
                    onClick={() => applyPatch({ visible: !state.visible })}
                  >
                    {state.visible ? "Hide Lower Third" : "Show Lower Third"}
                  </button>
                </section>

                <section className="control-panel__section">
                  <span className="field__label">Quick Themes</span>
                  <div className="preset-grid">
                    {Object.keys(presetThemes).map((key) => {
                      const colors = presetThemes[key];
                      const swatchStyle = {
                        background: `linear-gradient(90deg, ${colors.primaryBg}, ${colors.secondaryBg})`
                      };
                      return (
                        <button
                          key={key}
                          type="button"
                          className="preset-button"
                          onClick={() => handlePreset(key)}
                        >
                          <span
                            className="preset-button__swatch"
                            style={swatchStyle}
                          />
                          <span className="preset-button__label">{key}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "logo" && (
              <div className="panel-group">
                <section className="control-panel__section">
                  <h2 className="section-title">Animated Logo</h2>
                  <p className="section-helper">
                    Transparent GIF/APNG or alpha video (WebM, MP4, MOV) supported.
                  </p>
                  <div className="logo-controls">
                    <button
                      type="button"
                      className="button"
                      onClick={handleLogoBrowse}
                    >
                      {state.logoSrc ? "Change Logo" : "Select Logo"}
                    </button>
                    {state.logoSrc && (
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={handleLogoClear}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {state.logoSrc && (
                    <div className="logo-preview">
                      <span className="field__label">Preview</span>
                      <div className="logo-preview__surface">
                        <AnimatedLogo
                          src={state.logoSrc}
                          position={state.logoPosition}
                          enabled
                        />
                      </div>
                    </div>
                  )}

                  <label className="field">
                    <span className="field__label">Logo Position</span>
                    <select
                      className="field__input"
                      value={state.logoPosition}
                      onChange={(event) =>
                        applyPatch({ logoPosition: event.target.value })
                      }
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className={`toggle-button ${state.logoEnabled ? "is-active" : ""}`}
                    onClick={() => applyPatch({ logoEnabled: !state.logoEnabled })}
                  >
                    {state.logoEnabled ? "Hide Logo" : "Show Logo"}
                  </button>
                </section>
              </div>
            )}

            {activeTab === "system" && (
              <div className="panel-group">
                <section className="control-panel__section">
                  <h2 className="section-title">Key Color</h2>
                  <p className="section-helper">
                    Choose the chroma color filling the output for OBS/ATEM keying.
                  </p>
                  <div className="field field--inline">
                    <span className="field__label">Background Color</span>
                    <input
                      type="color"
                      value={state.backgroundColor || "#00FF00"}
                      onChange={(event) =>
                        applyPatch({ backgroundColor: event.target.value })
                      }
                    />
                  </div>
                </section>

                <section className="control-panel__section">
                  <h2 className="section-title">Output Display</h2>
                  <p className="section-helper">
                    Pick the HDMI monitor. Auto selects any external screen.
                  </p>
                  <label className="field">
                    <span className="field__label">Active Display</span>
                    <select
                      className="field__input"
                      value={
                        state.displayId !== null && state.displayId !== undefined
                          ? String(state.displayId)
                          : "auto"
                      }
                      onChange={handleDisplaySelect}
                    >
                      <option value="auto">Auto Detect</option>
                      {displays.map((display) => (
                        <option key={display.id} value={String(display.id)}>
                          {display.label}
                          {display.isPrimary ? " (Primary)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="control-panel__section">
                  <h2 className="section-title">Output Control</h2>
                  <div className="output-status">
                    <span className={outputStatusClass}>{outputStatusLabel}</span>
                    <button
                      type="button"
                      className={outputButtonClass}
                      disabled={outputBusy}
                      onClick={handleOutputToggle}
                    >
                      {outputBusy ? "Working..." : outputButtonLabel}
                    </button>
                  </div>
                  <p className="section-helper">
                    Start launches the kiosk window on the selected display. Stop closes it.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>

        <section className="control-panel__section control-panel__preview">
          <h2>Live Preview</h2>
          <div
            className="preview-frame"
            style={{ backgroundColor: previewState.backgroundColor || "#000000" }}
          >
            <LowerThird {...previewState} />
            <AnimatedLogo
              src={previewState.logoSrc}
              position={previewState.logoPosition}
              enabled={previewState.logoEnabled}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

ControlPanel.propTypes = {
  state: PropTypes.shape({
    primaryText: PropTypes.string,
    secondaryText: PropTypes.string,
    primaryBg: PropTypes.string,
    secondaryBg: PropTypes.string,
    position: PropTypes.string,
    visible: PropTypes.bool,
    logoSrc: PropTypes.string,
    logoPosition: PropTypes.string,
    logoEnabled: PropTypes.bool,
    displayId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    outputActive: PropTypes.bool,
    backgroundColor: PropTypes.string
  }).isRequired,
  displays: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      isPrimary: PropTypes.bool
    })
  ),
  onChange: PropTypes.func.isRequired,
  onDisplayChange: PropTypes.func,
  onOutputStart: PropTypes.func,
  onOutputStop: PropTypes.func,
  outputBusy: PropTypes.bool
};

ControlPanel.defaultProps = {
  displays: [],
  onDisplayChange: undefined,
  onOutputStart: undefined,
  onOutputStop: undefined,
  outputBusy: false
};

export default ControlPanel;
