import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import AnimatedLogo from "./AnimatedLogo.jsx";

const VIDEO_EXTENSIONS = ["webm", "mp4", "mov"];

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isVideoSource = (src) => {
  if (!src) return false;
  const [base, query = ""] = src.split("?");
  const params = new URLSearchParams(query);
  const extFromQuery = params.get("ext");
  const extension = (extFromQuery || base.split(".").pop() || "").toLowerCase();
  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
};

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
  { id: "videos", label: "Videos" },
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
  const logoIsVideo = useMemo(() => isVideoSource(state.logoSrc), [state.logoSrc]);
  const lowerThirdIsVideo = state.lowerThirdMode === "video";
  const fullscreenVideos = state.fullscreenVideos ?? [];
  const selectedFullscreenVideo = useMemo(
    () => fullscreenVideos.find((item) => item.id === state.fullscreenVideoSelectedId) || null,
    [fullscreenVideos, state.fullscreenVideoSelectedId]
  );
  const activeFullscreenVideo = useMemo(
    () => fullscreenVideos.find((item) => item.id === state.fullscreenVideoActiveId) || null,
    [fullscreenVideos, state.fullscreenVideoActiveId]
  );
  const fullscreenVideoIsLive = Boolean(state.fullscreenVideoVisible);
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
      logoEnabled: false,
      logoLoop: true
    });
  };

  const handleLowerThirdModeChange = (event) => {
    const nextMode = event.target.value;
    applyPatch({ lowerThirdMode: nextMode });
  };

  const handleLowerThirdVideoBrowse = async () => {
    try {
      const fileUrl = await window?.electronAPI?.chooseLowerThirdVideo?.();
      if (!fileUrl) return;
      applyPatch({
        lowerThirdMode: "video",
        lowerThirdVideoSrc: fileUrl,
        lowerThirdVideoLoop: state.lowerThirdVideoLoop ?? false
      });
    } catch (error) {
      console.warn("Lower third video selection failed", error);
    }
  };

  const handleLowerThirdVideoClear = () => {
    applyPatch({
      lowerThirdVideoSrc: "",
      lowerThirdMode: "text",
      lowerThirdVideoLoop: state.lowerThirdVideoLoop ?? false
    });
  };

  const handleAddFullscreenVideos = async () => {
    try {
      const clips = await window?.electronAPI?.chooseFullscreenVideos?.();
      if (!clips || clips.length === 0) return;
      const newItems = clips.map((clip) => ({
        id: createId(),
        name: clip.name || "Untitled Clip",
        src: clip.src
      }));
      const merged = [...fullscreenVideos, ...newItems];
      const nextSelected = state.fullscreenVideoSelectedId ?? newItems[0]?.id ?? null;
      applyPatch({
        fullscreenVideos: merged,
        fullscreenVideoSelectedId: nextSelected
      });
    } catch (error) {
      console.warn("Fullscreen video selection failed", error);
    }
  };

  const handleSelectFullscreenVideo = (clipId) => {
    applyPatch({ fullscreenVideoSelectedId: clipId });
  };

  const handleRemoveFullscreenVideo = (clipId) => {
    if (!clipId) return;
    const filtered = fullscreenVideos.filter((item) => item.id !== clipId);
    const nextSelected = filtered.length ? filtered[0].id : null;
    const patch = {
      fullscreenVideos: filtered,
      fullscreenVideoSelectedId: clipId === state.fullscreenVideoSelectedId ? nextSelected : state.fullscreenVideoSelectedId
    };
    if (state.fullscreenVideoActiveId === clipId) {
      patch.fullscreenVideoVisible = false;
      patch.fullscreenVideoPlaying = false;
      patch.fullscreenVideoActiveId = nextSelected;
    }
    applyPatch(patch);
  };

  const handlePlayFullscreenVideo = () => {
    if (!state.fullscreenVideoSelectedId) return;
    const clip = fullscreenVideos.find((item) => item.id === state.fullscreenVideoSelectedId);
    if (!clip) return;
    const trigger = (state.fullscreenVideoTrigger ?? 0) + 1;
    applyPatch({
      fullscreenVideoActiveId: clip.id,
      fullscreenVideoVisible: true,
      fullscreenVideoPlaying: true,
      fullscreenVideoTrigger: trigger
    });
  };

  const handleFadeOutFullscreenVideo = () => {
    applyPatch({
      fullscreenVideoVisible: false,
      fullscreenVideoPlaying: false
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
                    <span className="field__label">Lower Third Content</span>
                    <select
                      className="field__input"
                      value={state.lowerThirdMode || "text"}
                      onChange={handleLowerThirdModeChange}
                    >
                      <option value="text">Text Banner</option>
                      <option value="video">Video Clip</option>
                    </select>
                  </label>

                  {!lowerThirdIsVideo && (
                    <>
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
                          onChange={(event) =>
                            applyPatch({ primaryBg: event.target.value })
                          }
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
                    </>
                  )}

                  {lowerThirdIsVideo && (
                    <div className="field">
                      <span className="field__label">Video Clip</span>
                      <div className="logo-controls">
                        <button
                          type="button"
                          className="button"
                          onClick={handleLowerThirdVideoBrowse}
                        >
                          {state.lowerThirdVideoSrc ? "Change Clip" : "Select Clip"}
                        </button>
                        {state.lowerThirdVideoSrc && (
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={handleLowerThirdVideoClear}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {state.lowerThirdVideoSrc && (
                        <p className="section-helper">
                          Video plays in kiosk output with audio muted.
                        </p>
                      )}
                      {state.lowerThirdVideoSrc && (
                        <label className="field">
                          <span className="field__label">Loop Clip</span>
                          <select
                            className="field__input"
                            value={state.lowerThirdVideoLoop ? "yes" : "no"}
                            onChange={(event) =>
                              applyPatch({
                                lowerThirdVideoLoop: event.target.value === "yes"
                              })
                            }
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}

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

                  {logoIsVideo && (
                    <label className="field">
                      <span className="field__label">Logo Video Playback</span>
                      <select
                        className="field__input"
                        value={state.logoLoop === false ? "once" : "loop"}
                        onChange={(event) =>
                          applyPatch({ logoLoop: event.target.value === "loop" })
                        }
                      >
                        <option value="loop">Loop Continuously</option>
                        <option value="once">Play Once</option>
                      </select>
                    </label>
                  )}

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

            {activeTab === "videos" && (
              <div className="panel-group">
                <section className="control-panel__section">
                  <h2 className="section-title">Fullscreen Video Player</h2>
                  <p className="section-helper">
                    Build a playlist of clips to take the output full screen. Each video fades out automatically at the end.
                  </p>
                  <div className="video-playlist__actions">
                    <button
                      type="button"
                      className="button"
                      onClick={handleAddFullscreenVideos}
                    >
                      Add Clips
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleRemoveFullscreenVideo(state.fullscreenVideoSelectedId)}
                      disabled={!state.fullscreenVideoSelectedId}
                    >
                      Remove Selected
                    </button>
                  </div>

                  {fullscreenVideos.length === 0 ? (
                    <p className="video-playlist__empty">No clips yet. Add one to get started.</p>
                  ) : (
                    <ul className="video-list" role="listbox">
                      {fullscreenVideos.map((clip) => {
                        const isSelected = clip.id === state.fullscreenVideoSelectedId;
                        const isLive = fullscreenVideoIsLive && clip.id === state.fullscreenVideoActiveId;
                        const itemClass = [
                          "video-list__item",
                          isSelected ? "is-selected" : "",
                          isLive ? "is-live" : ""
                        ]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <li key={clip.id} className={itemClass}>
                            <label className="video-list__label">
                              <input
                                type="radio"
                                name="fullscreenVideo"
                                checked={isSelected}
                                onChange={() => handleSelectFullscreenVideo(clip.id)}
                              />
                              <span className="video-list__name">{clip.name || "Untitled"}</span>
                              {isLive && <span className="video-list__status">Playing</span>}
                            </label>
                            <button
                              type="button"
                              className="video-list__remove"
                              onClick={() => handleRemoveFullscreenVideo(clip.id)}
                              aria-label={`Remove ${clip.name || "clip"}`}
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="video-playback">
                    <button
                      type="button"
                      className="button"
                      onClick={handlePlayFullscreenVideo}
                      disabled={!selectedFullscreenVideo}
                    >
                      Play Selected
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleFadeOutFullscreenVideo}
                      disabled={!fullscreenVideoIsLive}
                    >
                      Fade Out
                    </button>
                  </div>
                  {activeFullscreenVideo && (
                    <p className="video-playback__meta">
                      Last triggered: <strong>{activeFullscreenVideo.name}</strong>
                    </p>
                  )}
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
                          loop={state.logoLoop ?? true}
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
    lowerThirdMode: PropTypes.oneOf(["text", "video"]),
    lowerThirdVideoSrc: PropTypes.string,
    lowerThirdVideoLoop: PropTypes.bool,
    fullscreenVideos: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        src: PropTypes.string.isRequired
      })
    ),
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
    logoSrc: PropTypes.string,
    logoPosition: PropTypes.string,
    logoEnabled: PropTypes.bool,
    logoLoop: PropTypes.bool,
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
