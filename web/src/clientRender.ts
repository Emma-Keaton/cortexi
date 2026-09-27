/**
 * Cortexi client-side renderer.
 *
 * Renders storyboard scenes to a canvas in real time, captures that canvas
 * with MediaRecorder, and mixes the per-scene voiceover audio into the stream.
 * The hosted backend (Render free tier) is never asked to run Remotion.
 */
import type { Scene } from './AppTypes.js';
import { assetUrl } from './api.js';

export type RenderProgress = {
  phase: 'preparing' | 'rendering' | 'encoding' | 'done';
  percent: number;
};

/** Download container offered to the user. MP4 is the default. */
export type ExportFormat = 'mp4' | 'webm';

export type ClientStoryboard = {
  title: string;
  aspect: '16:9' | '9:16' | '1:1';
  fps: number;
  style: { primaryColor: string; backgroundColor: string; textColor: string; font: string };
  voice: { engine: string; voice: string };
  music?: { file: string; volume: number };
  captions: boolean;
  scenes: Array<Scene & { words?: Array<{ word: string; start: number; end: number }> }>;
};

const ASPECT_DIMENSIONS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
} as const;

const RESOLUTION_SCALE: Record<'draft' | 'final', number> = { draft: 0.5, final: 1 };

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
): void {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const total = lines.length * lineHeight;
  lines.forEach((line, i) => ctx.fillText(line, 0, -total / 2 + lineHeight * (i + 0.5)));
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene & { __image?: CanvasImageSource; __imageW?: number; __imageH?: number },
  storyboard: ClientStoryboard,
  width: number,
  height: number,
  elapsed: number,
): void {
  const { style } = storyboard;
  ctx.fillStyle = style.backgroundColor || '#0A0A0E';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, style.primaryColor);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  if (scene.__image && scene.__imageW && scene.__imageH) {
    const scale = Math.max(width / scene.__imageW, height / scene.__imageH);
    const w = scene.__imageW * scale;
    const h = scene.__imageH * scale;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(scene.__image, (width - w) / 2, (height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  const headlineSize = Math.round(height * 0.075);
  const bodySize = Math.round(height * 0.038);
  const pad = Math.round(width * 0.08);
  const t = Math.min(1, elapsed / 0.6);
  let offsetX = 0;
  let scaleFactor = 1;
  if (scene.animation === 'zoom') scaleFactor = 0.92 + 0.08 * t;
  else if (scene.animation === 'slide-left') offsetX = (1 - t) * width * 0.06;
  else if (scene.animation === 'slide-right') offsetX = -(1 - t) * width * 0.06;

  ctx.save();
  ctx.globalAlpha = t;
  ctx.translate(width / 2 + offsetX, height / 2);
  ctx.scale(scaleFactor, scaleFactor);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.textColor || '#FFFFFF';
  ctx.font = `700 ${headlineSize}px ${style.font || 'Inter, sans-serif'}`;
  wrapText(ctx, scene.headline, width - pad * 2, headlineSize * 1.15);
  if (scene.body) {
    ctx.font = `500 ${bodySize}px ${style.font || 'Inter, sans-serif'}`;
    ctx.globalAlpha = t * 0.85;
    wrapText(ctx, scene.body, width - pad * 2, bodySize * 1.35);
  }
  ctx.restore();

  if (storyboard.captions && scene.words?.length) {
    const word = scene.words.find((w) => elapsed >= w.start && elapsed < w.end);
    if (word) {
      const size = Math.round(height * 0.045);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${size}px ${style.font || 'Inter, sans-serif'}`;
      const w = ctx.measureText(word.word).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(width / 2 - w / 2 - 20, height - size * 2.2, w + 40, size * 1.6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(word.word, width / 2, height - size * 1.4);
      ctx.restore();
    }
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadAudio(src: string, ctx: BaseAudioContext): Promise<AudioBuffer> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to load audio: ${src}`);
  return ctx.decodeAudioData(await response.arrayBuffer());
}

function estimateDuration(scene: Scene): number {
  const words = `${scene.headline} ${scene.body ?? ''}`.trim().split(/\s+/).length;
  return Math.max(2, words / 2.5);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const FFMPEG_CORE_VERSION = '0.12.10';
const FFMPEG_CORE_CDN = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

/** Transcode recorded WebM into MP4 (H.264 + AAC) entirely in the browser. */
async function transcodeToMp4(input: Blob, onProgress?: (p: RenderProgress) => void): Promise<Blob> {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.({ phase: 'encoding', percent: Math.round(5 + progress * 95) });
  });
  const base = FFMPEG_CORE_CDN;
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  await ffmpeg.writeFile('input.webm', await fetchFile(input));
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    'output.mp4',
  ]);
  const data = await ffmpeg.readFile('output.mp4');
  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');
  // Copy into a plain ArrayBuffer: ffmpeg's FileData is typed as a possibly-shared view.
  const bytes = new Uint8Array(data as Uint8Array);
  return new Blob([bytes.slice().buffer], { type: 'video/mp4' });
}

