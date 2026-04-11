// Helper to get config from runtime (window._env_) or build-time (import.meta.env)
const getEnv = (key, defaultValue) => {
  // Runtime config (from docker environment variables)
  if (typeof window !== 'undefined' && window._env_ && window._env_[key]) {
    return window._env_[key];
  }
  // Build-time config (for development)
  return import.meta.env[key] || defaultValue;
};

// Supabase Configuration
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

// API Configuration
export const ADSB_FI_API_URL = getEnv('VITE_ADSB_FI_API_URL', 'https://opendata.adsb.fi/api');
export const OURAIRPORTS_API_URL = getEnv('VITE_OURAIRPORTS_API_URL');

// FlightAware AeroAPI Configuration
export const FLIGHTAWARE_API_URL = getEnv('VITE_FLIGHTAWARE_API_URL', 'https://aeroapi.flightaware.com/aeroapi');

// Polling Configuration
export const POLLING_INTERVAL = parseInt(getEnv('VITE_POLLING_INTERVAL', '25000'), 10);
export const ACTIVE_POLLING_INTERVAL = parseInt(getEnv('VITE_ACTIVE_POLLING_INTERVAL', '10000'), 10);

// Altitude & Breach Configuration
export const ALTITUDE_THRESHOLD = parseInt(getEnv('VITE_ALTITUDE_THRESHOLD', '1300'), 10);

// Operating Hours (24-hour format)
export const ACTIVE_HOURS_START = parseInt(getEnv('VITE_ACTIVE_HOURS_START', '9'), 10);
export const ACTIVE_HOURS_END = parseInt(getEnv('VITE_ACTIVE_HOURS_END', '19'), 10);

// Default Boundary (Radlett area — circle centered on approximate rectangle midpoint)
// Radius ~1.47km matches the inscribed circle of the original rectangle (~2.95km N-S)
export const DEFAULT_BOUNDARY = {
  centerLat: 51.6797,
  centerLon: -0.3146,
  radiusKm: 1.47,
};

// Default report email recipient (placeholder — set your own in Settings)
export const DEFAULT_REPORT_EMAIL = '';

// Radlett Aerodrome ICAO code (for elevation lookup)
export const REFERENCE_AIRPORT_ICAO = 'EGTR';

// Default email template for noise complaint reports (placeholder — customise in Settings)
export const DEFAULT_EMAIL_TEMPLATE = `Hello,

I am writing to formally log a complaint regarding a flight [flight_number] operating out of your aerodrome at [timestamp].

Based on flight tracking data, the aircraft was flying at an altitude of [altitude]ft, which is [delta_altitude]ft below the mandatory [threshold]ft requirement outlined in the noise abatement procedures.

The aircraft type was [aircraft_type], with QNH [nav_qnh] hPa and corrected altitude [corrected_altitude]ft ([height_above_aerodrome]ft above aerodrome). Coordinates: [coordinates].

I request a formal investigation into this specific flight.

Best wishes`;

// Duplicate prevention window (ms) — 5 minutes, so repeat circuit breaches are captured
export const DUPLICATE_PREVENTION_WINDOW = 300000;

// Cross-poll flight tracking
// Multiplier for API query radius vs boundary corner distance (2.5x catches planes ~4-5km out)
export const QUERY_RADIUS_MULTIPLIER = 2.5;
// How long to remember a flight after last seen (ms)
export const TRACKER_TTL = 90000;
// Max position history entries per tracked flight
export const TRACKER_MAX_POSITIONS = 10;

// Date format for storage
export const DATE_FORMAT = 'yyyy-MM-dd';
