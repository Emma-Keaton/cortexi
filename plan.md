# Cortexi — Project Plan & Readiness Status

> Free, local-first AI video generator: prompt → LLM storyboard → edge-tts voiceover + captions → Remotion MP4 render, with a React wizard UI.
>
> **Status legend:** ✅ done & verified · 🔧 done, needs re-verify · ⬜ not started

---

## 1. Architecture (as built)

| Layer | Tech | Location |
|---|---|---|
| Monorepo | pnpm workspace (`server`, `web`) | `E:\Projects\cortexi` |
| API server | Hono + tsx, port **8787** | `server/src/` |
| Render engine | Remotion 4 (React compositions) | `server/remotion/` |
| Frontend | React 18 + Vite 6, port **5173** (proxies `/api`, `/assets`) | `web/src/` |
| Voiceover | `edge-tts` CLI (Microsoft neural voices) + ffprobe | `server/src/tts.ts` |
| LLM | Groq / Gemini / offline fallback | `server/src/llm.ts` |
| Storage | File-based (`assets/audio`, `assets/uploads`, `assets/output`, `assets/settings.json`) — no DB | |

---

## 2. Everything done so far ✅

### Server core
- ✅ `types.ts` — Zod schemas for storyboard, scenes, render job types.
- ✅ `llm.ts` — Groq + Gemini storyboards with schema-constrained JSON prompt and rule-based offline fallback.
- ✅ `tts.ts` — edge-tts per-scene MP3 + VTT word timings via ffprobe durations; graceful text-length fallback on failure.
- ✅ `vtt.ts` — WebVTT parser → word-timed caption cues.
- ✅ `render.ts` — serialized job queue (concurrency=1, 4GB-RAM safe), draft mode (half-res @15fps with proportional `durationInFrames` scaling), local Chrome detection via `findBrowser()` / `CORTEXI_CHROME`.
- ✅ `settings.ts` — persisted settings store (`assets/settings.json`) with absolute-path validation & normalization.
- ✅ `index.ts` — API: `/api/health`, `/api/voices`, `/api/plan`, `/api/voice`, `/api/upload`, `/api/render`, `/api/jobs/:id`, `GET|PUT /api/settings`, static `/assets/*` + web build serving.

### Remotion engine
- ✅ `Root.tsx`, `CortexiVideo.tsx` (aspect ratios, music bed, caption overlay), `Captions.tsx` (word-by-word karaoke), `SceneRenderer.tsx` (title-card / feature / outro templates, fade-up / zoom / slide-left animations).

### Web UI
- ✅ 4-step wizard: prompt+provider+key → storyboard editing (brand colors, captions toggle, music/image upload, per-scene edit) → voiceover → render with live progress + video preview + download.
- ✅ **"Hyper Electric" theme** — full dark/light modes via CSS variables (`web/src/theme.css`), persisted (`localStorage` + pre-paint apply, no FOUC), `color-scheme` aware.
- ✅ **Settings page** — Appearance (Dark/Light buttons) + **Export destination folder** (absolute path, saved via `PUT /api/settings`); header toggle to switch views.
- ✅ **Branding** — logo copied to `web/public/logo.jpeg`: header logo, favicon, apple-touch-icon, OG/Twitter meta, pre-paint animated loading splash in `index.html`.
- ✅ `web/tsconfig.json` added; strict typecheck passes.
- ✅ Render completion shows **`exportedTo`** path when an export folder is configured.

