/**
 * Cortexi visual library: UI and infographic compositions drawn to canvas 2D.
 *
 * Drawn rather than DOM-composed on purpose. We encode frames to H.264 with
 * WebCodecs, so every visual has to end up in a 2D context we own. Building the
 * same infographic twice - once as React DOM for preview, once on canvas for
 * output - guarantees the two drift apart, and a design that only looks right in
 * the preview is worse than no preview at all.
 *
 * So: one function per visual, called by the preview AND by both render paths.
 *
 * Every function takes `t` in ms since scene start and is a pure function of it.
 * Nothing here samples a clock or measures the DOM.
 */

import {
  DURATION,
  SPRINGS,
  clamp01,
  lerp,
  mixHex,
  sample,
  staggerFor,
  withAlpha,
  type MotionSpec,
} from './motion';
import type { SceneVisual, StoryboardStyle } from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** ms since this scene started. */
  t: number;
  /** ms since the video started - used for the exit. */
  globalT: number;
  sceneDurationMs: number;
  fps?: number;
  style: StoryboardStyle;
  visual: SceneVisual;
  font: string;
  quality?: 'draft' | 'high';
}

interface Palette {
  bg: string;
  ink: string;
  muted: string;
  primary: string;
  accent: string;
  surface: string;
  line: string;
  onPrimary: string;
}

