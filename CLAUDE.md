# Flight Tracking

React application for monitoring low-altitude aircraft over Radlett, UK. Polls ADSB.fi API (free, community-run ADS-B aggregator), detects altitude breaches (<1300ft AGL), and provides dashboard views.

## Tech Stack

- **React 18.2** (JSX, not TypeScript)
- **Vite 5** (build tool and dev server)
- **Zustand** (state management)
- **Supabase** (`@supabase/supabase-js` — PostgreSQL cloud storage)
- **React Leaflet 4 + Leaflet** (map visualization)
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
│   │   └── ConfigPanel.jsx/css    — Configuration modal (boundary, threshold, hours)
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
│   │   └── ourAirportsClient.js    — OurAirports CSV data client (airport elevation)
│   ├── storage/
│   │   ├── db.js                   — Supabase client initialization
│   │   └── breachRepository.js     — Breach CRUD via Supabase (queries by date/hour/month, monthly stats)
│   └── calculations/
│       ├── aglCalculator.js        — AGL calculation and breach threshold check
│       └── boundaryChecker.js      — Point-in-rectangle check, Haversine distance
├── store/
│   ├── configStore.js      — Boundary, threshold, hours, airport elevation (persisted to Supabase)
│   ├── flightStore.js      — Current flights, count, loading/error state
│   ├── breachStore.js      — Breach records, current hour breaches
│   └── uiStore.js          — Active page, selected date/hour, modal visibility
└── utils/
    ├── constants.js        — Config from env vars, defaults, ICAO code, Supabase URL/key
    ├── timeHelpers.js      — Operating hours check, date formatting, hour ranges
    ├── formatters.js       — Altitude, velocity, heading, coordinate formatting
    └── exportCsv.js        — CSV export utility for breach data
```

## UI Layout

The app uses a **sidebar navigation layout** matching the Figma design:

- **Left sidebar** (212px): "Flight Tracking" logo, "Dashboards > Overview" and "Pages > Breach history" nav items
- **Top bar**: Breadcrumb (e.g. "Dashboards / Overview") + settings gear icon
- **Main content**: Scrollable area with light gray background

### Overview Page (default)
Two-column layout at top: main content (left) + Alert explorer (right, 280px sticky with left border).

1. Current hour bar chart (5-min intervals) with breach count legend
2. **Editable boundary mini map** — `L.Rectangle` with 8 draggable handles (4 corners + 4 edge midpoints) built with native Leaflet API (no leaflet-draw). Handles resize the rectangle on drag; boundary persists to Supabase via `configStore.setBoundary()` with 500ms debounce. Map has zoom/pan enabled. Pencil button opens ConfigPanel for manual coordinate entry. The `EditableBoundary` component lives inside `OverviewPage.jsx`; the main `FlightMap` uses a separate read-only `BoundaryOverlay`.
3. Breaches table (Flight number, Coordinates, Airport, Altitude, Timestamp) — rows are **clickable** to select a breach for the Alert explorer. Selected row highlighted with `--accent-light` background. Clicking again deselects.
4. **Alert explorer** (right column) — shows selected breach details: flight callsign, airport, timestamp, coordinates, a small Leaflet map with dashed blue border and marker at breach location, and altitude. SVG icons in purple-tinted rounded backgrounds. Empty state shown when no row selected.
5. "Past breaches" section with 6-month stat cards (Avg/Max/Total/Min per month)
6. Monthly bar chart (last 6 months)
7. Month/year selector dropdowns
8. Breaches-by-month table grouped by date headers

### Breach History Page
- Calendar grid with breach count badges
- Drill-down: Calendar → Day (hourly bars) → Hour (breach cards) → Breach detail modal

All tables and charts have **graceful empty states** when no data is present.

## Configuration

Environment variables in `.env.local`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable (anon) key
- `VITE_ADSB_FI_API_URL` — ADSB.fi API base URL (default: `https://opendata.adsb.fi/api`)
- `VITE_POLLING_INTERVAL` — Normal polling interval (60000ms)
- `VITE_ACTIVE_POLLING_INTERVAL` — Active polling interval (20000ms)
- `VITE_ALTITUDE_THRESHOLD` — Breach threshold in feet AGL (1300)
- `VITE_ACTIVE_HOURS_START` / `_END` — Operating hours (9-19)
- `VITE_DEFAULT_BOUNDARY_*` — Default Radlett boundary coordinates

User configuration is stored in Supabase and editable via the Settings panel (gear icon).

## Supabase Database

Storage uses Supabase PostgreSQL (no local IndexedDB). Three tables:

- **breaches** — Breach records (id, timestamp, date, hour, callsign, altitude, agl, latitude, longitude, velocity, heading, icao24, created_at). Indexed on date, callsign, timestamp.
- **config** — Key-value config (key TEXT PK, value JSONB, updated_at BIGINT). Stores boundary, altitudeThreshold, activeHoursStart, activeHoursEnd, airportElevation.
- **last_breaches** — Duplicate prevention (callsign_altitude_key UNIQUE, last_recorded_at, latitude, longitude).

RLS is enabled with permissive policies (single-user app). Column naming: snake_case in DB, camelCase mapping in `breachRepository.js`.

## Default Monitoring Boundary (Radlett)

- Lat: 51.666476 to 51.692979
- Lon: -0.351682 to -0.277525
- ~5.5km E-W × 2.9km N-S

## Key Concepts

- **AGL (Above Ground Level):** `barometric_altitude - ground_elevation`. Ground elevation fetched from OurAirports for Radlett Aerodrome (EGTR, ~300ft AMSL).
- **Breach:** Flight with AGL < 1300ft within the monitoring boundary during operating hours.
- **Duplicate prevention:** Same callsign+altitude combo not re-recorded within 60s.
- **Operating hours:** 9am–7pm local time. Polling stops outside this window.

## Theme & Design System

- **Inter font** (loaded from Google Fonts: 400, 500, 600, 700 weights)
- **Light theme by default** (`#F9F9FA` cards on `#f0f2f5` background)
- Dark mode via `prefers-color-scheme: dark` media query
- **Colors**: `--text-primary: #000000`, `--text-secondary: rgba(0,0,0,0.4)`, `--border-color: rgba(0,0,0,0.1)`
- **Border radius**: 20px for cards/stat cards, 12px for nav items/badges, 8px for icon backgrounds
- **Stat cards**: Flat colored backgrounds alternating `rgba(125,187,255,0.2)` (blue) and `rgba(184,153,235,0.2)` (purple), no left border
- **Chart palette**: `--chart-1: #6BE6D3` (teal), `--chart-2: #000000` (black), `--chart-3: #7DBBFF` (blue), `--chart-4: #B899EB` (purple), `--chart-5: #71DD8C` (green), `--chart-6: #A0BCE8` (light blue)
- **Tables**: 12px font, first data row highlighted with blue tint `rgba(125,187,255,0.2)`
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

## Design

Figma designs are in `screenshots/` as PNGs. A Figma MCP server is configured (via `claude mcp add`) for reading designs directly from Figma — do not hardcode or commit the Figma API token.
