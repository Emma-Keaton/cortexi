# Engineering notes

Decisions, research findings, and applied practices. Kept separate from
`DEPLOYMENT.md` (how to ship) and `README.md` (what it is).

## Remotion practices applied

Sourced from the official `remotion-best-practices` skill and applied to
`server/remotion/`.

| Practice | Where | Why |
|---|---|---|
| Drive motion with `interpolate()` + `Easing.bezier`, not raw `spring()` | `scenes/SceneRenderer.tsx` | Springs settle at a physics-dependent time; interpolations with an explicit curve are predictable and match a designer's timing. A crisp `bezier(0.16, 1, 0.3, 1)` reads deliberate rather than bouncy. |
| One normalized progress value, derive all properties from it | `scenes/SceneRenderer.tsx` | Previously each property recomputed its own interpolation. Now a single `enter` (0..1) drives opacity, transform, and scale, so nothing can drift out of sync. |
| Clamp extrapolation on both ends | `scenes/SceneRenderer.tsx`, `Captions.tsx` | Without `extrapolateRight: 'clamp'`, values run past the range and elements fly off-frame. |
| `Easing.out` for enters, `Easing.in` for exits | `scenes/SceneRenderer.tsx` | Elements arrive with momentum and leave with gravity. |
| Fit text to its box | `scenes/SceneRenderer.tsx` (`fitText` from `@remotion/layout-utils`) | Long brand names previously overflowed the frame. Now the headline is measured and capped, with a safe fallback if the font is not loaded yet. |
| Add an exit animation | `scenes/SceneRenderer.tsx` | Scenes used to hard-cut. A short eased fade + lift reads far more produced. |
| Eased caption word-in and active-word pop | `Captions.tsx` | A ternary scale swap popped abruptly. Now each word eases in and the active word uses a slight overshoot. |
| `display: inline-block` for transformed spans | `Captions.tsx` | `transform` does not apply to non-replaced inline elements. |

Added dependency: `@remotion/layout-utils` (text measurement). `@remotion/transitions`
is installed and available for future `TransitionSeries` crossfades between scenes.

## HyperFrames: evaluated, not adopted

[HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache 2.0) is an
HTML/CSS/JS to deterministic video framework. It is genuinely well suited to
Cortexi's problem, and it is worth recording why we did *not* migrate.

**What it is**
- Compositions are plain `index.html` with data attributes. No React, no bundler.
- `@hyperframes/engine` captures via **Puppeteer + FFmpeg** - i.e. server-side.
- Also `@hyperframes/core`, `@hyperframes/producer`, `@hyperframes/player`, `@hyperframes/studio`.
- Ships agent skills, so an LLM can author valid compositions.

**Why it is a poor fit right now**

Cortexi's entire hosting strategy rests on *not* running a headless browser on the
free backend. HyperFrames' engine does exactly that. Adopting it would reintroduce
the Chromium + FFmpeg cost on a free CPU instance that we specifically removed by
moving encoding to the client.

Its authoring model is genuinely appealing though: we already have the renderer
(Remotion, local-only) and the client encoder (canvas + MediaRecorder + FFmpeg
WASM). A future option is authoring scenes as HTML and using `@hyperframes/player`
client-side, which would let one composition serve both the local server render and
the browser render.

**Revisit if** we move rendering to paid infrastructure, or if we want a single HTML
composition shared by both render paths.

## Storyboard rules

`server/src/storyboard.ts` encodes the invariants the renderer and TTS stages rely
on, so nothing downstream has to special-case a weird storyboard:

- 3-6 scenes (padded with sensible middle beats if the model returns too few)
- exactly one opener (`title-card`) and one closer (`outro`)
- sequential `s1..sN` ids
- durations clamped to 1.5-12s, estimated from word count when audio is absent
- unknown animation values replaced with `fade-up`
- no two identical entrances in a row (reads as a rendering bug)

Planning itself is constrained decoding (`response_format: json_schema, strict`),
with a tolerant parser as a second line of defence for providers that ignore it.

## Brand asset management

`server/src/brandAssets.ts` is the source of truth for a project's brand.

**Registry** - `assets/brand-assets.json`, roles: `logo`, `product`, `background`,
`foreground`. A corrupt registry degrades to empty rather than failing the app.

**Colour science** - full WCAG 2.1 implementation:
- `relativeLuminance`, `contrastRatio` (WCAG formula, not a naive approximation)
- `deriveBrandKit` guarantees readable text: if the supplied text colour fails
  AA (4.5:1) against the background, it is replaced with the better of
  white / near-black. Accents are held to the 3:1 "large text" threshold.
- `deriveSecondary` rotates hue 35 degrees and nudges lightness so the secondary
  colour harmonises instead of clashing.

**Pipeline**
1. User uploads a file, picks a role.
2. The browser samples the dominant colour locally (no upload of pixel data needed
   for the colour step).
3. The asset is registered; a logo's colour becomes the brand primary.
4. `deriveBrandKit` produces primary / secondary / background / text + contrast checks.
5. The kit is injected into the planner prompt and returned with the storyboard
   so the UI can show it before rendering.

API: `GET/POST/DELETE /api/brand-assets`, `POST /api/brand-kit`.

## Super prompts

`web/src/components/SuperPromptPanel.tsx` teaches prompt writing instead of
leaving users to guess.

The problem with a bare text box is that "make a video about my coffee brand"
gives the model nothing to work with. The result is generic: a title card, three
feature scenes, no art direction.

A **super prompt** is a complete art direction. The five recipes in
`RECIPES` all follow the same structure, which is what makes output predictable:

```
length -> arc -> opening -> middle beats -> closing -> palette -> voice
```

The key idea is the **arc**. Stating "open on X, then three scenes one idea each,
close on a call to action" is worth far more than any list of adjectives, because
it controls structure. Art direction (`{mood}`, `{palette}`) and delivery
(`{voice}`) are what separate a generic video from one that looks designed.

Fields are written `{duration}`, `{brand}`, etc. so they are visually obvious to
fill in, and an in-app field guide explains each one. `Use this structure` drops
the template into the prompt box so a user edits rather than authors.

Each showcase example ships its own real super prompt
(`web/src/examples.ts`), viewable under the video and one click away in Studio.

## Showcase gallery

`examples/concepts.json` is the source of truth for art direction, palette, voice,
per-scene copy, and the super prompt. `./build-examples.ps1` expands each concept
into a full storyboard (gradients, typography, motion, layout), calls `/api/voice`
for a real voiceover, renders via the local Remotion pipeline, and extracts a
poster frame.

Regenerate with:

```bash
CORTEXI_ENABLE_SERVER_RENDER=1 pnpm dev   # terminal 1
./build-examples.ps1                       # terminal 2
```

**Voice verification matters.** Edge TTS voices are not uniformly available -
`NoAudioReceived` is raised for some, and the failure only surfaces as a scene with
no audio. Every voice in `concepts.json` has been verified to return audio. Check a
new one first:

```bash
edge-tts --voice en-US-XxxNeural --text "Test" --write-media /tmp/t.mp3
```
