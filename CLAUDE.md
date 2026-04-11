# Flight Tracking

React application for monitoring low-altitude aircraft over Radlett, UK. Polls ADSB.fi API (free, community-run ADS-B aggregator), detects altitude breaches using QNH-corrected altitude when available, and provides dashboard views.

## Tech Stack

- **React 18.2** (JSX, not TypeScript)
- **Vite 5** (build tool and dev server)
- **Zustand** (state management)
- **Supabase** (`@supabase/supabase-js` — PostgreSQL cloud storage)
- **React Leaflet 4 + Leaflet** (map visualization, CartoDB Dark Matter tiles)
- **Recharts** (charts — bar charts for current hour and monthly overview)
- **date-fns** (date/time utilities)
- **Axios** (HTTP client)
- **ESLint 8** with eslint-plugin-react
- **CSS3** with CSS variables (light theme default, dark via media query)
- ES modules (`"type": "module"` in package.json)

## Commands

- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — Lint .js and .jsx files with ESLint

## Project Structure

```
src/
├── main.jsx                — Entry point, renders <App /> into #root
├── App.jsx                 — App shell: Sidebar + TopBar + page routing + config modal
├── App.css                 — App layout styles (sidebar + main area)
├── index.css               — Global styles, CSS variables, light/dark theme
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx/css        — Left navigation sidebar (Overview, Breach history)
│   │   ├── TopBar.jsx/css         — Breadcrumb bar + settings gear icon
│   │   ├── Header.jsx/css         — [Legacy] App title bar (replaced by TopBar)
│   │   ├── StatusBar.jsx/css      — [Legacy] Monitoring status bar (replaced by TopBar)
│   │   └── TabNavigation.jsx/css  — [Legacy] Tab switcher (replaced by Sidebar)
│   ├── pages/
│   │   ├── OverviewPage.jsx/css   — Main dashboard: current hour chart, breach table,
│   │   │                            6-month stats, monthly chart, breaches-by-month table
│   │   └── BreachHistoryPage.jsx/css — Calendar drill-down history page
│   ├── config/
│   │   └── ConfigPanel.jsx/css    — Configuration modal with two views: settings (boundary, threshold, airport, skip types, hours, FlightAware key, report email) and email template editor
│   ├── map/
│   │   ├── FlightMap.jsx/css      — Interactive Leaflet map with flights and boundary
│   │   ├── FlightMarker.jsx       — Rotated aircraft icon with popup
│   │   └── BoundaryOverlay.jsx    — Dashed rectangle for monitoring area
│   ├── current/
│   │   ├── CurrentHourPanel.jsx/css — [Legacy] Standalone current hour view
│   │   ├── BreachCard.jsx/css       — Individual breach display card
│   │   └── BreachAlertBanner.jsx/css — Red toast notification on new breaches
│   ├── history/
│   │   ├── HistoryView.jsx/css      — [Legacy] Standalone drill-down orchestrator
│   │   ├── CalendarView.jsx/css     — Monthly grid with breach count badges
│   │   ├── DayDetailView.jsx/css    — Hourly bar chart for a date
│   │   ├── HourDetailView.jsx/css   — Breach card list for an hour
│   │   └── BreachDetailModal.jsx/css — Full breach detail modal
│   └── shared/
│       ├── EmptyState.jsx/css       — Reusable empty state (icon + title + description)
│       └── ErrorBoundary.jsx/css    — App-wide error boundary with retry
├── hooks/
│   ├── useFlightPolling.js          — Adaptive API polling engine
│   ├── useBreachDetection.js        — Breach evaluation + persistence
│   ├── useTimeWindow.js             — Operating hours awareness
│   └── useBreachHistory.js          — Historical data loading from Supabase
├── services/
│   ├── api/
│   │   ├── flightClient.js          — ADSB.fi API client (no auth required)
│   │   ├── flightAwareClient.js     — FlightAware AeroAPI client (departure airport lookup)
│   │   └── ourAirportsClient.js    — OurAirports CSV data client (airport elevation)
│   ├── storage/
│   │   ├── db.js                   — Supabase client initialization
│   │   └── breachRepository.js     — Breach CRUD via Supabase (queries by date/hour/month/recent 60min, monthly stats)
│   └── calculations/
│       ├── aglCalculator.js        — AGL calculation, QNH altitude correction, breach threshold check
│       └── boundaryChecker.js      — Point-in-rectangle check, Haversine distance
├── store/
│   ├── configStore.js      — Boundary, threshold, hours, airport filter, skip airport types, FlightAware API key, email template, report email, airport elevation (persisted to Supabase)
│   ├── flightStore.js      — Current flights, count, loading/error state
│   ├── breachStore.js      — Breach records, current hour breaches
│   └── uiStore.js          — Active page, selected date/hour, modal visibility
└── utils/
    ├── constants.js        — Config from env vars, defaults, ICAO code, Supabase URL/key
    ├── timeHelpers.js      — Operating hours check, date formatting, hour ranges
    ├── formatters.js       — Altitude, velocity, heading, coordinate formatting
    └── exportCsv.js        — CSV export utility for breach data
supabase/
└── schema.sql              — Database setup script (CREATE TABLE, indexes, RLS policies)
```