export async function renderOnDevice(
  storyboard: ClientStoryboard,
  quality: 'draft' | 'final',
  format: ExportFormat,
  onProgress?: (p: RenderProgress) => void,
): Promise<{ blob: Blob; extension: ExportFormat; durationSec: number }> {
  const recorded = await recordScenes(storyboard, quality, onProgress);
  if (format === 'webm') { onProgress?.({ phase: 'done', percent: 100 }); return { ...recorded, extension: 'webm' }; }
  try {
    const mp4 = await transcodeToMp4(recorded.blob, onProgress);
    onProgress?.({ phase: 'done', percent: 100 });
    return { blob: mp4, extension: 'mp4', durationSec: recorded.durationSec };
  } catch (err) {
    console.warn('[clientRender] MP4 transcode failed:', err);
    onProgress?.({ phase: 'done', percent: 100 });
    throw new Error('MP4 conversion failed in this browser. Please use a recent Chrome or Edge build, or choose the WebM format.');
  }
}

async function recordScenes(
  storyboard: ClientStoryboard,
  quality: 'draft' | 'final',
  onProgress?: (p: RenderProgress) => void,
): Promise<{ blob: Blob; durationSec: number }> {
  onProgress?.({ phase: 'preparing', percent: 0 });
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record video. Use a recent Chrome, Edge, or Firefox build.');
  }

  const { width: fullW, height: fullH } = ASPECT_DIMENSIONS[storyboard.aspect];
  const scale = RESOLUTION_SCALE[quality];
  const width = Math.round(fullW * scale);
  const height = Math.round(fullH * scale);
  const fps = quality === 'draft' ? Math.min(15, storyboard.fps) : storyboard.fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser.');

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();

  let offset = 0;
  const scenes: Array<Scene & { __image?: HTMLImageElement; duration: number }> = [];
  for (const scene of storyboard.scenes) {
    const duration = Math.max(1.5, scene.durationSec ?? estimateDuration(scene));
    const prepared: Scene & { __image?: HTMLImageElement; duration: number } = { ...scene, duration };
    if (scene.image) {
      const url = assetUrl(scene.image);
      if (url) prepared.__image = await loadImage(url).catch(() => undefined);
    }
    if (scene.audioFile) {
      const url = assetUrl(scene.audioFile);
      if (url) {
        const buffer = await loadAudio(url, audioCtx).catch(() => undefined);
        if (buffer) {
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(dest);
          source.start(audioCtx.currentTime + offset);
        }
      }
    }
    offset += duration;
    scenes.push(prepared);
  }

  if (storyboard.music?.file) {
    const url = assetUrl(storyboard.music.file);
    if (url) {
      const music = await loadAudio(url, audioCtx).catch(() => undefined);
      if (music) {
        const gain = audioCtx.createGain();
        gain.gain.value = storyboard.music.volume ?? 0.12;
        const source = audioCtx.createBufferSource();
        source.buffer = music;
        source.loop = true;
        source.connect(gain).connect(dest);
        source.start();
      }
    }
  }

  const totalDuration = offset;
  const videoStream = canvas.captureStream(fps);
  const mixed = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) throw new Error('No supported WebM recording profile is available in this browser.');

  const recorder = new MediaRecorder(mixed, {
    mimeType,
    videoBitsPerSecond: quality === 'final' ? 8_000_000 : 3_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const finished = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });

  onProgress?.({ phase: 'preparing', percent: 5 });
  await audioCtx.resume();
  recorder.start(200);

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = () => {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed >= totalDuration) { resolve(); return; }
      let acc = 0;
      let current = scenes[0];
      let local = 0;
      for (const s of scenes) {
        if (elapsed < acc + s.duration) { current = s; local = elapsed - acc; break; }
        acc += s.duration;
      }
      drawScene(ctx, current, storyboard, width, height, local);
      onProgress?.({ phase: 'rendering', percent: Math.round((elapsed / totalDuration) * 95) });
      const targetFrame = Math.floor((performance.now() - start) / (1000 / fps));
      const nextDelay = Math.max(0, targetFrame * (1000 / fps) - (performance.now() - start) + 1000 / fps);
      setTimeout(step, nextDelay);
    };
    step();
  });

  recorder.stop();
  const blob = await finished;
  await audioCtx.close();
  onProgress?.({ phase: 'done', percent: 100 });
  return { blob, durationSec: totalDuration };
}


