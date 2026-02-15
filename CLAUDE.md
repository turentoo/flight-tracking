# Flight Tracking

React application for monitoring low-altitude aircraft over Radlett, UK. Polls OpenSky Network API, detects altitude breaches (<1300ft AGL), and provides dashboard views.

## Tech Stack

- **React 18.2** (JSX, not TypeScript)
- **Vite 5** (build tool and dev server)
- **Zustand** (state management)
- **Dexie.js** (IndexedDB wrapper for persistent storage)
- **React Leaflet 4 + Leaflet** (map visualization)
- **Recharts** (charts)
- **date-fns** (date/time utilities)
- **Axios** (HTTP client)
- **ESLint 8** with eslint-plugin-react
- **CSS3** with CSS variables (dark/light theme, no preprocessor)
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
├── App.jsx                 — Main app shell with layout, tabs, config modal
├── App.css                 — App layout styles
├── index.css               — Global styles, CSS variables, dark/light theme
├── components/
│   ├── layout/
│   │   ├── Header.jsx/css          — App title bar + settings button
│   │   ├── StatusBar.jsx/css       — Monitoring status, flight count, breach count, errors
│   │   └── TabNavigation.jsx/css   — Tab switcher (Map / Current Hour / History)
│   ├── config/
│   │   └── ConfigPanel.jsx/css     — Configuration modal (boundary, threshold, hours)
│   ├── map/
│   │   ├── FlightMap.jsx/css       — Interactive Leaflet map with flights and boundary
│   │   ├── FlightMarker.jsx        — Rotated aircraft icon with popup
│   │   └── BoundaryOverlay.jsx     — Dashed rectangle for monitoring area
│   ├── current/
│   │   ├── CurrentHourPanel.jsx/css — Real-time breaches for the current hour
│   │   ├── BreachCard.jsx/css       — Individual breach display card
│   │   └── BreachAlertBanner.jsx/css — Red toast notification on new breaches
│   ├── history/
│   │   ├── HistoryView.jsx/css      — Drill-down orchestrator (calendar → day → hour)
│   │   ├── CalendarView.jsx/css     — Monthly grid with breach count badges
│   │   ├── DayDetailView.jsx/css    — Hourly bar chart for a date
│   │   ├── HourDetailView.jsx/css   — Breach card list for an hour
│   │   └── BreachDetailModal.jsx/css — Full breach detail modal
│   └── shared/
│       └── ErrorBoundary.jsx/css    — App-wide error boundary with retry
├── hooks/
│   ├── useFlightPolling.js          — Adaptive API polling engine
│   ├── useBreachDetection.js        — Breach evaluation + persistence
│   ├── useTimeWindow.js             — Operating hours awareness
│   └── useBreachHistory.js          — Historical data loading from IndexedDB
├── services/
│   ├── api/
│   │   ├── openskyClient.js        — OpenSky Network API client (fetch flights in boundary)
│   │   └── ourAirportsClient.js    — OurAirports CSV data client (airport elevation)
│   ├── storage/
│   │   ├── db.js                   — Dexie database schema (breaches, config, lastBreaches)
│   │   └── breachRepository.js     — Breach CRUD operations, queries by date/hour/callsign
│   └── calculations/
│       ├── aglCalculator.js        — AGL calculation and breach threshold check
│       └── boundaryChecker.js      — Point-in-rectangle check, Haversine distance
├── store/
│   ├── configStore.js      — Boundary, threshold, hours, airport elevation (persisted to IndexedDB)
│   ├── flightStore.js      — Current flights, count, loading/error state
│   ├── breachStore.js      — Breach records, current hour breaches
│   └── uiStore.js          — Active tab, selected date/hour, modal visibility
└── utils/
    ├── constants.js        — Config from env vars, defaults, ICAO code
    ├── timeHelpers.js      — Operating hours check, date formatting, hour ranges
    └── formatters.js       — Altitude, velocity, heading, coordinate formatting
