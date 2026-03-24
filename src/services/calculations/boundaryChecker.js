/**
 * Check if a point (latitude, longitude) is within a circular boundary.
 * @param {number} latitude - Flight latitude
 * @param {number} longitude - Flight longitude
 * @param {Object} boundary - Boundary object with centerLat, centerLon, radiusKm
 * @returns {boolean} True if point is within boundary circle
 */
export const isWithinBoundary = (latitude, longitude, boundary) => {
  if (!boundary) return false;
  if (latitude === null || longitude === null) return false;

  const dist = calculateDistance(latitude, longitude, boundary.centerLat, boundary.centerLon);
  return dist <= boundary.radiusKm;
};

/**
 * Calculate simple distance between two lat/lon points (in kilometers)
 * Using Haversine formula for accuracy
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Get boundary center point
 */
export const getBoundaryCenter = (boundary) => {
  if (!boundary) return null;
  return {
    latitude: boundary.centerLat,
    longitude: boundary.centerLon,
  };
};
