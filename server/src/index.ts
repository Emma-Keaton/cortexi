import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mkdir, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { generateStoryboard } from './llm.js';
import { generateVoiceover } from './tts.js';
import { enqueueRender, getJob } from './render.js';
import { getSettings, saveSettings } from './settings.js';
import { normalizeStoryboard } from './storyboard.js';
import { StoryboardSchema } from './types.js';
import { listAssets, registerAsset, removeAsset, deriveBrandKit, describeBrandKit, BrandAssetSchema } from './brandAssets.js';
import { storyboardDuration, spokenCharacters } from './storyboard.js';
import { ASSETS_DIR, UPLOAD_DIR, OUT_DIR, WEB_DIST } from './paths.js';

const execFileP = promisify(execFile);

const app = new Hono();

const port = Number(process.env.PORT ?? 8787);
// Local-first: bind loopback unless HOST is explicitly set (e.g. HOST=0.0.0.0 in Docker).
const host = process.env.HOST ?? '127.0.0.1';

// CORS: only the dev server and this server's own origins may call the API cross-origin.
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  ...(process.env.CORTEXI_WEB_ORIGIN?.split(',').map((v) => v.trim()).filter(Boolean) ?? []),
]);
app.use('/api/*', cors({
  origin: (o) => (o && allowedOrigins.has(o) ? o : null),
}));

// Basic shared-capacity guard: production deployments should back this with Redis.
const daily = new Map<string, { day: string; count: number }>();
app.use('/api/*', async (c, next) => {
  const key = c.req.header('x-device-id') ?? c.req.header('user-agent') ?? 'anonymous';
  const day = new Date().toISOString().slice(0, 10); const current = daily.get(key);
  if (current?.day !== day) daily.set(key, { day, count: 1 });
  else if (current.count >= 120) return c.json({ error: 'Daily free limit reached. Bring your own API key or try tomorrow.' }, 429);
  else current.count += 1;
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

// App settings (export destination folder, etc.)
app.get('/api/settings', async (c) => c.json(await getSettings()));
app.put('/api/settings', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await saveSettings({ exportDir: String(body.exportDir ?? '').trim() }));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.get('/api/voices', (c) => {
  const list = (raw?: string) => (raw ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  const piper = list(process.env.PIPER_VOICES);
  const kokoro = list(process.env.KOKORO_VOICES);
  const edge = list(process.env.EDGE_TTS_VOICES ?? 'en-US-AriaNeural,en-US-GuyNeural,en-US-JennyNeural,en-GB-SoniaNeural,en-AU-NatashaNeural,en-IN-NeerjaNeural');
  const combined = [
    ...piper.map((id) => ({ engine: 'piper', id })),
    ...kokoro.map((id) => ({ engine: 'kokoro', id })),
    ...edge.map((id) => ({ engine: 'edge-tts', id })),
  ];
  return c.json({ piper, kokoro, edge, combined });
});

// ---- Brand assets -------------------------------------------------------------
// A registry of the user's brand files plus a derived, contrast-checked brand kit.

app.get('/api/brand-assets', async (c) => {
  const assets = await listAssets();
  return c.json({ assets });
});

app.post('/api/brand-assets', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await registerAsset(body));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.delete('/api/brand-assets/:id', async (c) => {
  const removed = await removeAsset(c.req.param('id'));
  return c.json({ removed });
});

/** Derive (or recompute) the brand kit, including WCAG contrast diagnostics. */
app.post('/api/brand-kit', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const assets = await listAssets();
  // A logo's extracted colour is the most trustworthy signal of brand primary.
  const fromLogo = assets.find((a) => a.role === 'logo')?.primaryColor;
  const kit = deriveBrandKit({
    primaryColor: body.primaryColor ?? fromLogo,
    backgroundColor: body.backgroundColor,
    textColor: body.textColor,
    font: body.font,
  });
  return c.json({ kit, description: describeBrandKit(kit, assets), assets });
});

app.get('/api/brand-assets/schema', (c) => c.json({ roles: BrandAssetSchema.shape.role._def.values }));

// 1. Prompt -> storyboard JSON
app.post('/api/plan', async (c) => {
  const body = await c.req.json();
  // Registered assets win; a one-off body payload is still accepted for convenience.
  const registered = await listAssets();
  let assets = registered;
  if (!assets.length && Array.isArray(body.brandAssets)) {
    // Loose payload from older clients - only the fields the planner needs.
    assets = (body.brandAssets as Array<{ id?: string; name?: string; role?: string; path?: string; primaryColor?: string }>)
      .filter((a) => a && a.id)
      .map((a) =>
        BrandAssetSchema.parse({
          id: a.id,
          name: a.name ?? a.id,
          role: a.role ?? 'product',
          path: a.path ?? '',
        }),
      )
      .filter((a) => a.path.length > 0);
  }

  const kit = deriveBrandKit({
    primaryColor: body.primaryColor ?? assets.find((a) => a.role === 'logo')?.primaryColor,
    backgroundColor: body.backgroundColor,
    textColor: body.textColor,
    font: body.font,
  });

  const sb = await generateStoryboard({
    prompt: String(body.prompt ?? ''),
    aspect: body.aspect ?? '16:9',
    // Browser-supplied key wins; otherwise fall back to server env (never logged).
    apiKey: (body.apiKey as string) || process.env.CORTEXI_GROQ_KEY || process.env.CORTEXI_GEMINI_KEY || undefined,
    // Leave provider undefined when the client did not choose one, so the LLM
    // layer can fall back to the configured shared provider (HF Router).
    provider: body.provider as 'groq' | 'gemini' | 'huggingface' | undefined,
    brandAssets: assets.map((a) => ({ id: a.id, name: a.name, role: a.role, url: a.path })),
    brandStyle: { ...kit, description: describeBrandKit(kit, assets) },
  });

  // Attach the kit + estimated cost so the UI can show the user what they are about to make.
  return c.json({
    ...sb,
    brandKit: kit,
    estimates: { durationSec: storyboardDuration(sb), spokenCharacters: spokenCharacters(sb) },
  });
});

// 2. Storyboard -> voiceover + word timings + durations
app.post('/api/voice', async (c) => {
  const body = await c.req.json();
  const sb = StoryboardSchema.parse(body.storyboard);
  const out = await generateVoiceover(sb);
  return c.json(out);
});

// File uploads (images for scenes, music)
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_UPLOAD_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp3', '.wav', '.m4a', '.ogg']);
app.post('/api/upload', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ error: 'no file' }, 400);
  const ext = path.extname(file.name).toLowerCase() || '.bin';
  if (!ALLOWED_UPLOAD_EXT.has(ext)) return c.json({ error: `file type not allowed: ${ext}` }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: 'file too large (max 50 MB)' }, 400);
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return c.json({ path: `uploads/${name}` });
});

