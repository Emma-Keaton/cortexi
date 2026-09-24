import { z } from 'zod';

export const WordTimingSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});
export type WordTiming = z.infer<typeof WordTimingSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  template: z.enum(['title-card', 'feature', 'outro']),
  headline: z.string(),
  body: z.string().optional(),
  image: z.string().optional(),
  animation: z.enum(['fade-up', 'zoom', 'slide-left']).default('fade-up'),
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
    engine: z.enum(['edge-tts', 'upload', 'none']).default('edge-tts'),
    voice: z.string().default('en-US-AriaNeural'),
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
