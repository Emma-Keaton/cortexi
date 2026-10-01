/**
 * Cortexi motion primitives.
 *
 * Shared verbatim by every render path: the browser canvas renderer, the Remotion
 * (server) renderer, and the Studio preview. One implementation, so a frame drawn
 * in the preview is the frame that gets encoded.
 *
 * Everything here is a pure function of time. Nothing reads a clock, a DOM node,
 * or a React render. That is the whole point: given `t`, you get the same numbers
 * on every machine, every run, forever. Rendering is then reproducible and
 * frame-accurate by construction rather than by careful bookkeeping.
 *
 * Craft constants come from the `animation-principles` and
 * `animated-infographic` skills (iart-ai/motion-skills, MIT) - see `skills-src/`.
 */

export type Bezier = readonly [number, number, number, number];
export type EaseName = 'linear' | 'enter' | 'exit' | 'move' | 'playful' | 'soft' | 'snap';

/**
 * Curves are chosen by *intent*, not taste. Symmetric ease-in-out on an entrance
 * is the most common reason motion reads as generic.
 */
export const EASINGS: Record<Exclude<EaseName, 'linear'>, Bezier> = {
  // Enter/appear: fast start, gentle settle. Arrives with energy, decelerates in.
  enter: [0.16, 1, 0.3, 1],
  // Exit: gentle start, fast end. Accelerates away.
  exit: [0.7, 0, 0.84, 0],
  // Move/reposition while staying on screen: symmetric.
  move: [0.65, 0, 0.35, 1],
  // Overshoot-and-settle. Reads as weight. Sparingly, on one focal element.
  playful: [0.34, 1.56, 0.64, 1],
  // Heavy objects start slowly and land softly.
  soft: [0.32, 0, 0.67, 0],
  // Light objects that snap immediately.
  snap: [0.22, 1, 0.36, 1],
};

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;

/** Evaluate a cubic bezier timing function at x in [0,1]. */
function bezierEasing([x1, y1, x2, y2]: Bezier) {
  if (x1 === y1 && x2 === y2) return (x: number) => x;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Newton-Raphson first: fast when the curve is well-conditioned.
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < NEWTON_MIN_SLOPE) return t;
      const d = sampleDerivX(t);
      if (Math.abs(d) < NEWTON_MIN_SLOPE) break;
      t -= err / d;
    }
    // Bisection fallback for the flat regions Newton cannot handle.
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < NEWTON_MIN_SLOPE) break;
      if (err > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
}

const easingCache = new Map<string, (x: number) => number>();

/** Resolve an ease name (or raw bezier) to an easing function. */
export function ease(name: EaseName | Bezier | undefined): (x: number) => number {
  if (name === undefined || name === 'linear') return (x) => x;
  if (typeof name !== 'string') return bezierEasing(name);
  const cached = easingCache.get(name);
  if (cached) return cached;
  const fn = bezierEasing(EASINGS[name] ?? EASINGS.enter);
  easingCache.set(name, fn);
  return fn;
}

// ---------------------------------------------------------------------------
// Springs
// ---------------------------------------------------------------------------

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  velocity?: number;
}

/**
 * Spring presets. Damping is the character dial: low damping overshoots visibly,
 * ~0.7-0.85 gives one clean overshoot, above 1 it never passes the target.
 */
export const SPRINGS: Record<string, SpringConfig> = {
  // Crisp UI entrance for icons and cards.
  pop: { stiffness: 180, damping: 10, mass: 0.5 },
  // Confident cascade for sibling reveals.
  enter: { stiffness: 170, damping: 14, mass: 0.6 },
  // Large, heavy elements (hero panels, full-bleed shapes).
  heavy: { stiffness: 120, damping: 20, mass: 1.1 },
  // No overshoot, for numbers that must land on an exact value.
  settle: { stiffness: 160, damping: 26, mass: 1 },
};

/**
 * Analytic damped harmonic oscillator: 0 -> 1 with physical overshoot.
 *
 * Solved in closed form rather than integrated step-by-step, so the result is
 * identical no matter how often or in what order it is called. A numeric
 * integrator would drift with call pattern and break reproducibility.
 */
