import React from 'react';
import { Composition } from 'remotion';
import { CortexiVideo } from './CortexiVideo';
import type { Storyboard } from '../src/types';

const demo: Storyboard = {
  title: 'Demo',
  aspect: '16:9',
  fps: 30,
  style: { primaryColor: '#6C5CE7', backgroundColor: '#0F0F1A', textColor: '#FFFFFF', font: 'Arial, sans-serif' },
  voice: { engine: 'none', voice: 'en-US-AriaNeural' },
  captions: true,
  scenes: [
    { id: 's1', template: 'title-card', headline: 'Hello Cortexi', body: 'AI generated videos', animation: 'zoom', durationSec: 3 },
  ],
};

const dims = (aspect: string) =>
  aspect === '9:16' ? { width: 1080, height: 1920 } : aspect === '1:1' ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 };

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CortexiVideo"
    component={CortexiVideo as any}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ storyboard: demo, quality: 'final' as const }}
    calculateMetadata={({ props }) => {
      const sb = (props as any).storyboard as Storyboard;
      const fps = sb.fps || 30;
      const total = sb.scenes.reduce((a, s) => a + (s.durationSec ?? 3), 0);
      return {
        durationInFrames: Math.max(30, Math.ceil(total * fps)),
        fps,
        ...dims(sb.aspect),
        props,
      };
    }}
  />
);
