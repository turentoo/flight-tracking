import { supabase } from './supabase.js';

const toRow = (breach) => ({
  timestamp: breach.timestamp,
  date: breach.date,
  hour: breach.hour,
  callsign: breach.callsign,
  altitude: breach.altitude,
  agl: breach.agl,
  latitude: breach.latitude,
  longitude: breach.longitude,
  velocity: breach.velocity,
  heading: breach.heading,
  icao24: breach.icao24,
  departure_airport: breach.departureAirport || null,
  aircraft_type: breach.aircraftType || null,
  nav_qnh: breach.navQnh ?? null,
  corrected_altitude: breach.correctedAltitude ?? null,
  height_above_aerodrome: breach.heightAboveAerodrome ?? null,
});

export const addBreach = async (breach) => {
  const { data, error } = await supabase
    .from('breaches')
    .insert(toRow(breach))
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getLastBreachForKey = async (key) => {
  const { data, error } = await supabase
    .from('last_breaches')
    .select('*')
    .eq('callsign_altitude_key', key)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    callsignAltitudeKey: data.callsign_altitude_key,
    lastRecordedAt: data.last_recorded_at,
    latitude: data.latitude,
    longitude: data.longitude,
  };
};

export const updateLastBreach = async (key, lastRecordedAt, latitude, longitude) => {
  const { error } = await supabase
    .from('last_breaches')
    .upsert(
      { callsign_altitude_key: key, last_recorded_at: lastRecordedAt, latitude, longitude },
      { onConflict: 'callsign_altitude_key' },
    );
  if (error) throw error;
};

export const updateBreachDepartureAirport = async (id, airportCode) => {
  const { error } = await supabase
    .from('breaches')
    .update({ departure_airport: airportCode })
    .eq('id', id);
  if (error) throw error;
};
