/**
 * Calculate AGL (Above Ground Level) altitude
 * AGL = barometric_altitude - ground_elevation
 * @param {number} barometricAltitude - Flight altitude in feet (from OpenSky)
 * @param {number} groundElevation - Ground elevation in feet (typically airport AMSL)
 * @returns {number} AGL altitude in feet
 */
export const calculateAGL = (barometricAltitude, groundElevation) => {
  if (barometricAltitude === null || barometricAltitude === undefined) {
    return null;
  }
  if (groundElevation === null || groundElevation === undefined) {
    // Fallback: assume ground elevation if not provided
    return barometricAltitude;
  }
  return barometricAltitude - groundElevation;
};

/**
 * Check if altitude is below threshold
 * @param {number} agl - AGL altitude in feet
 * @param {number} threshold - Threshold in feet (default 1300ft)
 * @returns {boolean} True if AGL is below threshold (breach condition)
 */
export const isAltitudeBreach = (agl, threshold = 1300) => {
  if (agl === null || agl === undefined) {
    return false;
  }
  return agl < threshold;
};

/**
 * Format AGL data for storage/display
 */
export const formatAGLData = (barometricAltitude, groundElevation, threshold = 1300) => {
  const agl = calculateAGL(barometricAltitude, groundElevation);
  const isBreach = isAltitudeBreach(agl, threshold);

  return {
    altitude: barometricAltitude,
    agl,
    isBreach,
  };
};
