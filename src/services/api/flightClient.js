import axios from 'axios';
import { ADSB_FI_API_URL } from '../../utils/constants';
import { getBoundaryCenter, calculateDistance } from '../calculations/boundaryChecker';

const client = axios.create({
  baseURL: ADSB_FI_API_URL,
  timeout: 10000,
});

const FT_TO_M = 1 / 3.28084;
const KT_TO_MS = 0.514444;
const FPM_TO_MS = 1 / 196.85;
const KM_TO_NM = 0.539957;

/**
 * Convert an ADSB.fi aircraft object to the internal flight format.
 * Unit conversions: feet→meters, knots→m/s, ft/min→m/s.
 */
const mapAircraftToFlight = (ac) => {
  const isOnGround = ac.alt_baro === 'ground';

  return {
    icao24: ac.hex ?? null,
    callsign: ac.flight ? ac.flight.trim() : null,
    latitude: ac.lat ?? null,
    longitude: ac.lon ?? null,
    barometricAltitude: isOnGround ? null : (ac.alt_baro != null ? ac.alt_baro * FT_TO_M : null),
    geometricAltitude: ac.alt_geom != null ? ac.alt_geom * FT_TO_M : null,
    onGround: isOnGround,
    velocity: ac.gs != null ? ac.gs * KT_TO_MS : null,
    trueTrack: ac.track ?? null,
    verticalRate: ac.geom_rate != null ? ac.geom_rate * FPM_TO_MS : null,
    squawk: ac.squawk ?? null,
    spi: ac.spi ?? false,
    categoryCode: ac.category ?? null,
  };
};

/**
 * Compute the search radius in nautical miles from a boundary rectangle.
 * Uses the distance from center to a corner, plus a 10 % buffer.
 */
const boundaryToRadius = (boundary) => {
  const center = getBoundaryCenter(boundary);
  const distKm = calculateDistance(
    center.latitude,
    center.longitude,
    boundary.latMax,
    boundary.lonMax,
  );
  return distKm * KM_TO_NM * 1.1; // 10 % buffer
};

/**
 * Fetch flights near the configured boundary from ADSB.fi.
 * @param {Object} boundary - { latMin, latMax, lonMin, lonMax }
 * @returns {Promise<Array>} Array of internal flight objects (altitudes in meters, velocity in m/s)
 */
export const fetchFlightsInBoundary = async (boundary) => {
  try {
    const center = getBoundaryCenter(boundary);
    const radiusNm = boundaryToRadius(boundary);

    const url = `/v2/lat/${center.latitude.toFixed(6)}/lon/${center.longitude.toFixed(6)}/dist/${radiusNm.toFixed(1)}`;
    const response = await client.get(url);

    if (!response.data || !response.data.ac) {
      return [];
    }

    return response.data.ac.map(mapAircraftToFlight);
  } catch (error) {
    console.error('Error fetching flights from ADSB.fi:', error);
    throw error;
  }
};
