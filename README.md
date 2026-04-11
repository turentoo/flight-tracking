# Flight Tracking

A React dashboard for monitoring low-altitude aircraft over a defined area. Polls the free [ADSB.fi](https://www.adsb.fi/) API for real-time ADS-B data, detects altitude breaches using QNH-corrected altitude, and provides tools to track, review, and report noise complaints.

Built for monitoring circuit training flights near small aerodromes, but configurable for any location.

## Features

- **Real-time monitoring** — polls ADSB.fi every 10–25s for aircraft within a configurable circular boundary
- **QNH altitude correction** — uses the aircraft's own QNH pressure setting to calculate true height above the aerodrome, not just raw barometric altitude
- **Breach detection** — flags flights below a configurable altitude threshold during operating hours
- **Interactive map** — Leaflet map with draggable boundary circle and flight markers (dark CartoDB tiles)
- **Dashboard** — past-60-minute chart, breach tables, 6-month statistics, monthly drill-down with pagination
- **Breach status workflow** — mark breaches as New / Reported / Dismissed with colored pills and filter controls
- **Noise complaint reporting** — one-click mailto with customisable email template and placeholder shortcodes
- **Departure airport lookup** — optional FlightAware AeroAPI integration to identify where flights originated
- **Calendar history** — drill down by month, day, and hour to review historical breaches
- **Persistent storage** — all data stored in Supabase (PostgreSQL), works across devices

## Prerequisites

- **Node.js** v16 or higher
- A **Supabase** account (free tier works) — [supabase.com](https://supabase.com)
- Optional: **FlightAware** AeroAPI key for departure airport lookup — [flightaware.com/aeroapi](https://www.flightaware.com/aeroapi/)

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** in your project dashboard
3. Paste the contents of `supabase/schema.sql` and run it — this creates the `breaches`, `config`, and `last_breaches` tables with indexes and RLS policies

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials (found in Settings > API):

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

All other variables are optional and have sensible defaults. See `.env.example` for the full list.

### 3. Install and run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Configure in the app

Open the app and click the gear icon (top right) to configure:

- **Monitoring boundary** — drag the circle on the map or enter coordinates manually
- **Altitude threshold** — breach altitude in feet (default: 1300ft)
- **Operating hours** — when to monitor (default: 9am–7pm)
- **Airport code** — reference aerodrome ICAO code (default: EGTR)
- **Report email** — recipient for noise complaint emails
- **Email template** — customise the complaint email with placeholder shortcodes
- **FlightAware API key** — optional, for departure airport lookup

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint .js and .jsx files |

## Docker Deployment

A `Dockerfile` and `docker-compose.yaml` are included for containerised deployment.

### Build

```bash
docker build -t flight-tracking \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  .
```

### Run

```bash
docker run -d -p 3000:80 flight-tracking
```

Or use docker-compose:

```bash
# Set your env vars in .env, then:
docker compose up -d
```

## How It Works

### Altitude correction

Aircraft transponders report barometric altitude based on standard pressure (1013.25 hPa). When actual pressure differs, this reading can be off by hundreds of feet. The app corrects for this:

```
corrected_altitude = baro_altitude + ((QNH - 1013.25) x 27)
height_above_aerodrome = corrected_altitude - airport_elevation
```

The QNH value comes directly from the aircraft's ADS-B data via ADSB.fi. When QNH is unavailable, the app falls back to comparing raw barometric altitude against `threshold + airport_elevation`.

### Breach detection

A breach is recorded when:
- The aircraft is within the monitoring boundary circle
- It's during operating hours
- The height above aerodrome is below the configured threshold
- The same aircraft hasn't been recorded in the last 5 minutes (deduplication)

### APIs used

| API | Auth | Purpose |
|-----|------|---------|
| [ADSB.fi](https://www.adsb.fi/) | None (free) | Real-time aircraft positions, altitude, QNH, aircraft type |
| [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) | API key (paid) | Departure airport lookup (optional) |
| [OurAirports](https://ourairports.com/) | None (free) | Airport elevation data |

## Tech Stack

- **React 18** with Vite 5
- **Zustand** for state management
- **Supabase** for PostgreSQL cloud storage
- **React Leaflet** with CartoDB Dark Matter tiles
- **Recharts** for charts
- **date-fns** for date utilities
- **Axios** for HTTP

## Project Structure

```
src/
├── components/
│   ├── pages/          # OverviewPage, BreachHistoryPage
│   ├── layout/         # Sidebar, TopBar
│   ├── config/         # Settings modal + email template editor
│   ├── map/            # Flight map, markers, boundary overlay
│   ├── current/        # Breach cards, alert banner
│   ├── history/        # Calendar, day/hour drill-down, detail modal
│   └── shared/         # EmptyState, ErrorBoundary
├── hooks/              # Polling, breach detection, time window, history
├── services/
│   ├── api/            # ADSB.fi, FlightAware, OurAirports clients
│   ├── storage/        # Supabase client, breach CRUD
│   └── calculations/   # AGL calculator, boundary checker
├── store/              # Zustand stores (config, flights, breaches, UI)
└── utils/              # Constants, formatters, time helpers, CSV export
supabase/
└── schema.sql          # Database setup script
```

## License

MIT