export function spring(t: number, config: SpringConfig = SPRINGS.enter): number {
  const { stiffness: k, damping: c, mass: m, velocity: v0 = 0 } = config;
  if (t <= 0) return 0;

  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));

  if (zeta < 1) {
    // Underdamped: overshoots, then settles.
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const b = (zeta * w0 - v0) / wd;
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + b * Math.sin(wd * t));
  }
  if (Math.abs(zeta - 1) < 1e-6) {
    // Critically damped: fastest approach with no overshoot.
    return 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t);
  }
  // Overdamped: two real roots.
  const r = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + r;
  const r2 = -zeta * w0 - r;
  const c2 = (v0 - r1) / (r2 - r1);
  return 1 - ((1 - c2) * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

/** Settling time in ms: when a spring is within 0.1% of its target. */
export function springDuration(config: SpringConfig = SPRINGS.enter): number {
  const { stiffness: k, damping: c, mass: m } = config;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  return Math.max(1, -Math.log(0.001) / (zeta >= 1 ? w0 : zeta * w0)) * 1000;
}
// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

export interface MotionSpec {
  /** Milliseconds. */
  duration: number;
  /** Milliseconds to wait before starting. */
  delay?: number;
  ease?: EaseName | Bezier;
  spring?: SpringConfig;
  from?: number;
  to?: number;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Sample a motion spec at an absolute time. Mirrors the `sample()` seam in
 * Motion's JSAnimation, but standalone so it works with no DOM present.
 *
 * Returns exactly `from` before the delay and `to` after it. Springs extrapolate
 * past their target rather than clamping, which is what produces overshoot.
 */
export function sample(spec: MotionSpec, t: number): number {
  const { duration, delay = 0, from = 0, to = 1 } = spec;
  if (duration <= 0) return to;
  const local = t - delay;
  if (local <= 0) return from;
  if (spec.spring) return from + (to - from) * spring(local / 1000, spec.spring);
  return from + (to - from) * ease(spec.ease)(clamp01(local / duration));
}

/** Has this element finished entering? */
export function entered(spec: MotionSpec, t: number): boolean {
  return t >= (spec.delay ?? 0) + spec.duration;
}

// ---------------------------------------------------------------------------
// Timing vocabulary (from the motion skills)
// ---------------------------------------------------------------------------

/**
 * Duration by perceived scale. Small and light things snap; big and heavy things
 * need time or they look weightless.
 */
export const DURATION = {
  micro: 140,
  ui: 280,
  hero: 560,
  cinematic: 1100,
} as const;

/**
 * Sibling stagger, in ms. One consistent curve across siblings so a cascade
 * reads as confidence. Above ~15 frames it stops reading as a sequence.
 */
export function staggerFor(count: number, fps: number): number {
  if (count <= 1) return 0;
  const frames = count > 8 ? 5 : count > 5 ? 6 : 8;
  return (frames / fps) * 1000;
}

/**
 * Split a scene's budget across N ordered beats.
 *
 * Budget time per *element*, not per second of polish, and a viewer can only
 * track one moving thing at a time - so beats are strictly sequential. The step
 * is treated as the *gap* after a beat finishes, not as the offset between beat
 * starts, which is what keeps a short scene from overlapping its own beats.
 */
export function beatTimeline(count: number, totalMs: number, fps: number): MotionSpec[] {
  if (count <= 0) return [];
  const gap = staggerFor(count, fps);
  const each = Math.max(0, (totalMs - gap * (count - 1)) / count);
  return Array.from({ length: count }, (_, i) => ({
    duration: each,
    delay: i * (each + gap),
    ease: 'enter' as const,
  }));
}

/** Without music, one major event per ~500-800ms keeps a piece breathing. */
export const PULSE_MS = 620;

// ---------------------------------------------------------------------------
// Colour helpers used by the visual library
// ---------------------------------------------------------------------------

export function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = (hex || '#000000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const p = clamp01(t);
  return toHex(lerp(ca.r, cb.r, p), lerp(ca.g, cb.g, p), lerp(ca.b, cb.b, p));
}

export function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Relative luminance, for picking a readable foreground against `hex`. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}