// Local product cutout. The Python helper uses rembg with a locally cached U2Net model.
app.post('/api/cutout', async (c) => {
  const body = await c.req.json();
  const relative = String(body.path ?? '');
  const source = path.resolve(ASSETS_DIR, relative);
  if (!source.startsWith(path.resolve(ASSETS_DIR)) || !existsSync(source)) return c.json({ error: 'Source asset not found' }, 400);
  const output = path.join(UPLOAD_DIR, `${randomUUID().slice(0, 8)}-cutout.png`);
  const script = path.resolve(process.cwd(), 'server/scripts/remove_background.py');
  try {
    const { stdout } = await execFileP('python', [script, source, output], { timeout: 10 * 60 * 1000, maxBuffer: 2 * 1024 * 1024 });
    return c.json({ path: `uploads/${path.basename(output)}`, model: 'u2net', output: String(stdout).trim() });
  } catch (e) {
    const error = e as { stderr?: string; message: string };
    return c.json({ error: `Local rembg failed: ${error.stderr || error.message}` }, 500);
  }
});

// Common roots for POSIX systems.
function tryListRoots(): string[] {
  return ['/', '/home', '/Users', '/mnt', '/media'].filter(existsSync);
}

// Folder browser for the export-destination picker. Works on any device because
// the listing happens server-side (browsers never expose absolute paths to JS).
const isWin = process.platform === 'win32';
app.get('/api/folders', (c) => {
  const raw = c.req.query('path');
  const tryList = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('$'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const parent = path.resolve(dir, '..');
    return c.json({
      path: dir,
      parent: parent === dir ? null : parent,
      dirs: entries,
    });
  };
  try {
    if (!raw) {
      if (isWin) {
        const drives: string[] = [];
        for (let i = 65; i <= 90; i++) {
          const d = `${String.fromCharCode(i)}:\\`;
          if (existsSync(d)) drives.push(d);
        }
        return c.json({ path: null, parent: null, dirs: drives });
      }
      return c.json({ path: '/', parent: null, dirs: tryListRoots() });
    }
    const dir = path.resolve(raw);
    if (!existsSync(dir)) return c.json({ error: 'path not found' }, 404);
    return tryList(dir);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 403);
  }
});