## UI Layout

The app uses a **sidebar navigation layout** matching the Figma design:

- **Left sidebar** (212px): "Flight Tracking" logo, "Dashboards > Overview" and "Pages > Breach history" nav items
- **Top bar**: Breadcrumb (e.g. "Dashboards / Overview") + settings gear icon
- **Main content**: Scrollable area with light gray background

### Overview Page (default)
Two-column layout at top: main content (left) + Alert explorer (right, 280px sticky with left border).

1. **Past 60 minutes** bar chart (12 bars at 5-min intervals, snapped to clean :00/:05/:10 boundaries) with breach count legend. Data loaded via `getRecentBreaches()` which queries `timestamp >= now - 60min` from Supabase.
2. **Editable boundary mini map** — `L.Rectangle` with 8 draggable handles (4 corners + 4 edge midpoints) built with native Leaflet API (no leaflet-draw). Handles resize the rectangle on drag; boundary persists to Supabase via `configStore.setBoundary()` with 500ms debounce. Map has zoom/pan enabled. Pencil button opens ConfigPanel for manual coordinate entry. The `EditableBoundary` component lives inside `OverviewPage.jsx`; the main `FlightMap` uses a separate read-only `BoundaryOverlay`.
3. Breaches table (Flight number, Type, Airport, Baro alt ft, QNH hPa, Corrected alt ft, Severity, Timestamp, Status) — Airport column shows `departure_airport` from FlightAware (or "Unknown" if not available). Type column shows ICAO aircraft type code from ADSB.fi (or "N/A"). "Baro alt" shows raw barometric altitude. "QNH" shows the `nav_qnh` pressure setting from ADSB.fi (or "N/A"). "Corrected alt" shows QNH-corrected height above aerodrome (or "N/A" when QNH unavailable). **Severity** column shows a colored dot indicating the gap between the altitude threshold and the corrected altitude (falling back to baro): yellow (<=50ft), orange (51–100ft), red (>100ft); tooltip shows exact gap. Rows are **clickable** to select a breach for the Alert explorer. Selected row highlighted with `--accent-light` background (applied at `td` level to override any other row styles). Clicking again deselects. Selection is shared across all tables (current hour + monthly). Status column shows a colored pill badge based on `breach.status`: red "New", green "Reported", or grey "Dismissed". Tables are filterable by status via segmented buttons (All / New / Reported / Dismissed).
4. **Alert explorer** (right column) — shows selected breach details: flight callsign, airport, timestamp, coordinates, a small Leaflet map with dashed blue border and marker at breach location, barometric altitude, QNH, and corrected altitude (height above aerodrome). SVG icons in purple-tinted rounded backgrounds. Empty state shown when no row selected. **Status selector** provides 3 inline buttons (New / Reported / Dismissed) to change breach status via `setBreachStatus()` in `breachRepository.js`. Active button has matching status color (rose for new, green for reported, slate for dismissed). Status updates optimistically (UI updates immediately, persists to Supabase async). `breachStore.updateBreachStatus()` updates the store; a `statusUpdates` map in `OverviewPage` propagates changes to `MonthlyBreachesTable`'s local state. **Report button** below the status selector opens a `mailto:` link with pre-filled noise complaint email; hidden when status is "reported". Built via `buildReportMailto()` in `OverviewPage.jsx`. **Delete alert** button (spaced well below Report to prevent accidental clicks) removes the breach from Supabase and both tables (current hour via store, monthly via `deletedIds` Set). All three buttons share consistent sizing (8px 12px padding, 12px font, 8px radius).
5. "Past breaches" section with 6-month stat cards (Avg/Max/Total/Min per month)
6. Monthly bar chart (last 6 months)
7. Month/year selector dropdowns + **airport toggle** (right-aligned in the same row). Toggle label is the configured airport code (default "EGTR", editable in Settings). When on, the breaches-by-month table is filtered to only show rows where `departure_airport` matches the configured airport.
8. Breaches-by-month table grouped by date headers, paginated (20 per page, Previous/Next controls). **Status filter** (All / New / Reported / Dismissed segmented buttons) inline with the card title filters displayed breaches by status.

