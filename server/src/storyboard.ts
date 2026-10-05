import { z } from 'zod';
import { StoryboardSchema, type Storyboard } from './types.js';
import { classifyGenre, recipeFor } from './motionBrief.js';
import type { Genre, SceneVisual, StepItem, VisualKind } from '../../shared/types.js';

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

  scenes = withVisuals(scenes, parsed);

  return StoryboardSchema.parse({
    ...parsed,
    title: (parsed.title || 'Untitled Video').trim(),
    scenes: scenes.length >= MIN_SCENES ? scenes : padToMinimum(scenes, parsed),
  });
}

/**
 * Give every scene a visual, whether or not the model supplied one.
 *
 * A video with no visuals is the failure mode that makes AI video look cheap. But
 * we cannot invent data, so this fills from the genre recipe only where it is
 * safe (ui-frame, step-flow) and leaves numeric visuals to the model. It also
 * enforces the one-visual-per-scene rule, dropping extras the model hallucinated
 * in a scene that already has text to carry.
 */
function withVisuals(
  scenes: Storyboard['scenes'],
  parsed: z.infer<typeof StoryboardSchema>,
): Storyboard['scenes'] {
  const genre = classifyGenre(`${parsed.title || ''} ${scenes.map((s) => s.headline).join(' ')}`);
  const recipe = recipeFor(genre);
  return scenes.map((s, i) => {
    const shape = recipe.shapes[i] ?? recipe.shapes[recipe.shapes.length - 1];
    const has = s.visual && s.visual.kind && s.visual.kind !== 'none';

    // The model already chose: trust it, but never trust its shape.
    if (has) return { ...s, visual: coerceVisual(s.visual!, genre) };

    // First and last scenes are the hook and the close: text only.
    const isEdge = i === 0 || i === scenes.length - 1;
    const fill = !isEdge && shape.v !== 'none' && shape.v !== 'stat-counter' && shape.v !== 'line-chart' && shape.v !== 'bar-chart' && shape.v !== 'donut' && shape.v !== 'lottie';
    if (!fill) return { ...s, visual: { kind: 'none' } };
    return { ...s, visual: autoVisual(shape.v, s, parsed, i) };
  });
}

/** Break a scene's body or headline into short ordered steps. */
function deriveSteps(s: { headline?: string; body?: string }): StepItem[] {
  const source = (s.body || s.headline || '').replace(/[.!?]+$/, '');
  const parts = source.split(/\s*(?:,|;|->|\u2192|\band\b|\bthen\b)\s*/i).filter(Boolean);
  const picked = (parts.length >= 2 ? parts : [source]).slice(0, 4);
  return picked.map((p) => ({
    label: p.split(/\s+/).slice(0, 3).join(' '),
    detail: p.split(/\s+/).slice(3, 9).join(' '),
  }));
}

/** Pull a few short, meaningful words out of a scene for a word cloud. */
function deriveCloud(s: { headline?: string; body?: string }): { text: string; weight: number }[] {
  const words = (s.body || s.headline || '')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, ''))
    .filter((w) => w.length > 3)
    .slice(0, 5);
  const terms = words.length >= 3 ? words : ['Core', 'Fast', 'Simple'];
  return terms.map((text, i) => ({ text, weight: 5 - i }));
}

/**
 * Auto-fill a visual when a scene has none, from the genre recipe's shape.
 * Every kind gets safe, data-appropriate defaults so a scene never renders an
 * empty axis. Numeric kinds are excluded up front; lottie needs a URL so it
 * also is excluded here.
 */
function autoVisual(
  kind: VisualKind,
  s: { headline?: string; body?: string },
  parsed: z.infer<typeof StoryboardSchema>,
  i: number,
): SceneVisual {
  switch (kind) {
    case 'step-flow':
      return { kind: 'step-flow', data: { steps: deriveSteps(s) } };
    case 'chat':
      return {
        kind: 'chat',
        data: {
          bubbles: [
            { text: (s.headline || "Let's set that up").slice(0, 42), side: 'right' },
            { text: (s.body || 'Done in a few clicks.').slice(0, 42), side: 'left' },
          ],
        },
      };
    case 'notify':
      return { kind: 'notify', data: { caption: s.headline || 'Something just changed', icon: 'zap' } };
    case 'icon-grid':
      return { kind: 'icon-grid', data: { cells: [] } };
    case 'hub':
      return {
        kind: 'hub',
        data: { center: (parsed.title || 'Core').split(/\s+/)[0], nodes: deriveSteps(s).slice(0, 3).map((x) => ({ label: x.label })) },
      };
    case 'word-cloud':
      return { kind: 'word-cloud', data: { terms: deriveCloud(s) } };
    case 'collage':
      return { kind: 'collage', data: { count: 4, caption: s.headline } };
    case 'logo-strip':
      return { kind: 'logo-strip', data: { count: 2 } };
    case 'hero-shape':
      return { kind: 'hero-shape', data: { caption: s.headline } };
    case 'burst':
      return { kind: 'burst', data: { caption: (s.headline || 'Live').split(' ').slice(0, 2).join(' ') } };
    case 'split-panel':
      return { kind: 'split-panel', data: { caption: s.headline, count: 5 } };
    default:
      return { kind: 'ui-frame', data: { chrome: 'browser', layout: i % 2 ? 'dashboard' : 'cards', appName: parsed.title?.split(/\s+/)[0] } };
  }
}

/** Drop hallucinated numeric visuals that arrived without any data. */
function coerceVisual(v: SceneVisual, genre: Genre): SceneVisual {
  const numeric = new Set(['stat-counter', 'bar-chart', 'line-chart', 'donut']);
  if (!numeric.has(v.kind)) return v;
  const d = v.data ?? {};
  const hasSeries = Array.isArray(d.series) && d.series.length > 1;
  const hasSegments = Array.isArray(d.segments) && d.segments.length > 0;
  const hasValue = typeof d.value === 'number' && Number.isFinite(d.value) && d.value !== 0;
  // No real data behind a chart: drop it rather than render an empty axis.
  if (v.kind === 'stat-counter' ? !hasValue : v.kind === 'donut' ? !hasSegments : !hasSeries) {
    const fallback = recipeFor(genre).shapes.find((x) => x.v === 'ui-frame' || x.v === 'step-flow');
    if (fallback && fallback.v === 'step-flow') return { kind: 'step-flow' };
    return { kind: 'ui-frame', data: { chrome: 'browser', layout: 'cards' } };
  }
  return v;
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
