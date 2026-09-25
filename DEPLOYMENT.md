# Cortexi - Deployment (Render backend + Vercel frontend)

## Architecture

```
Vercel (static React frontend)
        |  fetch /api/*  and  /assets/*
        v
Render free CPU web service (Docker)
        |- Lightweight LLM (Hugging Face Router, server-side token)
        |- Piper ONNX TTS (default, fastest)
        |- Kokoro-82M TTS (optional, higher quality)
        |- Microsoft Edge TTS
        |- Uploads + generated audio (temporary disk)
        |- Rate limiting / daily quotas
        `- API + static asset serving

User device
        |- Storyboard preview
        `- FINAL VIDEO ENCODING (canvas + MediaRecorder)
```

The hosted backend never runs Remotion, Chromium, or FFmpeg video encoding.
The browser composites every scene to a canvas, records it with MediaRecorder,
mixes the TTS audio, and downloads the finished file locally.

## Why Render free works

| Workload | Where it runs | Server cost |
|---|---|---|
| LLM storyboard | Render (CPU) | low |
| Piper TTS | Render (CPU) | low |
| Kokoro TTS | Render (CPU) | medium |
| Edge TTS | Render (CPU) | low |
| Uploads/assets | Render (temp disk) | low |
| **Final video encode** | **User browser** | **none** |

Free-tier caveats: the instance sleeps when idle (first request is slow), the
filesystem is ephemeral, and monthly hours are capped. UI copy tells users the
backend may be waking up.

## Files that matter

| File | Purpose |
|---|---|
| `render.yaml` | One-click Render blueprint (free plan, Docker, health check) |
| `vercel.json` | Vercel build + SPA rewrite config |
| `Dockerfile` | Backend image: Node, ffmpeg, Chromium, Python, Kokoro, Edge TTS |
| `web/src/clientRender.ts` | On-device canvas renderer + MediaRecorder encoder |
| `web/src/AppTypes.ts` | Shared storyboard types for the client renderer |
| `server/src/index.ts` | API; `/api/render` disabled unless `CORTEXI_ENABLE_SERVER_RENDER=1` |

## Deploy the backend to Render (free)

1. Push the repository to GitHub.
2. Go to https://render.com -> **New +** -> **Blueprint**.
3. Connect the repo. Render detects `render.yaml` automatically.
4. Set the prompted secrets:
   - `CORTEXI_WEB_ORIGIN` - your Vercel URL (e.g. `https://cortexi.vercel.app`)
   - `HF_TOKEN` - a Hugging Face token with inference permission
5. Click **Apply**. The first build installs Python/Kokoro and may take a while.
6. Verify: `https://cortexi-api.onrender.com/api/health` returns `{ "ok": true }`.

Environment variables (defaults live in `render.yaml`):

```
HOST=0.0.0.0
PORT=8787
CORTEXI_ENABLE_SERVER_RENDER=0
CORTEXI_HF_MODEL=Qwen/Qwen3-0.6B
KOKORO_VOICES=af_heart,af_bella,am_michael,bf_emma,bm_george,...
EDGE_TTS_VOICES=en-US-AriaNeural,en-US-GuyNeural,...
CORTEXI_WEB_ORIGIN=https://your-app.vercel.app
```

## Deploy the frontend to Vercel

1. Go to https://vercel.com -> **New Project** -> import the repo.
2. Framework preset: **Vite**. `vercel.json` supplies build/output settings.
3. Add the environment variable:
   - `VITE_API_TARGET=https://cortexi-api.onrender.com`
4. Deploy and copy the assigned URL.
5. Set that URL as `CORTEXI_WEB_ORIGIN` on Render and redeploy.

`VITE_API_TARGET` is read by `web/src/clientRender.ts` (for `/assets/...`) and
by `web/src/App.tsx` (for all `/api/...` calls), so a split deployment works
with no code changes. Leave it unset locally - the Vite dev proxy handles it.

## TTS engines

| Engine | Runtime | Notes |
|---|---|---|
| `piper` | ONNX Runtime | Default. No PyTorch. Fastest + smallest container. Voices are baked into the image. |
| `kokoro` | PyTorch | Higher quality/natural prosody, but pulls ~2 GB of PyTorch into the image. |
| `edge-tts` | Microsoft service | Most voice options and the only engine with accurate VTT word timings. |
| `none` | - | Muted; scene durations are estimated from text length. |

Piper is the default because on a free CPU instance the runtime, not the model
size, is the bottleneck. Set `PIPER_VOICES` (and the matching Docker build arg)
to choose which Piper voices ship in the image:

```
PIPER_VOICES=en_US-amy-medium,en_US-ryan-medium,en_GB-alan-medium
```

`server/scripts/fetch_piper_voices.py` downloads the `.onnx` + `.onnx.json`
pairs at image build time so synthesis needs no runtime downloads.

## Download formats

Step 04 renders in the browser and offers both containers:

- **MP4 (H.264 + AAC, yuv420p, +faststart)** - default, broadly compatible.
- **WebM (VP9 + Opus)** - no conversion step, slightly smaller.

MP4 is produced by transcoding the recorded stream with FFmpeg WASM. The core
(~30 MB) is fetched from unpkg on first MP4 export only and then cached by the
browser, so it does not affect initial page load.

## Voice configuration

Only list voice IDs that the installed Kokoro model revision actually supports.
`GET /api/voices` returns both engines:

```json
{ "kokoro": ["af_heart"], "edge": ["en-US-AriaNeural"],
  "combined": [{ "engine": "kokoro", "id": "af_heart" }] }
```

The UI filters the voice list by the selected engine (Kokoro / Edge TTS / Mute).

## Server rendering (local desktop only)

The original Remotion + Chromium pipeline is preserved for local use. Enable it
with `CORTEXI_ENABLE_SERVER_RENDER=1`. When disabled (the hosted default),
`POST /api/render` returns HTTP 409 and the frontend renders in the browser.

## Still to do before public launch

- Object storage for uploads/audio (Render disk is ephemeral).
- Shared (Redis/KV) rate limiting - the current Map is per-instance.
- Privacy, Terms, and Acceptable-Use pages.
- SEO article routes, sitemap, robots.txt, Search Console.
- Real Adsterra / Monetag scripts once publisher IDs are provided.
- Optional: FFmpeg WASM core self-hosting instead of the unpkg CDN (adds ~30 MB to your own CDN).