### Breach History Page
- Calendar grid with breach count badges
- Drill-down: Calendar → Day (hourly bars) → Hour (breach cards) → Breach detail modal

All tables and charts have **graceful empty states** when no data is present.

## Configuration

Environment variables in `.env.local` (not committed to git — each user provides their own):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable (anon) key
- `VITE_ADSB_FI_API_URL` — ADSB.fi API base URL (default: `https://opendata.adsb.fi/api`)
- `VITE_FLIGHTAWARE_API_URL` — FlightAware AeroAPI base URL (default: `https://aeroapi.flightaware.com/aeroapi`)
- `VITE_POLLING_INTERVAL` — Polling interval (30000ms default)
- `VITE_ALTITUDE_THRESHOLD` — Breach threshold in feet (1300)
- `VITE_ACTIVE_HOURS_START` / `_END` — Operating hours (9-19)
- `VITE_DEFAULT_BOUNDARY_*` — Default Radlett boundary coordinates

User configuration is stored in Supabase and editable via the Settings panel (gear icon). The ConfigPanel modal has two views:
- **Settings view**: "Monitoring boundary" (4 coordinate inputs in 2-column grid), "Flight parameters" (altitude threshold + airport code in row, skip airport types), "Monitoring hours" (start/end hour in row), "FlightAware API" (API key, password-masked), report email (full-width), "Edit email template" link, and "Save configuration" button.
- **Email template view**: Clickable placeholder pills (`[flight_number]`, `[timestamp]`, `[threshold]`, `[altitude]`, `[delta_altitude]`, `[coordinates]`, `[aircraft_type]`, `[nav_qnh]`, `[corrected_altitude]`, `[height_above_aerodrome]`) that insert at cursor position, freetext textarea for the email body, "Back to settings" link. Template is persisted to Supabase and used by the Report button's `mailto:` link.

Airport defaults to "EGTR" and is used as the label/filter value for the airport toggle on the monthly breaches table. FlightAware API key is stored in Supabase config (not env var) so each user provides their own via the UI. Report email is configured per user via the Settings UI.

## Supabase Database

Storage uses Supabase PostgreSQL (no local IndexedDB). Three tables:

