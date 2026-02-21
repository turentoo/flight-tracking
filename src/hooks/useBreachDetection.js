import { useEffect, useRef, useCallback } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useConfigStore } from '../store/configStore';
import { useBreachStore } from '../store/breachStore';
import { calculateAGL, isAltitudeBreach } from '../services/calculations/aglCalculator';
import { isWithinBoundary } from '../services/calculations/boundaryChecker';
import { addBreach, getLastBreachForKey, updateLastBreach, getRecentBreaches, updateBreachDepartureAirport } from '../services/storage/breachRepository';
import { fetchDepartureAirport } from '../services/api/flightAwareClient';
import { formatCallsign } from '../utils/formatters';
import { getCurrentDate, getCurrentHour } from '../utils/timeHelpers';
import { DUPLICATE_PREVENTION_WINDOW } from '../utils/constants';

/**
 * Meters-to-feet conversion factor.
 * OpenSky returns altitudes in meters; we work in feet everywhere else.
 */
const M_TO_FT = 3.28084;

/**
 * Build a dedup key for a flight.
 * Keyed on callsign only — once an aircraft breaches, it is not
 * recorded again (within the duplicate-prevention window).
 */
const buildDedupKey = (callsign) => {
  return (callsign || 'UNKNOWN').trim().toUpperCase();
};

/**
 * Hook that watches the flight store for new data and evaluates
 * each flight against the breach criteria:
 *   1. Inside the monitoring boundary
 *   2. Not on the ground
 *   3. AGL < configured threshold
 *   4. Not a duplicate of a recent breach
 *
 * Detected breaches are persisted to IndexedDB and pushed into
 * the breach store so the UI reacts immediately.
 *
 * Also refreshes `currentHourBreaches` from IndexedDB each time
 * the hour rolls over or new breaches are recorded, keeping the
 * StatusBar badge accurate.
 *
 * @param {boolean} isActive — whether the system is within operating hours
 */
export default function useBreachDetection(isActive) {
  const flights = useFlightStore((s) => s.flights);
  const lastUpdated = useFlightStore((s) => s.lastUpdated);
  const boundary = useConfigStore((s) => s.boundary);
  const altitudeThreshold = useConfigStore((s) => s.altitudeThreshold);
  const groundElevation = useConfigStore((s) => s.airportElevation);
  const skipAirportTypes = useConfigStore((s) => s.skipAirportTypes);
  const { addBreach: addBreachToStore, setCurrentHourBreaches, updateBreachAirport } = useBreachStore();

  // Track the last-processed update so we don't re-scan the same data.
  const lastProcessedRef = useRef(null);
  // Track most recent new-breach timestamp for the alert banner.
  const latestBreachRef = useRef(null);
  // Callback the parent can read to get the latest breach (for banner).
  const onBreachRef = useRef(null);

  const refreshCurrentHour = useCallback(async () => {
    try {
      const breaches = await getRecentBreaches();
      setCurrentHourBreaches(breaches);
    } catch (err) {
      console.error('Failed to refresh recent breaches:', err);
    }
  }, [setCurrentHourBreaches]);

  // Refresh current-hour breaches on mount and every minute
  // (handles the hour rolling over).
  useEffect(() => {
    if (!isActive) return;
    refreshCurrentHour();
    const id = setInterval(refreshCurrentHour, 60_000);
    return () => clearInterval(id);
  }, [isActive, refreshCurrentHour]);

  // Main detection logic — runs whenever flights/lastUpdated changes.
  useEffect(() => {
    if (!isActive) return;
    if (!lastUpdated || lastUpdated === lastProcessedRef.current) return;
    lastProcessedRef.current = lastUpdated;

    const detectBreaches = async () => {
      const now = Date.now();
      const date = getCurrentDate();
      const hour = getCurrentHour();
      let newBreachCount = 0;
      const processedCallsigns = new Set();

      for (const flight of flights) {
        // Skip flights on the ground.
        if (flight.onGround) continue;

        // Must be inside the boundary.
        if (!isWithinBoundary(flight.latitude, flight.longitude, boundary)) continue;

        // Convert altitude from meters to feet.
        const altMeters = flight.barometricAltitude ?? flight.geometricAltitude;
        if (altMeters == null) continue;
        const altFeet = altMeters * M_TO_FT;

        // Calculate AGL.
        const agl = calculateAGL(altFeet, groundElevation);
        if (!isAltitudeBreach(agl, altitudeThreshold)) continue;

        // --- This flight is a breach candidate ---

        // Duplicate prevention.
        const dedupKey = buildDedupKey(flight.callsign);

        // Skip if already processed in this detection run (handles duplicate entries in a single API response).
        if (processedCallsigns.has(dedupKey)) continue;
        processedCallsigns.add(dedupKey);
        try {
          const last = await getLastBreachForKey(dedupKey);
          if (last && (now - last.lastRecordedAt) < DUPLICATE_PREVENTION_WINDOW) {
            continue; // Already recorded recently.
          }
        } catch {
          // If dedup lookup fails, still record the breach.
        }

        // Build the breach record.
        const breach = {
          timestamp: now,
          date,
          hour,
          callsign: formatCallsign(flight.callsign),
          altitude: Math.round(altFeet),
          agl: Math.round(agl),
          latitude: flight.latitude,
          longitude: flight.longitude,
          velocity: flight.velocity,
          heading: flight.trueTrack,
          icao24: flight.icao24,
          aircraftType: flight.aircraftType,
        };

        try {
          const saved = await addBreach(breach);
          addBreachToStore(saved);
          await updateLastBreach(dedupKey, now, flight.latitude, flight.longitude);
          latestBreachRef.current = saved;
          newBreachCount++;

          // Notify callback if registered.
          if (onBreachRef.current) onBreachRef.current(saved);

          // Enrich with departure airport from FlightAware (skip for configured aircraft types).
          const skipTypes = skipAirportTypes
            ? skipAirportTypes.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
            : [];
          const shouldSkip = flight.aircraftType && skipTypes.includes(flight.aircraftType.toUpperCase());
          if (!shouldSkip) {
            try {
              const origin = await fetchDepartureAirport(flight.callsign);
              if (origin) {
                await updateBreachDepartureAirport(saved.id, origin);
                updateBreachAirport(saved.id, origin);
              }
            } catch {
              // FlightAware failure — keep breach, airport stays unknown.
            }
          }
        } catch (err) {
          console.error('Failed to record breach:', err);
        }
      }

      // If any new breaches were recorded, refresh the current-hour list.
      if (newBreachCount > 0) {
        await refreshCurrentHour();
      }
    };

    detectBreaches();
  }, [
    isActive,
    flights,
    lastUpdated,
    boundary,
    altitudeThreshold,
    groundElevation,
    skipAirportTypes,
    addBreachToStore,
    updateBreachAirport,
    refreshCurrentHour,
  ]);

  return {
    latestBreachRef,
    onBreachRef,
  };
}
