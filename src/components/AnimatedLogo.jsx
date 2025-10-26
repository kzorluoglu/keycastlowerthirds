import PropTypes from "prop-types";
import { useEffect, useMemo, useRef } from "react";

const SUPPORTED_VIDEO_EXTENSIONS = ["webm", "mp4", "mov"];

const inferType = (src) => {
  if (!src) return "none";
  const [base, query = ""] = src.split("?");
  const params = new URLSearchParams(query);
  const extFromQuery = params.get("ext");
  const extension = extFromQuery || base.split(".").pop()?.toLowerCase();
  if (!extension) return "image";
  if (SUPPORTED_VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }
  return "image";
};

const AnimatedLogo = ({
  src = "",
  position = "top-right",
  enabled = false,
  loop = true,
  logoPositionCustomEnabled = false,
  logoPositionOffsetX = 0,
  logoPositionOffsetY = 0
}) => {
  const videoRef = useRef(null);
  const type = useMemo(() => inferType(src), [src]);

  useEffect(() => {
    const element = videoRef.current;
    if (!enabled || type !== "video" || !element) return undefined;

    const restart = () => {
      element.currentTime = 0;
      const playPromise = element.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Ignore autoplay prevention errors; user can trigger manually if needed
        });
      }
    };

    if (element.readyState >= 2) {
      restart();
    } else {
      const handleLoaded = () => {
        restart();
      };
      element.addEventListener("loadeddata", handleLoaded, { once: true });
      return () => {
        element.removeEventListener("loadeddata", handleLoaded);
      };
    }

    return () => {
      if (!loop) {
        element.pause();
      }
    };
  }, [enabled, src, loop, type]);

  useEffect(() => {
    if (enabled) return;
    const element = videoRef.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
  }, [enabled]);

  if (!enabled || !src) return null;

  const parseOffset = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const offsetX = parseOffset(logoPositionOffsetX);
  const offsetY = parseOffset(logoPositionOffsetY);

  const className = `animated-logo animated-logo--${position}`;
  const positionStyle = logoPositionCustomEnabled
    ? { transform: `translate(${offsetX}px, ${offsetY}px)` }
    : undefined;

  if (type === "video") {
    return (
      <div className={className} style={positionStyle}>
        <video
          key={`${src}-${loop ? "loop" : "once"}`}
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop={loop}
          playsInline
          preload="auto"
        />
      </div>
    );
  }

  return (
    <div className={className} style={positionStyle}>
      <img src={src} alt="Channel logo" />
    </div>
  );
};

AnimatedLogo.propTypes = {
  src: PropTypes.string,
  position: PropTypes.oneOf([
    "bottom-left",
    "bottom-right",
    "top-left",
    "top-right"
  ]),
  enabled: PropTypes.bool,
  loop: PropTypes.bool,
  logoPositionCustomEnabled: PropTypes.bool,
  logoPositionOffsetX: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  logoPositionOffsetY: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default AnimatedLogo;