- **breaches** — Breach records (id, timestamp, date, hour, callsign, altitude, agl, latitude, longitude, velocity, heading, icao24, status, departure_airport, aircraft_type, nav_qnh, corrected_altitude, height_above_aerodrome, created_at). `status` is TEXT DEFAULT 'new' — breach lifecycle state: 'new' (unreviewed), 'reported' (noise complaint filed), 'dismissed' (ignored). `departure_airport` is TEXT — ICAO code of the departure airport, populated via FlightAware AeroAPI after each breach is saved. `aircraft_type` is TEXT — ICAO type code (e.g. P28A, R22, C172) from ADSB.fi `ac.t` field. `nav_qnh` is NUMERIC — QNH pressure setting in hPa from ADSB.fi `ac.nav_qnh`. `corrected_altitude` is NUMERIC — QNH-corrected altitude AMSL in feet. `height_above_aerodrome` is NUMERIC — corrected altitude minus aerodrome elevation in feet. Indexed on date, callsign, timestamp.
- **config** — Key-value config (key TEXT PK, value JSONB, updated_at BIGINT). Stores boundary, altitudeThreshold, activeHoursStart, activeHoursEnd, reportEmail, airportFilter, skipAirportTypes, flightAwareApiKey, emailTemplate, airportElevation.
- **last_breaches** — Duplicate prevention (callsign_altitude_key UNIQUE, last_recorded_at, latitude, longitude).

RLS is enabled with permissive policies (single-user app). Column naming: snake_case in DB, camelCase mapping in `breachRepository.js`.

## Default Monitoring Boundary (Radlett)

- Lat: 51.666476 to 51.692979
- Lon: -0.351682 to -0.277525
- ~5.5km E-W × 2.9km N-S

## Key Concepts

- **AGL (Above Ground Level):** `barometric_altitude - ground_elevation`. Ground elevation fetched from OurAirports for Radlett Aerodrome (EGTR, ~300ft AMSL). Stored on breach records for reference only.
- **QNH altitude correction:** When ADSB.fi provides `nav_qnh` (aircraft QNH pressure setting), barometric altitude is corrected to true altitude AMSL: `corrected = baro_alt + ((nav_qnh - 1013.25) × 27)`. Height above aerodrome is then `corrected_altitude - airportElevation`. Computed in `aglCalculator.js` via `calculateCorrectedAltitude()` and `calculateHeightAboveAerodrome()`.
- **Breach:** The altitude threshold is treated as QFE (height above aerodrome). When QNH is available: breach fires when `height_above_aerodrome < threshold`. When QNH is unavailable: fallback compares `baro_altitude < threshold + airportElevation` to approximate the same check. Default threshold is 1300ft. Flight must be within the monitoring boundary during operating hours.
- **Duplicate prevention:** Three layers — (1) `detectingRef` mutex prevents concurrent detection runs (React StrictMode safe), (2) in-memory `processedCallsigns` Set per detection run deduplicates multiple entries for the same aircraft in a single ADSB.fi response, (3) `last_breaches` Supabase table prevents the same callsign from being re-recorded within 5 minutes (allows capturing repeat circuit breaches).
- **Operating hours:** 9am–7pm local time. Polling stops outside this window.
- **Debug logging:** `console.debug` messages in breach detection show skip reasons (on ground, no altitude, above threshold, duplicate) and recorded breaches. Visible in browser console with Verbose/All log level enabled.

## Theme & Design System

- **Inter font** (loaded from Google Fonts: 400, 500, 600, 700 weights)
- **Light theme by default** (`#F9F9FA` cards on `#f0f2f5` background)
- Dark mode via `prefers-color-scheme: dark` media query
- **Colors**: `--text-primary: #000000`, `--text-secondary: rgba(0,0,0,0.4)`, `--border-color: rgba(0,0,0,0.1)`
- **Border radius**: 20px for cards/stat cards, 12px for nav items/badges, 8px for icon backgrounds
- **Stat cards**: Flat colored backgrounds alternating `rgba(125,187,255,0.2)` (blue) and `rgba(184,153,235,0.2)` (purple), no left border
- **Chart palette**: `--chart-1: #6BE6D3` (teal), `--chart-2: #000000` (black), `--chart-3: #7DBBFF` (blue), `--chart-4: #B899EB` (purple), `--chart-5: #71DD8C` (green), `--chart-6: #A0BCE8` (light blue)
- **Tables**: 12px font, no automatic first-row highlight (selection-only highlighting via `breach-row-selected`)
- **Font sizes**: 12px (tables, labels), 14px (section headers, nav items, stat labels), 24px (stat values)
- CSS variables: `--bg-primary`, `--bg-card`, `--bg-secondary`, `--text-primary`, `--accent`, `--chart-1` through `--chart-6`, `--stat-card-blue/purple`

