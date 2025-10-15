import PropTypes from "prop-types";

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
  enabled = false
}) => {
  if (!enabled || !src) return null;

  const type = inferType(src);
  const className = `animated-logo animated-logo--${position}`;

  if (type === "video") {
    return (
      <div className={className}>
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>
    );
  }

  return (
    <div className={className}>
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
  enabled: PropTypes.bool
};

export default AnimatedLogo;
