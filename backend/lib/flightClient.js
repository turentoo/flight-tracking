import axios from 'axios';
import { ADSB_FI_API_URL, QUERY_RADIUS_MULTIPLIER } from './config.js';
import { getBoundaryCenter } from './calc.js';

const client = axios.create({ baseURL: ADSB_FI_API_URL, timeout: 10_000 });

let lastFetchTime = 0;
let lastResult = null;
let backoffUntil = 0;
let consecutiveRateLimits = 0;
const MIN_INTERVAL_MS = 10_000;
const BASE_BACKOFF_MS = 15_000;

const FT_TO_M = 1 / 3.28084;
const KT_TO_MS = 0.514444;
const FPM_TO_MS = 1 / 196.85;
const KM_TO_NM = 0.539957;

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
    aircraftType: ac.t ?? null,
    navQnh: ac.nav_qnh ?? null,
  };
};

const boundaryToRadius = (boundary) => boundary.radiusKm * KM_TO_NM * QUERY_RADIUS_MULTIPLIER;

export const fetchFlightsInBoundary = async (boundary) => {
  const now = Date.now();
  if (now < backoffUntil) return lastResult ?? [];
  if ((now - lastFetchTime) < MIN_INTERVAL_MS) return lastResult ?? [];

  try {
    const center = getBoundaryCenter(boundary);
    const radiusNm = boundaryToRadius(boundary);
    const url = `/v2/lat/${center.latitude.toFixed(6)}/lon/${center.longitude.toFixed(6)}/dist/${radiusNm.toFixed(1)}`;
    const response = await client.get(url);

    consecutiveRateLimits = 0;
    lastFetchTime = Date.now();

    const aircraft = response.data?.aircraft ?? response.data?.ac;
    lastResult = aircraft ? aircraft.map(mapAircraftToFlight) : [];
    return lastResult;
  } catch (error) {
    if (error.response?.status === 429) {
      consecutiveRateLimits++;
      const wait = BASE_BACKOFF_MS * Math.pow(2, consecutiveRateLimits - 1);
      backoffUntil = Date.now() + wait;
      console.warn(`[adsb] rate limited — backing off ${wait / 1000}s`);
      return lastResult ?? [];
    }
    console.error('[adsb] fetch failed:', error.message);
    throw error;
  }
};
