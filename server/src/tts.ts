import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Storyboard } from './types.js';
import { ASSETS_DIR, AUDIO_DIR } from './paths.js';

const run = promisify(execFile);

export { ASSETS_DIR, AUDIO_DIR };

/** Run ffprobe to get media duration in seconds. */
export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', file,
  ]);
  return parseFloat(stdout.trim());
}

/**
 * Generate per-scene voiceover with a LOCAL engine (Piper default, Kokoro
 * optional); fills audioFile, words, durationSec. Microsoft edge-tts was
 * dropped on purpose - its consumer endpoint is ToS-grey for a public,
 * ad-supported product - so synthesis runs entirely on the backend.
 */
export async function generateVoiceover(sb: Storyboard): Promise<Storyboard> {
  const engine = sb.voice.engine;
  // Anything that is not a local synth engine (none, upload, legacy values)
  // gets data-driven durations instead of generated audio.
  if (engine !== 'piper' && engine !== 'kokoro') {
    sb.scenes = sb.scenes.map((s) => ({
      ...s,
      durationSec: s.durationSec ?? Math.max(2.5, ((s.headline + ' ' + (s.body ?? '')).split(' ').length / 2.5)),
    }));
    return sb;
  }
  await mkdir(AUDIO_DIR, { recursive: true });
  const isKokoro = engine === 'kokoro';
  const script = path.resolve(process.cwd(), `server/scripts/${isKokoro ? 'kokoro' : 'piper'}_tts.py`);
  const scenes = [] as Storyboard['scenes'];
  for (const scene of sb.scenes) {
    const text = [scene.headline, scene.body].filter(Boolean).join('. ');
    const mp3 = path.join(AUDIO_DIR, `${scene.id}.mp3`);
    try {
      // Piper emits WAV (ffmpeg to MP3); Kokoro emits MP3 directly.
      if (isKokoro) {
        await run('python', [script, text, sb.voice.voice, mp3]);
      } else {
        const wav = mp3.replace(/\.mp3$/, '.wav');
        await run('python', [script, text, sb.voice.voice, wav]);
        await run('ffmpeg', ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', mp3]);
      }
      const durationSec = await probeDuration(mp3);
      const tokens = text.split(/\s+/).filter(Boolean);
      const words = tokens.map((word, i) => ({ word, start: (i / tokens.length) * durationSec, end: ((i + 1) / tokens.length) * durationSec }));
      scenes.push({ ...scene, audioFile: `audio/${scene.id}.mp3`, durationSec: Math.max(1.5, durationSec + 0.3), words });
    } catch (e) {
      console.warn(`[tts] scene ${scene.id} failed:`, (e as Error).message);
      scenes.push({ ...scene, durationSec: Math.max(2.5, text.split(' ').length / 2.5) });
    }
  }
  return { ...sb, scenes };
}
