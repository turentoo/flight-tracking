import axios from 'axios';
import { FLIGHTAWARE_API_URL, FLIGHTAWARE_API_KEY } from '../../utils/constants';

// In dev, Vite proxies /flightaware-api → https://aeroapi.flightaware.com/aeroapi to avoid CORS.
const baseURL = import.meta.env.DEV ? '/flightaware-api' : FLIGHTAWARE_API_URL;

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'x-apikey': FLIGHTAWARE_API_KEY,
  },
});

// Rate limit: FlightAware Personal plan = 10 req/min → 6s minimum between requests.
let lastFetchTime = 0;
const MIN_INTERVAL_MS = 6000;

/**
 * Fetch the departure airport for a flight by its callsign.
 * Queries FlightAware AeroAPI GET /flights/{callsign} and returns
 * the ICAO origin airport code (e.g. "EGTR") or null.
 *
 * @param {string} callsign — flight callsign (e.g. "BAW123")
 * @returns {Promise<string|null>} ICAO airport code or null
 */
export const fetchDepartureAirport = async (callsign) => {
  if (!FLIGHTAWARE_API_KEY) {
    console.warn('FlightAware API key not configured — skipping departure airport lookup');
    return null;
  }

  if (!callsign) return null;

  // Respect minimum interval between requests.
  const now = Date.now();
  const elapsed = now - lastFetchTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }

  try {
    lastFetchTime = Date.now();
    const response = await client.get(`/flights/${encodeURIComponent(callsign.trim())}`);
    const flights = response.data?.flights;
    if (!flights || flights.length === 0) return null;

    // Find the most recent flight with an origin
    for (const flight of flights) {
      const origin = flight.origin?.code_icao || flight.origin?.code;
      if (origin) return origin;
    }

    return null;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('FlightAware rate limited');
    } else {
      console.error('Error fetching departure airport from FlightAware:', error);
    }
    return null;
  }
};