## Conventions

- Functional components with hooks (useState, useEffect, useMemo, useCallback)
- File extensions: `.jsx` for React components, `.js` for plain JS
- CSS files co-located with components (ComponentName.css)
- Light theme by default with `prefers-color-scheme: dark` media query support
- Zustand stores in `src/store/`, one per domain
- Services organized by concern: `api/`, `storage/`, `calculations/`
- Pages in `src/components/pages/`, layout in `src/components/layout/`
- Reusable shared components in `src/components/shared/`

## ADSB.fi Integration

- **API**: `https://opendata.adsb.fi/api` (free, no auth required)
- **Endpoint**: `/v2/lat/{lat}/lon/{lon}/dist/{nm}` — queries by center + radius in nautical miles
- **CORS**: In dev, Vite proxies `/adsb-api` → `https://opendata.adsb.fi/api` (configured in `vite.config.js`)
- **Rate limiting**: Client-side 10s minimum between requests; exponential backoff on 429 (15s base, doubling). Rate limit state persisted across Vite HMR reloads.
- **Polling**: 30s normal interval, 20s active interval (when flights detected, for 5 min). Uses refs-based polling hook (StrictMode safe, no timer restarts on re-renders)
- **Unit conversion**: `flightClient.js` converts ADSB.fi units (feet, knots, ft/min) → internal units (meters, m/s) so downstream code (breach detection, FlightMarker) is unchanged
- **Aircraft type**: `ac.t` field provides ICAO type designator (e.g. P28A, C172, R22), mapped to `aircraftType` and stored on breach records
- **QNH**: `ac.nav_qnh` field provides the QNH pressure setting in hPa, mapped to `navQnh` and used for altitude correction
- **Response field**: v2 API returns aircraft in `response.data.aircraft` (not `.ac`)

## FlightAware AeroAPI Integration

- **API**: `https://aeroapi.flightaware.com/aeroapi` (requires API key)
- **Endpoint**: `GET /flights/{callsign}` — returns flight details including origin airport
- **Auth**: `x-apikey` header with key from Supabase config (`flightAwareApiKey`), entered via Settings UI
- **CORS**: In dev, Vite proxies `/flightaware-api` → `https://aeroapi.flightaware.com/aeroapi`
- **Rate limiting**: Client-side 6s minimum between requests (Personal plan = 10 req/min)
- **Flow**: Breach saved → call FlightAware → update `departure_airport` with origin ICAO code / on failure: keep breach with null airport (displays as "Unknown")
- **Skip types**: Configurable comma-separated list of ICAO aircraft type codes (e.g. "R22, P28A") in Settings. Flights matching these types skip the FlightAware lookup entirely (airport stays unknown). Useful for aircraft types where FlightAware data is unreliable.
- **Client**: `flightAwareClient.js` follows same pattern as `flightClient.js`

## New Project Setup

1. Create a Supabase project
2. Run `supabase/schema.sql` in the Supabase SQL Editor (creates tables, indexes, RLS policies)
3. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. `npm install && npm run dev`
5. Open Settings in the app and enter your FlightAware API key

## Design

Figma designs are in `screenshots/` as PNGs. A Figma MCP server is configured (via `claude mcp add`) for reading designs directly from Figma — do not hardcode or commit the Figma API token.
