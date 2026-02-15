import supabase from './db';
import { formatDate } from '../../utils/timeHelpers';

/**
 * Map a JS camelCase breach object to Supabase snake_case columns
 */
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
});

/**
 * Add a breach record to the database
 */
export const addBreach = async (breach) => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .insert(toRow(breach))
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding breach:', error);
    throw error;
  }
};

/**
 * Get all breaches
 */
export const getAllBreaches = async () => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('*');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching all breaches:', error);
    throw error;
  }
};

/**
 * Get breaches for a specific date (YYYY-MM-DD)
 */
export const getBreachesForDate = async (date) => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('*')
      .eq('date', date);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching breaches for date:', error);
    throw error;
  }
};

/**
 * Get breaches for a specific hour on a specific date
 */
export const getBreachesForHour = async (date, hour) => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('*')
      .eq('date', date)
      .eq('hour', hour);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching breaches for hour:', error);
    throw error;
  }
};

/**
 * Get breaches for current hour
 */
export const getBreachesForCurrentHour = async () => {
  try {
    const now = new Date();
    const date = formatDate(now);
    const hour = now.getHours();
    return await getBreachesForHour(date, hour);
  } catch (error) {
    console.error('Error fetching breaches for current hour:', error);
    throw error;
  }
};

/**
 * Get breaches within a date range
 */
export const getBreachesInRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching breaches in range:', error);
    throw error;
  }
};

/**
 * Get breaches by callsign
 */
export const getBreachesByCallsign = async (callsign) => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('*')
      .eq('callsign', callsign);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching breaches by callsign:', error);
    throw error;
  }
};

/**
 * Get breach count by date
 */
export const getBreachCountByDate = async () => {
  try {
    const { data, error } = await supabase
      .from('breaches')
      .select('date');
    if (error) throw error;
    const countByDate = {};
    data.forEach((row) => {
      countByDate[row.date] = (countByDate[row.date] || 0) + 1;
    });
    return countByDate;
  } catch (error) {
    console.error('Error getting breach count by date:', error);
    throw error;
  }
};

/**
 * Get breach count by date and hour
 */
export const getBreachCountByHour = async (date) => {
  try {
    const breaches = await getBreachesForDate(date);
    const countByHour = {};
    for (let i = 0; i < 24; i++) {
      countByHour[i] = 0;
    }
    breaches.forEach((breach) => {
      countByHour[breach.hour] = (countByHour[breach.hour] || 0) + 1;
    });
    return countByHour;
  } catch (error) {
    console.error('Error getting breach count by hour:', error);
    throw error;
  }
};

/**
 * Check if a breach already exists (for duplicate prevention)
 */
export const getLastBreachForKey = async (key) => {
  try {
    const { data, error } = await supabase
      .from('last_breaches')
      .select('*')
      .eq('callsign_altitude_key', key)
      .maybeSingle();
    if (error) throw error;
    // Map snake_case back to camelCase for callers
    if (data) {
      return {
        id: data.id,
        callsignAltitudeKey: data.callsign_altitude_key,
        lastRecordedAt: data.last_recorded_at,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching last breach:', error);
    throw error;
  }
};

/**
 * Update or add last breach record (for duplicate prevention)
 */
export const updateLastBreach = async (key, lastRecordedAt, latitude, longitude) => {
  try {
    const { data, error } = await supabase
      .from('last_breaches')
      .upsert(
        {
          callsign_altitude_key: key,
          last_recorded_at: lastRecordedAt,
          latitude,
          longitude,
        },
        { onConflict: 'callsign_altitude_key' }
      )
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error updating last breach:', error);
    throw error;
  }
};

/**
 * Delete all breaches (reset database)
 */
export const deleteAllBreaches = async () => {
  try {
    const { error } = await supabase
      .from('breaches')
      .delete()
      .neq('id', 0);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting all breaches:', error);
    throw error;
  }
};

/**
 * Get breaches for a specific month (year: number, month: 1-12)
 */
export const getBreachesForMonth = async (year, month) => {
  try {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('breaches')
      .select('*')
      .like('date', `${monthStr}%`)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching breaches for month:', error);
    throw error;
  }
};

/**
 * Get monthly breach stats for the last N months.
 * Returns { months: [{ year, month, label, count }], avg, max, total, min }
 */
export const getMonthlyStats = async (numMonths = 6) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('default', { month: 'short' }),
      });
    }

    const counts = [];
    for (const m of months) {
      const monthStr = `${m.year}-${String(m.month).padStart(2, '0')}`;
      const { count, error } = await supabase
        .from('breaches')
        .select('*', { count: 'exact', head: true })
        .like('date', `${monthStr}%`);
      if (error) throw error;
      counts.push(count);
      m.count = count;
    }

    const total = counts.reduce((s, c) => s + c, 0);
    const nonZero = counts.filter((c) => c > 0);
    const avg = nonZero.length > 0 ? Math.round(total / nonZero.length) : 0;
    const max = counts.length > 0 ? Math.max(...counts) : 0;
    const min = nonZero.length > 0 ? Math.min(...nonZero) : 0;

    return { months, avg, max, total, min };
  } catch (error) {
    console.error('Error computing monthly stats:', error);
    throw error;
  }
};

/**
 * Delete breaches older than N days
 */
export const deleteBreachesOlderThan = async (days) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = formatDate(cutoffDate);

    const { error } = await supabase
      .from('breaches')
      .delete()
      .lt('date', cutoffDateStr);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting old breaches:', error);
    throw error;
  }
};
