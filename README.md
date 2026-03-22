# Flight Tracking

A React application for tracking flights.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview the production build:

```bash
npm run preview
```

## Docker Deployment

### Prerequisites

- Docker installed and running
- GitHub Container Registry authentication (`docker login ghcr.io`)
- Supabase project credentials

### Setup

1. **Create environment file:**

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

2. **Build and push to GHCR:**

```bash
./deploy.sh
```

3. **Build and deploy to server:**

```bash
./deploy.sh --deploy
```

4. **Custom version tag:**

```bash
./deploy.sh --tag v1.0.0
```

### Server Deployment

The application can be deployed on any Docker host with Traefik reverse proxy:

1. **Create deployment directory:**

```bash
ssh <server> "sudo mkdir -p /opt/flight-tracking"
ssh <server> "sudo chown 3005:3005 /opt/flight-tracking"
```

2. **Copy docker-compose.yaml:**

```bash
scp docker-compose.yaml <server>:/opt/flight-tracking/
```

3. **Pull and start:**

```bash
ssh <server> "cd /opt/flight-tracking && docker compose pull && docker compose up -d"
```

The application will be available at `https://flights.example.com` (via Traefik).

### Local Docker Testing

Test the Docker build locally before deploying:

```bash
# Build locally
docker build -t flight-tracking:test \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  .

# Run locally
docker run -d -p 3000:80 --name flight-test flight-tracking:test

# Test
open http://localhost:3000

# Cleanup
docker stop flight-test && docker rm flight-test
```

## Features

- Real-time flight tracking
- Flight information display
- Interactive search

## Technologies

- React 18
- Vite
- CSS3
- Docker & nginx (production)

## License

MIT
