import db from './db';
import { formatDate } from '../../utils/timeHelpers';

/**
 * Add a breach record to the database
 */
export const addBreach = async (breach) => {
  try {
    const id = await db.breaches.add(breach);
    return { ...breach, id };
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
    return await db.breaches.toArray();
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
    return await db.breaches.where('date').equals(date).toArray();
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
    return await db.breaches
      .where('date').equals(date)
      .and((breach) => breach.hour === hour)
      .toArray();
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
    return await db.breaches
      .where('date').between(startDate, endDate, true, true)
      .toArray();
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
    return await db.breaches
      .where('callsign').equals(callsign)
      .toArray();
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
    const breaches = await getAllBreaches();
    const countByDate = {};
    breaches.forEach((breach) => {
      countByDate[breach.date] = (countByDate[breach.date] || 0) + 1;
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
    return await db.lastBreaches.where('callsignAltitudeKey').equals(key).first();
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
    const existing = await getLastBreachForKey(key);
    if (existing) {
      await db.lastBreaches.update(existing.id, {
        lastRecordedAt,
        latitude,
        longitude,
      });
      return existing.id;
    } else {
      return await db.lastBreaches.add({
        callsignAltitudeKey: key,
        lastRecordedAt,
        latitude,
        longitude,
      });
    }
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
    await db.breaches.clear();
  } catch (error) {
    console.error('Error deleting all breaches:', error);
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

    await db.breaches
      .where('date').below(cutoffDateStr)
      .delete();
  } catch (error) {
    console.error('Error deleting old breaches:', error);
    throw error;
  }
};
