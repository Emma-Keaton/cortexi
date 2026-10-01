import type { SceneVisual } from '../../shared/types';

export type Word = { word: string; start: number; end: number };

export type Scene = {
  id: string;
  template: string;
  headline: string;
  body?: string;
  eyebrow?: string;
  ctaLabel?: string;
  image?: string;
  imageRole?: 'product' | 'background' | 'foreground' | 'logo';
  animation: string;
  visual?: SceneVisual;
  audioFile?: string;
  durationSec?: number;
  words?: Word[];
};

export type Storyboard = {
  title: string;
  aspect: '16:9' | '9:16' | '1:1';
  fps: number;
  style: { primaryColor: string; backgroundColor: string; textColor: string; font: string };
  voice: { engine: string; voice: string };
  music?: { file: string; volume: number };
  captions: boolean;
  scenes: Scene[];
};
