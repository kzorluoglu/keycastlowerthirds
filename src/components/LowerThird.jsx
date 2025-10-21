import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

const LowerThird = ({
  primaryText = "",
  secondaryText = "",
  primaryBg = "#FF2E63",
  secondaryBg = "#252A34",
  position = "bottom-left",
  visible = true,
  lowerThirdMode = "text",
  lowerThirdVideoSrc = ""
}) => {
  // Internal phase to orchestrate enter/exit animation without snapping the container
  // Phases: hidden -> entering -> active -> exiting -> hidden

  const [localPhase, setLocalPhase] = useState("hidden");
  const enterTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const videoRef = useRef(null);
  const wantsVideo = lowerThirdMode === "video";
  const hasVideoSrc = Boolean(lowerThirdVideoSrc);
  const isVideoMode = wantsVideo && hasVideoSrc;

  // Durations must match CSS animations below
  const ENTER_TOTAL = isVideoMode ? 350 : 900; // video uses direct fade-in
  const EXIT_TOTAL = 350; // ms simple fade-out duration + small buffer

  useEffect(() => {
    // Clear timers on unmount
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Start enter if coming from hidden or exiting
      if (localPhase === "hidden" || localPhase === "exiting") {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        setLocalPhase("entering");
        enterTimerRef.current = setTimeout(() => {
          setLocalPhase("active");
        }, ENTER_TOTAL);
      }
    } else {
      // Start exit if currently active or entering
      if (localPhase === "active" || localPhase === "entering") {
        if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
        setLocalPhase("exiting");
        exitTimerRef.current = setTimeout(() => {
          setLocalPhase("hidden");
        }, EXIT_TOTAL);
      }
    }
  }, [visible, ENTER_TOTAL]);

  useEffect(() => {
    if (!wantsVideo) return;
    const element = videoRef.current;
    if (!element) return;
    if (visible && hasVideoSrc) {
      const playPromise = element.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Ignore autoplay prevention errors.
        });
      }
    } else {
      element.pause();
    }
  }, [visible, wantsVideo, hasVideoSrc, lowerThirdVideoSrc]);

  if (wantsVideo && !hasVideoSrc) {
    return null;
  }

  const onStage = localPhase === "entering" || localPhase === "active" || localPhase === "exiting";
  const containerClass = [
    "lower-third",
    `lower-third--${position}`,
    onStage ? "is-visible" : "",
    localPhase === "entering" ? "is-entering" : "",
    localPhase === "active" ? "is-active" : "",
    localPhase === "exiting" ? "is-exiting" : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (!isVideoMode) {
    return (
      <div className={containerClass}>
        <div className="lower-third__banner">
          <span
            className="lower-third__primary"
            // pass bg color through a CSS variable for animations
            style={{ "--bg": primaryBg }}
          >
            <span className="lower-third__text">{primaryText || "\u00A0"}</span>
          </span>
          <span
            className="lower-third__secondary"
            style={{ "--bg": secondaryBg }}
          >
            <span className="lower-third__text">{secondaryText || "\u00A0"}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClass} lower-third--video`}>
      <div className="lower-third__video">
        <video
          key={`${lowerThirdVideoSrc}`}
          ref={videoRef}
          src={lowerThirdVideoSrc}
          autoPlay
          loop={false}
          playsInline
          preload="auto"
        />
      </div>
    </div>
  );
};

LowerThird.propTypes = {
  primaryText: PropTypes.string,
  secondaryText: PropTypes.string,
  primaryBg: PropTypes.string,
  secondaryBg: PropTypes.string,
  position: PropTypes.oneOf([
    "bottom-left",
    "bottom-right",
    "top-left",
    "top-right"
  ]),
  visible: PropTypes.bool,
  lowerThirdMode: PropTypes.oneOf(["text", "video"]),
  lowerThirdVideoSrc: PropTypes.string
};

export default LowerThird;
