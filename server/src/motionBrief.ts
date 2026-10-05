/**
 * The motion brief: how the LLM is taught to use the visual system.
 *
 * Everything in the prompt below is distilled from the motion skills we vendored
 * into `skills-src/` (iart-ai/motion-skills, MIT) and from the HyperFrames and
 * Remotion Lottie references. The point is not to tell the model what a chart
 * is - it knows that. The point is to tell it the things that make motion look
 * designed instead of generated: what belongs on screen, what belongs in the
 * caption, and how many things may move at once.
 *
 * Two failure modes this is written against:
 *   1. Every scene becomes a title card. Fixed by forcing a genre-specific shape.
 *   2. The model invents a chart with made-up numbers. Fixed by requiring the
 *      user to supply the data and by refusing to fabricate.
 */

import type { Genre, VisualKind } from '../../shared/types';

export interface GenreRecipe {
  genre: Genre;
  /** Keyword signals, checked in order. */
  signals: RegExp;
  /**
   * Scene shapes. `v` is the visual the renderer will draw, `text` says whether
   * the scene needs a headline on top of it.
   */
  shapes: { v: VisualKind; text: boolean; beat: string }[];
}

export const GENRE_RECIPES: GenreRecipe[] = [
  {
    genre: 'data',
    signals:
      /\b(stats|statistic|metrics?|numbers?|data|growth|revenue|report|survey|benchmark|roi|conversion|retention|churn|percentage|chart|graph|trend|annual|quarterly|results?)\b/i,
    shapes: [
      { v: 'stat-counter', text: true, beat: 'Hook on the single number that matters' },
      { v: 'bar-chart', text: true, beat: 'Where that number comes from - compare across groups' },
      { v: 'line-chart', text: true, beat: 'How it moved over time' },
      { v: 'donut', text: true, beat: 'The proportion, stated plainly' },
      { v: 'hub', text: true, beat: 'Everything routes through one system' },
      { v: 'none', text: true, beat: 'What it means for the viewer' },
    ],
  },
  {
    genre: 'product',
    signals:
      /\b(app|saas|platform|dashboard|product|feature|tool|software|api|workflow|integrat|onboard|analytics|crm|landing|crm)\b/i,
    shapes: [
      { v: 'none', text: true, beat: "Name the problem in the viewer's own words" },
      { v: 'ui-frame', text: true, beat: 'Show the product doing the one thing it is good at' },
      { v: 'hero-shape', text: true, beat: 'Reveal the object that carries the promise' },
      { v: 'stat-counter', text: true, beat: 'The outcome, as a number' },
      { v: 'chat', text: true, beat: 'The moment a user actually gets it' },
      { v: 'step-flow', text: true, beat: 'How to start, in three steps' },
    ],
  },
  {
    genre: 'tutorial',
    signals:
      /\b(how to|howto|tutorial|guide|step|steps|learn|explainer|walkthrough|setup|install|configure|diy)\b/i,
    shapes: [
      { v: 'none', text: true, beat: 'What you will be able to do by the end' },
      { v: 'step-flow', text: false, beat: 'The steps, numbered, in order' },
      { v: 'step-flow', text: true, beat: 'The step people usually get wrong' },
      { v: 'none', text: true, beat: 'The result' },
    ],
  },
  {
    genre: 'launch',
    signals:
      /\b(launch|announc|new|introduc|reveal|ship|release|now live|coming soon|unveil)\b/i,
    shapes: [
      { v: 'none', text: true, beat: 'The tension before' },
      { v: 'hero-shape', text: true, beat: 'Reveal the thing itself' },
      { v: 'burst', text: true, beat: 'The one-word punchline' },
      { v: 'stat-counter', text: true, beat: 'Why now, as a number' },
      { v: 'none', text: true, beat: 'The ask' },
    ],
  },
  {
    genre: 'brand',
    signals:
      /\b(brand|story|about|founder|mission|craft|heritage|why we|philosophy|lifestyle|collection|lookbook)\b/i,
    shapes: [
      { v: 'none', text: true, beat: 'Open on a single strong claim' },
      { v: 'lottie', text: true, beat: 'A signature motion moment' },
      { v: 'word-cloud', text: true, beat: 'What people keep saying' },
      { v: 'logo-strip', text: true, beat: 'Who is already on board' },
      { v: 'none', text: true, beat: 'Close on the line you want remembered' },
    ],
  },
  {
    genre: 'general',
    signals: /.^/,
    shapes: [
      { v: 'none', text: true, beat: 'Open on the sharpest claim' },
      { v: 'icon-grid', text: true, beat: 'The set of things it does' },
      { v: 'ui-frame', text: true, beat: 'Show it' },
      { v: 'stat-counter', text: true, beat: 'Prove it' },
      { v: 'step-flow', text: true, beat: 'Make it concrete' },
      { v: 'none', text: true, beat: 'Close on one memorable line' },
    ],
  },
];

