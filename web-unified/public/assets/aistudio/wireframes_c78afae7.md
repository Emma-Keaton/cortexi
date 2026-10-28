# Cortexi App Wireframes

## Overview
Local-first AI video synthesis workstation. Single-page app with top navigation `Studio | Settings` and global header.

**Responsive breakpoints:** 390px mobile, 834px tablet, 1440px desktop.
**Design system:** CSS variables `--surface`, `--border`, `--text`, `--violet`, `--emerald`, `--rose`, `--amber`. Dark default.

---

## Global Shell

### Header
- Left: logo `CORTEXI` + `Studio v0.1` + tagline `Local-first AI video synthesis workstation`.
- Center/right: Engine status pill `Engine Ready / Server Disconnected` with pulse dot.
- Navigation segmented control: `Studio` active, `Settings`.
- Theme toggle `☀ / ☾`.
- Error banner above content: red notice with dismiss.

### Footer navigation (mobile <640)
Bottom nav 3 items: Generate, Clip, Edit.

---

## View 1 — Studio Wizard

Entry view when `view === 'wizard'`. Linear 4-step flow with optional supporting panels.

### Layout
Vertical stack:

1. `SuperPromptPanel` — prompt recipes with `onUse` / `onPromptChange`.
2. `FaqView` — accordion `Cortexi FAQ` with 6 FAQs `What kinds of brand videos...`.
3. `AdSlot` x2 — `Adsterra` / `Monetag` placeholders.
4. `BrandKitManager` — brand assets + kit + palette.
5. `BrandColorPicker` — upload logo → extract dominant color.
6. `HeroShowcase` — recipe gallery `onSelectRecipe` → set prompt + aspect.
7. Step Rail Indicator — 01 Prompt & Blueprint, 02 Storyboard Scenes, 03 Neural Voiceover, 04 Remotion Render.
8. Step 01, Step 02, Step 03, Step 04 sections conditional on state.

### Step 01 — Prompt & Blueprint
Card `STEP 01` `Describe Your Video`

- Textarea `prompt` placeholder "Describe your brand...".
- URL input + `Use page text` button `fetchUrlText`.
- Row:
  - Aspect Ratio select `16:9 / 9:16 / 1:1`
  - AI Blueprint Engine select `Automatic / Hugging Face Router / GPT-OSS 120B - Groq / Google Gemini Flash`
  - API Key password input
  - Primary button `Generate Storyboard`

### Step 02 — Storyboard Scenes
Card `STEP 02` `Storyboard: {sb.title} ({n} scenes)`

Toolbar:
- Accent color input
- Background color input
- Karaoke Captions checkbox
- Upload Soundtrack file input + indicator if attached

Scenes list:
Each scene card `var(--input-bg)` with violet left border:
- Scene N · {template} badge
- Headline editable input
- Animation select `fade-up / zoom / slide-left`
- Attach Image file label
- Duration `Xs` if present
- Body textarea `Voiceover script for this scene...`

### Step 03 — Neural Voiceover
Card `STEP 03` `Voiceover & Word Sync`

- Engine select `Piper / Kokoro-82M / none`
- Voice select filtered by engine
- Button `Synthesize Speech & Word Timings`
- Status pill `Voiceover & word timings ready` with pulse dot if scenes have audioFile

### Step 04 — On-Device Render & Download
Card `STEP 04` `On-Device Render & Download`

- Button `Draft Render (Fast, Half-Res)`
- Button `Master Render (Full 1080p)`
- Download Format select `MP4 / WebM`
- Progress bar with percent + phase `encoding / render`
- Video preview `<video controls>` if `deviceVideoUrl` exists
- Note: `This file was generated and downloaded on your device. Server never processed the video.`

---

## View 2 — Settings

Displayed when `view === 'settings'`.

Sections stacked:

### Interface Appearance
Card with title `Interface Appearance`
Description `Select your preferred workstation theme. Preserved in your browser session.`
Two theme buttons: `Obsidian Dark` / `Pure Light`. Active gets violet border + overlay.

### Export Mirror Destination
Card with title `Export Mirror Destination`
Description mentions `assets/output/`.
Row:
- Input mono `e.g. E:\Videos\Cortexi (or choose folder)` bound to `exportDir`
- Button `Browse` opens `FolderPickerModal`
- Button `Save Preference`
- Status msg green `✓ saved`

### Pipeline Architecture
Card with title `Pipeline Architecture`
Grid 3 tiles:
- Synthesizer `Remotion 4.0` · Headless Chromium / React
- Voiceover `Kokoro-82M` · Choose any voice configured by backend
- Media Processing `FFmpeg / ffprobe` · Hardware-accelerated muxing

### Product Cutout · Local rembg
Card
- File input image
- Button `Remove background`
- Result `<img>` with checkerboard background

---

## Modal — FolderPickerModal

Trigger: Browse in Settings.
Full-screen overlay `rgba(0,0,0,0.75)` blur.
Dialog:
- Header `Choose Server Export Folder` + close ✕
- Path display `📁 {currentPath}` + `↑ Up` button
- Error banner if present
- Dir list scrollable, hover highlight → `→` arrow. Click navigates deeper.
- Footer: Cancel button, `Choose This Folder` primary disabled until path selected.

---

## Component — BrandKitManager

Card `Brand assets`

Header:
- Title `Brand kit`
- Description `Upload a logo or product shot. Colours are extracted locally and contrast-checked to WCAG AA.`
- Asset role select `logo / product / background / foreground`
- `Add asset` button opens hidden file input.

