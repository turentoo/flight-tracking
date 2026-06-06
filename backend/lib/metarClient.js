import axios from 'axios';
import { METAR_API_URL } from './config.js';

let cachedQnh = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000;

export const fetchRegionalQnh = async (station = 'EGLL') => {
  const now = Date.now();
  if (cachedQnh != null && (now - lastFetchTime) < CACHE_DURATION_MS) {
    return cachedQnh;
  }
  try {
    const response = await axios.get(METAR_API_URL, {
      params: { ids: station, format: 'json' },
      timeout: 10_000,
    });
    const data = response.data;
    if (!data?.length) return cachedQnh;
    const altim = data[0].altim;
    if (altim != null) {
      cachedQnh = altim;
      lastFetchTime = now;
      console.log(`[metar] regional QNH from ${station}: ${altim} hPa`);
    }
    return cachedQnh;
  } catch (error) {
    console.warn('[metar] fetch failed:', error.message);
    return cachedQnh;
  }
};

export const getCachedQnh = () => cachedQnh;
