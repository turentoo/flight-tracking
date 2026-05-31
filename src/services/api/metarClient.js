import axios from 'axios';

const METAR_API_URL = '/metar-api';

const client = axios.create({
  baseURL: METAR_API_URL,
  timeout: 10000,
});

let cachedQnh = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes — METAR updates every 30-60 min

/**
 * Fetch current QNH (hPa) from METAR for a given station.
 * Caches for 30 minutes since METAR data updates infrequently.
 * @param {string} station - ICAO station code (default: EGLL for Heathrow, nearest to Radlett)
 * @returns {Promise<number|null>} QNH in hPa, or null if unavailable
 */
export const fetchRegionalQnh = async (station = 'EGLL') => {
  const now = Date.now();
  if (cachedQnh != null && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return cachedQnh;
  }

  try {
    const response = await client.get('', {
      params: { ids: station, format: 'json' },
    });

    const data = response.data;
    if (!data || !data.length) return cachedQnh;

    const metar = data[0];
    const altim = metar.altim;

    if (altim != null) {
      cachedQnh = altim;
      lastFetchTime = now;
      console.debug(`[metar] Regional QNH from ${station}: ${altim} hPa`);
      return cachedQnh;
    }

    return cachedQnh;
  } catch (error) {
    console.warn('[metar] Failed to fetch regional QNH:', error.message);
    return cachedQnh;
  }
};

/**
 * Get the currently cached QNH without making a network request.
 * @returns {number|null}
 */
export const getCachedQnh = () => cachedQnh;
