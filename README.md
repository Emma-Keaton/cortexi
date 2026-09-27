# Cortexi

**Free, self-hostable AI brand video generator.** Describe your product, get a
structured storyboard, generate a neural voiceover, and export an MP4 - all from
a browser.

Unlike most "AI video" tools, Cortexi does **not** run video encoding on the
server. The backend handles only the cheap parts (storyboard LLM, text-to-speech,
uploads, quotas), and the user's browser composites every scene and encodes the
final file locally.

## Why it's built this way

Rendering video server-side needs Chromium, FFmpeg, and a large chunk of CPU and
RAM. That makes traditional free hosting impractical. By moving encoding to the
client:

- the backend fits comfortably on a **free CPU instance**
- video length and resolution are limited by the user's machine, not the host
- batch renders never overload the shared free LLM
- uploads are the only server-side storage concern

## Features

- **4-step wizard** - prompt -> storyboard -> voiceover -> export
- **Three TTS engines**
  - `piper` - lightweight ONNX, no PyTorch, baked into the image (default)
  - `kokoro` - higher-quality neural voices (pulls in PyTorch)
  - `edge-tts` - Microsoft voices, with accurate word-level VTT timings
  - voices are **backend-configured**, never hardcoded in the UI
- **On-device rendering** - canvas composition + `MediaRecorder` + FFmpeg WASM
- **MP4 (H.264) and WebM (VP9) export**, MP4 by default
- **Lightweight LLM** via the Hugging Face Router (Qwen 2.5 ladder), Groq, or
  Gemini - works with **no API key** when a shared token is configured
- **BYOK** for Groq/Gemini if you want stronger blueprints or batch work
- 16:9, 9:16, and 1:1 aspect ratios; draft and master quality
- Karaoke-style word-synced captions
- **Brand kit manager** - upload/tag brand assets, extract dominant colours in-browser, derive a contrast-checked (WCAG AA) palette
- Storyboard normalization: always 3-6 scenes, one opener, one closer, no repeated entrances
- Local product background removal (`rembg`)
- Per-device daily rate limits
- **Super prompts** - 5 copy-paste prompt recipes that teach structure, art direction, and delivery
- Showcase gallery of 3 rendered examples, each with the real prompt behind it
- FAQ and ad slots

## Architecture

```
Vercel (static React frontend)
        |  /api/*  and  /assets/*
        v
Render free CPU web service (Docker)
        |-- LLM storyboard (HF Router / Groq / Gemini)
        |-- Piper . Kokoro . Edge TTS
        |-- uploads + generated audio
        `-- rate limits / quotas

User's device
        |-- storyboard preview
        `-- FINAL ENCODE (canvas + MediaRecorder + FFmpeg WASM)
```

## Quick start

```bash
pnpm install
pnpm dev
```

- API -> http://localhost:8787
- Web -> http://localhost:5173

Prerequisites: Node 18+, pnpm, ffmpeg, Python 3, Chrome/Edge, and
`pip install edge-tts piper-tts`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + web dev servers (hot reload) |
| `pnpm dev:server` / `pnpm dev:web` | One side only |
| `pnpm build` | Production web build to `web/dist` |
| `pnpm start` | Run everything from the built web bundle |
| `pnpm test` | Unit tests (settings, VTT, storyboard, JSON parsing, draft scaling) |
| `pnpm typecheck` | Strict TS checks for server + web |
| `pnpm lint` | oxlint over server and web sources |
| `pnpm check` | lint + typecheck + test + build |

## Deploy

| Piece | Where | Config |
|---|---|---|
| Backend | Render (free) | `render.yaml` - set `HF_TOKEN` + `CORTEXI_WEB_ORIGIN` |
| Frontend | Vercel | `vercel.json` - set `VITE_API_TARGET` |

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full walkthrough.

## Configuration

| Variable | Purpose |
|---|---|
| `HOST` / `PORT` | Bind address and port (`0.0.0.0` / `8787` on hosts) |
| `CORTEXI_WEB_ORIGIN` | Comma-separated CORS allowlist for the frontend |
| `VITE_API_TARGET` | Backend base URL baked into the frontend build |
| `HF_TOKEN` | Shared Hugging Face token (a `read` token is enough) |
| `CORTEXI_HF_MODEL` | Primary model, e.g. `Qwen/Qwen2.5-1.5B-Instruct` |
| `CORTEXI_HF_INFERENCE_URL` | HF Router chat-completions endpoint |
| `PIPER_VOICES` | Piper voices to bake into the image |
| `KOKORO_VOICES` | Kokoro voice IDs to expose |
| `EDGE_TTS_VOICES` | Edge TTS voice IDs to expose |
| `CORTEXI_ENABLE_SERVER_RENDER` | `1` re-enables the local Remotion pipeline |
| `CORTEXI_GROQ_KEY` / `CORTEXI_GEMINI_KEY` | Optional server-side LLM keys |

### LLM notes

The Hugging Face path uses **grammar-constrained decoding**
(`response_format: { type: "json_schema", strict: true }`), so model output is
valid JSON by construction. The fallback ladder is Qwen-first:

```
Qwen/Qwen2.5-1.5B-Instruct  ->  Qwen/Qwen2.5-3B-Instruct
                            ->  Qwen/Qwen2.5-7B-Instruct
                            ->  meta-llama/Llama-3.1-8B-Instruct
```

If every model fails, the rule-based planner takes over so the app always
returns a usable storyboard.

## Project layout

```
server/src/      Hono API, LLM ladder, TTS adapters, brand assets, storyboard rules, render queue, settings
server/remotion/ React compositions (local server rendering only)
server/scripts/  Piper + Kokoro Python adapters, voice prefetch
server/tests/    unit tests
web/src/         React wizard UI + client-side renderer
assets/          runtime data: audio/, uploads/, output/
```

## License

MIT - see [`LICENSE`](./LICENSE).

**Note:** this license covers the Cortexi source only. Review the terms of the
runtime dependencies before commercial use: Piper voice models, Microsoft Edge
TTS, Remotion, Groq, Gemini, and the Hugging Face Router each carry their own
terms.


