import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedLogo from "./AnimatedLogo.jsx";
import DisplaySurface from "./DisplaySurface.jsx";
import RemoteSourcesTab from "./RemoteSourcesTab.jsx";

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
  { id: "sources", label: "Live Sources" },
  { id: "logo", label: "Logo" },
  { id: "system", label: "System" }
];

const GRID_SNAP_X = 80;
const GRID_SNAP_Y = 45;
const GRID_FINE_DIVISOR = 5;

const ControlPanel = ({
  state,
  onChange,
  displays = [],
  onDisplayChange = undefined,
  onOutputStart = undefined,
  onOutputStop = undefined,
  outputBusy = false
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
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const fullscreenVideoIsLive = Boolean(state.fullscreenVideoVisible);
  const lowerThirdHistory = Array.isArray(state.lowerThirdHistory) ? state.lowerThirdHistory : [];
  const backgroundIsTransparent = state.backgroundColor === "transparent";
  const lowerThirdHistoryItems = useMemo(
    () =>
      [...lowerThirdHistory]
        .map((entry) => ({ ...entry, savedAt: entry?.savedAt || 0 }))
        .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
        .slice(0, 20),
    [lowerThirdHistory]
  );
  const canSaveLowerThirdHistory = useMemo(() => {
    if (state.lowerThirdMode === "video") {
      return Boolean(state.lowerThirdVideoSrc);
    }
    const primary = state.primaryText?.trim();
    const secondary = state.secondaryText?.trim();
    return Boolean(primary) || Boolean(secondary);
  }, [state.lowerThirdMode, state.lowerThirdVideoSrc, state.primaryText, state.secondaryText]);

  const applyPatch = (patch) => {
    const next = { ...state, ...patch };
    onChange(next);
  };

  const coerceNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const lowerThirdOffsetXValue = state.lowerThirdPositionOffsetX ?? 0;
  const lowerThirdOffsetYValue = state.lowerThirdPositionOffsetY ?? 0;
  const logoOffsetXValue = state.logoPositionOffsetX ?? 0;
  const logoOffsetYValue = state.logoPositionOffsetY ?? 0;
  const previewViewportRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  const dragStateRef = useRef(null);
  const [draggingTarget, setDraggingTarget] = useState(null);
  const getVideoLabel = useCallback((src) => {
    if (!src) return "Video Clip";
    try {
      const decoded = decodeURIComponent(src);
      const parts = decoded.split("/");
      return parts[parts.length - 1] || decoded;
    } catch (error) {
      return src;
    }
  }, []);

  const handleUseTransparentBackground = useCallback(() => {
    applyPatch({ backgroundColor: "transparent" });
  }, [applyPatch]);

  const handleUseChromaGreen = useCallback(() => {
    applyPatch({ backgroundColor: "#00FF00" });
  }, [applyPatch]);

  const previewState = useMemo(() => {
    const next = { ...state };
    const hasTextContent =
      (state.primaryText && state.primaryText.trim().length > 0) ||
      (state.secondaryText && state.secondaryText.trim().length > 0);
    const hasVideoContent = Boolean(state.lowerThirdVideoSrc);

    if (state.lowerThirdMode === "video" && hasVideoContent) {
      next.visible = true;
    } else if (state.lowerThirdMode === "text" && hasTextContent) {
      next.visible = true;
    }

    if (!hasTextContent && !hasVideoContent) {
      next.visible = false;
    }

    if (state.logoSrc) {
      next.logoEnabled = true;
    }

    return next;
  }, [state]);

  useEffect(() => {
    const element = previewViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const updateScale = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const scaleX = width / 1920;
      const scaleY = height / 1080;
      const nextScale = Math.max(0.1, Math.min(scaleX, scaleY));
      setPreviewScale(nextScale);
    };

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(element);
    updateScale();

    return () => observer.disconnect();
  }, []);

  const handleSaveLowerThirdHistory = useCallback(() => {
    const mode = state.lowerThirdMode;
    const primary = (state.primaryText || "").trim();
    const secondary = (state.secondaryText || "").trim();
    const videoSrc = state.lowerThirdVideoSrc || "";

    if (mode === "video") {
      if (!videoSrc) return;
    } else if (!primary && !secondary) {
      return;
    }

    const entry = {
      id: createId(),
      mode,
      primaryText: primary,
      secondaryText: secondary,
      primaryBg: state.primaryBg,
      secondaryBg: state.secondaryBg,
      position: state.position,
      lowerThirdVideoSrc: mode === "video" ? videoSrc : "",
      lowerThirdVideoLoop: Boolean(state.lowerThirdVideoLoop),
      lowerThirdPositionCustomEnabled: Boolean(state.lowerThirdPositionCustomEnabled),
      lowerThirdPositionOffsetX: state.lowerThirdPositionOffsetX ?? 0,
      lowerThirdPositionOffsetY: state.lowerThirdPositionOffsetY ?? 0,
      savedAt: Date.now()
    };

    const filtered = lowerThirdHistory.filter(
      (item) =>
        !(
          item.mode === entry.mode &&
          (item.primaryText || "") === entry.primaryText &&
          (item.secondaryText || "") === entry.secondaryText &&
          (item.lowerThirdVideoSrc || "") === entry.lowerThirdVideoSrc
        )
    );

    applyPatch({
      lowerThirdHistory: [entry, ...filtered].slice(0, 20)
    });
  }, [
    applyPatch,
    lowerThirdHistory,
    state.lowerThirdMode,
    state.lowerThirdVideoLoop,
    state.lowerThirdVideoSrc,
    state.lowerThirdPositionCustomEnabled,
    state.lowerThirdPositionOffsetX,
    state.lowerThirdPositionOffsetY,
    state.position,
    state.primaryBg,
    state.primaryText,
    state.secondaryBg,
    state.secondaryText
  ]);

  const handleLoadLowerThirdHistory = useCallback(
    (entry) => {
      if (!entry) return;
      const mode = entry.mode || "text";
      const prepared = {
        mode,
        primaryText: entry.primaryText?.trim() || "",
        secondaryText: entry.secondaryText?.trim() || "",
        lowerThirdVideoSrc: entry.lowerThirdVideoSrc || ""
      };
      const filtered = lowerThirdHistory.filter(
        (item) =>
          !(
            item.mode === prepared.mode &&
            (item.primaryText || "") === prepared.primaryText &&
            (item.secondaryText || "") === prepared.secondaryText &&
            (item.lowerThirdVideoSrc || "") === prepared.lowerThirdVideoSrc
          )
      );

      const updatedHistory = [
        {
          ...entry,
          ...prepared,
          savedAt: Date.now(),
          id: entry.id || createId()
        },
        ...filtered
      ].slice(0, 20);

      const patch = {
        lowerThirdMode: mode,
        primaryText: prepared.primaryText,
        secondaryText: prepared.secondaryText,
        primaryBg: entry.primaryBg ?? state.primaryBg,
        secondaryBg: entry.secondaryBg ?? state.secondaryBg,
        position: entry.position ?? state.position,
        lowerThirdVideoSrc: mode === "video" ? prepared.lowerThirdVideoSrc : "",
        lowerThirdVideoLoop:
          mode === "video" ? Boolean(entry.lowerThirdVideoLoop) : state.lowerThirdVideoLoop,
        lowerThirdPositionCustomEnabled:
          entry.lowerThirdPositionCustomEnabled ?? state.lowerThirdPositionCustomEnabled,
        lowerThirdPositionOffsetX:
          entry.lowerThirdPositionOffsetX ?? state.lowerThirdPositionOffsetX ?? 0,
        lowerThirdPositionOffsetY:
          entry.lowerThirdPositionOffsetY ?? state.lowerThirdPositionOffsetY ?? 0,
        lowerThirdHistory: updatedHistory
      };

      if (mode !== "video") {
        patch.lowerThirdVideoSrc = "";
      }

      applyPatch(patch);
    },
    [
      applyPatch,
      lowerThirdHistory,
      state.lowerThirdPositionCustomEnabled,
      state.lowerThirdPositionOffsetX,
      state.lowerThirdPositionOffsetY,
      state.lowerThirdVideoLoop,
      state.position,
      state.primaryBg,
      state.secondaryBg
    ]
  );

  const handleRemoveLowerThirdHistory = useCallback(
    (entryId) => {
      applyPatch({
        lowerThirdHistory: lowerThirdHistory.filter((item) => item.id !== entryId)
      });
    },
    [applyPatch, lowerThirdHistory]
  );

  const handleClearLowerThirdHistory = useCallback(() => {
    applyPatch({ lowerThirdHistory: [] });
  }, [applyPatch]);

  const startManualDrag = useCallback(
    (target, event) => {
      event.preventDefault();
      event.stopPropagation();

      const pointerId = event.pointerId;
      const offsets =
        target === "lowerThird"
          ? {
              x: coerceNumber(state.lowerThirdPositionOffsetX),
              y: coerceNumber(state.lowerThirdPositionOffsetY)
            }
          : {
              x: coerceNumber(state.logoPositionOffsetX),
              y: coerceNumber(state.logoPositionOffsetY)
            };

      dragStateRef.current = {
        target,
        pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: offsets.x,
        originY: offsets.y,
        lastAppliedX: Math.round(offsets.x),
        lastAppliedY: Math.round(offsets.y)
      };

      setDraggingTarget(target);

      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(pointerId);
      }

      if (target === "lowerThird" && !state.lowerThirdPositionCustomEnabled) {
        applyPatch({
          lowerThirdPositionCustomEnabled: true,
          lowerThirdPositionOffsetX: offsets.x,
          lowerThirdPositionOffsetY: offsets.y
        });
      }

      if (target === "logo" && !state.logoPositionCustomEnabled) {
        applyPatch({
          logoPositionCustomEnabled: true,
          logoPositionOffsetX: offsets.x,
          logoPositionOffsetY: offsets.y
        });
      }
    },
    [
      applyPatch,
      coerceNumber,
      state.lowerThirdPositionOffsetX,
      state.lowerThirdPositionOffsetY,
      state.lowerThirdPositionCustomEnabled,
      state.logoPositionOffsetX,
      state.logoPositionOffsetY,
      state.logoPositionCustomEnabled
    ]
  );

  const handleManualDragMove = useCallback(
    (event) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      event.preventDefault();

      const scale = previewScale || 1;
      const deltaX = (event.clientX - drag.startClientX) / scale;
      const deltaY = (event.clientY - drag.startClientY) / scale;

      let nextX = drag.originX + deltaX;
      let nextY = drag.originY + deltaY;

      if (!(event.altKey || event.metaKey)) {
        const stepX = event.shiftKey ? GRID_SNAP_X / GRID_FINE_DIVISOR : GRID_SNAP_X;
        const stepY = event.shiftKey ? GRID_SNAP_Y / GRID_FINE_DIVISOR : GRID_SNAP_Y;
        nextX = Math.round(nextX / stepX) * stepX;
        nextY = Math.round(nextY / stepY) * stepY;
      }

      const roundedX = Math.round(nextX);
      const roundedY = Math.round(nextY);

      if (roundedX === drag.lastAppliedX && roundedY === drag.lastAppliedY) {
        return;
      }

      drag.lastAppliedX = roundedX;
      drag.lastAppliedY = roundedY;

      if (drag.target === "lowerThird") {
        applyPatch({
          lowerThirdPositionOffsetX: roundedX,
          lowerThirdPositionOffsetY: roundedY
        });
      } else if (drag.target === "logo") {
        applyPatch({
          logoPositionOffsetX: roundedX,
          logoPositionOffsetY: roundedY
        });
      }
    },
    [applyPatch, previewScale]
  );

  const handleManualDragEnd = useCallback(
    (event) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (event.currentTarget.releasePointerCapture) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragStateRef.current = null;
      setDraggingTarget(null);
    },
    []
  );

  const handleManualDragCancel = useCallback(
    (event) => {
      handleManualDragEnd(event);
    },
    [handleManualDragEnd]
  );

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

  const handleLowerThirdOffsetReset = () => {
    applyPatch({
      lowerThirdPositionOffsetX: 0,
      lowerThirdPositionOffsetY: 0
    });
  };

  const handleLogoOffsetReset = () => {
    applyPatch({
      logoPositionOffsetX: 0,
      logoPositionOffsetY: 0
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

  const handleLowerThirdDragStart = useCallback(
    (event) => {
      startManualDrag("lowerThird", event);
    },
    [startManualDrag]
  );

  const handleLogoDragStart = useCallback(
    (event) => {
      startManualDrag("logo", event);
    },
    [startManualDrag]
  );

  const lowerThirdPreviewControls =
    previewState.visible || state.lowerThirdMode === "video"
      ? {
          isDraggable: true,
          isDragging: draggingTarget === "lowerThird",
          onManualDragStart: handleLowerThirdDragStart,
          onManualDragMove: handleManualDragMove,
          onManualDragEnd: handleManualDragEnd,
          onManualDragCancel: handleManualDragCancel
        }
      : undefined;

  const logoPreviewControls =
    previewState.logoSrc
      ? {
          isDraggable: true,
          isDragging: draggingTarget === "logo",
          onManualDragStart: handleLogoDragStart,
          onManualDragMove: handleManualDragMove,
          onManualDragEnd: handleManualDragEnd,
          onManualDragCancel: handleManualDragCancel
        }
      : undefined;

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
        <aside className="control-panel__preview">
          <div className="preview-panel">
            <div className="preview-panel__header">
              <h2 className="section-title">Output Preview</h2>
              <span className="preview-panel__meta">16:9</span>
            </div>
            <div
              className="preview-panel__viewport"
              ref={previewViewportRef}
            >
              <div
                className="preview-panel__stage"
                style={{ transform: `scale(${previewScale}) translate(-50%, -50%)` }}
              >
                <div className="preview-panel__surface">
                  <DisplaySurface
                    state={previewState}
                    lowerThirdPreviewControls={lowerThirdPreviewControls}
                    logoPreviewControls={logoPreviewControls}
                  />
                </div>
                <div className="preview-panel__grid" aria-hidden="true" />
              </div>
            </div>
            <p className="preview-panel__helper">
              Use the grid to line up elements before sending them live.
            </p>
          </div>
        </aside>

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
                <section className="control-panel__section">
                  <h2 className="section-title">Content</h2>
                  <label className="field">
                    <span className="field__label">Video or Text</span>
                    <select
                      className="field__input"
                      value={state.lowerThirdMode || "text"}
                      onChange={handleLowerThirdModeChange}
                    >
                      <option value="text">Text Banner</option>
                      <option value="video">Video Clip</option>
                    </select>
                  </label>
                </section>

                {!lowerThirdIsVideo ? (
                  <>
                    <section className="control-panel__section">
                      <h3 className="section-title">Text Type</h3>
                      <label className="field">
                        <span className="field__label">Primary Title</span>
                        <input
                          className="field__input"
                          type="text"
                          value={state.primaryText}
                          onChange={(event) =>
                            applyPatch({ primaryText: event.target.value })
                          }
                          placeholder="Primary headline"
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
                          placeholder="Supporting line"
                        />
                      </label>
                    </section>

                    <section className="control-panel__section control-panel__section--row">
                      <h3 className="section-title">Colors</h3>
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
                    </section>
                  </>
                ) : (
                  <section className="control-panel__section">
                    <h3 className="section-title">Video Type</h3>
                    <div className="field">
                      <span className="field__label">Clip</span>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button"
                          onClick={handleLowerThirdVideoBrowse}
                        >
                          {state.lowerThirdVideoSrc ? "Change Clip" : "Select Clip"}
                        </button>
                        {state.lowerThirdVideoSrc && (
                          <>
                            <span className="button-row__separator">:</span>
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={handleLowerThirdVideoClear}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {state.lowerThirdVideoSrc && (
                      <p className="section-helper">
                        Video plays in kiosk output with audio muted.
                      </p>
                    )}
                  </section>
                )}

                <section className="control-panel__section">
                  <h3 className="section-title">Settings</h3>
                  {lowerThirdIsVideo && state.lowerThirdVideoSrc && (
                    <label className="field">
                      <span className="field__label">Loop</span>
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

                  <label className="field field--inline">
                    <span className="field__label">Manual Offset</span>
                    <span className="field__checkbox-wrapper">
                      <input
                        className="field__checkbox"
                        type="checkbox"
                        checked={Boolean(state.lowerThirdPositionCustomEnabled)}
                        onChange={(event) =>
                          applyPatch({
                            lowerThirdPositionCustomEnabled: event.target.checked,
                            ...(event.target.checked
                              ? {}
                              : {
                                  lowerThirdPositionOffsetX: 0,
                                  lowerThirdPositionOffsetY: 0
                                })
                          })
                        }
                      />
                      <span className="field__checkbox-label">
                        {state.lowerThirdPositionCustomEnabled ? "Disable" : "Enable"}
                      </span>
                    </span>
                  </label>

                  {state.lowerThirdPositionCustomEnabled && (
                    <>
                      <div className="field field--inline field--offsets">
                        <span className="field__label">Offset (px)</span>
                        <div className="field-offsets__group">
                          <label className="field-offsets__item">
                            <span className="field-offsets__label">X</span>
                            <input
                              className="field__input field__input--number"
                              type="number"
                              step="1"
                              value={lowerThirdOffsetXValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                applyPatch({
                                  lowerThirdPositionOffsetX:
                                    nextValue === "" || nextValue === "-"
                                      ? nextValue
                                      : coerceNumber(nextValue)
                                });
                              }}
                              onBlur={(event) =>
                                applyPatch({
                                  lowerThirdPositionOffsetX: coerceNumber(event.target.value)
                                })
                              }
                            />
                          </label>
                          <label className="field-offsets__item">
                            <span className="field-offsets__label">Y</span>
                            <input
                              className="field__input field__input--number"
                              type="number"
                              step="1"
                              value={lowerThirdOffsetYValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                applyPatch({
                                  lowerThirdPositionOffsetY:
                                    nextValue === "" || nextValue === "-"
                                      ? nextValue
                                      : coerceNumber(nextValue)
                                });
                              }}
                              onBlur={(event) =>
                                applyPatch({
                                  lowerThirdPositionOffsetY: coerceNumber(event.target.value)
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost button--compact"
                        onClick={handleLowerThirdOffsetReset}
                      >
                        Reset Defaults
                      </button>
                    </>
                  )}

                  <div className="button-row">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleSaveLowerThirdHistory}
                      disabled={!canSaveLowerThirdHistory}
                    >
                      Save to History
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`toggle-button ${state.visible ? "is-active" : ""}`}
                    onClick={() => applyPatch({ visible: !state.visible })}
                  >
                    {state.visible ? "Hide Lower Third" : "Show Lower Third"}
                  </button>
                </section>

                {!lowerThirdIsVideo && (
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
              )}

              <section className="control-panel__section">
                <h2 className="section-title">History</h2>
                {lowerThirdHistoryItems.length === 0 ? (
                  <p className="section-helper">
                    Save lower third layouts to quickly recall previous text or video configurations.
                  </p>
                ) : (
                  <>
                    <ul className="history-list">
                      {lowerThirdHistoryItems.map((entry) => {
                        const isVideoEntry = entry.mode === "video";
                        const title = isVideoEntry
                          ? entry.primaryText || "Video Lower Third"
                          : entry.primaryText || "Lower Third";
                        const subtitle = isVideoEntry
                          ? getVideoLabel(entry.lowerThirdVideoSrc)
                          : entry.secondaryText || "No secondary line";
                        const timestamp = entry.savedAt
                          ? new Date(entry.savedAt).toLocaleString()
                          : "";

                        return (
                          <li
                            key={entry.id}
                            className="history-item"
                          >
                            <div className="history-item__meta">
                              <strong>{title}</strong>
                              <span>{subtitle}</span>
                              {timestamp ? (
                                <span className="history-item__timestamp">{timestamp}</span>
                              ) : null}
                            </div>
                            <div className="history-item__actions">
                              <button
                                type="button"
                                className="button button--compact"
                                onClick={() => handleLoadLowerThirdHistory(entry)}
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                className="button button--ghost"
                                onClick={() => handleRemoveLowerThirdHistory(entry.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      className="button button--ghost history-clear"
                      onClick={handleClearLowerThirdHistory}
                    >
                      Clear History
                    </button>
                  </>
                )}
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

            {activeTab === "sources" && (
              <RemoteSourcesTab
                state={state}
                applyPatch={applyPatch}
              />
            )}

            {activeTab === "logo" && (
              <div className="panel-group">
                <section className="control-panel__section">
                  <h2 className="section-title">Select Logo</h2>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button"
                      onClick={handleLogoBrowse}
                    >
                      {state.logoSrc ? "Change Logo" : "Select Logo"}
                    </button>
                    {state.logoSrc && (
                      <>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={handleLogoClear}
                        >
                          Remove
                        </button>
                      </>
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
                          logoPositionCustomEnabled={state.logoPositionCustomEnabled}
                          logoPositionOffsetX={state.logoPositionOffsetX}
                          logoPositionOffsetY={state.logoPositionOffsetY}
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="control-panel__section">
                  <h3 className="section-title">Settings</h3>
                  <label className="field">
                    <span className="field__label">Placement</span>
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

                  {logoIsVideo && (
                    <label className="field">
                      <span className="field__label">Loop Playback</span>
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

                  <label className="field field--inline">
                    <span className="field__label">Manual Offset</span>
                    <span className="field__checkbox-wrapper">
                      <input
                        className="field__checkbox"
                        type="checkbox"
                        checked={Boolean(state.logoPositionCustomEnabled)}
                        onChange={(event) =>
                          applyPatch({
                            logoPositionCustomEnabled: event.target.checked,
                            ...(event.target.checked
                              ? {}
                              : { logoPositionOffsetX: 0, logoPositionOffsetY: 0 })
                          })
                        }
                      />
                      <span className="field__checkbox-label">
                        {state.logoPositionCustomEnabled ? "Disable" : "Enable"}
                      </span>
                    </span>
                  </label>

                  {state.logoPositionCustomEnabled && (
                    <>
                      <div className="field field--inline field--offsets">
                        <span className="field__label">Offset (px)</span>
                        <div className="field-offsets__group">
                          <label className="field-offsets__item">
                            <span className="field-offsets__label">X</span>
                            <input
                              className="field__input field__input--number"
                              type="number"
                              step="1"
                              value={logoOffsetXValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                applyPatch({
                                  logoPositionOffsetX:
                                    nextValue === "" || nextValue === "-"
                                      ? nextValue
                                      : coerceNumber(nextValue)
                                });
                              }}
                              onBlur={(event) =>
                                applyPatch({
                                  logoPositionOffsetX: coerceNumber(event.target.value)
                                })
                              }
                            />
                          </label>
                          <label className="field-offsets__item">
                            <span className="field-offsets__label">Y</span>
                            <input
                              className="field__input field__input--number"
                              type="number"
                              step="1"
                              value={logoOffsetYValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                applyPatch({
                                  logoPositionOffsetY:
                                    nextValue === "" || nextValue === "-"
                                      ? nextValue
                                      : coerceNumber(nextValue)
                                });
                              }}
                              onBlur={(event) =>
                                applyPatch({
                                  logoPositionOffsetY: coerceNumber(event.target.value)
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button button--ghost button--compact"
                        onClick={handleLogoOffsetReset}
                      >
                        Reset Defaults
                      </button>
                    </>
                  )}

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
                    Pick a chroma fill for keying workflows or switch to a fully transparent background for OBS browser sources.
                  </p>
                  <div className="field field--inline">
                    <span className="field__label">Background Color</span>
                    <input
                      type="color"
                      value={
                        backgroundIsTransparent
                          ? "#000000"
                          : state.backgroundColor || "#00FF00"
                      }
                      onChange={(event) => applyPatch({ backgroundColor: event.target.value })}
                    />
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button--compact"
                      onClick={handleUseChromaGreen}
                    >
                      Use Chroma Green
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleUseTransparentBackground}
                      disabled={backgroundIsTransparent}
                    >
                      Transparent for OBS
                    </button>
                  </div>
                  {backgroundIsTransparent ? (
                    <p className="section-helper">
                      Output window renders with alpha—drop it into OBS as a Browser Source, no chroma key required.
                    </p>
                  ) : null}
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
    lowerThirdPositionCustomEnabled: PropTypes.bool,
    lowerThirdPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    lowerThirdPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
    logoPositionCustomEnabled: PropTypes.bool,
    logoPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    logoPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    displayId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    outputActive: PropTypes.bool,
    backgroundColor: PropTypes.string,
    remoteSources: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        url: PropTypes.string.isRequired
      })
    ),
    remoteSourceHistory: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        url: PropTypes.string.isRequired,
        lastUsedAt: PropTypes.number
      })
    ),
    remoteSourceActiveId: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    remoteSourceVisible: PropTypes.bool,
    remoteSourceTrigger: PropTypes.number,
    lowerThirdHistory: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        mode: PropTypes.oneOf(["text", "video"]),
        primaryText: PropTypes.string,
        secondaryText: PropTypes.string,
        primaryBg: PropTypes.string,
        secondaryBg: PropTypes.string,
        position: PropTypes.string,
        lowerThirdVideoSrc: PropTypes.string,
        lowerThirdVideoLoop: PropTypes.bool,
        lowerThirdPositionCustomEnabled: PropTypes.bool,
        lowerThirdPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        lowerThirdPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        savedAt: PropTypes.number
      })
    )
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

export default ControlPanel;
