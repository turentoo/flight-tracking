const toRadians = (degrees) => degrees * (Math.PI / 180);

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isWithinBoundary = (latitude, longitude, boundary) => {
  if (!boundary) return false;
  if (latitude == null || longitude == null) return false;
  return calculateDistance(latitude, longitude, boundary.centerLat, boundary.centerLon) <= boundary.radiusKm;
};

export const getBoundaryCenter = (boundary) => {
  if (!boundary) return null;
  return { latitude: boundary.centerLat, longitude: boundary.centerLon };
};

export const calculateAGL = (barometricAltitudeFt, groundElevationFt) => {
  if (barometricAltitudeFt == null) return null;
  if (groundElevationFt == null) return barometricAltitudeFt;
  return barometricAltitudeFt - groundElevationFt;
};

export const calculateCorrectedAltitude = (baroAltitudeFt, navQnh) => {
  if (baroAltitudeFt == null || navQnh == null) return null;
  return baroAltitudeFt + ((navQnh - 1013.25) * 27);
};

export const calculateHeightAboveAerodrome = (correctedAltitudeFt, aerodromeElevationFt) => {
  if (correctedAltitudeFt == null || aerodromeElevationFt == null) return null;
  return correctedAltitudeFt - aerodromeElevationFt;
};

export const isBelowThreshold = (altitude, threshold) => {
  if (altitude == null) return false;
  return altitude < threshold;
};

export const formatCallsign = (callsign) => {
  if (!callsign) return 'Unknown';
  return callsign.trim().toUpperCase();
};

export const getCurrentDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCurrentHour = () => new Date().getHours();
