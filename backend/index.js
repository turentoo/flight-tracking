import { loadRuntimeConfig } from './lib/configRepository.js';
import { fetchFlightsInBoundary } from './lib/flightClient.js';
import { fetchRegionalQnh } from './lib/metarClient.js';
import { updateTracker, pruneTracker, evaluateBreaches } from './lib/breachDetector.js';
import { POLLING_INTERVAL_MS, ACTIVE_POLLING_INTERVAL_MS } from './lib/config.js';

let activeUntil = 0;
let metarFetchAt = 0;
let lastMonitoringState = null;
let lastTimeWindowState = null;
let stopping = false;

const METAR_REFRESH_MS = 30 * 60 * 1000;

const withinHours = (start, end) => {
  const hour = new Date().getHours();
  return hour >= start && hour < end;
};

const tick = async () => {
  const cfg = await loadRuntimeConfig();
  const inHours = withinHours(cfg.activeHoursStart, cfg.activeHoursEnd);

  if (cfg.monitoringEnabled !== lastMonitoringState) {
    console.log(`[ctl] monitoringEnabled=${cfg.monitoringEnabled}`);
    lastMonitoringState = cfg.monitoringEnabled;
  }
  if (inHours !== lastTimeWindowState) {
    console.log(`[ctl] withinHours=${inHours} (window ${cfg.activeHoursStart}-${cfg.activeHoursEnd})`);
    lastTimeWindowState = inHours;
  }

  if (!cfg.monitoringEnabled || !inHours) {
    return false;
  }

  if (Date.now() - metarFetchAt > METAR_REFRESH_MS) {
    await fetchRegionalQnh();
    metarFetchAt = Date.now();
  }

  let flights;
  try {
    flights = await fetchFlightsInBoundary(cfg.boundary);
  } catch (err) {
    console.error('[poll] adsb fetch failed:', err.message);
    return false;
  }

  updateTracker(flights, cfg.boundary);
  if (flights.length > 0) {
    activeUntil = Date.now() + 60_000;
  }

  await evaluateBreaches({
    boundary: cfg.boundary,
    altitudeThreshold: cfg.altitudeThreshold,
    groundElevation: cfg.airportElevation,
    skipAirportTypes: cfg.skipAirportTypes,
    flightAwareApiKey: cfg.flightAwareApiKey,
  });

  pruneTracker();
  return true;
};

const loop = async () => {
  while (!stopping) {
    let polled = false;
    try {
      polled = await tick();
    } catch (err) {
      console.error('[loop] tick failed:', err.message);
    }
    const interval = polled && Date.now() < activeUntil
      ? ACTIVE_POLLING_INTERVAL_MS
      : POLLING_INTERVAL_MS;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, shutting down');
  stopping = true;
  setTimeout(() => process.exit(0), 500);
});
process.on('SIGINT', () => {
  console.log('[worker] SIGINT received, shutting down');
  stopping = true;
  setTimeout(() => process.exit(0), 500);
});

console.log('[worker] flight-tracking backend starting');
console.log(`[worker] polling interval=${POLLING_INTERVAL_MS}ms (active=${ACTIVE_POLLING_INTERVAL_MS}ms)`);

loop().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
