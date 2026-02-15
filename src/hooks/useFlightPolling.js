import { useEffect, useRef, useCallback } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useConfigStore } from '../store/configStore';
import { fetchFlightsInBoundary } from '../services/api/openskyClient';
import { POLLING_INTERVAL, ACTIVE_POLLING_INTERVAL } from '../utils/constants';

/**
 * Core polling hook. Fetches flights from OpenSky at regular intervals
 * when isActive is true, and stops when false.
 *
 * Implements adaptive polling:
 *  - Normal: POLLING_INTERVAL (60 s)
 *  - When flights detected in the last fetch: ACTIVE_POLLING_INTERVAL (20 s) for 5 min
 *
 * @param {boolean} isActive — whether to poll (controlled by useTimeWindow)
 */
export default function useFlightPolling(isActive) {
  const boundary = useConfigStore((s) => s.boundary);
  const { setFlights, setLoading, updateFlightError, clearFlights } = useFlightStore();

  // Track adaptive-polling state across renders without re-triggering the effect.
  const activeUntilRef = useRef(0);     // timestamp until which we use the faster interval
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchFlights = useCallback(async () => {
    if (!boundary) return;

    setLoading(true);
    try {
      const flights = await fetchFlightsInBoundary(boundary);
      if (!isMountedRef.current) return;

      setFlights(flights);

      // If flights are present, switch to the faster interval for 5 minutes.
      if (flights.length > 0) {
        activeUntilRef.current = Date.now() + 5 * 60 * 1000;
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      updateFlightError(error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [boundary, setFlights, setLoading, updateFlightError]);

  // Returns the interval to use for the *next* poll.
  const getInterval = useCallback(() => {
    return Date.now() < activeUntilRef.current ? ACTIVE_POLLING_INTERVAL : POLLING_INTERVAL;
  }, []);

  // Schedule the next poll after the current one completes.
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetchFlights();
      if (isMountedRef.current && isActive) scheduleNext();
    }, getInterval());
  }, [fetchFlights, getInterval, isActive]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isActive) {
      // Outside operating hours — clear data and stop.
      clearFlights();
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Kick off an immediate fetch, then start the schedule loop.
    (async () => {
      await fetchFlights();
      if (isMountedRef.current) scheduleNext();
    })();

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, fetchFlights, scheduleNext, clearFlights]);
}
