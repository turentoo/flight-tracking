FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better Docker layer caching.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy worker source.
COPY index.js ./
COPY lib ./lib

# Run as a non-root user.
RUN addgroup -S worker && adduser -S worker -G worker
USER worker

ENV NODE_ENV=production

CMD ["node", "index.js"]