// 3. Storyboard -> render job (LOCAL DESKTOP ONLY).
// On hosted deployments video encoding happens in the user's browser, so the
// Remotion/Chromium path is disabled unless CORTEXI_ENABLE_SERVER_RENDER=1.
const serverRenderEnabled = process.env.CORTEXI_ENABLE_SERVER_RENDER === '1';

app.post('/api/render', async (c) => {
  if (!serverRenderEnabled) {
    return c.json({
      error: 'Server rendering is disabled in this deployment. Cortexi renders on your device instead.',
      renderMode: 'browser',
    }, 409);
  }
  const body = await c.req.json();
  // Normalize at the render funnel, not just in the planner. Every storyboard
  // passes through here, so a hand-authored or LLM-generated board gets its
  // visuals filled and its invariants enforced identically. Normalizing only in
  // the planner would miss boards arriving from anywhere else.
  const sb = normalizeStoryboard(body.storyboard);
  const job = enqueueRender(sb, body.quality === 'final' ? 'final' : 'draft');
  return c.json({ jobId: job.id, renderMode: 'server' });
});

app.get('/api/jobs/:id', (c) => {
  const job = getJob(c.req.param('id'));
  if (!job) return c.json({ error: 'not found' }, 404);
  return c.json(job);
});

// Static: generated audio, uploads, rendered output.
// NOTE: serveStatic joins req.path onto root, so strip the /assets prefix
// (otherwise it looks for assets/assets/... and falls through to the SPA shell).
app.use('/assets/*', serveStatic({
  root: ASSETS_DIR,
  rewriteRequestPath: (p) => p.replace(/^\/assets/, ''),
}));

// Static: web build (production)
app.use('/*', serveStatic({ root: WEB_DIST }));
app.get('*', serveStatic({ path: path.join(WEB_DIST, 'index.html') }));

// ---- Startup: self-checks + output retention ---------------------------------

const KEEP_OUTPUTS = 20; // newest N rendered MP4s kept in assets/output

async function startupTasks() {
  // Dependency self-check (warnings only, actionable messages).
  const checks: [string, Promise<any>][] = [
    ['ffprobe', execFileP('ffprobe', ['-version'])],
    ['edge-tts', execFileP('edge-tts', ['--version'])],
  ];
  for (const [name, p] of checks) {
    try { await p; } catch {
      console.warn(`[check] ${name} not found on PATH â€” some features will fall back or fail. See README prerequisites.`);
    }
  }
  if (!process.env.CORTEXI_CHROME) {
    console.warn('[check] CORTEXI_CHROME not set â€” will auto-detect a local Chrome/Edge.');
  }
  if (!process.env.CORTEXI_GROQ_KEY && !process.env.CORTEXI_GEMINI_KEY) {
    console.log('[check] No server-side LLM key set â€” users can paste their own key in the UI.');
  }

  // Output retention: keep only the newest KEEP_OUTPUTS renders.
  try {
    const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith('.mp4'));
    if (files.length > KEEP_OUTPUTS) {
      const withStats = await Promise.all(
        files.map(async (f) => ({ f, mtime: (await stat(path.join(OUT_DIR, f))).mtimeMs }))
      );
      withStats.sort((a, b) => b.mtime - a.mtime);
      for (const { f } of withStats.slice(KEEP_OUTPUTS)) {
        await unlink(path.join(OUT_DIR, f));
        console.log('[retention] removed old output', f);
      }
    }
  } catch { /* out dir may not exist yet */ }
}

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(`\n  Cortexi server running â†’ http://localhost:${info.port} (bound to ${host})\n`);
  void startupTasks();
});
