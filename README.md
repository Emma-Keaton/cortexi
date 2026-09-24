# Cortexi 🎬

Free, **local-first** AI video generator: turn a text prompt into a finished MP4 —
LLM storyboard → edge-tts voiceover with word-synced captions → Remotion render —
all from a simple 4-step web wizard.

## Prerequisites

| Dependency | Why | Install |
|---|---|---|
| Node.js ≥ 18 | server + UI | https://nodejs.org |
| pnpm ≥ 9 | workspace | `corepack enable` |
| **ffmpeg / ffprobe** on PATH | audio durations, muxing | https://ffmpeg.org (or `winget install ffmpeg`) |
| **edge-tts** | free neural voiceover | `pip install edge-tts` |
| Chrome or Edge | Remotion render target (auto-detected, or set `CORTEXI_CHROME`) | usually preinstalled |

> Local DNS note: `aiodns`/`pycares` (optional aiohttp deps) break edge-tts on some
> Windows setups — if voiceover fails with a DNS error, `pip uninstall aiodns pycares`.

## Quick start

```bash
pnpm install
pnpm dev            # API :8787 + web :5173
```

Open **http://localhost:5173**, then:

1. Describe your video → **Generate Storyboard**
2. Edit scenes, brand colors, captions, music/images → next
3. **Generate Voice + Captions** (edge-tts)
4. **Render** — Draft (fast, half-res) or Final (1080p) → preview + download

Without an API key you get rule-based offline storyboards. With a **free** key
(Groq recommended — https://console.groq.com) you get full LLM storyboards.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + web dev servers (hot reload) |
| `pnpm dev:server` / `pnpm dev:web` | one side only |
| `pnpm build` | production web build → `web/dist` (served by the API server) |
| `pnpm start` | run everything from the built web bundle (production) |
| `pnpm test` | unit tests (settings, VTT, storyboard fallback, draft scaling) |
| `pnpm typecheck` | strict TS checks for server + web |

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | API port |
| `HOST` | `127.0.0.1` | bind address — local-only by default; set `0.0.0.0` for Docker |
| `CORTEXI_CHROME` | auto-detect | full path to chrome.exe / chromium |
| `CORTEXI_GROQ_KEY` | — | server-side Groq key (users don't need to paste one) |
| `CORTEXI_GEMINI_KEY` | — | server-side Gemini key |
| `CORTEXI_GEMINI_MODEL` | `gemini-2.0-flash` | override Gemini model id |
| `CORTEXI_ROOT` | repo root | relocate the `assets/` data directory |

## Settings (in-app ⚙ Settings)

- **Appearance** — dark / light theme (saved per browser)
- **Export destination** — absolute folder; every finished MP4 is *also* copied
  there as `cortexi-<job>.mp4` (the built-in `assets/output` copy always remains
  for in-app preview/download)

## Docker

```bash
docker build -t cortexi .
docker run -p 8787:8787 -v cortexi-assets:/app/assets cortexi
```

Ships with ffmpeg + chromium + edge-tts. Open http://localhost:8787.

## Project layout

```
server/src/     Hono API, LLM, TTS, render queue, settings
server/remotion/ React compositions (what gets rendered)
server/tests/    unit tests
web/src/         React wizard UI + Hyper Electric theme
assets/          runtime data: audio/, uploads/, output/, settings.json
```

## License

MIT — see `LICENSE`. **Before commercial use**, verify the terms of the
runtime dependencies: Microsoft Edge TTS voices, Remotion, Groq/Gemini free tiers.
