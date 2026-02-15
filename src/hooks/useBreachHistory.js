import { useState, useEffect, useCallback } from 'react';
import {
  getBreachCountByDate,
  getBreachesForDate,
  getBreachCountByHour,
  getBreachesForHour,
} from '../services/storage/breachRepository';

/**
 * Hook for loading historical breach data from IndexedDB.
 * Provides breach counts by date (for the calendar) and
 * drill-down loaders for day and hour views.
 */
export default function useBreachHistory() {
  const [countByDate, setCountByDate] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load the date→count map (used by CalendarView).
  const refreshDateCounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const counts = await getBreachCountByDate();
      setCountByDate(counts);
    } catch (err) {
      console.error('Failed to load breach counts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    refreshDateCounts();
  }, [refreshDateCounts]);

  // Fetch all breaches for a given date.
  const loadBreachesForDate = useCallback(async (date) => {
    return await getBreachesForDate(date);
  }, []);

  // Fetch hour→count map for a given date.
  const loadHourCountsForDate = useCallback(async (date) => {
    return await getBreachCountByHour(date);
  }, []);

  // Fetch breaches for a specific hour on a date.
  const loadBreachesForHour = useCallback(async (date, hour) => {
    return await getBreachesForHour(date, hour);
  }, []);

  return {
    countByDate,
    isLoading,
    refreshDateCounts,
    loadBreachesForDate,
    loadHourCountsForDate,
    loadBreachesForHour,
  };
}
