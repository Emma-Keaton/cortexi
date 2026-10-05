/**
 * Storyboard contract shared by the server, the browser renderer and Remotion.
 *
 * A scene has two independent layers:
 *   - `visual`  an infographic / UI / Lottie composition drawn to canvas
 *   - `copy`    the headline and body text drawn by the text renderer
 *
 * Keeping them separate is what lets a data point, a product screenshot mock and
 * a sentence coexist on one screen without either fighting the other. Most scenes
 * need both: the visual carries the evidence, the copy carries the argument.
 */

export type VisualKind =
  /** None - text only. The default. */
  | 'none'
  /** A headline-sized figure that counts up. Evidence, not decoration. */
  | 'stat-counter'
  /** Horizontal bars with a shared baseline. */
  | 'bar-chart'
  /** Time series / trend. Line draws on along its path length. */
  | 'line-chart'
  /** One proportion. Sweeps to its value, then settles. */
  | 'donut'
  /** Numbered process steps joined by a connector that draws on as steps land. */
  | 'step-flow'
  /** A browser or phone chrome frame with UI elements animating inside. */
  | 'ui-frame'
  /** A real Lottie asset, seeked frame-accurately. */
  | 'lottie'
  /** Two/three conversation bubbles, one per move. */
  | 'chat'
  /** A single notification pill that drops in. */
  | 'notify'
  /** A bento grid of icons / tiles, one focal tile tinted. */
  | 'icon-grid'
  /** A central hub with connector lines to orbiting pills. */
  | 'hub'
  /** A word cloud sized by importance. */
  | 'word-cloud'
  /** A loose collage of photo tiles. */
  | 'collage'
  /** A marquee strip of logo tiles, gently alive. */
  | 'logo-strip'
  /** A single hero tile that lifts in and has a highlight sweep. */
  | 'hero-shape'
  /** A divider flourish: an expanding line with a rotating star. */
  | 'burst'
  /** An accent panel that slides in beside a list of bars. */
  | 'split-panel';

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface StepItem {
  label: string;
  detail?: string;
  /** Lucide icon name for this step, e.g. "zap", "users", "check". */
  icon?: string;
}

export interface VisualData {
  // stat-counter
  value?: number;
  /** How to format the count: 'plain' | 'percent' | 'currency' | 'compact'. */
  format?: 'plain' | 'percent' | 'currency' | 'compact';
  prefix?: string;
  suffix?: string;
  caption?: string;

  // bar-chart / line-chart
  series?: SeriesPoint[];
  axisLabel?: string;
  /** 'bars' grows from the baseline; 'sweep' wipes the line by x position. */
  reveal?: 'grow' | 'sweep' | 'draw';

  // donut
  segments?: { label: string; value: number; color?: string }[];

  // step-flow
  steps?: StepItem[];

  /**
   * Icon for the visual, chosen by the LLM from the shared Lucide set.
   * Ignored where an icon is implied by the data (a currency stat shows $).
   */
  icon?: string;

  // ui-frame
  /** 'browser' | 'phone'. */
  chrome?: 'browser' | 'phone';
  appName?: string;
  url?: string;
  /** UI rows to animate in: nav, cards, rows, chart-ish placeholders. */
  layout?: 'nav' | 'cards' | 'rows' | 'dashboard';
  /** Optional lottie asset URL for an in-frame accent. */
  accentLottie?: string;

  // lottie
  src?: string;
  /** Seconds. Defaults to the whole scene. */
  fromSeconds?: number;
  toSeconds?: number;
  loop?: boolean;
  /** Recolor the asset toward the brand palette. */
  tint?: string;

  // chat
  bubbles?: { text: string; side?: 'left' | 'right' }[];

  // word-cloud (falls back to `series` when omitted)
  terms?: { text: string; weight?: number }[];

  // icon-grid: Lucide icon names, one per tile.
  cells?: string[];

  // hub: pills orbiting a central node.
  nodes?: { label: string; icon?: string }[];
  /** Label for the hub's central node. */
  center?: string;

  // collage / logo-strip / split-panel: how many tiles / rows / bars.
  count?: number;
}

export interface SceneVisual {
  kind: VisualKind;
  data?: VisualData;
  /** Percentage of the scene's height the visual occupies (top-aligned area). */
  height?: number;
  /** Index of the highlighted item, for the text layer to reference. */
  focusIndex?: number;
}

/** Topic -> structure. Decided server-side from the prompt. */
export type Genre =
  | 'product'
  | 'data'
  | 'brand'
  | 'tutorial'
  | 'launch'
  | 'general';

export interface StoryboardStyle {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor?: string;
  mutedColor?: string;
  font?: string;
}