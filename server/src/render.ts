import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, copyFile, readdir, unlink, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { RenderJob, Storyboard } from './types.js';
import { getSettings } from './settings.js';
import { OUT_DIR, REMOTION_ENTRY } from './paths.js';

/** Half-res @15fps for draft; keeps wall-clock duration by scaling frames. */
export function scaleForQuality(
  composition: { width: number; height: number; fps: number; durationInFrames: number },
  quality: 'draft' | 'final'
) {
  const fps = quality === 'draft' ? 15 : composition.fps;
  return {
    width: quality === 'draft' ? Math.round(composition.width / 2) : composition.width,
    height: quality === 'draft' ? Math.round(composition.height / 2) : composition.height,
    fps,
    durationInFrames: Math.round((composition.durationInFrames / composition.fps) * fps),
  };
}

/** Use a locally installed Chrome/Edge so no browser download is needed. */
function findBrowser(): string | undefined {
  if (process.env.CORTEXI_CHROME && existsSync(process.env.CORTEXI_CHROME))
    return process.env.CORTEXI_CHROME;
  const candidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find(existsSync);
}
const BROWSER = findBrowser();
const jobs = new Map<string, RenderJob>();
let bundleUrl: string | null = null;
let queue: Promise<void> = Promise.resolve();

export function getJob(id: string) {
  return jobs.get(id);
}

async function getBundle(): Promise<string> {
  if (!bundleUrl) {
    console.log('[render] Bundling Remotion project (one-time)...');
    bundleUrl = await bundle({
      entryPoint: REMOTION_ENTRY,
    });
    console.log('[render] Bundle ready:', bundleUrl);
  }
  return bundleUrl;
}

export function enqueueRender(sb: Storyboard, quality: 'draft' | 'final'): RenderJob {
  const job: RenderJob = {
    id: randomUUID().slice(0, 8),
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  // Serialize renders - critical on low-RAM machines.
  queue = queue.then(() => doRender(job, sb, quality)).catch(() => {});
  return job;
}

async function doRender(job: RenderJob, sb: Storyboard, quality: 'draft' | 'final') {
  job.status = 'rendering';
  try {
    const serveUrl = await getBundle();
    await mkdir(OUT_DIR, { recursive: true });

    const inputProps = { storyboard: sb, quality };
    const composition = await selectComposition({
      serveUrl,
      id: 'CortexiVideo',
      inputProps,
    });

    const outFile = path.join(OUT_DIR, `${job.id}.mp4`);
    const scaled = scaleForQuality(composition, quality);
    await renderMedia({
      composition: {
        ...composition,
        ...scaled,
      },
      serveUrl,
      codec: 'h264',
      outputLocation: outFile,
      inputProps,
      concurrency: 1, // 4GB RAM safety
      timeoutInMilliseconds: 120000,
      ...(BROWSER ? { browserExecutable: BROWSER } : {}),
      onProgress: ({ progress }) => {
        job.progress = Math.round(progress * 100);
      },
    });

    job.status = 'done';
    job.progress = 100;
    job.output = `output/${job.id}.mp4`;

    // Copy the finished MP4 to the user's chosen export folder, if configured.
    const { exportDir } = await getSettings();
    if (exportDir) {
      try {
        await mkdir(exportDir, { recursive: true });
        const dest = path.join(exportDir, `cortexi-${job.id}.mp4`);
        await copyFile(outFile, dest);
        job.exportedTo = dest;
        console.log('[render] exported copy →', dest);
      } catch (err) {
        console.error('[render] export copy failed:', err);
      }
    }
  } catch (e) {
    console.error('[render] failed:', e);
    job.status = 'error';
    job.error = (e as Error).message;
  }
}
