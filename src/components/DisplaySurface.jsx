import PropTypes from "prop-types";
import LowerThird from "./LowerThird.jsx";
import AnimatedLogo from "./AnimatedLogo.jsx";

const DisplaySurface = ({ state }) => {
  const backgroundColor = state.backgroundColor || "#000000";

  return (
    <div
      className="display-surface"
      style={{ backgroundColor }}
    >
      <LowerThird {...state} />
      <AnimatedLogo
        src={state.logoSrc}
        position={state.logoPosition}
        enabled={state.logoEnabled}
      />
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
    logoSrc: PropTypes.string,
    logoPosition: PropTypes.string,
    logoEnabled: PropTypes.bool,
    displayId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    outputActive: PropTypes.bool,
    backgroundColor: PropTypes.string
  }).isRequired
};

export default DisplaySurface;