Body grid:
- Asset list: thumbnail, name, role, primaryColor, remove `x`
- Palette:
  - Swatch Primary `color input + code`
  - Swatch Background
  - Swatch Text
  - Contrast row: `text {ratio}:1 AA / FAIL`, `accent {ratio}:1 AA large / large only`
  - Button `Apply to storyboard` primary disabled until kit exists.

---

## Component — BrandColorPicker

Section `Identify brand colors`
- Description `Upload a logo or product photo. Cortexi samples it locally and extracts a dominant color.`
- Color input `#7C3AED` default
- `Analyze asset` button triggers hidden file input
- Code display

---

## Component — HeroShowcase
Recipe gallery that sets prompt + aspect on selection.

---

## Component — SuperPromptPanel
Prompt recipes with onUse / onPromptChange.

---

## Component — FaqView
Accordion with 6 FAQs.

---

## Page Components — Separate Workspaces

These exist as standalone pages/components but are not routed in current `App.tsx`. Wireframed in `clonekit/wireframes/index.html`.

### Tab 1 — Generate / Storyboard
Responsive shell:
- Desktop ≥1100: left rail `Generate / Auto-Clip / Editor / Settings`
- 640–1099: top segmented tabs
- <640: bottom nav

Content grid 2-col:
Left:
- Step rail `1 Intake / 2 Storyboard / 3 Voice / 4 Export`
- Card `What are we making?`
  - Mode chips `Idea / Script / URL / Document`
  - Prompt placeholder
  - Format chips `Motion graphics / Explainer / Ad / Voice-over / Social`
  - Aspect chips `9:16 / 16:9 / 1:1`
  - Buttons `Build storyboard` `Brand kit ▸`
- Card `Storyboard — 5 scenes`
  - 4 scene cards with headline, visual-kind badge, duration
  - Buttons `Regenerate SC 03` `Rebuild all`

Right:
- Card `Voice & captions` with KV list Engine / Voice / Captions / Style / Music, `Preview voice`
- Card `Render` with phase badges, format pills MP4 / WebM, draft / master, `Download`

### Tab 2 — Auto-Clip
Left column:
- Card `Ingest`: drop zone + privacy note
- Phase badges `transcribing / energy scan / scoring`
- Card `Ranked clips` with sort/filter bar
  - Clip row: score ring 0-100, title, 5-criterion bar chart `hook / flow / value / trend / share`, badges, `Style ▸`

Right column Desktop / Bottom sheet Mobile:
- Card `Style clip · 92`
  - Preview `9:16 preview · captions burned-in`
  - Captions transcript first editable
  - Header / Title inputs
  - Font & look chips `Inter / Space G. / JetBrains`, `B / UP`, size `A 44`, swatches
  - Animated presets `word-highlight / bounce / typewriter / none`
  - Effects chips `grain / glow / vignette`
  - Buttons `Apply to all clips` `Export clip`

### Tab 3 — Editor
Desktop 4-region layout:
1. Media bin left 210px: asset grid, `+ Import`, Effects packs badges
2. Preview + Timeline center:
   - Preview canvas `9:16 stage — play`
   - Timeline with ruler 0s-12s, transport pills `⏮ ◀| ▶ |▶ ⏭`, split / ripple / snap / zoom
   - 3 tracks: video clips, text clips, audio clip
   - Clip-strip mobile fallback
3. Inspector right 260px + Checkpoint rail:
   - Tabs `Transform / Color / Text / Effects / History`
   - Transform KV `Position / Scale / Rotation / Opacity / Keyframe`
   - Color KV `Wheels / LUT`
   - Checkpoints list with dot, label, prompt snippet, time, actions `Undo / Redo`, `Adjust prompt ↻ branches`

Header prompt bar `Prompt an edit — “split at the second pause…”` with Run button, resolution pill, Export pill.

Mobile: timeline collapses to clip-strip, inspector/history become bottom sheet.

---

## Pages — Legacy/Alternative Workspaces

### EditorWorkspace
4-panel editor:
- Media bin left
- Preview center top
- Timeline center bottom with tracks V2/V1/A1, ruler, zoom, split/ripple/snap
- Inspector right with Transform/Color/Text/Effects tabs + History/Checkpoints rail
- Prompt bar in header for AI edits → checkpoint created
- Export dialog

### ClipWorkspace
Full-screen auto-clip:
- Header with source name + `New source`
- Left: Ingest dropzone, phase list `Transcribing → Energy scan → Scoring`
- Center: Ranked clip cards with score ring, 5-criterion breakdown, badges, checklist
- Right: Style panel with transcript-first caption editor, Header/Title inputs, font/style/size/color/position, animated presets, effects, 9:16 reframe, `Apply to all`, `Export`
- Preview player with playhead + word snap markers

### SettingsPage
Separate settings page component with provider key, voice, export destination, effects packs, learning stats.

### DesignGallery
Design system showcase:
- Buttons variants/sizes
- Inputs / Textarea
- Chips
- Cards
- ScoreRing
- ProgressPhases
- Toast

### PlaceholderTab
Empty state page with icon, title, blurb, bullet chips for features coming next.

---

## Responsive Behavior Summary

- **Desktop 1440:** Left rail navigation, 2-3 column grids, inspector side panels, full timeline.
- **Tablet 834:** Top segmented tabs, 2-column grids, sheets for inspector.
- **Mobile 390:** Bottom nav, single column stack, bottom sheets for timeline/inspector, clip-strip horizontal scroll.

---

## Notes
- All rendering is on-device via Remotion + MediaRecorder. Server never processes video.
- Brand kit colours are contrast-checked server-side for WCAG AA.
- Checkpoints are append-only history with AI prompt branching.
- Folder picker navigates host server filesystem directly for cross-device export mirroring.
