import React from 'react';

export type Recipe = {
  id: string;
  name: string;
  blurb: string;
  /** Copy-paste starting point. The user edits the bracketed parts. */
  template: string;
  tags: string[];
};

/**
 * Super prompt recipes.
 *
 * Each one is a complete art direction, not a keyword soup. The structure is
 * always the same, which is what makes the output predictable:
 *   length -> arc -> opening -> middle beats -> closing -> palette -> voice
 */
export const RECIPES: Recipe[] = [
  {
    id: 'product-launch',
    name: 'Product launch',
    blurb: 'Reveal a product, justify it, then ask for the click.',
    tags: ['16:9', 'Launch', 'Cinematic'],
    template:
      'A {duration}-second product launch film for {brand}.\n\n' +
      'Arc: open on the product name and one line of positioning. Then {beats} scenes, one idea each, each leading with a concrete benefit rather than an adjective. Close on a single call to action.\n\n' +
      'Direction: {mood}. Use a {palette} palette with generous negative space. Keep on-screen text under six words per scene.\n\n' +
      'Voice: {voice}.',
  },
  {
    id: 'feature-spotlight',
    name: 'Feature spotlight',
    blurb: 'Explain one capability with hard numbers.',
    tags: ['1:1', 'Product', 'Data-led'],
    template:
      'A {duration}-second spotlight on {feature} for {brand}.\n\n' +
      'Arc: state the problem in one line, reveal the feature, prove it with {proof} (a number, a comparison, or a time saving). Close on a call to action.\n\n' +
      'Direction: {mood}. Big type for the number, restrained palette ({palette}). Type on screen should be readable at thumbnail size.\n\n' +
      'Voice: {voice}.',
  },
  {
    id: 'brand-story',
    name: 'Brand story',
    blurb: 'Why the brand exists, told emotionally.',
    tags: ['16:9', 'Story', 'Warm'],
    template:
      'A {duration}-second brand story for {brand}, about {mission}.\n\n' +
      'Arc: open on the tension the audience feels. Then {beats} turning points showing how the brand answers it. Close on an invitation, not a discount.\n\n' +
      'Direction: {mood}. Warm palette ({palette}), slow pacing, human imagery. Avoid jargon entirely.\n\n' +
      'Voice: {voice}.',
  },
  {
    id: 'social-promo',
    name: 'Social promo',
    blurb: 'Built for a vertical feed, fast and punchy.',
    tags: ['9:16', 'Reels/TikTok', 'Fast'],
    template:
      'A {duration}-second vertical promo for {brand}, framed for {platform}.\n\n' +
      'Arc: hook in the first two seconds with the single most striking claim. Then {beats} fast beats, one line each. Close with the offer and a call to action.\n\n' +
      'Direction: {mood}. High contrast palette ({palette}), large type, nothing subtle. The hook must work with sound off, since captions carry the message.\n\n' +
      'Voice: {voice}.',
  },
  {
    id: 'how-it-works',
    name: 'How it works',
    blurb: 'Dismantle a process into simple steps.',
    tags: ['16:9', 'Explainer', 'Clean'],
    template:
      'A {duration}-second explainer showing how {brand} {task}.\n\n' +
      'Arc: state the outcome first, then break it into {steps} steps, then show the result. Close by reinforcing the outcome.\n\n' +
      'Direction: {mood}. Clean palette ({palette}), one idea per scene, numbered steps. Keep jargon out of the copy.\n\n' +
      'Voice: {voice}.',
  },
];

const FIELD_HELP: Array<[string, string]> = [
  ['{duration}', 'Total length in seconds, e.g. 20.'],
  ['{brand}', 'The product or company name.'],
  ['{beats}', 'How many middle scenes, e.g. three.'],
  ['{mood}', 'Art direction, e.g. minimal and cinematic, or playful and bold.'],
  ['{palette}', 'Colours, e.g. near-black on warm cream with a gold accent.'],
  ['{voice}', 'Delivery, e.g. calm and precise, like an engineer explaining their work.'],
];

export function SuperPromptPanel({
  onUse,
  onPromptChange,
}: {
  onUse: (template: string) => void;
  onPromptChange?: (value: string) => void;
}) {
  const [active, setActive] = React.useState(RECIPES[0].id);
  const [open, setOpen] = React.useState(false);
  const recipe = RECIPES.find((r) => r.id === active) ?? RECIPES[0];

  return (
    <section className="super-prompt" aria-label="Prompt recipes">
      <div className="super-prompt-head">
        <div>
          <h3>Super prompts</h3>
          <p>Start from a structure that already works, then make it yours.</p>
        </div>
        <button
          onClick={() => {
            onUse(recipe.template);
            onPromptChange?.(recipe.template);
          }}
        >
          Use this structure
        </button>
      </div>

      <div className="recipe-tabs" role="tablist" aria-label="Prompt recipes">
        {RECIPES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={r.id === active}
            className={r.id === active ? 'active' : ''}
            onClick={() => setActive(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>

      <p className="recipe-blurb">{recipe.blurb}</p>

      <div className="recipe-tags">
        {recipe.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      {open && (
        <div className="recipe-help">
          <strong>Fields to fill in</strong>
          <ul>
            {FIELD_HELP.map(([field, help]) => (
              <li key={field}>
                <code>{field}</code> {help}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="link" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide field guide' : 'What do the fields mean?'}
      </button>
    </section>
  );
}
