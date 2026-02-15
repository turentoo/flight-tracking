import Dexie from 'dexie';

export const db = new Dexie('FlightTrackingDB');

db.version(1).stores({
  breaches: '++id, timestamp, date, hour, callsign',
  config: 'key',
  lastBreaches: '++id, callsignAltitudeKey',
});

/**
 * Breach object structure:
 * {
 *   id: number (auto-increment),
 *   timestamp: number (unix timestamp in ms),
 *   date: string (YYYY-MM-DD),
 *   hour: number (0-23),
 *   callsign: string,
 *   altitude: number (feet, barometric),
 *   agl: number (feet, Above Ground Level),
 *   latitude: number,
 *   longitude: number,
 *   velocity: number (m/s),
 *   heading: number (degrees, 0-359),
 *   icao24: string (aircraft ICAO hex ID),
 * }
 */

/**
 * Config object structure:
 * {
 *   key: string (config key like 'boundary', 'airportElevation', etc),
 *   value: any (configuration value),
 *   updatedAt: number (timestamp),
 * }
 */

/**
 * LastBreach object for duplicate prevention:
 * {
 *   id: number (auto-increment),
 *   callsignAltitudeKey: string (e.g., "BA285-2500"),
 *   lastRecordedAt: number (timestamp),
 *   latitude: number,
 *   longitude: number,
 * }
 */

export default db;
