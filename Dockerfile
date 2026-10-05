# Cortexi — Docker build (Linux)
FROM node:22-bookworm-slim

# TTS stack (all local, no Microsoft dependency):
#   piper-tts   - lightweight ONNX voices, baked at build time, offline (default engine)
#   kokoro      - higher-quality neural voices (pulls in PyTorch; model fetched on first use)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg chromium fonts-liberation fonts-noto-color-emoji \
      python3 python3-pip ca-certificates curl espeak-ng \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir --break-system-packages \
      piper-tts soundfile numpy \
 && pip3 install --no-cache-dir --break-system-packages 'kokoro>=0.9,<1' 'misaki[en]'

# Piper voice models are baked into the image so synthesis needs no downloads at runtime.
ENV PIPER_VOICES_DIR=/app/piper-voices \
    HF_HOME=/app/.cache/huggingface

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

# Bake Piper voices into the image (set PIPER_VOICES as a build arg to include them).
ARG PIPER_VOICES=""
ENV PIPER_VOICES=${PIPER_VOICES}
RUN python3 server/scripts/fetch_piper_voices.py || true

EXPOSE 8787
# Persist renders/uploads/settings: mount a volume at /app/assets
CMD ["pnpm", "--filter", "@cortexi/server", "start"]
