# Cortexi — Docker build (Linux)
FROM node:22-bookworm-slim

# ffmpeg (ffprobe), Chromium (render target), Python + edge-tts (voiceover)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg chromium fonts-liberation fonts-noto-color-emoji \
      python3 python3-pip ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir edge-tts

ENV CORTEXI_CHROME=/usr/bin/chromium \
    HOST=0.0.0.0 \
    PORT=8787 \
    PUPPETEER_SKIP_DOWNLOAD=1

WORKDIR /app
RUN corepack enable

# Install deps first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @cortexi/web build

EXPOSE 8787
# Persist renders/uploads/settings: mount a volume at /app/assets
CMD ["pnpm", "--filter", "@cortexi/server", "start"]