```

## Configuration

Environment variables in `.env.local`:
- `VITE_OPENSKY_API_URL` — OpenSky API base URL
- `VITE_POLLING_INTERVAL` — Normal polling interval (60000ms)
- `VITE_ACTIVE_POLLING_INTERVAL` — Active polling interval (20000ms)
- `VITE_ALTITUDE_THRESHOLD` — Breach threshold in feet AGL (1300)
- `VITE_ACTIVE_HOURS_START` / `_END` — Operating hours (9-19)
- `VITE_DEFAULT_BOUNDARY_*` — Default Radlett boundary coordinates

User configuration is stored in IndexedDB and editable via the Settings panel.

## Default Monitoring Boundary (Radlett)

- Lat: 51.666476 to 51.692979
- Lon: -0.351682 to -0.277525
- ~5.5km E-W × 2.9km N-S

## Key Concepts

- **AGL (Above Ground Level):** `barometric_altitude - ground_elevation`. Ground elevation fetched from OurAirports for Radlett Aerodrome (EGTR, ~300ft AMSL).
- **Breach:** Flight with AGL < 1300ft within the monitoring boundary during operating hours.
- **Duplicate prevention:** Same callsign+altitude combo not re-recorded within 60s.
- **Operating hours:** 9am–7pm local time. Polling stops outside this window.

## Current State

**All 7 phases complete.** The application is fully functional.

### Phase 1 — Foundation & Configuration
- App shell with Header, StatusBar, TabNavigation, ConfigPanel
- Zustand stores (config, flight, breach, UI) with IndexedDB persistence
- Dexie database schema for breaches and config
- API clients for OpenSky Network and OurAirports
- AGL calculator and boundary checker
- Breach repository with full query support

### Phase 2 — API Integration & Polling
- `useFlightPolling` hook with adaptive polling (60s normal, 20s when flights detected)
- `useTimeWindow` hook for operating hours awareness (re-checks every 30s)
- OpenSky Network authentication support via `VITE_OPENSKY_USERNAME`/`VITE_OPENSKY_PASSWORD`
- Live flight count and "last updated X s ago" in StatusBar

### Phase 3 — Map Visualization
- Interactive Leaflet map centered on monitoring boundary
- Aircraft markers rotated to heading, coloured red when below threshold
- Clickable markers with popup showing all flight data including AGL
- Dashed boundary rectangle overlay with legend

### Phase 4 — Breach Detection
- `useBreachDetection` hook: evaluates every polled flight against boundary, altitude, on-ground
- Duplicate prevention via callsign+altitude bucketing with 60s window
- Persists breaches to IndexedDB and updates Zustand store in real-time
- `BreachAlertBanner`: red toast notification on new breaches (auto-dismiss 8s)

### Phase 5 — Current Hour Panel
- `CurrentHourPanel` showing all breaches in the current hour
- `BreachCard` with 4-stat grid (AGL, altitude, speed, heading), callsign, ICAO24, coordinates
- Sorted most-recent-first, refreshes every minute for hour rollover

### Phase 6 — Calendar & Historical Views
- `CalendarView`: monthly grid with breach count badges, prev/next month navigation
- `DayDetailView`: hourly bar chart for a selected date (operating hours only)
- `HourDetailView`: breach card list for a specific hour
- `BreachDetailModal`: full-detail modal with all fields
- Drill-down navigation: Calendar → Day → Hour → Breach detail

### Phase 7 — Polish & Optimization
- `ErrorBoundary` wrapping the entire app
- CSV export of all breach data (Settings → Data Management → Export CSV)
- Clear all data with two-click confirmation
- Vite chunk splitting (vendor-react, vendor-map, vendor-charts)
- Keyboard accessibility (Escape closes modals)
- `htmlFor` labels on all form inputs
- Dark/light theme via CSS variables

## Conventions

- Functional components with hooks (useState, useEffect, etc.)
- File extensions: `.jsx` for React components, `.js` for plain JS
- CSS files co-located with components (ComponentName.css)
- Dark theme by default with `prefers-color-scheme: light` media query support
- Zustand stores in `src/store/`, one per domain
- Services organized by concern: `api/`, `storage/`, `calculations/`
