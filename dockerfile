FROM node:20-bookworm-slim

# sqlite3 CLI for debugging inside the Fly machine
RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Seed DB baked into the image
RUN mkdir -p /seed /data
COPY accounts.db /seed/accounts.db

# Copy seed DB into the volume only if the volume doesn't already have one
CMD sh -c 'if [ ! -s /data/accounts.db ]; then cp -f /seed/accounts.db /data/accounts.db; fi && npm run start:all'

