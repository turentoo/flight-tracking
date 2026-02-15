import { create } from 'zustand';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END } from '../utils/constants';
import db from '../services/storage/db';

export const useConfigStore = create((set) => ({
  boundary: DEFAULT_BOUNDARY,
  altitudeThreshold: ALTITUDE_THRESHOLD,
  activeHoursStart: ACTIVE_HOURS_START,
  activeHoursEnd: ACTIVE_HOURS_END,
  airportElevation: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const boundary = await db.config.get('boundary');
      const altitudeThreshold = await db.config.get('altitudeThreshold');
      const activeHoursStart = await db.config.get('activeHoursStart');
      const activeHoursEnd = await db.config.get('activeHoursEnd');
      const airportElevation = await db.config.get('airportElevation');

      set({
        boundary: boundary?.value || DEFAULT_BOUNDARY,
        altitudeThreshold: altitudeThreshold?.value || ALTITUDE_THRESHOLD,
        activeHoursStart: activeHoursStart?.value || ACTIVE_HOURS_START,
        activeHoursEnd: activeHoursEnd?.value || ACTIVE_HOURS_END,
        airportElevation: airportElevation?.value || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  setBoundary: async (boundary) => {
    try {
      await db.config.put({ key: 'boundary', value: boundary, updatedAt: Date.now() });
      set({ boundary, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setAltitudeThreshold: async (threshold) => {
    try {
      await db.config.put({ key: 'altitudeThreshold', value: threshold, updatedAt: Date.now() });
      set({ altitudeThreshold: threshold, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setActiveHours: async (start, end) => {
    try {
      await db.config.put({ key: 'activeHoursStart', value: start, updatedAt: Date.now() });
      await db.config.put({ key: 'activeHoursEnd', value: end, updatedAt: Date.now() });
      set({ activeHoursStart: start, activeHoursEnd: end, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setAirportElevation: async (elevation) => {
    try {
      await db.config.put({ key: 'airportElevation', value: elevation, updatedAt: Date.now() });
      set({ airportElevation: elevation, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },
}));
