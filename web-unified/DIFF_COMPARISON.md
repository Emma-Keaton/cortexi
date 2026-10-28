# Cortexi Existing vs Cortexi + StykAnimate Workstation — Difference Analysis

Extracted from: `cortexi---ai-video-synthesis-&-stykanimate-workstation.zip` → `E:\Projects\cortexi\tmp_styk_extract`

## High-Level Architecture

### Existing App
- Stack: Vite + React SPA, `web/src/App.tsx` single entry
- Routing: internal `view` state `wizard | settings`
- UI system: CSS variables, inline styles, minimal component library
- Render: Remotion 4.0 headless Chromium, on-device MediaRecorder + MP4/WebM, FFmpeg backend
- Backend integration: API_BASE /api/* for brand assets, upload, brand-kit, folders
- State: React useState, local prompt, storyboard, voice, exportDir
- Navigation: Header with Studio/Settings segmented control + theme toggle

### New StykAnimate Workstation
- Stack: Next.js 15 App Router, Tailwind CSS 4, `app/page.tsx`
- Routing: 3-tab workstation `generate | autoclip | editor` via `activeTab` state
- UI system: Tailwind, lucide-react icons, motion, class-variance-authority
- Render: Client-side canvas capture via MediaRecorder from StykCanvas, no server render
- State: StoryboardProject, BrandKit persisted to localStorage, undo/redo stacks
- Navigation: Header with desktop segmented control, tablet dropdown, mobile bottom nav `Generate / Auto-Clip / Editor` + Settings modal + Quick Export

## UI / UX Differences

### Global Shell
- Existing: Header with logo, engine status pill, Studio/Settings nav, theme toggle ☀/☾, error banner
- New: Header with gradient CX logo, engine tag `Studio`, desktop 3-tab segmented control with violet/cyan/rose active states, tablet dropdown selector, mobile bottom nav with Film/Scissors/Layers icons, Settings gear icon, Export button with Play icon
- Existing uses inline style objects; New uses Tailwind classes, backdrop-blur, sticky header

### Color & Typography
- Existing: CSS vars `--violet`, `--emerald`, `--rose`, `--amber`, dark obsidian theme
- New: Neutral palette `#0A0D14` / `#0B0F17`, violet-600/fuchsia-600/cyan-400/rose-500, font-sans, mono for timestamps

### Main Views

#### Existing Studio Wizard
- Linear 4-step flow inside single view
- Components stacked: SuperPromptPanel, FaqView, AdSlots, BrandKitManager, BrandColorPicker, HeroShowcase, Step Rail, Step 01-04
- Step 01: Prompt textarea + URL input + Aspect/AI Engine/API Key selects + Generate Storyboard
- Step 02: Scene cards with headline input, animation select, image attach, body textarea
- Step 03: Voice engine/voice selects + Synthesize button
- Step 04: Draft/Master render buttons + format select + progress bar + video preview

#### New TabGenerate
- Step rail 01 Blueprint / 02 Scenes / 03 Voice & Sync / 04 Render
- Mobile view switcher Blueprint vs Stage Preview
- Collapsible SuperPrompt Recipes drawer
- Prompt card with mode select Idea/Script/URL/Document, aspect ratio, duration select, Stickman Style select comic_pop/classic_bw/doodle
- Scene inspector split: compact scene list left, active scene drawer right with sub-tabs Actor / Infographic / Props
  - Actor: headline, Styk Action select walk/run/point/scratch_head/jump/celebrate/shocked/wave/sit/idle, expression select, voiceover textarea
  - Infographic: type select metric_counter/bar_chart/terminal/alert_card/sparkline, metric value input
  - Props: caption style select, props toggle grid laptop/lightbulb/coffee...
- Right 40% live StykCanvas preview with canvas ref, transport controls play/pause/reset/range, timecode
- Voice step with engine select Gemini/Kokoro/Piper, narrator persona, soundtrack select
- Render step with Draft/Master buttons, progress bar, download link from MediaRecorder blob

#### Existing Settings
- Interface Appearance theme buttons
- Export Mirror Destination with FolderPickerModal browse server filesystem
- Pipeline Architecture cards Remotion/Kokoro/FFmpeg
- Product Cutout local rembg

#### New SettingsModal
- Modal overlay for Workstation Settings & Brand Kit
- BrandKit state managed in page, passed to modal
- No server export folder picker, no pipeline architecture display, no product cutout UI in extracted code

#### Existing Pages not in App.tsx
- EditorWorkspace.tsx, ClipWorkspace.tsx, SettingsPage.tsx, DesignGallery.tsx, PlaceholderTab.tsx
- EditorWorkspace: media bin, preview, timeline, inspector, checkpoints, prompt bar
- ClipWorkspace: ingest dropzone, analyze phases, results cards, clip editor

#### New TabAutoClip
- Ingest accordion with drop zone + Scan for Viral Hooks button
- Ranked clips list with circular viral score ring, 5-criterion bar breakdown hook/flow/value/trend/share, Styk Reaction tag
- Right style drawer with StykCanvas preview 9:16, Hook Headline input, Caption Script textarea, Font select, Animation Preset select, Accent color swatches
- Send to Editor button converts clip to storyboard scene with stykAction mapping

#### New TabEditor
- Pro NLE layout with collapsible left media bin and right inspector
- Left bin tabs: styk / poses / infographics / props / audio
- Center canvas preview + timeline with zoom, onion skin, grid, tools select/split, easing, playhead
- Right inspector tabs: styk_ik / camera / video / infographic / history
- Checkpoints rail with undo/redo stacks, AI prompt dock bottom
- Microphone voiceover recording, project import/export .cortexi bundle
- No server folder picker, no FFmpeg pipeline display

## Functional Differences

### Data Model
- Existing: prompt, aspect, apiKey, provider, sb with scenes {id, template, headline, animation, image, body, durationSec}
- New: StoryboardProject with mode, format, accent/background colors, scenes with stykAction, stykFacing, stykPosition, stykStyle, expression, camera, secondaryCharacter, infographic, infographicData, props, captionStyle, words timestamps
- New adds ViralClip type with viralScore + criteria breakdown + stykReaction

### Animation Engine
- Existing: Remotion React components, static scenes
- New: StykCanvas with StykEngine, IK rigging, stickman actions, expressions, props attachment, infographic engine, camera config, hyperframes

### Voice & Captions
- Existing: Piper/Kokoro/None engine select, voice select, synthesize button
- New: Gemini 3.8 Flash TTS, neural synthesis with word timestamps via calculateWordTimestamps, karaoke sync, dynamic caption styles, microphone recording

### Brand Kit
- Existing: BrandKitManager with asset upload, dominant color extract client-side, server contrast check WCAG AA, apply to storyboard style
- New: BrandKit type with logoUrl, colors, fontFamily, assets array, managed in SettingsModal, no server contrast check visible

### Auto-Clip
- Existing: ClipWorkspace with ingest + analyze phases transcribe/energy/scoring, clip cards with score ring, style panel with captions transcript-first
- New: Auto-Clip tab with simulate scan, viral scoring, Styk reaction mapping, stage preview with reactive stickman, caption styling

### Rendering & Export
- Existing: On-device Remotion render + MediaRecorder, draft/master, MP4/WebM, export mirror to server folder
- New: Canvas capture via canvas.captureStream(30) + MediaRecorder, WebM VP9, progress simulation, download blob URL, no server mirror

### History & AI
- Existing: No explicit checkpoints in wizard; EditorWorkspace has Checkpoint with manual/AI/restore
- New: Checkpoints array, undoStack/redoStack, AI prompt edit API /api/gemini/prompt-edit, prompt edit dock

### APIs
- Existing: /api/brand-assets, /api/upload, /api/brand-kit, /api/folders
- New: /api/gemini/generate-storyboard, /api/gemini/prompt-edit

### Storage
- Existing: localStorage for editor project only
- New: saveProjectToStorage, loadProjectFromStorage, exportCortexiBundle / parseCortexiBundleFile

## Component Mapping

- SuperPromptPanel → SUPER_PROMPT_RECIPES drawer in TabGenerate
- BrandKitManager → SettingsModal BrandKit state
- BrandColorPicker → not present in new; color via brand kit
- HeroShowcase → not present; replaced by recipe presets
- FaqView / AdSlot → removed
- FolderPickerModal → removed, no server export
- EditorWorkspace → TabEditor with StykCanvas integration
- ClipWorkspace → TabAutoClip with Styk reaction
- SettingsPage → SettingsModal

## Missing in New
- Server export folder picker
- Product cutout rembg
- Pipeline architecture display
- FAQ & Ad slots
- Hero showcase gallery
- BrandColorPicker standalone
- WCAG contrast server check

## New Features Not in Existing
- StykAnimate stickman rig with IK, actions, expressions, props, infographics
- Viral Auto-Clip scoring with 5 criteria bars
- Canvas stage preview live with playhead sync
- Stickman style selector
- Infographic types metric_counter/bar_chart/terminal/alert_card/sparkline
- Camera config zoom/pan/shake
- Secondary character config
- Custom props attachment to bones
- Microphone voiceover recording
- .cortexi bundle import/export
- Undo/redo stacks
- AI prompt edit dock
- Mobile view switcher blueprint/stage
- SFX audio feedback

## Merge Implications
To unify:
- Adopt Next.js + Tailwind base, keep dark obsidian theme
- Merge 3-tab workstation into existing Studio/Settings navigation or replace with 3 tabs
- Integrate StykCanvas into existing wizard steps 02 Storyboard scenes replacing Remotion scene cards
- Port BrandKitManager UI into SettingsModal with WCAG check retained
- Keep FolderPickerModal and Export Mirror Destination in Settings
- Add product cutout rembg to Settings
- Retain SuperPromptPanel recipes, FAQ, BrandColorPicker as optional panels
- Merge ClipWorkspace scoring UI with TabAutoClip viral scoring
- Merge EditorWorkspace timeline + checkpoints with TabEditor pro NLE layout
- Keep Remotion render option alongside canvas capture for master export
- Preserve existing API routes for brand assets and folders
