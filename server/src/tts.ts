import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Storyboard } from './types.js';
import { parseVtt } from './vtt.js';
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

/** Generate per-scene voiceover with edge-tts; fills audioFile, words, durationSec. */
export async function generateVoiceover(sb: Storyboard): Promise<Storyboard> {
  if (sb.voice.engine === 'none') {
    // Give scenes sensible default durations based on text length.
    sb.scenes = sb.scenes.map((s) => ({
      ...s,
      durationSec: s.durationSec ?? Math.max(2.5, ((s.headline + ' ' + (s.body ?? '')).split(' ').length / 2.5)),
    }));
    return sb;
  }
  await mkdir(AUDIO_DIR, { recursive: true });
  const scenes = [] as Storyboard['scenes'];
  for (const scene of sb.scenes) {
    const text = [scene.headline, scene.body].filter(Boolean).join('. ');
    const mp3 = path.join(AUDIO_DIR, `${scene.id}.mp3`);
    const vtt = path.join(AUDIO_DIR, `${scene.id}.vtt`);
    try {
      await run('edge-tts', [
        '--voice', sb.voice.voice,
        '--text', text,
        '--write-media', mp3,
        '--write-subtitles', vtt,
      ]);
      const words = parseVtt(await readFile(vtt, 'utf-8'));
      const durationSec = await probeDuration(mp3);
      scenes.push({
        ...scene,
        audioFile: `audio/${scene.id}.mp3`,
        durationSec: Math.max(1.5, durationSec + 0.3),
        words,
      });
    } catch (e) {
      console.warn(`[tts] scene ${scene.id} failed:`, (e as Error).message);
      scenes.push({
        ...scene,
        durationSec: Math.max(2.5, text.split(' ').length / 2.5),
      });
    }
  }
  return { ...sb, scenes };
}
