import { useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useConfigStore } from '../store/configStore';
import { fetchFlightsInBoundary } from '../services/api/flightClient';
import { POLLING_INTERVAL, ACTIVE_POLLING_INTERVAL } from '../utils/constants';

/**
 * Core polling hook. Fetches flights from ADSB.fi at regular intervals
 * when isActive is true, and stops when false.
 *
 * Uses setInterval with refs so that dependency changes (boundary, store
 * actions) are picked up without restarting the interval timer.
 *
 * @param {boolean} isActive — whether to poll (controlled by useTimeWindow)
 */
export default function useFlightPolling(isActive) {
  const boundaryRef = useRef(useConfigStore.getState().boundary);
  const activeUntilRef = useRef(0);
  const intervalRef = useRef(null);
  const fetchingRef = useRef(false);

  // Keep boundaryRef in sync with the store.
  useEffect(() => {
    return useConfigStore.subscribe((s) => {
      boundaryRef.current = s.boundary;
    });
  }, []);

  useEffect(() => {
    const { setFlights, setLoading, updateFlightError, clearFlights } = useFlightStore.getState();

    if (!isActive) {
      clearFlights();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    const doFetch = async () => {
      const boundary = boundaryRef.current;
      if (!boundary || fetchingRef.current) return;

      fetchingRef.current = true;
      setLoading(true);
      try {
        const flights = await fetchFlightsInBoundary(boundary);
        setFlights(flights);
        if (flights.length > 0) {
          activeUntilRef.current = Date.now() + 1 * 60 * 1000;
        }
      } catch (error) {
        updateFlightError(error);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    // Immediate first fetch.
    doFetch();

    // Poll at the faster interval; the API client's own rate limiter
    // ensures we never actually hit ADSB.fi more often than MIN_INTERVAL_MS.
    const getInterval = () =>
      Date.now() < activeUntilRef.current ? ACTIVE_POLLING_INTERVAL : POLLING_INTERVAL;

    // Use a self-adjusting interval via recursive setTimeout.
    const schedule = () => {
      intervalRef.current = setTimeout(() => {
        doFetch().then(() => {
          if (isActive) schedule();
        });
      }, getInterval());
    };
    schedule();

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isActive]); // Only depends on isActive — boundary changes picked up via ref
}
