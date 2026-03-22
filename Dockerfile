# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build tools like vite)
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables (Vite requires these at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ADSB_FI_API_URL=https://opendata.adsb.fi/api
ARG VITE_FLIGHTAWARE_API_URL=https://aeroapi.flightaware.com/aeroapi
ARG VITE_POLLING_INTERVAL=30000
ARG VITE_ACTIVE_POLLING_INTERVAL=20000
ARG VITE_ALTITUDE_THRESHOLD=1300
ARG VITE_ACTIVE_HOURS_START=9
ARG VITE_ACTIVE_HOURS_END=19
ARG VITE_DEFAULT_BOUNDARY_LAT_MIN=51.666476
ARG VITE_DEFAULT_BOUNDARY_LAT_MAX=51.692979
ARG VITE_DEFAULT_BOUNDARY_LON_MIN=-0.351682
ARG VITE_DEFAULT_BOUNDARY_LON_MAX=-0.277525

# Set environment variables for Vite build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_ADSB_FI_API_URL=$VITE_ADSB_FI_API_URL \
    VITE_FLIGHTAWARE_API_URL=$VITE_FLIGHTAWARE_API_URL \
    VITE_POLLING_INTERVAL=$VITE_POLLING_INTERVAL \
    VITE_ACTIVE_POLLING_INTERVAL=$VITE_ACTIVE_POLLING_INTERVAL \
    VITE_ALTITUDE_THRESHOLD=$VITE_ALTITUDE_THRESHOLD \
    VITE_ACTIVE_HOURS_START=$VITE_ACTIVE_HOURS_START \
    VITE_ACTIVE_HOURS_END=$VITE_ACTIVE_HOURS_END \
    VITE_DEFAULT_BOUNDARY_LAT_MIN=$VITE_DEFAULT_BOUNDARY_LAT_MIN \
    VITE_DEFAULT_BOUNDARY_LAT_MAX=$VITE_DEFAULT_BOUNDARY_LAT_MAX \
    VITE_DEFAULT_BOUNDARY_LON_MIN=$VITE_DEFAULT_BOUNDARY_LON_MIN \
    VITE_DEFAULT_BOUNDARY_LON_MAX=$VITE_DEFAULT_BOUNDARY_LON_MAX

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:1.25-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run as nginx user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/nginx-health || exit 1
