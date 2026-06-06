import {
  calculateAGL,
  calculateCorrectedAltitude,
  calculateHeightAboveAerodrome,
  isBelowThreshold,
  isWithinBoundary,
  formatCallsign,
  getCurrentDate,
  getCurrentHour,
} from './calc.js';
import { addBreach, getLastBreachForKey, updateLastBreach, updateBreachDepartureAirport } from './breachRepository.js';
import { fetchDepartureAirport } from './flightAwareClient.js';
import { getCachedQnh } from './metarClient.js';
import { DUPLICATE_PREVENTION_WINDOW, TRACKER_TTL, TRACKER_MAX_POSITIONS } from './config.js';

const M_TO_FT = 3.28084;

const buildDedupKey = (callsign) => (callsign || 'UNKNOWN').trim().toUpperCase();

const flightTracker = new Map();

export const updateTracker = (flights, boundary) => {
  const now = Date.now();
  for (const flight of flights) {
    if (!flight.icao24) continue;
    const altMeters = flight.barometricAltitude ?? flight.geometricAltitude;
    const inBoundary = isWithinBoundary(flight.latitude, flight.longitude, boundary);

    let entry = flightTracker.get(flight.icao24);
    if (!entry) {
      entry = {
        icao24: flight.icao24,
        callsign: flight.callsign,
        aircraftType: flight.aircraftType,
        lastSeen: now,
        breachRecorded: false,
        positions: [],
      };
      flightTracker.set(flight.icao24, entry);
    }

    entry.callsign = flight.callsign || entry.callsign;
    entry.aircraftType = flight.aircraftType || entry.aircraftType;
    entry.lastSeen = now;

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
};

export const pruneTracker = () => {
  const now = Date.now();
  for (const [key, entry] of flightTracker) {
    if (now - entry.lastSeen > TRACKER_TTL) {
      flightTracker.delete(key);
    }
  }
};

export const evaluateBreaches = async ({ boundary, altitudeThreshold, groundElevation, skipAirportTypes, flightAwareApiKey }) => {
  const now = Date.now();
  const date = getCurrentDate();
  const hour = getCurrentHour();
  const processedCallsigns = new Set();
  const newBreaches = [];

  for (const [, entry] of flightTracker) {
    if (entry.breachRecorded) continue;

    const inBoundaryPositions = entry.positions.filter(
      (p) => !p.onGround && p.altMeters != null && isWithinBoundary(p.lat, p.lon, boundary),
    );
    if (inBoundaryPositions.length === 0) continue;

    let lowestPos = inBoundaryPositions[0];
    for (let i = 1; i < inBoundaryPositions.length; i++) {
      if (inBoundaryPositions[i].altMeters < lowestPos.altMeters) {
        lowestPos = inBoundaryPositions[i];
      }
    }

    const altFeet = lowestPos.altMeters * M_TO_FT;
    const cs = entry.callsign || 'UNKNOWN';

    let navQnh = lowestPos.navQnh;
    if (navQnh == null) {
      for (let i = entry.positions.length - 1; i >= 0; i--) {
        if (entry.positions[i].navQnh != null) {
          navQnh = entry.positions[i].navQnh;
          break;
        }
      }
    }
    if (navQnh == null) navQnh = getCachedQnh();

    const correctedAltFt = calculateCorrectedAltitude(altFeet, navQnh);
    const heightAboveAerodrome = calculateHeightAboveAerodrome(correctedAltFt, groundElevation);
    const breach = heightAboveAerodrome != null
      ? isBelowThreshold(heightAboveAerodrome, altitudeThreshold)
      : isBelowThreshold(altFeet, altitudeThreshold + (groundElevation || 0));

    if (!breach) continue;

    const dedupKey = buildDedupKey(entry.callsign);
    if (processedCallsigns.has(dedupKey)) continue;
    processedCallsigns.add(dedupKey);

    try {
      const last = await getLastBreachForKey(dedupKey);
      if (last && (now - last.lastRecordedAt) < DUPLICATE_PREVENTION_WINDOW) {
        console.log(`[breach] ${cs}: skipped (duplicate, ${Math.round((now - last.lastRecordedAt) / 1000)}s ago)`);
        entry.breachRecorded = true;
        continue;
      }
    } catch {
      // Continue and try to record anyway.
    }

    const agl = calculateAGL(altFeet, groundElevation);
    const breachRecord = {
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
      const saved = await addBreach(breachRecord);
      await updateLastBreach(dedupKey, now, lowestPos.lat, lowestPos.lon);
      entry.breachRecorded = true;
      newBreaches.push(saved);
      console.log(`[breach] ${cs}: RECORDED altitude=${Math.round(altFeet)}ft height_above_aerodrome=${heightAboveAerodrome != null ? Math.round(heightAboveAerodrome) + 'ft' : 'n/a'} threshold=${altitudeThreshold}ft`);

      const skipTypes = skipAirportTypes
        ? skipAirportTypes.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
        : [];
      const shouldSkip = entry.aircraftType && skipTypes.includes(entry.aircraftType.toUpperCase());
      if (!shouldSkip) {
        const origin = await fetchDepartureAirport(entry.callsign, flightAwareApiKey);
        if (origin) {
          await updateBreachDepartureAirport(saved.id, origin);
          console.log(`[breach] ${cs}: enriched with origin=${origin}`);
        }
      }
    } catch (err) {
      console.error(`[breach] ${cs}: failed to record:`, err.message);
    }
  }

  return newBreaches;
};