function luminance(hex: string): number {
  let h = (hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Palette resolved once per frame so visuals never re-derive colours. */
function palette(s: StoryboardStyle): Palette {
  const primary = s.primaryColor || '#2f6bff';
  const bg = s.backgroundColor || '#0b0b0f';
  const ink = s.textColor || '#ffffff';
  return {
    bg,
    ink,
    muted: s.mutedColor || mixHex(ink, bg, 0.45),
    primary,
    accent: s.accentColor || mixHex(primary, '#ffffff', 0.4),
    surface: mixHex(bg, primary, 0.08),
    line: mixHex(bg, ink, 0.18),
    // Readable on the brand colour, not just on the background.
    onPrimary: luminance(primary) > 0.42 ? '#0b0b0f' : '#ffffff',
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Standard entrance. Children share one curve and differ only in delay, so a
 * group reads as a single confident event rather than a pile of unrelated pops.
 */
function enter(delay: number, scale: number, fps: number): MotionSpec {
  return { duration: staggerFor(scale, fps) * 2.6, delay, ease: 'enter' };
}

/** Entrance with slight overshoot. Reserved for one focal element. */
function pop(delay: number): MotionSpec {
  return { duration: DURATION.hero, delay, spring: SPRINGS.pop };
}

/** Exit: accelerate away. Never clamps, so it reads as leaving the frame. */
function exitAt(globalT: number, sceneEnd: number): number {
  return sample({ duration: DURATION.ui, ease: 'exit', from: 1, to: 0 }, globalT - (sceneEnd - DURATION.ui));
}

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

/** Wrap to a width, so long captions never overflow their area. */
function wrap(ctx: CanvasRenderingContext2D, str: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of str.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// --- icons -----------------------------------------------------------------

/**
 * Lucide icon geometry, inlined on a 24x24 viewBox.
 *
 * Deliberately not `import { TrendingUp } from 'lucide-react'`: `shared/` is also
 * consumed by the server, and the video path carries no runtime deps. The data is
 * ~1KB of strings; a React component would drag a DOM renderer into a canvas
 * renderer. `lucide-react` is still used for the app's own UI.
 */
const ICONS: Record<string, string[]> = {
  'trending-up': ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M16 3.128a4 4 0 0 1 0 7.744',
    'M22 21v-2a4 4 0 0 0-3-3.87',
  ],
  zap: ['M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z'],
  check: ['M20 6 9 17l-5-5'],
  clock: ['M12 6v6h4', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
  'shield-check': [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  rocket: [
    'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
    'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09',
    'M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z',
    'M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05',
  ],
  dollar: ['M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 18V6'],
  sparkles: [
    'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
    'M20 2v4',
    'M22 4h-4',
  ],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
};

export const iconNames = (): string[] => Object.keys(ICONS);

/**
 * Stroke an icon centred on (cx, cy) at `size` px.
 *
 * Stroke width is scaled with the icon so it stays visually consistent next to
 * text - a hairline at 12px and a hairline at 64px do not read the same.
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha = 1,
): boolean {
  const paths = ICONS[name];
  if (!paths) return false;
  const k = size / 24;
  ctx.save();
  ctx.globalAlpha *= clamp01(alpha);
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 1.75 / k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
  return true;
}

/**
 * Icons that suit a visual, in a fixed order. Deterministic by design: a scene
 * that re-rolled its icons between preview and render would look like a bug.
 */
export const ICON_ROTATION = ['trending-up', 'users', 'dollar', 'zap', 'check', 'gauge'];
export function formatValue(v: number, format = 'plain', prefix = '', suffix = ''): string {
  if (!Number.isFinite(v)) return `${prefix}0${suffix}`;
  if (format === 'percent') return `${prefix}${Math.round(v * (Math.abs(v) <= 1 ? 100 : 1))}%${suffix}`;
  if (format === 'currency') return `${prefix}$${Math.round(v).toLocaleString('en-US')}${suffix}`;
  if (format === 'compact') {
    const s = Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`;
    return `${prefix}${s}${suffix}`;
  }
  // Round before formatting: interpolating then truncating leaves a number that
  // reads as wrong for the last few frames.
  return `${prefix}${Math.round(v).toLocaleString('en-US')}${suffix}`;
}

function drawStatCounter(d: DrawContext, p: Palette, area: Rect) {
  const { ctx, t } = d;
  const data = d.visual.data ?? {};
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const cx = area.x + area.w / 2;
  const cy = area.y + area.h * 0.5;
  const size = Math.min(area.w * 0.3, area.h * 0.5);

  // Count up on an ease-out so it decelerates into the final value: a number that
  // settles reads as measured, one that accelerates away reads as fake.
  const eased = clamp01(sample({ duration: DURATION.cinematic, ease: 'enter' }, t));
  const shown = formatValue((data.value ?? 0) * eased, data.format, data.prefix, data.suffix);

  // Overshoot applies to scale only, never to the digits: a number that visibly
  // overshoots 100% would be a lie.
  const g = clamp01(sample(pop(0), t));
  ctx.save();
  ctx.globalAlpha = clamp01(out);
  ctx.translate(cx, cy);
  ctx.scale(lerp(0.9, 1, g), lerp(0.9, 1, g));
  // A soft icon above the figure gives the number a subject. It arrives before the
// digits so the eye reads "what this is" then "how much".
  const iconFade = clamp01(sample({ duration: DURATION.ui, ease: 'enter' }, t));
  if (iconFade > 0.01) {
    const name = (data.icon && ICONS[data.icon] ? data.icon : null) ?? (data.format === 'percent' ? 'gauge' : data.format === 'currency' ? 'dollar' : 'trending-up');
    drawIcon(ctx, name, 0, -size * 0.72, size * 0.3, p.accent, iconFade * 0.9);
  }
  text(ctx, shown, 0, 0, `700 ${size}px ${d.font}`, p.ink, 'center');

  if (data.caption) {
    const capSize = size * 0.15;
    wrap(ctx, data.caption, area.w * 0.9).forEach((line, i) => {
      const fade = clamp01(sample({ duration: DURATION.ui, delay: 320, ease: 'enter' }, t));
      if (fade <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = fade * clamp01(out);
      text(ctx, line, 0, capSize * (i * 1.6 + 2), `600 ${capSize}px ${d.font}`, p.muted, 'center');
      ctx.restore();
    });
  }
  ctx.restore();
}

function drawBarChart(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const series = d.visual.data?.series ?? [];
  if (series.length === 0) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const max = Math.max(...series.map((s) => Math.abs(s.value)), 1);
  const labelSize = Math.max(11, area.h * 0.05);
  const barH = Math.min((area.h * 0.92) / (series.length + (series.length - 1) * 0.5), 52);
  const gap = barH * 0.5;
  const left = area.x + area.w * 0.3;
  const right = area.x + area.w;
  const top = area.y + (area.h - (barH + gap) * series.length + gap) / 2;

  ctx.save();
  ctx.globalAlpha = clamp01(out);

  series.forEach((s, i) => {
    const spec = enter(i * staggerFor(series.length, fps), series.length, fps);
    const g = clamp01(sample(spec, t));
    const y = top + i * (barH + gap);
    // Bars grow from a shared baseline so the axis never shifts.
    const w = (right - left) * (Math.abs(s.value) / max) * g;

    ctx.fillStyle = i === d.visual.focusIndex ? p.accent : p.primary;
    roundRect(ctx, left, y, Math.max(2, w), barH, Math.min(7, barH / 2));
    ctx.fill();

    // Label and value ride in after the bar has established itself.
    const fade = clamp01(sample({ duration: DURATION.ui, delay: (spec.delay ?? 0) + 110, ease: 'enter' }, t));
    if (fade > 0.02) {
      ctx.save();
      ctx.globalAlpha = fade * clamp01(out);
      const mid = y + barH * 0.66;
      text(ctx, s.label, left - 14, mid, `600 ${labelSize}px ${d.font}`, p.muted, 'right');
      text(ctx, formatValue(s.value, 'compact'), left + Math.max(2, w) + 12, mid, `700 ${labelSize * 1.1}px ${d.font}`, p.ink);
      ctx.restore();
    }
  });

  const axis = d.visual.data?.axisLabel;
  if (axis) {
    const fade = clamp01(sample({ duration: DURATION.ui, delay: DURATION.hero, ease: 'enter' }, t));
    if (fade > 0.02) {
      ctx.save();
      ctx.globalAlpha = fade * clamp01(out);
      text(ctx, axis, right, top + (barH + gap) * series.length - gap + labelSize * 1.6, `600 ${labelSize}px ${d.font}`, p.muted, 'right');
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawDonut(d: DrawContext, p: Palette, area: Rect) {
  const { ctx, t } = d;
  const segs = d.visual.data?.segments ?? [];
  if (segs.length === 0) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const total = segs.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h * 0.48;
  const r = Math.min(area.w, area.h) * 0.38;
  const width = r * 0.3;

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  // Start at 12 o'clock rather than 3: reads as a gauge, not a pie chart.
  let angle = -Math.PI / 2;

  segs.forEach((s, i) => {
    const g = clamp01(sample({ duration: DURATION.cinematic, delay: i * 150, ease: 'enter' as const }, t));
    const sweep = (s.value / total) * Math.PI * 2 * g;
    ctx.beginPath();
    ctx.strokeStyle = s.color || mixHex(p.primary, p.accent, i / Math.max(1, segs.length - 1));
    ctx.lineWidth = width;
    ctx.arc(cx, cy, r, angle, angle + Math.max(0.0001, sweep));
    ctx.stroke();
    angle += sweep;
  });

  const lead = segs[0];
  const eased = clamp01(sample({ duration: DURATION.cinematic, ease: 'enter' }, t));
  text(ctx, formatValue(lead.value * eased, d.visual.data?.format ?? 'percent'), cx, cy + r * 0.16, `700 ${r * 0.46}px ${d.font}`, p.ink, 'center');
  if (lead.label) {
    const fade = clamp01(sample({ duration: DURATION.ui, delay: 340, ease: 'enter' }, t));
    if (fade > 0.02) {
      ctx.save();
      ctx.globalAlpha = fade * clamp01(out);
      text(ctx, lead.label, cx, cy + r * 0.54, `600 ${r * 0.15}px ${d.font}`, p.muted, 'center');
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawStepFlow(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const steps = d.visual.data?.steps ?? [];
  if (steps.length === 0) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const rowH = Math.min((area.h * 0.92) / steps.length, 96);
  const labelSize = Math.max(12, Math.min(rowH / 2.8, area.h * 0.07));
  const nodeR = labelSize * 0.85;
  const cx = area.x + nodeR + area.w * 0.03;
  const top = area.y + (area.h - rowH * steps.length) / 2;
  const stepMs = staggerFor(steps.length, fps);

  ctx.save();
  ctx.globalAlpha = clamp01(out);

  steps.forEach((s, i) => {
    const delay = i * stepMs;
    const y = top + i * rowH + rowH / 2;

    // Connector draws on behind the nodes: the path is built as steps complete
    // rather than existing in advance.
    if (i < steps.length - 1) {
      const seg = clamp01((t - delay - DURATION.ui) / (stepMs + DURATION.ui));
      ctx.beginPath();
      ctx.strokeStyle = withAlpha(p.primary, 0.5);
      ctx.lineWidth = 2.5;
      ctx.moveTo(cx, y + nodeR);
      ctx.lineTo(cx, y + nodeR + (rowH - nodeR * 2) * seg);
      ctx.stroke();
    }

    const g = clamp01(sample(pop(delay), t));
    const isFocus = i === d.visual.focusIndex;
    ctx.beginPath();
    ctx.arc(cx, y, nodeR * lerp(0.72, 1, g), 0, Math.PI * 2);
    ctx.fillStyle = isFocus ? p.primary : p.surface;
    ctx.fill();
    if (!isFocus) {
      ctx.strokeStyle = withAlpha(p.primary, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // A step carries either a number or an icon. An icon is chosen when the step is
  // a named kind of thing (Connect, Verify, Ship) and a number when the order
  // itself is the point.
  const iconName = s.icon && ICONS[s.icon] ? s.icon : null;
  if (iconName) {
    drawIcon(ctx, iconName, cx, y, nodeR * 1.05, isFocus ? p.onPrimary : p.primary, g);
  } else {
    text(ctx, String(i + 1), cx, y + labelSize * 0.34, `700 ${labelSize * 0.88}px ${d.font}`, isFocus ? p.onPrimary : p.primary, 'center');
  }

    const tx = cx + nodeR + labelSize * 0.9;
    const fade = clamp01(sample({ duration: DURATION.ui, delay: delay + 90, ease: 'enter' }, t));
    if (fade > 0.02) {
      ctx.save();
      ctx.globalAlpha = fade * clamp01(out);
      text(ctx, s.label, tx, y - (s.detail ? labelSize * 0.1 : labelSize * 0.34), `700 ${labelSize}px ${d.font}`, p.ink);
      if (s.detail) text(ctx, s.detail, tx, y + labelSize * 0.95, `500 ${labelSize * 0.8}px ${d.font}`, p.muted);
      ctx.restore();
    }
  });
  ctx.restore();
}

function drawLineChart(d: DrawContext, p: Palette, area: Rect) {
  const { ctx, t } = d;
  const series = d.visual.data?.series ?? [];
  if (series.length < 2) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const labelSize = Math.max(11, area.h * 0.045);
  const left = area.x + area.w * 0.05;
  const right = area.x + area.w * 0.95;
  const top = area.y + area.h * 0.12;
  const bottom = area.y + area.h * 0.74;
  const vals = series.map((s) => s.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const px = (i: number) => left + ((right - left) * i) / (series.length - 1);
  const py = (v: number) => bottom - ((v - min) / span) * (bottom - top);

  ctx.save();
  ctx.globalAlpha = clamp01(out);

  // Chart furniture stays quiet so the data carries the contrast.
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 1;
  for (const y of [bottom, py(max)]) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  const progress = clamp01(sample({ duration: DURATION.cinematic, ease: 'enter' }, t));
  const idxAt = Math.min(series.length - 1, Math.round(progress * (series.length - 1)));

  // Area under the curve, revealed with the same progress as the line.
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let i = 0; i <= idxAt; i++) ctx.lineTo(px(i), py(series[i].value));
  ctx.lineTo(px(idxAt), bottom);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, withAlpha(p.primary, 0.32));
  grad.addColorStop(1, withAlpha(p.primary, 0));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = p.primary;
  ctx.lineWidth = Math.max(2.5, area.h * 0.014);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i <= idxAt; i++) {
    if (i === 0) ctx.moveTo(px(i), py(series[i].value));
    else ctx.lineTo(px(i), py(series[i].value));
  }
  ctx.stroke();

  // Endpoint marker pulses gently so the eye lands on the latest value.
  if (progress > 0.02) {
    const mx = px(idxAt);
    const my = py(series[idxAt].value);
    const pulse = 1 + 0.15 * Math.sin(t / 260);
    ctx.beginPath();
    ctx.arc(mx, my, labelSize * 0.46 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.strokeStyle = p.bg;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    text(ctx, formatValue(series[series.length - 1].value, 'compact'), mx, my - labelSize * 1.7, `700 ${labelSize * 1.12}px ${d.font}`, p.ink, mx > (left + right) / 2 ? 'right' : 'left');
  }

  text(ctx, series[0].label, left, bottom + labelSize * 1.6, `600 ${labelSize}px ${d.font}`, p.muted);
  text(ctx, series[series.length - 1].label, right, bottom + labelSize * 1.6, `600 ${labelSize}px ${d.font}`, p.muted, 'right');
  ctx.restore();
}

/**
 * A product-UI mockup: real chrome, abstract interior. Nobody needs the actual
 * product to understand "the dashboard updates itself" - they need the shape of a
 * dashboard and the one thing that changed.
 *
 * Rasterising a real DOM mockup would cost a layout per frame. An abstract frame
 * costs a dozen rectangles and stays legible at 1080p.
 */
function drawUiFrame(d: DrawContext, p: Palette, area: Rect) {
  const { ctx, t } = d;
  const data = d.visual.data ?? {};
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const isPhone = data.chrome === 'phone';
  const fw = isPhone ? Math.min(area.w * 0.32, area.h * 0.98) : Math.min(area.w, area.h / 0.62);
  const fh = isPhone ? fw * 2.05 : fw * 0.62;
  const fx = area.x + (area.w - fw) / 2;
  const fy = area.y + (area.h - fh) / 2;
  const radius = isPhone ? fw * 0.11 : 14;

  // The device lifts in as one object, then its contents animate.
  const lift = clamp01(sample({ duration: DURATION.hero, ease: 'enter' }, t));
  ctx.save();
  ctx.globalAlpha = clamp01(out);
  ctx.translate(fx + fw / 2, fy + fh / 2);
  ctx.scale(lerp(0.96, 1, lift), lerp(0.96, 1, lift));
  ctx.translate(-(fx + fw / 2), -(fy + fh / 2));

  ctx.save();
  ctx.shadowColor = withAlpha('#000000', 0.42);
  ctx.shadowBlur = 42 * lift;
  ctx.shadowOffsetY = 16 * lift;
  roundRect(ctx, fx, fy, fw, fh, radius);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, fx, fy, fw, fh, radius);
  ctx.fillStyle = mixHex(p.surface, p.bg, 0.3);
  ctx.fill();
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, radius);
  ctx.clip();

  const chromeH = isPhone ? fh * 0.05 : fh * 0.13;
  const pad = fw * 0.05;
  ctx.fillStyle = mixHex(p.surface, p.bg, 0.12);
  ctx.fillRect(fx, fy, fw, chromeH);
  ctx.strokeStyle = p.line;
  ctx.beginPath();
  ctx.moveTo(fx, fy + chromeH);
  ctx.lineTo(fx + fw, fy + chromeH);
  ctx.stroke();

  if (isPhone) {
    roundRect(ctx, fx + fw * 0.37, fy + chromeH * 0.34, fw * 0.26, chromeH * 0.36, chromeH * 0.2);
    ctx.fillStyle = withAlpha(p.ink, 0.55);
    ctx.fill();
  } else {
    const dot = chromeH * 0.25;
    [p.accent, withAlpha(p.accent, 0.55), withAlpha(p.ink, 0.22)].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(fx + pad + i * dot * 1.75, fy + chromeH / 2, dot, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    const uw = fw * 0.4;
    roundRect(ctx, fx + fw - pad - uw, fy + chromeH / 2 - chromeH * 0.3, uw, chromeH * 0.6, chromeH * 0.3);
    ctx.fillStyle = mixHex(p.surface, p.bg, 0.45);
    ctx.fill();
    text(ctx, data.url ?? `${data.appName ?? 'app'}.com`, fx + fw - pad - uw / 2, fy + chromeH / 2 + chromeH * 0.09, `500 ${chromeH * 0.3}px ${d.font}`, p.muted, 'center');
  }

  const cx = fx + pad;
  const cy = fy + chromeH + pad * 0.75;
  const cw = fw - pad * 2;
  const layout = data.layout ?? 'cards';

  if (layout === 'nav') {
    const items = 4;
    const itemW = (cw - (items - 1) * pad * 0.3) / items;
    for (let i = 0; i < items; i++) {
      const g = clamp01(sample({ duration: DURATION.ui, delay: 200 + i * 70, ease: 'enter' as const }, t));
      if (g <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = clamp01(out) * g;
      roundRect(ctx, cx + i * (itemW + pad * 0.3), cy, itemW, fh * 0.045, 8);
      ctx.fillStyle = i === 0 ? p.primary : mixHex(p.surface, p.ink, 0.1);
      ctx.fill();
      ctx.restore();
    }
  }

  if (layout === 'cards' || layout === 'dashboard') {
    const cols = layout === 'dashboard' ? 3 : 2;
    const avail = fh - chromeH - pad * 1.5;
    const rowsN = layout === 'dashboard' ? 2 : Math.max(1, Math.min(2, Math.floor(avail / (fh * 0.24))));
    const gW = (cw - (cols - 1) * pad * 0.4) / cols;
    const gH = layout === 'dashboard' ? avail / 3.6 : Math.min(gW * 0.8, avail / rowsN - pad * 0.45);
    let n = 0;
    for (let r = 0; r < rowsN; r++) {
      for (let c = 0; c < cols; c++) {
        const g = clamp01(sample({ duration: DURATION.ui, delay: 280 + n * 85, ease: 'enter' as const }, t));
        if (g > 0.01) {
          const x = cx + c * (gW + pad * 0.4);
          const y = cy + r * (gH + pad * 0.45);
          ctx.save();
          ctx.globalAlpha = clamp01(out) * g;
          ctx.translate(0, (1 - g) * 10);
          roundRect(ctx, x, y, gW, gH, 10);
          ctx.fillStyle = mixHex(p.surface, p.ink, 0.06);
          ctx.fill();
          ctx.strokeStyle = p.line;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Value bar + label line: abstract, but the right proportions.
          // An icon in a tinted chip, then the value bar and a label line beneath. The
          // chip is what makes the card read as a real UI surface rather than a
          // stack of grey rectangles.
          const chip = Math.min(gH * 0.34, gW * 0.2);
          const chipX = x + pad * 0.5;
          const chipY = y + gH * 0.18;
          roundRect(ctx, chipX, chipY, chip, chip, chip * 0.28);
          ctx.fillStyle = withAlpha(p.primary, 0.16);
          ctx.fill();
          const cardIcon = (n === 0 && d.visual.data?.icon && ICONS[d.visual.data.icon] ? d.visual.data.icon : ICON_ROTATION[n % ICON_ROTATION.length]);
          drawIcon(ctx, cardIcon, chipX + chip / 2, chipY + chip / 2, chip * 0.58, p.primary, g);

          roundRect(ctx, x + pad * 0.5 + chip + pad * 0.4, y + gH * 0.3, gW * 0.42 - chip, gH * 0.15, 4);
          ctx.fillStyle = withAlpha(p.primary, 0.9);
          ctx.fill();
          roundRect(ctx, x + pad * 0.5, y + gH * 0.58, gW * 0.66, gH * 0.09, 4);
          ctx.fillStyle = withAlpha(p.muted, 0.5);
          ctx.fill();
          ctx.restore();
        }
        n++;
      }
    }
  }

  if (layout === 'rows') {
    const rowH = Math.min(fh * 0.11, (fh - chromeH - pad) / 3.4);
    const rowsN = Math.max(2, Math.min(5, Math.floor((fh - chromeH - pad) / rowH)));
    for (let i = 0; i < rowsN; i++) {
      const g = clamp01(sample({ duration: DURATION.ui, delay: 240 + i * 80, ease: 'enter' as const }, t));
      if (g <= 0.01) continue;
      const y = cy + i * rowH;
      ctx.save();
      ctx.globalAlpha = clamp01(out) * g;
      ctx.translate((1 - g) * -16, 0);
      const dot = rowH * 0.26;
      ctx.beginPath();
      ctx.arc(cx + dot, y + rowH / 2, dot, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(p.primary, 0.85);
      ctx.fill();
      roundRect(ctx, cx + dot * 2.6, y + rowH * 0.36, cw * 0.42, rowH * 0.28, 4);
      ctx.fillStyle = withAlpha(p.muted, 0.55);
      ctx.fill();
      // Trailing value ticks in after the row, so it reads as a value being
      // filled rather than the row simply appearing.
      const tw = cw * 0.15 * g;
      roundRect(ctx, cx + cw - tw, y + rowH * 0.34, tw, rowH * 0.32, 4);
      ctx.fillStyle = p.accent;
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Motion-graphics composition library.
 *
 * A second family of visuals alongside the infographics above: flat shapes,
 * plain type, one move plus a slow drift. Ported clean-room from the idea of
 * NullMotion's HyperFrames "beat kinds" (unlicensed, so nothing is copied) into
 * this file's pure-function-of-time canvas model - the same one the browser and
 * Remotion renderers share. Each drawer owns one composition and nothing else.
 */

function drawChat(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const bubbles = d.visual.data?.bubbles ?? [];
  if (bubbles.length === 0) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;

  const rows = Math.min(3, bubbles.length);
  const bh = Math.min(area.h * 0.3, 110);
  const gap = area.h * 0.1;
  const top = area.y + (area.h - (bh + gap) * rows + gap) / 2;
  const maxW = area.w * 0.72;
  const fontSize = Math.round(bh * 0.32);

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  bubbles.slice(0, 3).forEach((b, i) => {
    const right = (b.side ?? 'right') === 'right';
    const g = clamp01(sample({ duration: DURATION.ui, delay: i * 220, ease: 'enter' }, t));
    if (g <= 0.01) return;
    ctx.font = `500 ${fontSize}px ${d.font}`;
    const lines = wrap(ctx, b.text, maxW).slice(0, 2);
    const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + bh * 0.55);
    const x = right ? area.x + area.w - bw : area.x;
    const y = top + i * (bh + gap);
    ctx.save();
    ctx.globalAlpha *= g;
    ctx.translate(0, (1 - g) * 14);
    roundRect(ctx, x, y, bw, bh, bh * 0.34);
    ctx.fillStyle = right ? p.accent : p.surface;
    ctx.fill();
    if (!right) { ctx.strokeStyle = p.line; ctx.lineWidth = 1.5; ctx.stroke(); }
    const col = right ? p.onPrimary : p.ink;
    lines.forEach((l, li) => text(ctx, l, x + bh * 0.28, y + bh * 0.4 + li * fontSize * 1.2, `500 ${fontSize}px ${d.font}`, col));
    ctx.restore();
  });
  ctx.restore();
}

function drawNotify(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const cap = d.visual.data?.caption;
  const iconName = d.visual.data?.icon && ICONS[d.visual.data.icon] ? d.visual.data.icon : 'check';

  const w = area.w * 0.9;
  const h = Math.min(area.h * 0.5, 132);
  const x = area.x + (area.w - w) / 2;
  const y = area.y + area.h / 2 - h / 2;
  const g = clamp01(sample({ duration: DURATION.hero, ease: 'enter' }, t));
  if (g <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = clamp01(out) * g;
  ctx.translate(0, (1 - g) * -44);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const chip = h * 0.5;
  roundRect(ctx, x + h * 0.16, y + h * 0.25, chip, chip, chip * 0.28);
  ctx.fillStyle = withAlpha(p.primary, 0.16);
  ctx.fill();
  drawIcon(ctx, iconName, x + h * 0.16 + chip / 2, y + h * 0.25 + chip / 2, chip * 0.55, p.primary, 1);
  if (cap) text(ctx, cap, x + h * 0.16 + chip + h * 0.18, y + h / 2 + h * 0.1, `600 ${Math.round(h * 0.22)}px ${d.font}`, p.ink);
  ctx.restore();
}

function drawIconGrid(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const cells = (d.visual.data?.cells ?? []).slice(0, 6);
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const n = cells.length || 4;
  const cols = n <= 4 ? 2 : 3;
  const gap = area.w * 0.06;
  const tw = (area.w - gap * (cols - 1)) / cols;
  const th = (area.h - gap * (Math.ceil(n / cols) - 1)) / Math.ceil(n / cols);

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const g = clamp01(sample({ duration: DURATION.ui, delay: i * 70, ease: 'enter' }, t));
    if (g <= 0.01) continue;
    const x = area.x + col * (tw + gap);
    const y = area.y + row * (th + gap);
    ctx.save();
    ctx.globalAlpha *= g;
    ctx.translate(x + tw / 2, y + th / 2);
    ctx.scale(lerp(0.8, 1, g), lerp(0.8, 1, g));
    roundRect(ctx, -tw / 2, -th / 2, tw, th, tw * 0.14);
    ctx.fillStyle = i % 2 ? p.surface : mixHex(p.surface, p.primary, 0.1);
    ctx.fill();
    ctx.strokeStyle = withAlpha(p.primary, 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const name = cells[i] && ICONS[cells[i]] ? cells[i] : ICON_ROTATION[i % ICON_ROTATION.length];
    drawIcon(ctx, name, 0, 0, Math.min(tw, th) * 0.42, i === 0 ? p.primary : p.ink, 1);
    ctx.restore();
  }
  ctx.restore();
}

function drawHub(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const nodes = (d.visual.data?.nodes ?? []).slice(0, 4);
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const coreR = Math.min(area.w, area.h) * 0.15;
  const positions: Array<[number, number]> = [
    [cx - area.w * 0.3, cy - area.h * 0.26],
    [cx + area.w * 0.3, cy - area.h * 0.26],
    [cx - area.w * 0.3, cy + area.h * 0.26],
    [cx + area.w * 0.3, cy + area.h * 0.26],
  ];

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  nodes.forEach((nd, i) => {
    const [px, py] = positions[i] ?? [cx, cy];
    const g = clamp01(sample({ duration: DURATION.ui, delay: 260 + i * 140, ease: 'enter' }, t));
    if (g <= 0.01) return;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(p.primary, 0.35 * g);
    ctx.lineWidth = 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(lerp(cx, px, g), lerp(cy, py, g));
    ctx.stroke();
    const pw = area.w * 0.26;
    const ph = Math.min(area.h * 0.2, 60);
    ctx.save();
    ctx.globalAlpha *= g;
    ctx.translate(px, py);
    roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = p.surface;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (nd.icon && ICONS[nd.icon]) drawIcon(ctx, nd.icon, -pw / 2 + ph * 0.42, 0, ph * 0.5, p.primary, 1);
    text(ctx, nd.label ?? '', nd.icon ? -pw / 2 + ph * 0.8 : 0, ph * 0.14, `600 ${Math.round(ph * 0.42)}px ${d.font}`, p.ink, nd.icon ? 'left' : 'center');
    ctx.restore();
  });
  const cg = clamp01(sample(pop(0), t));
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * lerp(0.6, 1, cg), 0, Math.PI * 2);
  ctx.fillStyle = p.primary;
  ctx.fill();
  if (d.visual.data?.center) text(ctx, d.visual.data.center, cx, cy + coreR * 0.24, `700 ${Math.round(coreR * 0.46)}px ${d.font}`, p.onPrimary, 'center');
  ctx.restore();
}

function drawWordCloud(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const terms = d.visual.data?.terms ?? d.visual.data?.series?.map((s) => ({ text: s.label, weight: s.value })) ?? [];
  if (terms.length === 0) return;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const shown = terms.slice(0, 6);
  const maxW = Math.max(...shown.map((x) => x.weight ?? 1), 1);
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const rowH = area.h * 0.34;

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  shown.forEach((term, i) => {
    const weight = (term.weight ?? 1) / maxW;
    const size = lerp(area.h * 0.1, area.h * 0.28, weight);
    const g = clamp01(sample({ duration: DURATION.ui, delay: i * 130, ease: 'enter' }, t));
    if (g <= 0.01) return;
    const x = cx + (i % 2 === 0 ? -area.w * 0.18 : area.w * 0.18);
    const y = cy + (Math.floor(i / 2) - 1) * rowH;
    ctx.save();
    ctx.globalAlpha *= g;
    ctx.translate(x, y + (1 - g) * 10);
    ctx.font = `700 ${Math.round(size)}px ${d.font}`;
    ctx.fillStyle = i === 0 ? p.primary : i % 2 ? p.muted : p.ink;
    ctx.fillText(term.text, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function drawCollage(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const n = Math.min(d.visual.data?.count ?? 5, 5);
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const spots: Array<[number, number, number, number]> = [
    [0.02, 0.02, 0.42, 0.44],
    [0.56, 0.05, 0.42, 0.44],
    [0.04, 0.5, 0.4, 0.46],
    [0.5, 0.54, 0.24, 0.4],
    [0.78, 0.5, 0.2, 0.44],
  ];

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  for (let i = 0; i < n; i++) {
    const [fx, fy, fw, fh] = spots[i];
    const x = area.x + fx * area.w;
    const y = area.y + fy * area.h;
    const w = fw * area.w;
    const h = fh * area.h;
    const g = clamp01(sample({ duration: DURATION.hero, delay: i * 110, ease: 'enter' }, t));
    if (g <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha *= g;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((i % 2 ? -1 : 1) * 0.05 * g);
    ctx.scale(lerp(0.85, 1, g), lerp(0.85, 1, g));
    roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.fillStyle = i % 2 ? p.surface : mixHex(p.surface, p.primary, 0.14);
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  const cap = d.visual.data?.caption;
  if (cap) {
    const fade = clamp01(sample({ duration: DURATION.ui, delay: 320, ease: 'enter' }, t));
    if (fade > 0.01) {
      ctx.save();
      ctx.globalAlpha *= fade;
      const lines = wrap(ctx, cap, area.w * 0.9);
      lines.forEach((l, i) => text(ctx, l, area.x + area.w / 2, area.y + area.h * 0.84 + i * 16, `600 ${Math.round(area.h * 0.06)}px ${d.font}`, p.muted, 'center'));
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawLogoStrip(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const rows = Math.min(d.visual.data?.count ?? 3, 3);
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const perRow = 5;
  const tileW = area.w * 0.22;
  const tileH = Math.min(area.h * 0.22, 72);
  const gapX = area.w * 0.14;
  const step = tileW + gapX;

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  for (let r = 0; r < rows; r++) {
    const fade = clamp01(sample({ duration: DURATION.ui, delay: r * 160, ease: 'enter' }, t));
    if (fade <= 0.01) continue;
    // A slow back-and-forth sway so the strip reads as alive without wrap math.
    const phase = Math.sin((t / 6000) * Math.PI * 2 + (r % 2 ? Math.PI : 0));
    const shift = phase * step * 0.4;
    const y = area.y + r * (tileH + area.h * 0.16);
    ctx.save();
    ctx.globalAlpha *= fade;
    for (let i = 0; i < perRow; i++) {
      const baseX = area.x - (gapX + tileW) + i * step + shift;
      roundRect(ctx, baseX, y, tileW, tileH, tileH * 0.16);
      ctx.fillStyle = (i + r) % 3 ? p.surface : mixHex(p.surface, p.primary, 0.16);
      ctx.fill();
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawIcon(ctx, ICON_ROTATION[(i + r) % ICON_ROTATION.length], baseX + tileW / 2, y + tileH / 2, tileH * 0.46, (i + r) % 3 ? p.primary : p.ink, 0.92);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawHeroShape(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const cap = d.visual.data?.caption;
  const size = Math.min(area.w, area.h) * 0.5;
  const cx = cap ? area.x + area.w * 0.32 : area.x + area.w / 2;
  const cy = area.y + area.h * 0.46;
  const lift = clamp01(sample({ duration: DURATION.cinematic, ease: 'enter' }, t));
  if (lift <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  // Ground shadow grows in with the lift.
  ctx.save();
  ctx.translate(cx, cy + size * 0.62);
  ctx.scale(1, 0.32);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5 * lerp(0.6, 1, lift), 0, Math.PI * 2);
  ctx.fillStyle = withAlpha('#000000', 0.3 * lift);
  ctx.fill();
  ctx.restore();

  // The tile lifts in with a slight settle, a highlight bar sweeps across once.
  ctx.save();
  ctx.globalAlpha *= clamp01(lift);
  ctx.translate(cx, cy + (1 - lift) * -30);
  ctx.transform(1, 0, lerp(-0.1, 0, lift), 1, 0, 0);
  roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
  ctx.fillStyle = p.surface;
  ctx.fill();
  ctx.strokeStyle = p.primary;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  roundRect(ctx, -size * 0.2, -size * 0.2, size * 0.4, size * 0.4, size * 0.12);
  ctx.fillStyle = p.primary;
  ctx.fill();
  const shine = clamp01((t - 300) / 700);
  if (shine > 0 && shine < 1) {
    const sx = lerp(-size * 0.9, size * 0.9, shine);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
    ctx.clip();
    const grad = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
    grad.addColorStop(0, withAlpha(p.bg, 0));
    grad.addColorStop(0.5, withAlpha('#ffffff', 0.28 * (1 - shine)));
    grad.addColorStop(1, withAlpha(p.bg, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 40, -size / 2, 80, size);
    ctx.restore();
  }
  ctx.restore();

  if (cap) {
    const g = clamp01(sample({ duration: DURATION.ui, delay: 420, ease: 'enter' }, t));
    if (g > 0.01) {
      ctx.save();
      ctx.globalAlpha *= g;
      const lines = wrap(ctx, cap, area.w * 0.42);
      lines.forEach((l, i) => text(ctx, l, cx + size * 0.72, cy - (lines.length - 1) * 12 + i * 24, `600 ${Math.round(area.h * 0.08)}px ${d.font}`, p.ink));
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawBurst(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const cap = d.visual.data?.caption;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const lineGrow = clamp01(sample({ duration: DURATION.hero, ease: 'enter' }, t));
  const star = clamp01(sample(pop(120), t));

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  const lw = area.w * 0.7 * lineGrow;
  ctx.beginPath();
  ctx.strokeStyle = withAlpha(p.primary, 0.85);
  ctx.lineWidth = 3;
  ctx.moveTo(cx - lw / 2, cy);
  ctx.lineTo(cx + lw / 2, cy);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(star, star);
  ctx.rotate(star * 0.4);
  const s = area.h * 0.18;
  for (const rot of [0, Math.PI / 4]) {
    ctx.save();
    ctx.rotate(rot);
    roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.16);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  if (cap) {
    const g = clamp01(sample({ duration: DURATION.ui, delay: 300, ease: 'enter' }, t));
    if (g > 0.01) {
      ctx.save();
      ctx.globalAlpha *= g;
      text(ctx, cap, cx, cy + area.h * 0.24, `700 ${Math.round(area.h * 0.12)}px ${d.font}`, p.ink, 'center');
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawSplitPanel(d: DrawContext, p: Palette, area: Rect, fps: number) {
  const { ctx, t } = d;
  const out = exitAt(d.globalT, d.sceneDurationMs);
  if (out <= 0) return;
  const cap = d.visual.data?.caption;
  const rows = Math.min(d.visual.data?.count ?? 5, 7);
  const panelW = area.w * 0.42;

  ctx.save();
  ctx.globalAlpha = clamp01(out);
  const pg = clamp01(sample({ duration: DURATION.hero, ease: 'enter' }, t));
  ctx.save();
  ctx.globalAlpha *= pg;
  ctx.translate((1 - pg) * -panelW, 0);
  roundRect(ctx, area.x, area.y, panelW, area.h, 12);
  ctx.fillStyle = p.accent;
  ctx.fill();
  if (cap) {
    const lines = wrap(ctx, cap, panelW * 0.7);
    ctx.font = `700 ${Math.round(area.h * 0.11)}px ${d.font}`;
    lines.forEach((l, i) => text(ctx, l, area.x + panelW * 0.14, area.y + area.h / 2 - (lines.length - 1) * area.h * 0.08 + i * area.h * 0.16, `700 ${Math.round(area.h * 0.11)}px ${d.font}`, p.onPrimary));
  }
  ctx.restore();

  const bx = area.x + panelW + area.w * 0.12;
  const bw = area.w - panelW - area.w * 0.12;
  for (let i = 0; i < rows; i++) {
    const bg = clamp01(sample({ duration: DURATION.ui, delay: 240 + i * 70, ease: 'enter' }, t));
    if (bg <= 0.01) continue;
    const w = (i % 3 === 0 ? 0.9 : i % 2 ? 0.62 : 0.75) * bw * bg;
    roundRect(ctx, bx, area.y + i * (area.h / (rows + 1)), Math.max(3, w), area.h * 0.08, 4);
    ctx.fillStyle = withAlpha(p.ink, 0.35);
    ctx.fill();
  }
  ctx.restore();
}

const DRAWERS: Record<string, (d: DrawContext, p: Palette, area: Rect, fps: number) => void> = {
  'stat-counter': (d, p, a) => drawStatCounter(d, p, a),
  'bar-chart': drawBarChart,
  donut: (d, p, a) => drawDonut(d, p, a),
  'step-flow': drawStepFlow,
  'line-chart': (d, p, a) => drawLineChart(d, p, a),
  'ui-frame': (d, p, a) => drawUiFrame(d, p, a),
  'chat': (d, p, a, f) => drawChat(d, p, a, f),
  'notify': (d, p, a, f) => drawNotify(d, p, a, f),
  'icon-grid': (d, p, a, f) => drawIconGrid(d, p, a, f),
  'hub': (d, p, a, f) => drawHub(d, p, a, f),
  'word-cloud': (d, p, a, f) => drawWordCloud(d, p, a, f),
  'collage': (d, p, a, f) => drawCollage(d, p, a, f),
  'logo-strip': (d, p, a, f) => drawLogoStrip(d, p, a, f),
  'hero-shape': (d, p, a, f) => drawHeroShape(d, p, a, f),
  'burst': (d, p, a, f) => drawBurst(d, p, a, f),
  'split-panel': (d, p, a, f) => drawSplitPanel(d, p, a, f),
};

export function visualKinds(): string[] {
  return Object.keys(DRAWERS);
}

/**
 * Draw a scene's visual. Returns false when there is nothing to draw, so callers
 * fall back to text-only layout instead of reserving empty space.
 */
export function drawVisual(d: DrawContext): boolean {
  const { visual } = d;
  // Lottie is dispatched by the renderer: it needs a player instance rather than
  // a pure function of t.
  if (!visual || visual.kind === 'none' || visual.kind === 'lottie' || !DRAWERS[visual.kind]) {
    return false;
  }
  DRAWERS[visual.kind](
    d,
    palette(d.style),
    { x: d.w * 0.08, y: d.h * 0.3, w: d.w * 0.84, h: d.h * (visual.height ?? 0.62) },
    d.fps ?? 30,
  );
  return true;
}
