import { create } from 'zustand';
import { DEFAULT_BOUNDARY, ALTITUDE_THRESHOLD, ACTIVE_HOURS_START, ACTIVE_HOURS_END, DEFAULT_REPORT_EMAIL, DEFAULT_EMAIL_TEMPLATE } from '../utils/constants';
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
  skipAirportTypes: '',
  flightAwareApiKey: '',
  emailTemplate: DEFAULT_EMAIL_TEMPLATE,
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
      const skipAirportTypes = await getConfigValue('skipAirportTypes');
      const flightAwareApiKey = await getConfigValue('flightAwareApiKey');
      const emailTemplate = await getConfigValue('emailTemplate');

      // Migrate old rectangle boundary {latMin,latMax,lonMin,lonMax} → circle
      let resolvedBoundary = boundary || DEFAULT_BOUNDARY;
      if (resolvedBoundary.latMin != null && resolvedBoundary.centerLat == null) {
        // Use inscribed circle: radius = half the shorter dimension (N-S vs E-W)
        const R = 6371;
        const toRad = (d) => d * Math.PI / 180;
        const nsKm = R * toRad(resolvedBoundary.latMax - resolvedBoundary.latMin);
        const midLat = toRad((resolvedBoundary.latMin + resolvedBoundary.latMax) / 2);
        const ewKm = R * Math.cos(midLat) * toRad(resolvedBoundary.lonMax - resolvedBoundary.lonMin);
        resolvedBoundary = {
          centerLat: (resolvedBoundary.latMin + resolvedBoundary.latMax) / 2,
          centerLon: (resolvedBoundary.lonMin + resolvedBoundary.lonMax) / 2,
          radiusKm: Math.min(nsKm, ewKm) / 2,
        };
        // Persist the migrated boundary so this only happens once
        setConfigValue('boundary', resolvedBoundary).catch(() => {});
      }

      set({
        boundary: resolvedBoundary,
        altitudeThreshold: altitudeThreshold || ALTITUDE_THRESHOLD,
        activeHoursStart: activeHoursStart || ACTIVE_HOURS_START,
        activeHoursEnd: activeHoursEnd || ACTIVE_HOURS_END,
        reportEmail: reportEmail || DEFAULT_REPORT_EMAIL,
        airportFilter: airportFilter || '',
        skipAirportTypes: skipAirportTypes || '',
        flightAwareApiKey: flightAwareApiKey || '',
        emailTemplate: emailTemplate || DEFAULT_EMAIL_TEMPLATE,
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

  setSkipAirportTypes: async (types) => {
    try {
      await setConfigValue('skipAirportTypes', types);
      set({ skipAirportTypes: types, error: null });
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

  setEmailTemplate: async (template) => {
    try {
      await setConfigValue('emailTemplate', template);
      set({ emailTemplate: template, error: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setFlightAwareApiKey: async (key) => {
    try {
      await setConfigValue('flightAwareApiKey', key);
      set({ flightAwareApiKey: key, error: null });
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
