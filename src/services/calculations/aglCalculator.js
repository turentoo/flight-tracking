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
 * Check if barometric altitude is below threshold (breach condition).
 * No QFE correction — compares raw barometric altitude directly.
 * @param {number} altitude - Barometric altitude in feet
 * @param {number} threshold - Threshold in feet (default 1300ft)
 * @returns {boolean} True if altitude is below threshold
 */
export const isBelowThreshold = (altitude, threshold = 1300) => {
  if (altitude === null || altitude === undefined) {
    return false;
  }
  return altitude < threshold;
};

/**
 * Format AGL data for storage/display
 */
export const formatAGLData = (barometricAltitude, groundElevation, threshold = 1300) => {
  const agl = calculateAGL(barometricAltitude, groundElevation);
  const isBreach = isBelowThreshold(barometricAltitude, threshold);

  return {
    altitude: barometricAltitude,
    agl,
    isBreach,
  };
};
