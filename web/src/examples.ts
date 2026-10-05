/**
 * Showcase gallery metadata.
 *
 * Kept in sync with `examples/concepts.json`, which drives
 * `./build-examples.ps1` to actually render the MP4s and poster frames.
 *
 * Each entry ships a `superPrompt` - a complete, copy-pasteable art direction
 * that a user can adapt rather than write from scratch.
 */
export type Example = {
  id: string;
  title: string;
  badge: string;
  aspect: string;
  duration: string;
  videoSrc: string;
  videoFallbackSrc: string;
  posterSrc: string;
  prompt: string;
  superPrompt: string;
};

export const EXAMPLES: Example[] = [
  {
    id: 'aurelia-chronos',
    title: 'Aurelia Watches',
    badge: 'Luxury Timepieces',
    aspect: '16:9',
    duration: '~20s',
    videoSrc: '/examples/aurelia-chronos.webm',
    videoFallbackSrc: '/examples/aurelia-chronos.mp4',
    posterSrc: '/examples/aurelia-chronos.webp',
    prompt: 'Luxury watch launch in warm cream and antique gold, calm and precise',
    superPrompt:
      'A 20-second luxury watch launch film for Aurelia. Open on a title card reading "Aurelia Chrono" over a white-to-warm-cream gradient with thin gold rules. Then one scene per benefit using a left-aligned editorial layout with generous negative space: the sapphire crystal face, the Swiss automatic movement, the 72-hour power reserve. Close on a full-bleed hero with a gold call-to-action button. Palette: near-black type, antique gold accent, white background. Voice: calm and precise, unhurried, as if describing a piece you would handle once a year.',
  },
  {
    id: 'vireo-summer-capsule',
    title: 'Vireo',
    badge: 'Sustainable Fashion',
    aspect: '9:16',
    duration: '~15s',
    videoSrc: '/examples/vireo-summer-capsule.webm',
    videoFallbackSrc: '/examples/vireo-summer-capsule.mp4',
    posterSrc: '/examples/vireo-summer-capsule.webp',
    prompt: 'Vertical social campaign in sage and forest green, warm and conversational',
    superPrompt:
      "A 15-second vertical social campaign for the Vireo summer capsule, composed for a phone screen. Open with a stacked typography statement on pale sage, set in lowercase with wide letter tracking. Then three quick beats, one idea each, each leading with a bold fact in the accent green: organic linen, plant dyed colour, made in small runs. Close on a single centered call to action. Palette: soft sage background, deep forest accent, charcoal text. Voice: warm and conversational, like a friend showing you their favourite pieces, never salesy.",
  },
  {
    id: 'nimbus-aero',
    title: 'Nimbus Audio',
    badge: 'Premium Audio',
    aspect: '1:1',
    duration: '~16s',
    videoSrc: '/examples/nimbus-aero.webm',
    videoFallbackSrc: '/examples/nimbus-aero.mp4',
    posterSrc: '/examples/nimbus-aero.webp',
    prompt: 'Square product spot in engineered monochrome with a cyan accent',
    superPrompt:
      'A 16-second square product spot for flagship wireless headphones, framed for social feeds. Open on a centered hero with the product name over a cool graphite split background. Then two technical beats with hard numbers set in large type: forty two hours of playback, and adaptive noise cancelling that reads the room eight hundred times a second. Close on a minimal centered call to action. Palette: engineered monochrome, near black on cool grey, with a single electric cyan accent. Voice: deep, confident and precise, the way an engineer explains their own work.',
  },
  {
    id: 'momentum-motion',
    title: 'Momentum',
    badge: 'Motion Graphics',
    aspect: '16:9',
    duration: '~24s',
    videoSrc: '/examples/momentum-motion.webm',
    videoFallbackSrc: '/examples/momentum-motion.mp4',
    posterSrc: '/examples/momentum-motion.webp',
    prompt: 'A 24-second motion-graphics spot: flat shapes, one move each, near-black with a single cyan accent',
    superPrompt:
      'A 24-second motion-graphics spot for Momentum, the flat-shape way to build a launch film. Open on a near-black title card reading "Momentum" with a single cyan accent rule. Then one flat move per scene: a hero tile that lifts into frame, a hub with three nodes routing through it, a gliding strip of partners, and a divider that lands the one word that matters. Palette: near-black field, electric cyan accent, white type, one accent doing all the work. Voice: fast and confident, like a director calling the last take.',
  },
];
