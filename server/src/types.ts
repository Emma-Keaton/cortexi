import { z } from 'zod';

export const WordTimingSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});
export type WordTiming = z.infer<typeof WordTimingSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  template: z.enum(['title-card', 'feature', 'outro', 'editorial-hero', 'product-spotlight', 'split-feature', 'full-bleed', 'logo-interstitial', 'typography-statement', 'call-to-action']).default('feature'),
  headline: z.string(),
  body: z.string().optional(),
  eyebrow: z.string().optional(),
  ctaLabel: z.string().optional(),
  image: z.string().optional(),
  imageRole: z.enum(['product', 'background', 'foreground', 'logo']).optional(),
  layout: z.object({ align: z.enum(['left', 'center', 'right']).default('center'), direction: z.enum(['left', 'right', 'center']).default('center') }).optional(),
  typography: z.object({ font: z.string().optional(), sizeScale: z.number().min(.5).max(1.5).default(1), weight: z.number().int().min(100).max(900).default(800), tracking: z.number().min(-5).max(20).default(0), uppercase: z.boolean().default(false) }).optional(),
  motion: z.object({ entrance: z.enum(['fade', 'fade-up', 'zoom', 'slide-left', 'slide-right', 'mask-reveal']).default('fade-up'), intensity: z.number().min(0).max(1).default(.45) }).optional(),
  background: z.object({ type: z.enum(['color', 'gradient', 'split', 'image']).default('color'), secondaryColor: z.string().optional(), image: z.string().optional(), overlayOpacity: z.number().min(0).max(1).default(.2) }).optional(),
  animation: z.enum(['fade-up', 'zoom', 'slide-left', 'slide-right', 'mask-reveal']).default('fade-up'),
  /**
   * An infographic / UI / vector composition drawn by the visual library.
   * Independent of `template`: a scene can carry a headline AND a chart, or
   * either alone.
   */
  visual: z.object({
    kind: z.enum(['none', 'stat-counter', 'bar-chart', 'line-chart', 'donut', 'step-flow', 'ui-frame', 'lottie']).default('none'),
    data: z.object({
      value: z.number().optional(),
      format: z.enum(['plain', 'percent', 'currency', 'compact']).optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      caption: z.string().optional(),
      series: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
      axisLabel: z.string().optional(),
      reveal: z.enum(['grow', 'sweep', 'draw']).optional(),
      segments: z.array(z.object({ label: z.string(), value: z.number(), color: z.string().optional() })).optional(),
      steps: z.array(z.object({ label: z.string(), detail: z.string().optional() })).optional(),
      chrome: z.enum(['browser', 'phone']).optional(),
      appName: z.string().optional(),
      url: z.string().optional(),
      layout: z.enum(['nav', 'cards', 'rows', 'dashboard']).optional(),
      accentLottie: z.string().optional(),
      src: z.string().optional(),
      fromSeconds: z.number().optional(),
      toSeconds: z.number().optional(),
      loop: z.boolean().optional(),
      tint: z.string().optional(),
    }).optional(),
    height: z.number().min(0.2).max(0.9).optional(),
    focusIndex: z.number().int().min(0).optional(),
  }).optional(),
  audioFile: z.string().optional(),
  durationSec: z.number().optional(),
  words: z.array(WordTimingSchema).optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const StoryboardSchema = z.object({
  title: z.string(),
  aspect: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  fps: z.number().default(30),
  style: z.object({
    primaryColor: z.string().default('#6C5CE7'),
    backgroundColor: z.string().default('#0F0F1A'),
    textColor: z.string().default('#FFFFFF'),
    font: z.string().default('Inter, Arial, sans-serif'),
  }),
  voice: z.object({
    engine: z.enum(['piper', 'kokoro', 'edge-tts', 'upload', 'none']).default('piper'),
    voice: z.string().min(1).default('none'),
  }),
  music: z
    .object({ file: z.string(), volume: z.number().default(0.12) })
    .optional(),
  captions: z.boolean().default(true),
  scenes: z.array(SceneSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  output?: string;
  /** Absolute path the finished MP4 was also exported to, if exportDir is set. */
  exportedTo?: string;
  error?: string;
  createdAt: number;
}
