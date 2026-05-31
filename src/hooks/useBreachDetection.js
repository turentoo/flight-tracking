import { useEffect, useRef, useCallback } from 'react';
import { useFlightStore } from '../store/flightStore';
import { useConfigStore } from '../store/configStore';
import { useBreachStore } from '../store/breachStore';
import { calculateAGL, isBelowThreshold, calculateCorrectedAltitude, calculateHeightAboveAerodrome } from '../services/calculations/aglCalculator';
import { isWithinBoundary } from '../services/calculations/boundaryChecker';
import { addBreach, getLastBreachForKey, updateLastBreach, getRecentBreaches, updateBreachDepartureAirport } from '../services/storage/breachRepository';
import { fetchDepartureAirport } from '../services/api/flightAwareClient';
import { fetchRegionalQnh, getCachedQnh } from '../services/api/metarClient';
import { formatCallsign } from '../utils/formatters';
import { getCurrentDate, getCurrentHour } from '../utils/timeHelpers';
import { DUPLICATE_PREVENTION_WINDOW, TRACKER_TTL, TRACKER_MAX_POSITIONS } from '../utils/constants';

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
  const flightAwareApiKey = useConfigStore((s) => s.flightAwareApiKey);
  const { addBreach: addBreachToStore, setCurrentHourBreaches, updateBreachAirport } = useBreachStore();

  // Track the last-processed update so we don't re-scan the same data.
  const lastProcessedRef = useRef(null);
  // Prevent concurrent detection runs (e.g. React StrictMode double-mount).
  const detectingRef = useRef(false);
  // Track most recent new-breach timestamp for the alert banner.
  const latestBreachRef = useRef(null);
  // Callback the parent can read to get the latest breach (for banner).
  const onBreachRef = useRef(null);
  // Cross-poll flight tracker — persists across polls, keyed by icao24.
  // Each entry: { icao24, callsign, aircraftType, lastSeen, breachRecorded, positions: [{lat, lon, altMeters, onGround, inBoundary, timestamp}] }
  const flightTrackerRef = useRef(new Map());

  const refreshCurrentHour = useCallback(async () => {
    try {
      const breaches = await getRecentBreaches();
      setCurrentHourBreaches(breaches);
    } catch (err) {
      console.error('Failed to refresh recent breaches:', err);
    }
  }, [setCurrentHourBreaches]);

  // Fetch regional QNH from METAR on mount and every 30 minutes.
  // Used as fallback when aircraft don't broadcast their own QNH.
  useEffect(() => {
    if (!isActive) return;
    fetchRegionalQnh();
    const id = setInterval(fetchRegionalQnh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [isActive]);

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
      if (detectingRef.current) return;
      detectingRef.current = true;
      const now = Date.now();
      const date = getCurrentDate();
      const hour = getCurrentHour();
      let newBreachCount = 0;
      const processedCallsigns = new Set();
      const tracker = flightTrackerRef.current;
      console.debug(`[breach] Detection run — ${flights.length} flights to evaluate`);

      // --- Phase 1: Update tracker with all flights from this poll ---
      for (const flight of flights) {
        if (!flight.icao24) continue;

        const altMeters = flight.barometricAltitude ?? flight.geometricAltitude;
        const inBoundary = isWithinBoundary(flight.latitude, flight.longitude, boundary);

        let entry = tracker.get(flight.icao24);
        if (!entry) {
          entry = {
            icao24: flight.icao24,
            callsign: flight.callsign,
            aircraftType: flight.aircraftType,
            lastSeen: now,
            breachRecorded: false,
            positions: [],
          };
          tracker.set(flight.icao24, entry);
        }

        // Update mutable fields (callsign can appear/change between polls).
        entry.callsign = flight.callsign || entry.callsign;
        entry.aircraftType = flight.aircraftType || entry.aircraftType;
        entry.lastSeen = now;

        // Append position (cap at TRACKER_MAX_POSITIONS).
        entry.positions.push({
          lat: flight.latitude,
          lon: flight.longitude,
          altMeters,
          navQnh: flight.navQnh,
          onGround: flight.onGround,
          inBoundary,
          velocity: flight.velocity,
          heading: flight.trueTrack,
          timestamp: now,
        });
        if (entry.positions.length > TRACKER_MAX_POSITIONS) {
          entry.positions.shift();
        }
      }

      // --- Phase 2: Evaluate breaches from tracked flights ---
      // Re-read the current boundary to avoid evaluating against a stale value.
      const currentBoundary = useConfigStore.getState().boundary;
      for (const [, entry] of tracker) {
        // Skip if already recorded a breach for this flight in this tracking session.
        if (entry.breachRecorded) continue;

        // Re-check each position against the current boundary (not the stored flag).
        const inBoundaryPositions = entry.positions.filter(
          (p) => !p.onGround && p.altMeters != null && isWithinBoundary(p.lat, p.lon, currentBoundary)
        );
        if (inBoundaryPositions.length === 0) continue;

        // Find the lowest altitude among in-boundary positions.
        let lowestPos = inBoundaryPositions[0];
        for (let i = 1; i < inBoundaryPositions.length; i++) {
          if (inBoundaryPositions[i].altMeters < lowestPos.altMeters) {
            lowestPos = inBoundaryPositions[i];
          }
        }

        const altFeet = lowestPos.altMeters * M_TO_FT;
        const cs = entry.callsign || 'UNKNOWN';

        // QNH resolution: prefer aircraft's own QNH, then any recent position's
        // QNH, then regional METAR QNH as final fallback.
        let navQnh = lowestPos.navQnh;
        if (navQnh == null) {
          for (let i = entry.positions.length - 1; i >= 0; i--) {
            if (entry.positions[i].navQnh != null) {
              navQnh = entry.positions[i].navQnh;
              break;
            }
          }
        }
        if (navQnh == null) {
          navQnh = getCachedQnh();
        }
        const correctedAltFt = calculateCorrectedAltitude(altFeet, navQnh);
        const heightAboveAerodrome = calculateHeightAboveAerodrome(correctedAltFt, groundElevation);
        const isBreach = heightAboveAerodrome != null
          ? isBelowThreshold(heightAboveAerodrome, altitudeThreshold)
          : isBelowThreshold(altFeet, altitudeThreshold + (groundElevation || 0));

        if (!isBreach) {
          const altLabel = heightAboveAerodrome != null
            ? `${Math.round(heightAboveAerodrome)}ft QNH-corrected (baro ${Math.round(altFeet)}ft, QNH ${navQnh})`
            : `${Math.round(altFeet)}ft (no QNH available)`;
          console.debug(`[breach] ${cs}: tracked in boundary at ${altLabel} — above threshold (${altitudeThreshold}ft)`);
          continue;
        }

        const agl = calculateAGL(altFeet, groundElevation);
        if (heightAboveAerodrome != null) {
          console.debug(`[breach] ${cs}: BREACH CANDIDATE — ${Math.round(heightAboveAerodrome)}ft above aerodrome (QNH ${lowestPos.navQnh}, baro ${Math.round(altFeet)}ft, threshold ${altitudeThreshold}ft), tracked ${entry.positions.length} positions`);
        } else {
          console.debug(`[breach] ${cs}: BREACH CANDIDATE — ${Math.round(altFeet)}ft (no QNH, threshold ${altitudeThreshold}ft), tracked ${entry.positions.length} positions`);
        }

        // Duplicate prevention.
        const dedupKey = buildDedupKey(entry.callsign);

        if (processedCallsigns.has(dedupKey)) {
          console.debug(`[breach] ${cs}: skipped — already processed this run`);
          continue;
        }
        processedCallsigns.add(dedupKey);

        try {
          const last = await getLastBreachForKey(dedupKey);
          if (last && (now - last.lastRecordedAt) < DUPLICATE_PREVENTION_WINDOW) {
            console.debug(`[breach] ${cs}: skipped — duplicate (last recorded ${Math.round((now - last.lastRecordedAt) / 1000)}s ago)`);
            entry.breachRecorded = true; // Don't re-evaluate until TTL expires and entry is pruned.
            continue;
          }
        } catch {
          // If dedup lookup fails, still record the breach.
        }

        // Build the breach record using the lowest-altitude position.
        const breach = {
          timestamp: now,
          date,
          hour,
          callsign: formatCallsign(entry.callsign),
          altitude: Math.round(altFeet),
          agl: Math.round(agl),
          latitude: lowestPos.lat,
          longitude: lowestPos.lon,
          velocity: lowestPos.velocity,
          heading: lowestPos.heading,
          icao24: entry.icao24,
          aircraftType: entry.aircraftType,
          navQnh: navQnh ?? null,
          correctedAltitude: correctedAltFt != null ? Math.round(correctedAltFt) : null,
          heightAboveAerodrome: heightAboveAerodrome != null ? Math.round(heightAboveAerodrome) : null,
        };

        try {
          const saved = await addBreach(breach);
          addBreachToStore(saved);
          await updateLastBreach(dedupKey, now, lowestPos.lat, lowestPos.lon);
          latestBreachRef.current = saved;
          entry.breachRecorded = true;
          newBreachCount++;
          console.debug(`[breach] ${cs}: RECORDED — ${Math.round(altFeet)}ft at ${lowestPos.lat?.toFixed(4)},${lowestPos.lon?.toFixed(4)}`);

          if (onBreachRef.current) onBreachRef.current(saved);

          // Enrich with departure airport from FlightAware (skip for configured aircraft types).
          const skipTypes = skipAirportTypes
            ? skipAirportTypes.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
            : [];
          const shouldSkip = entry.aircraftType && skipTypes.includes(entry.aircraftType.toUpperCase());
          if (!shouldSkip) {
            try {
              const origin = await fetchDepartureAirport(entry.callsign, flightAwareApiKey);
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

      // --- Phase 3: Prune stale tracker entries ---
      for (const [key, entry] of tracker) {
        if (now - entry.lastSeen > TRACKER_TTL) {
          tracker.delete(key);
        }
      }

      // If any new breaches were recorded, refresh the current-hour list.
      if (newBreachCount > 0) {
        await refreshCurrentHour();
      }
      detectingRef.current = false;
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
    flightAwareApiKey,
    addBreachToStore,
    updateBreachAirport,
    refreshCurrentHour,
  ]);

  return {
    latestBreachRef,
    onBreachRef,
  };
}
