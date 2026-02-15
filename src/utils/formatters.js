/**
 * Format altitude in feet with thousands separator
 */
export const formatAltitude = (feet) => {
  if (feet === null || feet === undefined) return 'N/A';
  return `${Math.round(feet).toLocaleString()} ft`;
};

/**
 * Format velocity in m/s to knots
 */
export const formatVelocity = (ms) => {
  if (ms === null || ms === undefined) return 'N/A';
  const knots = ms * 1.94384;
  return `${Math.round(knots)} kt`;
};

/**
 * Format heading in degrees
 */
export const formatHeading = (degrees) => {
  if (degrees === null || degrees === undefined) return 'N/A';
  const heading = Math.round(degrees);
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((heading % 360) / 22.5) % 16;
  return `${heading}° ${directions[index]}`;
};

/**
 * Format coordinates with 4 decimal places
 */
export const formatCoordinates = (lat, lon) => {
  if (lat === null || lon === null) return 'N/A';
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};

/**
 * Format callsign (standardize case)
 */
export const formatCallsign = (callsign) => {
  if (!callsign) return 'Unknown';
  return callsign.trim().toUpperCase();
};

/**
 * Format ICAO24 hex code
 */
export const formatICAO24 = (icao24) => {
  if (!icao24) return 'N/A';
  return icao24.toUpperCase();
};

/**
 * Format AGL with threshold highlighting
 */
export const formatAGL = (agl, threshold = 1300) => {
  if (agl === null || agl === undefined) return 'N/A';
  const formatted = `${Math.round(agl).toLocaleString()} ft`;
  const isBreached = agl < threshold;
  return { formatted, isBreached };
};

/**
 * Format duration in seconds to readable format
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
};

/**
 * Format breach count with badge-style text
 */
export const formatBreachCount = (count) => {
  if (count === 0) return 'No breaches';
  if (count === 1) return '1 breach';
  return `${count} breaches`;
};
