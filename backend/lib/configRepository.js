import { supabase } from './supabase.js';
import {
  DEFAULT_BOUNDARY,
  ALTITUDE_THRESHOLD_DEFAULT,
  ACTIVE_HOURS_START_DEFAULT,
  ACTIVE_HOURS_END_DEFAULT,
} from './config.js';

const getConfigValue = async (key) => {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export const loadRuntimeConfig = async () => {
  const [
    boundary,
    altitudeThreshold,
    activeHoursStart,
    activeHoursEnd,
    airportElevation,
    skipAirportTypes,
    flightAwareApiKey,
    monitoringEnabled,
  ] = await Promise.all([
    getConfigValue('boundary'),
    getConfigValue('altitudeThreshold'),
    getConfigValue('activeHoursStart'),
    getConfigValue('activeHoursEnd'),
    getConfigValue('airportElevation'),
    getConfigValue('skipAirportTypes'),
    getConfigValue('flightAwareApiKey'),
    getConfigValue('monitoringEnabled'),
  ]);

  return {
    boundary: boundary || DEFAULT_BOUNDARY,
    altitudeThreshold: altitudeThreshold || ALTITUDE_THRESHOLD_DEFAULT,
    activeHoursStart: activeHoursStart ?? ACTIVE_HOURS_START_DEFAULT,
    activeHoursEnd: activeHoursEnd ?? ACTIVE_HOURS_END_DEFAULT,
    airportElevation: airportElevation || null,
    skipAirportTypes: skipAirportTypes || '',
    flightAwareApiKey: flightAwareApiKey || '',
    monitoringEnabled: monitoringEnabled === true,
  };
};