/**
/**
 * Pick a genre from the prompt. First match wins, so `data` is tested before
 * `product` - "dashboard analytics showing our revenue growth" should read as a
 * data video, not a product tour.
 */
export function classifyGenre(prompt: string): Genre {
  for (const r of GENRE_RECIPES) {
    if (r.signals.test(prompt)) return r.genre;
  }
  return 'general';
}

export function recipeFor(genre: Genre): GenreRecipe {
  return GENRE_RECIPES.find((r) => r.genre === genre) ?? GENRE_RECIPES[GENRE_RECIPES.length - 1];
}

/**
 * Per-visual authoring guidance, injected into the storyboard prompt.
 * Per-visual authoring guidance, injected into the storyboard prompt.
 *
 * Each entry is the minimum a model must be told to produce a usable visual:
 * its exact schema, what it is for, and the most common way to get it wrong.
 * The `never` line matters more than the rest - almost every bad result we would
 * otherwise ship comes from a model inventing numbers to fill a chart.
 */
export const VISUAL_GUIDE: Record<string, string> = {
  'stat-counter':
    'visual:{kind:"stat-counter",data:{value:12840,format:"compact"|"percent"|"currency"|"plain",prefix:"",suffix:"",caption:"one short line"}} - one headline figure. Use only when the user supplied the number.',
  'bar-chart':
    'visual:{kind:"bar-chart",data:{series:[{label:"Q1",value:42}],axisLabel:"units"}} - 3-6 categories, all in the same unit. Use only with numbers the user gave you.',
  'line-chart':
    'visual:{kind:"line-chart",data:{series:[{label:"Jan",value:12},{label:"Feb",value:19}]}} - 4-8 points in time order. Only when the user gave the values.',
  donut:
    'visual:{kind:"donut",data:{segments:[{label:"Adopted",value:68},{label:"Rest",value:32}],format:"percent"}} - 2-4 parts that sum to the whole.',
  'step-flow':
    'visual:{kind:"step-flow",data:{steps:[{label:"Connect",detail:"OAuth in one click"}]}} - 3-5 ordered steps. Steps are verbs, not nouns. No `headline` needed; the steps carry the text.',
  'ui-frame':
    'visual:{kind:"ui-frame",data:{chrome:"browser"|"phone",appName:"Acme",url:"acme.com",layout:"dashboard"|"cards"|"rows"|"nav"}} - an abstract product mock. Never use for a brand film with no product.',
  'chat':
    'visual:{kind:"chat",data:{bubbles:[{text:"One line",side:"right"|"left"}]}} - 2-3 short conversation bubbles, one in the accent colour. Use for a "what it feels like" moment. Keep each bubble under 6 words.',
  'notify':
    'visual:{kind:"notify",data:{caption:"Your plan was updated",icon:"zap"}} - a single notification pill that drops in. One short caption, one icon. Use when something just changed for the viewer.',
  'icon-grid':
    'visual:{kind:"icon-grid",data:{cells:["zap","shield-check","rocket"]}} - a bento of 2-6 icon tiles, first one focal. Use to list capabilities at a glance. Icons come from the shared Lucide set.',
  'hub':
    'visual:{kind:"hub",data:{center:"Router",nodes:[{label:"API"},{label:"Web"}]}} - a central node with 2-4 orbiting pills. Use for "everything routes through one thing". Set `center` and short node labels.',
  'word-cloud':
    'visual:{kind:"word-cloud",data:{terms:[{text:"Fastest",weight:5},{text:"Local",weight:3}]}} - words sized by importance. Use to show what people say / what is covered. 3-6 terms; the first is the loudest.',
  'collage':
    'visual:{kind:"collage",data:{count:4,caption:"One shot, many uses"}} - a loose cluster of photo tiles with a caption. Use for "look at all of these" without real photos.',
  'logo-strip':
    'visual:{kind:"logo-strip",data:{count:2}} - a marquee strip of partner or product tiles. Use for social proof. 1-3 rows; no invented brand names.',
  'hero-shape':
    'visual:{kind:"hero-shape",data:{caption:"The one object"}} - a single product tile that lifts in with a highlight sweep. Use to reveal the one thing that matters. One short caption.',
  'burst':
    'visual:{kind:"burst",data:{caption:"Live"}} - a divider flourish: an expanding line with a rotating star. Use as a beat between sections, or to land a one-word punchline.',
  'split-panel':
    'visual:{kind:"split-panel",data:{caption:"Fast",count:5}} - an accent panel carrying a claim beside a list of supporting bars. Use to pair a claim with detail.',
  lottie:
    'visual:{kind:"lottie",data:{src:"https://.../anim.json",tint:"#RRGGBB"}} - a real vector asset. Only when a URL is available; omit otherwise, the renderer falls back safely.',
  none: 'No visual. Use for statements, transitions and the closing line.',
};

