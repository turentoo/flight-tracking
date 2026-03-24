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
 * Correct barometric altitude using QNH pressure setting.
 * Formula: corrected = baro_altitude + ((QNH - 1013.25) × 27)
 * @param {number} baroAltitudeFt - Raw barometric altitude in feet
 * @param {number} navQnh - QNH pressure in hPa (from aircraft transponder)
 * @returns {number|null} Corrected altitude AMSL in feet, or null if inputs missing
 */
export const calculateCorrectedAltitude = (baroAltitudeFt, navQnh) => {
  if (baroAltitudeFt == null || navQnh == null) return null;
  return baroAltitudeFt + ((navQnh - 1013.25) * 27);
};

/**
 * Calculate height above aerodrome from corrected altitude.
 * @param {number} correctedAltitudeFt - QNH-corrected altitude AMSL in feet
 * @param {number} aerodromeElevationFt - Aerodrome elevation AMSL in feet
 * @returns {number|null} Height above aerodrome in feet, or null if inputs missing
 */
export const calculateHeightAboveAerodrome = (correctedAltitudeFt, aerodromeElevationFt) => {
  if (correctedAltitudeFt == null || aerodromeElevationFt == null) return null;
  return correctedAltitudeFt - aerodromeElevationFt;
};

/**
 * Check if altitude is below threshold (breach condition).
 * Works with any altitude value — QNH-corrected height above aerodrome
 * when available, or raw barometric altitude as fallback.
 * @param {number} altitude - Altitude in feet
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
