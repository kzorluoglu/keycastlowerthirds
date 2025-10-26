import PropTypes from "prop-types";
import { useCallback, useMemo, useState } from "react";
import { buildEmbedUrl, normalizeRemoteUrl } from "../utils/remoteSources.js";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const describeSource = (source) => {
  if (!source?.url) return "";
  try {
    const parsed = new URL(source.url);
    return parsed.hostname;
  } catch (error) {
    return source.url;
  }
};

const RemoteSourcesTab = ({ state, applyPatch }) => {
  const remoteSources = Array.isArray(state.remoteSources) ? state.remoteSources : [];
  const remoteSourceHistory = Array.isArray(state.remoteSourceHistory) ? state.remoteSourceHistory : [];
  const [labelInput, setLabelInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [formError, setFormError] = useState("");
  const [previewId, setPreviewId] = useState(null);
  const historyItems = useMemo(() => {
    return [...remoteSourceHistory]
      .map((entry) => ({
        ...entry,
        lastUsedAt: entry?.lastUsedAt || 0
      }))
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, 20);
  }, [remoteSourceHistory]);

  const previewSource = useMemo(
    () => remoteSources.find((item) => item.id === previewId) || null,
    [previewId, remoteSources]
  );

  const previewEmbedUrl = useMemo(
    () => (previewSource ? buildEmbedUrl(previewSource.url) : ""),
    [previewSource]
  );

  const handleAddSource = useCallback(
    (event) => {
      event.preventDefault();

      const nextLabel = labelInput.trim() || "VDO Ninja Feed";
      const normalizedUrl = normalizeRemoteUrl(urlInput);

      if (!normalizedUrl) {
        setFormError("Enter a valid VDO.Ninja view link (https://...).");
        return;
      }

      if (!normalizedUrl.includes("vdo.ninja")) {
        setFormError("This link does not look like a VDO.Ninja URL. Double-check it and try again.");
        return;
      }

      const duplicate = remoteSources.some(
        (item) => item.url.toLowerCase() === normalizedUrl.toLowerCase()
      );

      if (duplicate) {
        setFormError("This source is already in the list.");
        return;
      }

      const nextSource = {
        id: createId(),
        label: nextLabel,
        url: normalizedUrl
      };

      const historyEntry = {
        id: createId(),
        label: nextLabel,
        url: normalizedUrl,
        lastUsedAt: Date.now()
      };
      const normalizedLower = normalizedUrl.toLowerCase();
      const updatedHistory = [
        historyEntry,
        ...remoteSourceHistory.filter((item) => item.url.toLowerCase() !== normalizedLower)
      ].slice(0, 20);

      applyPatch({
        remoteSources: [...remoteSources, nextSource],
        remoteSourceHistory: updatedHistory
      });

      setLabelInput("");
      setUrlInput("");
      setFormError("");
      setPreviewId(nextSource.id);
    },
    [applyPatch, labelInput, remoteSources, urlInput]
  );

  const handleRemoveSource = useCallback(
    (sourceId) => {
      const nextSources = remoteSources.filter((source) => source.id !== sourceId);
      const patch = {
        remoteSources: nextSources
      };

      if (state.remoteSourceActiveId === sourceId) {
        patch.remoteSourceActiveId = null;
        patch.remoteSourceVisible = false;
      }

      applyPatch(patch);

      if (previewId === sourceId) {
        setPreviewId(null);
      }
    },
    [applyPatch, previewId, remoteSources, state.remoteSourceActiveId]
  );

  const handlePreviewToggle = useCallback(
    (sourceId) => {
      setPreviewId((current) => (current === sourceId ? null : sourceId));
    },
    []
  );

  const handleTakeLive = useCallback(
    (sourceId) => {
      const source = remoteSources.find((item) => item.id === sourceId);
      let updatedHistory = remoteSourceHistory;

      if (source?.url) {
        const normalizedUrl = normalizeRemoteUrl(source.url);
        const key = normalizedUrl.toLowerCase();
        const historyEntry = {
          id: createId(),
          label: source.label || "VDO.Ninja Feed",
          url: normalizedUrl,
          lastUsedAt: Date.now()
        };
        updatedHistory = [
          historyEntry,
          ...remoteSourceHistory.filter((item) => item.url.toLowerCase() !== key)
        ].slice(0, 20);
      }

      const patch = {
        remoteSourceActiveId: sourceId,
        remoteSourceVisible: true,
        remoteSourceTrigger: Date.now(),
        fullscreenVideoVisible: false,
        fullscreenVideoPlaying: false,
        ...(updatedHistory ? { remoteSourceHistory: updatedHistory } : {})
      };
      applyPatch(patch);
    },
    [applyPatch, remoteSourceHistory, remoteSources]
  );

  const handleHideLive = useCallback(() => {
    applyPatch({
      remoteSourceVisible: false
    });
  }, [applyPatch]);

  const handleUseHistory = useCallback(
    (entry) => {
      if (!entry?.url) return;
      const normalizedUrl = normalizeRemoteUrl(entry.url);
      const normalizedLower = normalizedUrl.toLowerCase();
      const nextLabel = entry.label || "VDO Ninja Feed";
      let nextSources = remoteSources;
      let nextId = null;

      const existing = remoteSources.find(
        (source) => source.url.toLowerCase() === normalizedLower
      );

      if (existing) {
        nextId = existing.id;
      } else {
        nextId = createId();
        nextSources = [
          ...remoteSources,
          {
            id: nextId,
            label: nextLabel,
            url: normalizedUrl
          }
        ];
      }

      const historyEntry = {
        id: createId(),
        label: nextLabel,
        url: normalizedUrl,
        lastUsedAt: Date.now()
      };
      const updatedHistory = [
        historyEntry,
        ...remoteSourceHistory.filter((item) => item.url.toLowerCase() !== normalizedLower)
      ].slice(0, 20);

      applyPatch({
        remoteSources: nextSources,
        remoteSourceHistory: updatedHistory
      });

      setPreviewId(nextId);
      setLabelInput(nextLabel);
      setUrlInput(normalizedUrl);
      setFormError("");
    },
    [applyPatch, remoteSourceHistory, remoteSources]
  );

  const handleClearHistory = useCallback(() => {
    applyPatch({ remoteSourceHistory: [] });
  }, [applyPatch]);

  const handleRemoveHistory = useCallback(
    (entryId) => {
      applyPatch({
        remoteSourceHistory: remoteSourceHistory.filter((entry) => entry.id !== entryId)
      });
    },
    [applyPatch, remoteSourceHistory]
  );

  return (
    <div className="panel-group">
      <section className="control-panel__section">
        <h2 className="section-title">VDO.Ninja Inputs</h2>
        <p className="section-helper">
          Paste a <code>https://vdo.ninja/?view=...</code> link. We embed it for preview and live playback. Append
          <code>&scene</code> or other VDO.Ninja flags as needed.
        </p>
        <form
          className="sources-form"
          onSubmit={handleAddSource}
        >
          <div className="sources-form__row">
            <label className="field">
              <span className="field__label">Display Name</span>
              <input
                className="field__input"
                type="text"
                value={labelInput}
                placeholder="Main Stage Slides"
                onChange={(event) => setLabelInput(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">VDO.Ninja Viewer URL</span>
              <input
                className="field__input"
                type="url"
                value={urlInput}
                placeholder="https://vdo.ninja/?view=..."
                onChange={(event) => setUrlInput(event.target.value)}
                required
              />
            </label>
          </div>
          <button
            type="submit"
            className="button button--primary"
          >
            Add Source
          </button>
          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </section>

      <section className="control-panel__section">
        <h2 className="section-title">Source List</h2>
        {remoteSources.length === 0 ? (
          <p className="section-helper">
            Add one or more VDO.Ninja view links above. They will appear here for quick preview and live control.
          </p>
        ) : (
          <ul className="source-grid">
            {remoteSources.map((source) => {
              const onAir =
                state.remoteSourceVisible && state.remoteSourceActiveId === source.id;
              const isPreviewing = previewId === source.id;

              return (
                <li
                  key={source.id}
                  className={`source-card${onAir ? " is-live" : ""}`}
                >
                  <div className="source-card__header">
                    <h3>{source.label || "VDO.Ninja Feed"}</h3>
                    <span className="source-card__meta">{describeSource(source)}</span>
                  </div>
                  <div className="source-card__actions">
                    <button
                      type="button"
                      className="button button--compact"
                      onClick={() => handlePreviewToggle(source.id)}
                    >
                      {isPreviewing ? "Close Preview" : "Preview"}
                    </button>
                    {onAir ? (
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={handleHideLive}
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button--danger"
                        onClick={() => handleTakeLive(source.id)}
                      >
                        Take Live
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      Remove
                    </button>
                  </div>
                  {onAir ? <span className="source-card__flag">ON AIR</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="control-panel__section">
        <h2 className="section-title">History</h2>
        {historyItems.length === 0 ? (
          <p className="section-helper">
            Recently added VDO.Ninja links will appear here so you can quickly bring them back into the show.
          </p>
        ) : (
          <>
            <ul className="history-list">
              {historyItems.map((entry) => (
                <li
                  key={entry.id}
                  className="history-item"
                >
                  <div className="history-item__meta">
                    <strong>{entry.label || "VDO.Ninja Feed"}</strong>
                    <span>{describeSource(entry)}</span>
                  </div>
                  <div className="history-item__actions">
                    <button
                      type="button"
                      className="button button--compact"
                      onClick={() => handleUseHistory(entry)}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleRemoveHistory(entry.id)}
                    >
                      Forget
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="button button--ghost history-clear"
              onClick={handleClearHistory}
            >
              Clear History
            </button>
          </>
        )}
      </section>

      <section className="control-panel__section">
        <h2 className="section-title">Preview Monitor</h2>
        <p className="section-helper">
          Preview a VDO.Ninja feed before switching it live. Use the <strong>Preview</strong> button above to toggle a
          source here.
        </p>
        <div className="preview-shell">
          {previewSource ? (
            <iframe
              key={`${previewSource.id}-${state.remoteSourceTrigger}`}
              src={previewEmbedUrl}
              title={previewSource.label || "VDO.Ninja Preview"}
              allow="autoplay; fullscreen; clipboard-read; clipboard-write"
              allowFullScreen
            />
          ) : (
            <span className="preview-shell__message">Select a source to preview.</span>
          )}
        </div>
      </section>
    </div>
  );
};

RemoteSourcesTab.propTypes = {
  state: PropTypes.shape({
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
    remoteSourceHistory: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        url: PropTypes.string.isRequired,
        lastUsedAt: PropTypes.number
      })
    )
  }).isRequired,
  applyPatch: PropTypes.func.isRequired
};

export default RemoteSourcesTab;