export const ICON_SET = [
  'trending-up', 'users', 'dollar', 'zap', 'check', 'gauge', 'clock', 'shield-check',
  'rocket', 'sparkles', 'arrow-right',
] as const;

/**
 * What each icon *means* here, so the model picks by meaning rather than by
 * what looks nice. A "shield-check" beside a pricing claim says "guaranteed";
 * a "sparkles" beside the same claim says "AI slop". That difference is the whole
 * job of choosing an icon.
 */
const ICON_MEANING: Record<string, string> = {
  'trending-up': 'growth, increase, a metric going up',
  users: 'people, audience, team, community',
  dollar: 'money, revenue, price, cost',
  zap: 'speed, automation, something instant',
  check: 'a completed or verified thing',
  gauge: 'percentage, share, rate, score out of 100',
  clock: 'time, speed, latency, schedule',
  'shield-check': 'guarantee, security, privacy, reliability',
  rocket: 'launch, ship, growth, going fast',
  sparkles: 'AI, magic, new-and-exciting (use sparingly - it reads as hype)',
  'arrow-right': 'next step, onward, continuation',
};

const iconGuide = (): string =>
  [
    '### Icons',
    '',
    'Icons come from one package: **Lucide**, drawn as 2px strokes on a 24x24 grid,',
    'tinted with the brand primary. They are used as accent, never as decoration.',
    '',
    'Available icons and what each one signals:',
    ...Object.entries(ICON_MEANING).map(([k, v]) => `  \`${k}\` - ${v}`),
    '',
    'How to use them:',
    '- Set `visual.data.icon` to the icon that matches the *meaning* of the scene.',
    '- For step-flow, set `icon` on each step; each step gets a different icon when',
    '  the steps differ in kind, and the same one only when they are genuinely alike.',
    '- Choose by meaning, never by prettiness. An icon that contradicts its claim',
    '  (a "shield" on a pricing claim) is worse than no icon at all.',
    '- Do not put an icon on every visual. A scene with a chart already has a',
    '  subject. One icon per scene at most.',
    '- Do not invent icon names. If nothing fits, omit the field and the visual',
    '  renders without one.',
  ].join('\n');

/**
 * The block appended to the system prompt.
 *
 * Note what is *absent*: no advice about gradients, glows or easing curves the
 * renderer already owns. Timing is not the model's decision. Structure, content
 * and data honesty are.
 */
export function motionBrief(genre: Genre): string {
  const recipe = recipeFor(genre);
  const shapeList = recipe.shapes
    .map((s, i) => `  ${i + 1}. ${s.beat}${s.v === 'none' ? '' : ` [${s.v}]`}`)
    .join('\n');

  return `
## Video structure

This is a "${genre}" video. Build the arc from this shape, in this order:

${shapeList}

Pick the number of scenes that fits the requested duration (3-6). Do not use every
shape if the material is thin - a 4-scene video beats a 6-scene one with filler.
Each beat gets exactly one scene. The first scene carries the hook and the last
carries the close.

## Visuals

Each scene may carry a \`visual\`. The visual is the evidence; the headline is the
argument. Use both when a scene makes a point AND shows it, and the visual alone
when the visual already says everything.

${Object.entries(VISUAL_GUIDE)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join('\n')}

The renderer animates every visual for you - bars grow, numbers count up, charts
draw on, UI elements stagger in. Never specify timing, keyframes or durations.

## Rules that are not negotiable

- NEVER invent data. No chart, no stat-counter, no donut without real numbers
  supplied by the user. A fabricated chart is worse than no chart: it is a lie
  the viewer cannot detect. If the user gave no numbers, use \`visual:{kind:"none"}\`
  and let the copy carry the scene.
- NEVER write "20% increase", "10,000 users" or similar into a headline as a
  substitute for a visual. Either you have the number for a visual, or you have
  no number.
- One idea per scene. Two visuals in one scene is always one too many.
- Keep labels to 2-4 words. Detail lines to 6-10. Headlines to 8 words or fewer.
- Write headlines as finished sentences, not fragments or keyphrases.

## Motion design (what makes this look designed)

- The final frame of a scene is what the viewer remembers. Every visual must end
  fully assembled and legible, then hold still before the cut. Never leave a
  chart mid-draw at the cut.
- Siblings cascade. If a scene shows 3 steps or 4 bars, they appear in sequence,
  not simultaneously. The renderer handles the offset.
- Only one element may move prominently at a time. A count-up competing with a
  stagger reads as noise.
- Reserve the strongest visual for the scene with the strongest point, usually
  the second or third. If everything is a chart, nothing is.

${iconGuide()}
`.trim();
}