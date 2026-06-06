export const POLLING_INTERVAL_MS = parseInt(process.env.VITE_POLLING_INTERVAL || '30000', 10);
export const ACTIVE_POLLING_INTERVAL_MS = parseInt(process.env.VITE_ACTIVE_POLLING_INTERVAL || '20000', 10);
export const ALTITUDE_THRESHOLD_DEFAULT = parseInt(process.env.VITE_ALTITUDE_THRESHOLD || '1300', 10);
export const ACTIVE_HOURS_START_DEFAULT = parseInt(process.env.VITE_ACTIVE_HOURS_START || '9', 10);
export const ACTIVE_HOURS_END_DEFAULT = parseInt(process.env.VITE_ACTIVE_HOURS_END || '19', 10);

export const DEFAULT_BOUNDARY = {
  centerLat: parseFloat(process.env.VITE_DEFAULT_BOUNDARY_CENTER_LAT || '51.6797'),
  centerLon: parseFloat(process.env.VITE_DEFAULT_BOUNDARY_CENTER_LON || '-0.3146'),
  radiusKm: parseFloat(process.env.VITE_DEFAULT_BOUNDARY_RADIUS_KM || '1.47'),
};

export const ADSB_FI_API_URL = process.env.VITE_ADSB_FI_API_URL || 'https://opendata.adsb.fi/api';
export const FLIGHTAWARE_API_URL = process.env.VITE_FLIGHTAWARE_API_URL || 'https://aeroapi.flightaware.com/aeroapi';
export const METAR_API_URL = process.env.VITE_METAR_API_URL || 'https://aviationweather.gov/api/data/metar';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const QUERY_RADIUS_MULTIPLIER = 2.5;
export const TRACKER_TTL = 90_000;
export const TRACKER_MAX_POSITIONS = 10;
export const DUPLICATE_PREVENTION_WINDOW = 300_000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required env vars VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
}