### Fixes verified (with evidence)
- ✅ **Draft fps bug** — 15fps override now scales `durationInFrames`; verified output **9.73 s** (was 19.4 s).
- ✅ **edge-tts "cannot reach Microsoft"** — root cause was the **aiodns/pycares (c-ares) DNS bug on Windows**, not network blocking. Fixed by uninstalling optional `aiodns`+`pycares` (system resolver works). Verified: MP3 + VTT generated; `/api/voice` returns real audio durations & word timings.
- ✅ **Groq model retired** — `llama-3.3-70b-versatile` returns 404 on current keys; patched `llm.ts` with model fallback chain: `openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → `allam-2-7b`. Verified: 5-scene storyboard in ~3 s with real key.
- ✅ **Export destination** — verified end-to-end: render → copied to `E:\Videos\Cortexi\cortexi-<id>.mp4`; relative path rejected with 400; path normalization works.
- ✅ **Static file serving bug** — Hono `serveStatic` joined the full `/assets/...` request path onto the assets root (`assets\assets\...`), so *every* `/assets/*` request (MP3s, MP4s) fell through to the SPA shell and returned `index.html` — corrupting Remotion's audio download on the first render-with-voiceover. Fixed with `rewriteRequestPath` stripping the `/assets` prefix; verified MP3 (49,536 bytes, ffprobe 8.256 s), JS bundle (154 KB), and SPA shell all serve correctly through :8787.
- ✅ **Groq key + real LLM storyboard** — user key authenticated; `openai/gpt-oss-120b` produced a proper 5-scene "Dark Roast Club Promo" in ~3 s.
- ✅ Web `tsc --noEmit` + `vite build` pass; server `tsc --noEmit` passes.
- ✅ Services running: API :8787, Vite :5173.

---

## 3. What still needs to be done

### P0 — Required before "usable" release
- ⬜ **Full browser walk-through** of the wizard (only API-level tests exist): plan → edit → voice → render → download, plus Settings/theme/logo splash in a real browser session.
- ✅ **Full pipeline with real LLM output — DONE & VERIFIED**: Groq `gpt-oss-120b` 5-scene storyboard → edge-tts (all 5 scenes, 10–17 word timings each) → Remotion draft render **39.13 s / AAC stereo / 2.26 MB** → auto-copied to `E:\Videos\Cortexi\cortexi-fc79eb15.mp4`.
- ✅ **Music mixing verification** — tone uploaded → rendered with `music.volume=0.9` → `volumedetect` on output confirms audible mix.
- ✅ **README.md** — install/run/scripts/env vars/prerequisites/troubleshooting/Docker.
- ✅ **`.gitignore`** — node_modules, dist, runtime assets, logs, test artifacts.
- ✅ **Git init + first commit** (branch `main`).
- ✅ **Test artifact cleanup** — `test-req.json`, `plan.json`, `voiced.json`, `render-req.json`, `voice-req.json`, `plan-test.json`, `frame*.png`, `build.log`, `install.log`, `tts-test.*`, helper `.ps1` scripts.

### P1 — Hardening for daily use
- ✅ **Bind server to localhost** — currently `0.0.0.0` + open CORS means anyone on the LAN can trigger renders/read assets. Default `127.0.0.1`, opt-in via `HOST` env; restrict CORS to dev origin.
- ✅ **Anchored paths** — `ASSETS_DIR`/`OUT_DIR` derive from `process.cwd()`; break if started elsewhere. Anchor to `import.meta.url` or `CORTEXI_ROOT`.
- ✅ **Startup self-check** — verify `ffprobe` on PATH, usable Chrome/Edge (or `CORTEXI_CHROME`), `edge-tts` importable; fail with actionable messages.
- ✅ **Job persistence / output retention** — jobs in-memory (lost on restart); `assets/output` grows forever → keep-last-N cleanup.
- ✅ **Server-side API key option** — `CORTEXI_GROQ_KEY` env so users needn't paste keys into the browser; never log keys.
- ✅ **UI resilience** — server-down banner, render poll timeout/retry, upload size/type validation.
- ✅ **Unit tests** — VTT parser, settings validation, fallback storyboard, fps/frame scaling + one API smoke test.
- ✅ **Proper `.ico` favicon** + absolute `og:image` URL for link previews.
- ✅ **Gemini model currency check** — currently `gemini-2.0-flash`; confirm still available.

### P2 — Deployment
- ✅ **Production runner** — `pnpm build` only builds web; server runs via `tsx`. Compile (`tsc` → `dist`) or formally depend on `tsx`; wrap with PM2/nssm (Windows) or Docker (Linux).
- ✅ **Dockerfile** (Linux/cloud): node + `ffmpeg` + `edge-tts` (pip) + chromium (`CORTEXI_CHROME=/usr/bin/chromium`); mount **volume** for `assets/`.
- ✅ **CI** — GitHub Actions: install + typecheck + build + tests on push.
- ✅ **Env documentation** — `PORT`, `HOST`, `CORTEXI_CHROME`, `CORTEXI_GROQ_KEY`, `CORTEXI_ROOT`.
- ✅ **Reverse proxy + auth** if exposed beyond localhost (app is local-first; public SaaS needs multi-tenancy, job isolation, rate limiting).

---

## 4. Commercial-use readiness assessment

| Area | State | Gap for commercial |
|---|---|---|
| Core product loop | ✅ works (prompt→storyboard→voice→MP4) | Browser E2E verification |
| Voiceover | ✅ edge-tts fixed (free, MS neural) | **Kokoro TTS never installed** — optional local/offline upgrade (see §5) |
| LLM | ✅ Groq fixed with current models | Users supply own free keys; consider proxying keys server-side |
| Rendering | ✅ draft+final, local Chrome | Headless Chrome bundling for non-Windows deploy |
| Multi-user / SaaS | ❌ single local user | Auth, DB, cross-process queue, storage service, billing |
| Security | ❌ binds all interfaces, open CORS, keys in localStorage | Localhost bind, CORS, CSP, key handling policy |
| Licensing | ❌ none | **LICENSE file needed**; review edge-tts (MS voices ToS), Remotion license (free tier terms), Groq/Gemini ToS — *critical for commercial* |
| Distribution | ✅ Dockerfile + README runbook | Mount volume at `/app/assets`; optional installer still possible |
| Observability | 🔧 file logs (`server.log`) + startup self-check | Structured logs, error reporting |
| Tests / CI | ✅ 8 unit tests + CI workflow + live smoke flag | Expand coverage over time |

**Bottom line:** feature-complete for local use after P0 items; **commercially deployable** requires P1 security + P2 packaging + legal/licensing review (especially Microsoft Edge TTS voices and Remotion licensing — verify both permit your intended commercial use).

---

## 5. Notes & decisions

- **Kokoro TTS: NOT installed** (never was). Current voice path is `edge-tts` CLI. If offline/local voices become a requirement, candidates: **Kokoro** (local neural TTS, Python + model download), Piper (lighter), or keep MS Edge voices. Decide based on whether "local-first" must include *offline* synthesis.
- **Groq key (user-provided)** tested directly; that key's model list contains no `llama-*` instruct models → fallback chain added. During normal use the key lives only in browser `localStorage`.
- **edge-tts fix trade-off:** removing `aiodns`/`pycares` makes aiohttp use Windows' system resolver. Reversible with `pip install aiodns`, but that reintroduces the bug on this machine.
- **Draft fps fix:** scaling `durationInFrames` proportionally when dropping 30→15fps keeps wall-clock duration constant — verified 9.73 s.
- **Export folder semantics:** built-in `assets/output` remains canonical (served via `/assets` for preview/download); the configured export folder receives a **copy** (`cortexi-<job>.mp4`) so UI playback never breaks.
- **Open security note:** the provided Groq key appeared in chat logs — rotate it if this conversation is shared anywhere.
