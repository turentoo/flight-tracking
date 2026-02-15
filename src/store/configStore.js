import { create } from 'zustand';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END, DEFAULT_REPORT_EMAIL } from '../utils/constants';
import supabase from '../services/storage/db';

const getConfigValue = async (key) => {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

const setConfigValue = async (key, value) => {
  const { error } = await supabase
    .from('config')
    .upsert({ key, value, updated_at: Date.now() }, { onConflict: 'key' });
  if (error) throw error;
};

export const useConfigStore = create((set) => ({
  boundary: DEFAULT_BOUNDARY,
  altitudeThreshold: ALTITUDE_THRESHOLD,
  activeHoursStart: ACTIVE_HOURS_START,
  activeHoursEnd: ACTIVE_HOURS_END,
  reportEmail: DEFAULT_REPORT_EMAIL,
  airportFilter: '',
  airportElevation: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const boundary = await getConfigValue('boundary');
      const altitudeThreshold = await getConfigValue('altitudeThreshold');
      const activeHoursStart = await getConfigValue('activeHoursStart');
      const activeHoursEnd = await getConfigValue('activeHoursEnd');
      const airportElevation = await getConfigValue('airportElevation');
      const reportEmail = await getConfigValue('reportEmail');
      const airportFilter = await getConfigValue('airportFilter');

      set({
        boundary: boundary || DEFAULT_BOUNDARY,
        altitudeThreshold: altitudeThreshold || ALTITUDE_THRESHOLD,
        activeHoursStart: activeHoursStart || ACTIVE_HOURS_START,
        activeHoursEnd: activeHoursEnd || ACTIVE_HOURS_END,
        reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
        airportFilter: airportFilter || '',
        airportElevation: airportElevation || null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  setBoundary: async (boundary) => {
    try {
      await setConfigValue('boundary', boundary);
      set({ boundary, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setAltitudeThreshold: async (threshold) => {
    try {
      await setConfigValue('altitudeThreshold', threshold);
      set({ altitudeThreshold: threshold, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setActiveHours: async (start, end) => {
    try {
      await setConfigValue('activeHoursStart', start);
      await setConfigValue('activeHoursEnd', end);
      set({ activeHoursStart: start, activeHoursEnd: end, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setAirportFilter: async (filter) => {
    try {
      await setConfigValue('airportFilter', filter);
      set({ airportFilter: filter, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setReportEmail: async (email) => {
    try {
      await setConfigValue('reportEmail', email);
      set({ reportEmail: email, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setAirportElevation: async (elevation) => {
    try {
      await setConfigValue('airportElevation', elevation);
      set({ airportElevation: elevation, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },
}));
