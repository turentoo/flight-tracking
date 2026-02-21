-- Flight Tracking — Supabase schema
-- Run this in the Supabase SQL Editor to set up a new project.

-- 1. Breaches table — stores detected altitude breaches
CREATE TABLE IF NOT EXISTS breaches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp   BIGINT NOT NULL,                   -- epoch ms of detection
  date        TEXT NOT NULL,                      -- YYYY-MM-DD
  hour        INTEGER NOT NULL,                   -- 0-23
  callsign    TEXT NOT NULL,
  altitude    NUMERIC NOT NULL,                   -- barometric altitude in feet
  agl         NUMERIC NOT NULL,                   -- altitude above ground level in feet
  latitude    NUMERIC NOT NULL,
  longitude   NUMERIC NOT NULL,
  velocity    NUMERIC,                            -- m/s (nullable)
  heading     NUMERIC,                            -- degrees true track (nullable)
  icao24      TEXT,                               -- ICAO 24-bit hex address
  departure_airport TEXT,                         -- ICAO airport code from FlightAware
  aircraft_type     TEXT,                         -- ICAO type designator (e.g. P28A, C172)
  reported    BOOLEAN NOT NULL DEFAULT FALSE,     -- noise complaint filed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breaches_date      ON breaches (date);
CREATE INDEX IF NOT EXISTS idx_breaches_callsign  ON breaches (callsign);
CREATE INDEX IF NOT EXISTS idx_breaches_timestamp ON breaches (timestamp);

-- 2. Config table — key-value settings (boundary, threshold, hours, etc.)
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  BIGINT
);

-- 3. Last breaches table — duplicate prevention (one breach per callsign per 24h)
CREATE TABLE IF NOT EXISTS last_breaches (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  callsign_altitude_key  TEXT NOT NULL UNIQUE,    -- normalised callsign used as dedup key
  last_recorded_at       BIGINT NOT NULL,         -- epoch ms of last recorded breach
  latitude               NUMERIC,
  longitude              NUMERIC
);

-- 4. Row Level Security — permissive policies (single-user app)
ALTER TABLE breaches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on breaches"      ON breaches      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on config"        ON config        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on last_breaches" ON last_breaches FOR ALL USING (true) WITH CHECK (true);
