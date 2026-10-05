import type { WordTiming } from './types.js';

/** Parse a WebVTT subtitle file into per-word timings (kept for tests; local engines estimate timings instead). */
export function parseVtt(vtt: string): WordTiming[] {
  const words: WordTiming[] = [];
  const blocks = vtt.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(
        /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/
      );
      if (!m) continue;
      const start =
        +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
      const end = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000;
      // text is on following line(s)
      const text = lines
        .slice(i + 1)
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (!text) continue;
      for (const w of text.split(/\s+/)) {
        if (w) words.push({ word: w, start, end });
      }
    }
  }
  return words;
}
