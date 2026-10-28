export type AspectRatio = '9:16' | '16:9' | '1:1';
export type StykStyle = 'classic_bw' | 'comic_pop' | 'doodle';
export type StykAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'wave'
  | 'point'
  | 'sit'
  | 'scratch_head'
  | 'jump'
  | 'shocked'
  | 'celebrate';

export type StykExpression = 'neutral' | 'happy' | 'confused' | 'shocked' | 'thinking';

export type CaptionStyle =
  | 'karaoke'
  | 'lower_third'
  | 'speech_bubble'
  | 'minimal';

export type InfographicType =
  | 'none'
  | 'metric_counter'
  | 'bar_chart'
  | 'terminal'
  | 'alert_card'
  | 'sparkline';

export interface StykNode {
  id: string;
  name: string;
  x: number;
  y: number;
  pinned?: boolean;
}

export interface StykBone {
  id: string;
  from: string;
  to: string;
  thickness: number;
  color?: string;
}

export interface StykRig {
  id: string;
  name: string;
  style: StykStyle;
  expression: StykExpression;
  color?: string;
  accentColor?: string;
  position: [number, number]; // [x, y] in canvas coordinates (0-800, 0-600)
  scale: number;
  facing: 'left' | 'right';
  nodes: Record<string, StykNode>;
}

export interface CameraConfig {
  zoom: number; // 1.0 = normal, 1.5 = punch in
  x: number;    // pan offset X
  y: number;    // pan offset Y
  shake: number; // 0 = none, 1-10 = intensity
}

export interface SecondaryCharacterConfig {
  enabled: boolean;
  name: string;
  stykAction: StykAction;
  stykFacing: 'left' | 'right';
  stykPosition: [number, number]; // [x, y] in canvas relative space
  stykStyle: StykStyle;
  expression: StykExpression;
  props: string[];
}

export interface CustomProp {
  id: string;
  name: string;
  svgData?: string;
  shapeType?: 'star' | 'crown' | 'shield' | 'badge' | 'custom_svg';
  parentBone: 'head' | 'hand_r' | 'hand_l' | 'torso';
}

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface StoryboardScene {
  id: string;
  title: string;
  headline: string;
  duration: number; // seconds
  animation: 'fade-up' | 'zoom' | 'slide-left' | 'kinetic';
  voiceover: string;
  words: WordTimestamp[];
  audioFile?: string;
  userRecordedAudioUrl?: string;
  audioWaveform?: number[];
  stykAction: StykAction;
  stykFacing: 'left' | 'right';
  stykPosition: [number, number]; // [x, y] % or coords
  stykStyle: StykStyle;
  expression: StykExpression;
  camera?: CameraConfig;
  secondaryCharacter?: SecondaryCharacterConfig;
  customProps?: CustomProp[];
  infographic: InfographicType;
  infographicData?: {
    label?: string;
    value?: string;
    subtext?: string;
    bars?: { label: string; height: number }[];
    terminalLines?: string[];
  };
  props: string[]; // e.g. 'laptop', 'coffee', 'lightbulb', 'desk', 'phone'
  captionStyle: CaptionStyle;
}

export interface StoryboardProject {
  id: string;
  title: string;
  prompt: string;
  mode: 'Idea' | 'Script' | 'URL' | 'Document';
  format: 'Styk Animated Story' | 'UI Infographics' | 'Motion Graphics' | 'Explainer' | 'Social Ad';
  aspectRatio: AspectRatio;
  durationTotal: number;
  accentColor: string;
  backgroundColor: string;
  scenes: StoryboardScene[];
  karaokeEnabled: boolean;
  soundtrackName?: string;
}

export interface ViralClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number; // 0-100
  criteria: {
    hook: number;
    flow: number;
    value: number;
    trend: number;
    share: number;
  };
  hookQuote: string;
  stykReaction: 'Mind Blown' | 'Facepalm' | 'Hyped Jump' | 'Skeptical Look' | 'Pointing Alert';
  suggestedCaption: string;
  headline: string;
  aspectRatio: AspectRatio;
}

export type EasingType = 'linear' | 'ease-in-out' | 'bounce' | 'anticipation';

export interface Keyframe {
  id: string;
  time: number; // seconds
  trackId: string;
  easing?: EasingType;
  data: {
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    action?: StykAction;
    expression?: StykExpression;
    cameraZoom?: number;
    cameraShake?: number;
  };
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'styk' | 'infographic' | 'audio' | 'captions';
  muted?: boolean;
  locked?: boolean;
  color: string;
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  promptSnippet: string;
  description: string;
  projectState: StoryboardProject;
}

export interface BrandKit {
  logoUrl?: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  assets: {
    id: string;
    name: string;
    role: 'logo' | 'product' | 'background' | 'foreground';
    url: string;
    primaryColor: string;
  }[];
}
