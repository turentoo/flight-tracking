import axios from 'axios';
import { FLIGHTAWARE_API_URL } from './config.js';

let lastFetchTime = 0;
const MIN_INTERVAL_MS = 6000;

export const fetchDepartureAirport = async (callsign, apiKey) => {
  if (!apiKey || !callsign) return null;

  const now = Date.now();
  const elapsed = now - lastFetchTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }

  try {
    lastFetchTime = Date.now();
    const response = await axios.get(
      `${FLIGHTAWARE_API_URL}/flights/${encodeURIComponent(callsign.trim())}`,
      { timeout: 15_000, headers: { 'x-apikey': apiKey } },
    );
    const flights = response.data?.flights;
    if (!flights?.length) return null;

    for (const flight of flights) {
      const origin = flight.origin?.code_icao || flight.origin?.code;
      if (origin) return origin;
    }
    return null;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('[flightaware] rate limited');
    } else {
      console.warn('[flightaware] lookup failed:', error.message);
    }
    return null;
  }
};
