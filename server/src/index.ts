import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mkdir, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { generateStoryboard } from './llm.js';
import { generateVoiceover } from './tts.js';
import { enqueueRender, getJob } from './render.js';
import { getSettings, saveSettings } from './settings.js';
import { StoryboardSchema } from './types.js';
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
]);
app.use('/api/*', cors({
  origin: (o) => (o && allowedOrigins.has(o) ? o : null),
}));

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

app.get('/api/voices', (c) =>
  c.json([
    'en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural',
    'en-GB-SoniaNeural', 'en-AU-NatashaNeural', 'en-IN-NeerjaNeural',
  ])
);

// 1. Prompt -> storyboard JSON
app.post('/api/plan', async (c) => {
  const body = await c.req.json();
  const sb = await generateStoryboard({
    prompt: String(body.prompt ?? ''),
    aspect: body.aspect ?? '16:9',
    // Browser-supplied key wins; otherwise fall back to server env (never logged).
    apiKey: (body.apiKey as string) || process.env.CORTEXI_GROQ_KEY || process.env.CORTEXI_GEMINI_KEY || undefined,
    provider: body.provider ?? 'groq',
  });
  return c.json(sb);
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

// 3. Storyboard -> render job
app.post('/api/render', async (c) => {
  const body = await c.req.json();
  const sb = StoryboardSchema.parse(body.storyboard);
  const job = enqueueRender(sb, body.quality === 'final' ? 'final' : 'draft');
  return c.json({ jobId: job.id });
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
      console.warn(`[check] ${name} not found on PATH — some features will fall back or fail. See README prerequisites.`);
    }
  }
  if (!process.env.CORTEXI_CHROME) {
    console.warn('[check] CORTEXI_CHROME not set — will auto-detect a local Chrome/Edge.');
  }
  if (!process.env.CORTEXI_GROQ_KEY && !process.env.CORTEXI_GEMINI_KEY) {
    console.log('[check] No server-side LLM key set — users can paste their own key in the UI.');
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
  console.log(`\n  Cortexi server running → http://localhost:${info.port} (bound to ${host})\n`);
  void startupTasks();
});
