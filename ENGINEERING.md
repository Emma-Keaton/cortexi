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

## Motion, visuals and the animation stack

### What was researched

| Tool | Verdict |
|---|---|
| **Motion** (`motion` 13.4.6, ex-Framer Motion) | Its engine exposes `sample(time)` - a headless, seekable sampler. Real, but we reimplemented the same seam in `shared/motion.ts` so the video path has **zero** animation dependencies and stays deterministic. Used for app-UI motion instead. |
| **Lottie** (`@lottiefiles/dotlottie-web` 0.80, `lottie-web` 5.13, `@remotion/lottie` 4.0.531) | Installed and supported as `visual.kind: "lottie"`. See the two corrections below. |
| **Remotion** | Unchanged role: the optional server-side render path. |
| **motion-skills** (iart-ai, MIT) | Vendored into `skills-src/` (39 files). This is where the timing numbers came from. |
| **HyperFrames** | `@hyperframes/lottie`, `/animation`, `/motion`, `/transitions` are **not published to npm** - only `engine`/`core`/`player`/`shader-transitions` (0.8.97) exist. Its producer is Puppeteer+FFmpeg, i.e. server-side, which is the thing we deliberately removed by moving encoding to the client. Patterns adopted, package not adopted. |

**Correction 1 - `lottie_light` is SVG-only.** The Airbnb wiki is explicit: "supports only the svg renderer... canvas and html renderers are not supported." Since we encode via WebCodecs, a visual that cannot draw into a 2D context is useless. Full `lottie-web` (canvas renderer + `rendererSettings.context` for a shared context) and dotLottie (canvas + WASM) are the working options.

**Correction 2 - determinism is a seek, not a play.** Per HyperFrames' own Lottie reference: "Lottie animations encode their own deterministic timeline... neither Remotion nor HF animate them, both just seek them." Lottie is created with `autoplay: false` and seeked with `goToAndStop(t * 1000)` - milliseconds, not frames, for precision when the asset's internal fps differs from ours.

### The visual system

`shared/visuals.ts` draws seven compositions to canvas: `stat-counter`, `bar-chart`, `line-chart`, `donut`, `step-flow`, `ui-frame`, `lottie`.

They are drawn rather than DOM-composed **on purpose**. Encoding to H.264 with WebCodecs means every visual must land in a 2D context we own. Implementing each infographic twice - React DOM for preview, canvas for output - guarantees drift, and a preview that lies is worse than none. So one function per visual, called by every path.

`shared/motion.ts` holds the timing vocabulary, distilled from the skills:

- **Easing by intent.** Enter `cubic-bezier(0.16,1,0.3,1)`, exit `(0.7,0,0.84,0)`, move `(0.65,0,0.35,1)`, overshoot `(0.34,1.56,0.64,1)`. Symmetric ease-in-out on an entrance is the most common reason motion reads as generic.
- **Spring solved in closed form.** A damped harmonic oscillator, not an integrator - a numeric integrator drifts with call pattern and would break reproducibility. Presets tuned from the skills: `pop` (180/10/0.5), `enter` (170/14/0.6), `settle` (no overshoot, for numbers).
- **Stagger 6-8 frames**, dropping to 5 past 8 items; above ~15 it stops reading as a sequence and starts dragging.
- **Counters round before formatting** and ease-out on the value. Overshoot is applied to scale only - a number that visibly overshoots 100% would be a lie.
- **Every visual ends fully assembled and holds.** The final frame is what the viewer remembers.

### Genre routing and the LLM brief

`server/src/motionBrief.ts` classifies the prompt into `data | product | tutorial | launch | brand | general`, each with a fixed scene shape, and injects that plus the visual schemas into the planner prompt.

The load-bearing rule is **never invent data**. A model asked for a "growth video" will cheerfully invent a bar chart, and a fabricated chart is worse than no chart: it is a lie the viewer cannot detect. So:

- Numeric visuals are never auto-filled. If the user supplied no numbers, the scene gets `visual: {kind:"none"}` and the copy carries it.
- A chart that arrives without data is replaced rather than rendered as an empty axis (`coerceVisual`).
- Only `ui-frame` and `step-flow` are safe to synthesise, because neither asserts a fact.

Verified: a `product` prompt auto-fills `ui-frame/dashboard` in the middle scene; a supplied `bar-chart` with real series survives; a `bar-chart` with no data is swapped for `ui-frame/cards`; a `data` prompt auto-fills nothing.

## Delivery formats: WebM and WebP

There is no WebP *video*. WebP is a still-image format: no audio track, and no
mainstream browser will play an animated WebP through a `<video>` element. The
request that started this was "WebP for the examples" - the goal behind it was
size and playback, so that is what was built:

- **Posters -> WebP.** `-c:v libwebp -quality 82`. A 1080p frame lands at ~22KB
  against ~35KB for JPEG at visually identical quality. Every browser that can
  run WebCodecs (which ours must, to encode) decodes WebP natively.
- **Video -> WebM (VP9 + Opus), MP4 kept as fallback.** `crf 34 -b:v 0
  -row-mt 1`. Typically 40-60% smaller than the H.264 MP4, and VP9 holds detail
  better on exactly the content these videos contain: gradients and flat UI
  fills. The showcase uses two `<source>` elements, so modern engines get the
  smaller file and older Safari falls back to MP4.

The MP4s are not deleted. They are the source the WebM is transcoded from and
the compatibility floor.

## Icons are chosen by the model, from one package

`server/src/motionBrief.ts` publishes a fixed Lucide vocabulary to the planner
along with what each icon *signals*, not just its name:

    `shield-check` - guarantee, security, privacy, reliability
    `sparkles`    - AI, magic, new-and-exciting (use sparingly - reads as hype)

The distinction is the whole point. A `shield-check` beside a pricing claim says
"guaranteed"; a `sparkles` beside the same claim says AI slop. A model shown only
names picks the one that looks nicest; a model shown meanings picks the one that
argues correctly. It sets `visual.data.icon`, or `icon` per step, and is told
plainly not to invent names - a test asserts every advertised name actually
renders.

Icons are inlined as path data in `shared/visuals.ts` rather than imported from
`lucide-react`. `shared/` is consumed by the server too, and the video path
carries no runtime dependencies; a React component would drag a DOM renderer
into a canvas renderer. `lucide-react` is still used for the app's own UI.
