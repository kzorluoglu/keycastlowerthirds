import PropTypes from "prop-types";

const LowerThird = ({
  primaryText = "",
  secondaryText = "",
  primaryBg = "#FF2E63",
  secondaryBg = "#252A34",
  position = "bottom-left",
  visible = true
}) => {
  return (
    <div className={`lower-third lower-third--${position} ${visible ? "is-visible" : ""}`}>
      <div className="lower-third__banner">
        <span
          className="lower-third__primary"
          style={{ backgroundColor: primaryBg }}
        >
          {primaryText || "\u00A0"}
        </span>
        <span
          className="lower-third__secondary"
          style={{ backgroundColor: secondaryBg }}
        >
          {secondaryText || "\u00A0"}
        </span>
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
  visible: PropTypes.bool
};

export default LowerThird;
