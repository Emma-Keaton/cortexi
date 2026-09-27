import { z } from 'zod';
import { StoryboardSchema, type Storyboard } from './types.js';

/**
 * Storyboard post-processing.
 *
 * The LLM is good at copy but not at structural guarantees. These rules make
 * every generated storyboard safe to render without special-casing it downstream.
 */

export const MIN_SCENES = 3;
export const MAX_SCENES = 6;
export const MIN_SCENE_SEC = 1.5;
export const MAX_SCENE_SEC = 12;

/** Average reading speed used when a scene has no measured audio duration. */
const WORDS_PER_SECOND = 2.5;

export function estimateSceneDuration(headline: string, body?: string): number {
  const words = `${headline} ${body ?? ''}`.trim().split(/\s+/).filter(Boolean).length;
  return clampDuration(Math.max(MIN_SCENE_SEC, words / WORDS_PER_SECOND));
}

export function clampDuration(sec: number): number {
  return Math.min(MAX_SCENE_SEC, Math.max(MIN_SCENE_SEC, Number(sec.toFixed(2))));
}

const ANIMATIONS = ['fade-up', 'zoom', 'slide-left', 'slide-right', 'mask-reveal'] as const;

/**
 * Enforce the invariants the renderer and TTS stages rely on:
 *  - sequential ids
 *  - an opening title card and a closing CTA
 *  - 3..6 scenes
 *  - positive, clamped durations
 *  - non-repeating consecutive animations
 */
export function normalizeStoryboard(input: z.input<typeof StoryboardSchema>): Storyboard {
  const parsed = StoryboardSchema.parse(input);
  let scenes = parsed.scenes.slice(0, MAX_SCENES);

  if (scenes.length === 0) {
    scenes = [{ id: 's1', template: 'title-card', headline: parsed.title || 'Untitled', animation: 'fade-up' }];
  }

  // Guarantee exactly one opener and one closer.
  scenes[0] = { ...scenes[0], template: 'title-card' };
  scenes[scenes.length - 1] = {
    ...scenes[scenes.length - 1],
    template: scenes.length === 1 ? 'outro' : 'outro',
  };

  scenes = scenes.map((s, i) => ({
    ...s,
    id: `s${i + 1}`,
    headline: (s.headline || parsed.title || 'Scene').trim(),
    body: s.body?.trim() || undefined,
    animation: ANIMATIONS.includes(s.animation as never) ? s.animation : 'fade-up',
    durationSec: clampDuration(s.durationSec ?? estimateSceneDuration(s.headline, s.body)),
  }));

  // Avoid two identical entrances back to back; looks like a rendering bug.
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].animation === scenes[i - 1].animation) {
      const current = scenes[i].animation as (typeof ANIMATIONS)[number];
      scenes[i] = { ...scenes[i], animation: ANIMATIONS[(ANIMATIONS.indexOf(current) + 1) % ANIMATIONS.length] };
    }
  }

  return StoryboardSchema.parse({
    ...parsed,
    title: (parsed.title || 'Untitled Video').trim(),
    scenes: scenes.length >= MIN_SCENES ? scenes : padToMinimum(scenes, parsed),
  });
}

/** If the model returned fewer than MIN_SCENES scenes, synthesise a valid arc. */
function padToMinimum(scenes: Storyboard['scenes'], parsed: z.infer<typeof StoryboardSchema>): Storyboard['scenes'] {
  const out = [...scenes];
  const title = parsed.title || 'Your Story';

  // Build plausible middle beats from the title when the model gave us too little.
  const filler: Array<{ headline: string; body: string }> = [
    { headline: 'Why It Matters', body: 'The problem your audience already feels every day.' },
    { headline: 'How It Works', body: 'A closer look at the part that sets you apart.' },
    { headline: 'Built For You', body: 'Everything you need, nothing you do not.' },
  ];

  let fi = 0;
  while (out.length < MIN_SCENES) {
    const extra = filler[fi % filler.length];
    // Insert before the closing outro so the arc still ends on a CTA.
    out.splice(Math.max(1, out.length - 1), 0, {
      id: 'pad',
      template: 'feature',
      headline: extra.headline,
      body: extra.body,
      animation: 'fade-up',
      durationSec: estimateSceneDuration(extra.headline, extra.body),
    });
    fi++;
  }

  out[0] = { ...out[0], template: 'title-card' };
  out[out.length - 1] = { ...out[out.length - 1], template: 'outro' };
  if (!out[0].headline) out[0] = { ...out[0], headline: title };

  return out.map((s, i) => ({ ...s, id: `s${i + 1}`, durationSec: clampDuration(s.durationSec ?? 3) }));
}

/** Total runtime, used for quota checks and UI estimates. */
export function storyboardDuration(sb: Storyboard): number {
  return sb.scenes.reduce((total, s) => total + (s.durationSec ?? 3), 0);
}

/** Characters of spoken copy, used to size TTS work before starting it. */
export function spokenCharacters(sb: Storyboard): number {
  return sb.scenes.reduce(
    (total, s) => total + [s.headline, s.body].filter(Boolean).join(' ').length,
    0,
  );
}
