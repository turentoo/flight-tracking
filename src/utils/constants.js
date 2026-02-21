// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// API Configuration
export const ADSB_FI_API_URL = import.meta.env.VITE_ADSB_FI_API_URL || 'https://opendata.adsb.fi/api';
export const OURAIRPORTS_API_URL = import.meta.env.VITE_OURAIRPORTS_API_URL;

// FlightAware AeroAPI Configuration
export const FLIGHTAWARE_API_URL = import.meta.env.VITE_FLIGHTAWARE_API_URL || 'https://aeroapi.flightaware.com/aeroapi';

// Polling Configuration
export const POLLING_INTERVAL = parseInt(import.meta.env.VITE_POLLING_INTERVAL || '30000', 10);
export const ACTIVE_POLLING_INTERVAL = parseInt(import.meta.env.VITE_ACTIVE_POLLING_INTERVAL || '30000', 10);

// Altitude & Breach Configuration
export const ALTITUDE_THRESHOLD = parseInt(import.meta.env.VITE_ALTITUDE_THRESHOLD || '1300', 10);

// Operating Hours (24-hour format)
export const ACTIVE_HOURS_START = parseInt(import.meta.env.VITE_ACTIVE_HOURS_START || '9', 10);
export const ACTIVE_HOURS_END = parseInt(import.meta.env.VITE_ACTIVE_HOURS_END || '19', 10);

// Default Boundary (Radlett area)
export const DEFAULT_BOUNDARY = {
  latMin: parseFloat(import.meta.env.VITE_DEFAULT_BOUNDARY_LAT_MIN || '51.666476'),
  latMax: parseFloat(import.meta.env.VITE_DEFAULT_BOUNDARY_LAT_MAX || '51.692979'),
  lonMin: parseFloat(import.meta.env.VITE_DEFAULT_BOUNDARY_LON_MIN || '-0.351682'),
  lonMax: parseFloat(import.meta.env.VITE_DEFAULT_BOUNDARY_LON_MAX || '-0.277525'),
};

// Default report email recipient
export const DEFAULT_REPORT_EMAIL = 'your@email.com';

// Radlett Aerodrome ICAO code (for elevation lookup)
export const REFERENCE_AIRPORT_ICAO = 'EGTR';

// Default email template for noise complaint reports
export const DEFAULT_EMAIL_TEMPLATE = `Hello,

I am writing to formally log a complaint regarding a flight [flight_number] operating out of your aerodrome at [timestamp].

Based on data from flight tracking, the aircraft in question was flying over Radlett at an altitude of [altitude]ft, which is [delta_altitude]ft below the mandatory [threshold]ft requirement outlined in your noise abatement procedures for circuits to the north.

This caused considerable noise disturbance at my property at your address.

Given that your previous response indicated confidence that procedures were being followed, I request a formal investigation into this specific flight to understand why it failed to adhere to the required altitude restriction.

I look forward to your response regarding this matter.
Best wishes,
Your Name
your address`;

// Duplicate prevention window (ms) — 24 hours, so a callsign is recorded at most once per day
export const DUPLICATE_PREVENTION_WINDOW = 86400000;

// Date format for storage
export const DATE_FORMAT = 'yyyy-MM-dd';
