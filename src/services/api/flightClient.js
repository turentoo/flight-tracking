import axios from 'axios';
import { ADSB_FI_API_URL } from '../../utils/constants';
import { getBoundaryCenter, calculateDistance } from '../calculations/boundaryChecker';

// In dev, Vite proxies /adsb-api → https://opendata.adsb.fi/api to avoid CORS.
// In production, hit the real URL directly (served from same origin or a CORS-friendly proxy).
const baseURL = import.meta.env.DEV ? '/adsb-api' : ADSB_FI_API_URL;

const client = axios.create({
  baseURL,
  timeout: 10000,
});

// Rate-limit: never hit the API more often than MIN_INTERVAL_MS.
// On 429, apply exponential backoff (doubles each consecutive 429, resets on success).
let lastFetchTime = 0;
let lastResult = null;
let backoffUntil = 0;
let consecutiveRateLimits = 0;
const MIN_INTERVAL_MS = 10000;
const BASE_BACKOFF_MS = 60000; // 1 minute initial backoff on 429

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
    aircraftType: ac.t ?? null,
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
  const now = Date.now();

  // Still in backoff period — return cached result silently.
  if (now < backoffUntil) {
    return lastResult ?? [];
  }

  // Respect minimum interval between requests.
  if (lastResult !== null && (now - lastFetchTime) < MIN_INTERVAL_MS) {
    return lastResult;
  }

  try {
    const center = getBoundaryCenter(boundary);
    const radiusNm = boundaryToRadius(boundary);

    const url = `/v2/lat/${center.latitude.toFixed(6)}/lon/${center.longitude.toFixed(6)}/dist/${radiusNm.toFixed(1)}`;
    const response = await client.get(url);

    consecutiveRateLimits = 0;
    lastFetchTime = Date.now();

    const aircraft = response.data?.aircraft ?? response.data?.ac;
    if (!aircraft) {
      lastResult = [];
      return lastResult;
    }

    lastResult = aircraft.map(mapAircraftToFlight);
    return lastResult;
  } catch (error) {
    if (error.response?.status === 429) {
      consecutiveRateLimits++;
      const wait = BASE_BACKOFF_MS * Math.pow(2, consecutiveRateLimits - 1);
      backoffUntil = Date.now() + wait;
      console.warn(`ADSB.fi rate limited — backing off ${wait / 1000}s`);
      return lastResult ?? [];
    }
    console.error('Error fetching flights from ADSB.fi:', error);
    throw error;
  }
};
