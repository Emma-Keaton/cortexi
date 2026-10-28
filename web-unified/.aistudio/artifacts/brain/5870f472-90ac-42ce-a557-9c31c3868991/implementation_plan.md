# Cortexi: AI Video Synthesis & StykAnimate Workstation

A professional local-first video synthesis and animation workstation that unites **Cortexi's 3-tab architecture** (Generate / Storyboard, Auto-Clip, and Editor) with **StykAnimate's stick-node document model & IK rig system**, **infographics & hyperframe motion graphics**, and **AI Director story synthesis**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Revised Core Decisions based on your feedback**:
> - **Strict 3-Tab View Architecture**:
>   1. **`Generate / Storyboard` Tab**: AI Director intake (Idea/Script/URL/Document), format selection (Motion Graphics, UI Infographics, Explainer, Stickman Animated Story), scene-by-scene hyperframe storyboard with Styk rigs, neural voiceover, and on-device render.
>   2. **`Auto-Clip` Tab**: Intelligent viral short-form repurposing workstation with AI energy scan, 5-criterion ranking (Hook, Flow, Value, Trend, Share), transcript-first caption editor, and dynamic stickman reaction overlays.
>   3. **`Editor` Tab**: Pro NLE (Non-Linear Editor) inspired by Premiere, After Effects, CapCut, and StykAnimate — 4-panel layout (Media Bin & Styk Rig/Prop Drawer, Interactive Canvas with live IK bone posing & UI infographics, Multi-track Timeline V2/V1/Styk/Audio/Captions, Inspector with Transform/Color/Effects/Styk IK, and AI Checkpoint Branching).
> - **Infographics + Stykman Hybrid Animation**:
>   - Seamless fusion where stick characters dynamically interact with on-screen UI infographics and hyperframes (e.g. stickman dragging a bar chart, pointing to a KPI metric, scratching head beside an alert card, or leaping across kinetic text).
> - **Visual Theme & Radical Color Language**:
>   - Sleek obsidian-black studio canvas (`#0A0D14` / `#111622`) rooted in DaVinci Resolve & Runway design language, energized with **radical neon accents**:
>     - **Electric Violet** (`#8B5CF6`) — AI generation, master controls, and timeline playhead.
>     - **Neon Cyan / Glitch Azure** (`#00F0FF`) — Stykman IK joint pins, bone transforms, and motion paths.
>     - **Laser Magenta** (`#FF007F`) — Keyframe diamonds, split points, and cut markers.
>     - **Acid Emerald** (`#10B981`) — Audio waveforms, word-sync milestones, and export success.
>     - **Hyper Amber** (`#F59E0B`) — Alert hyperframes, kinetic text highlights, and warning states.

---

## 1. Overview & Core Concept

Cortexi bridges generative AI video creation with tactile, professional animation software:
1. **The AI Director & Hyperframe Story Engine**:
   - Ingests prompts, long-form scripts, URLs, or documents.
   - Decomposes them into timed visual scenes mixing **hyperframe kinetic typography**, **UI infographics** (live metric counters, bar charts, terminal boxes), and **Stykman character performances**.
2. **The StykAnimate Rigging & IK System**:
   - 12-joint articulated stickman skeleton with forward & inverse kinematics (IK).
   - Manipulate limbs directly on the canvas or pick from curated action loops (Walk, Run, Wave, Point, Think, Jump, Sit, Scratch Head).
   - Stylistic rendering presets: *Classic B&W Ink*, *Comic Pop*, and *Whiteboard Doodle*.
3. **The Pro Multi-Track Editor & Timeline**:
   - Scrubbable time ruler, playhead, snapping, split/ripple edit tools, audio waveform preview, and animated word-by-word karaoke caption burning.
4. **Viral Auto-Clip Studio**:
   - Automatically ingest longer videos/scripts, score segments with viral potential radar, and burn styled captions with reactive stickman animations.

---

## 2. User Experience & Screen Design

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [CORTEXI] Studio v0.2 · AI Synthesis Workstation  [Generate] [Auto-Clip] [Editor] [⚙] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 1: GENERATE / STORYBOARD                                                           │
│ ┌───────────────────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ 1. Intake: Idea / Script / URL / Document     │ │ Voiceover & Captions             │ │
│ │    • Prompt bar & SuperPrompt recipe tags     │ │ • Engine: Kokoro / Gemini TTS    │ │
│ │    • Format: Motion Graphics / Styk / Infogr. │ │ • Caption Style: Karaoke/Lower3rd│ │
│ │    • Aspect: 9:16 / 16:9 / 1:1                │ │ • Background Music & SFX         │ │
│ │ 2. Storyboard (N Scenes):                     │ ├──────────────────────────────────┤ │
│ │    • Scene cards with hyperframe + Styk rig   │ │ On-Device Render Engine          │ │
│ │    • Headline, animation type, duration       │ │ • Fast Draft (720p) / Full 1080p │ │
│ │    • Voiceover text with live word timing     │ │ • WebM / MP4 Local MediaRecorder │ │
│ └───────────────────────────────────────────────┘ └──────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 2: AUTO-CLIP (Viral Repurposing)                                                   │
│ ┌─────────────────────────┬─────────────────────────┬────────────────────────────────┐ │
│ │ Ingest & Source Upload  │ Ranked Viral Clips      │ Style & Reframe Inspector      │ │
│ │ • Dropzone / URL paste  │ • 0-100 Viral Ring      │ • 9:16 Stage with burned subs  │ │
│ │ • Transcribe & Energy   │ • Hook/Flow/Value radar │ • Kinetic caption presets      │ │
│ │   scan progress badges  │ • Stickman reaction tag │ • Stickman reaction overlay    │ │
│ └─────────────────────────┴─────────────────────────┴────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TAB 3: PRO EDITOR (Premiere + StykAnimate Hybrid)                                      │
│ ┌──────────────┬──────────────────────────────────────────┬──────────────────────────┐ │
│ │ Media Bin &  │ Preview Canvas & Stage                   │ Inspector & Checkpoints  │ │
│ │ Styk Drawer  │ • Interactive Styk IK handles (Cyan)     │ • Transform (Pos/Rot/Scl)│ │
│ │ • Rig Roster │ • UI Infographic overlay layers          │ • Styk Rig IK controls   │ │
│ │ • Poses Loop │ • Transport [⏮ ◀| ▶ |▶ ⏭] Timecode       │ • Color Wheels / LUTs    │ │
│ │ • SVG Props  ├──────────────────────────────────────────┤ • Effects & Typography   │ │
│ │ • Infographic│ Multi-Track Timeline (V2, V1, Styk, A1)  │ • Checkpoint History     │ │
│ │   Elements   │ • Ruler 0-60s · Keyframes (Magenta)      │   Prompt Branching       │ │
│ └──────────────┴──────────────────────────────────────────┴──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Screen Breakdown

#### Tab 1 — Generate / Storyboard
- **Intake Card**:
  - Mode chips: `Idea`, `Script`, `URL`, `Document`.
  - Format chips: `Styk Animated Story`, `UI Infographics`, `Motion Graphics`, `Explainer`, `Social Ad`.
  - Aspect Ratio: `9:16 Vertical`, `16:9 Widescreen`, `1:1 Square`.
  - SuperPrompt drawer with 1-click recipes (*"SaaS Onboarding in 30s"*, *"The Procrastination Paradox"*, *"Market Crash Explained with Infographics"*).
  - Primary button: `Generate Storyboard` (triggers Gemini 3.8 Flash structured breakdown).
- **Storyboard Scene Pipeline**:
  - Interactive scene cards showing:
    - Visual type badge (`Stykman + Chart`, `Kinetic Hyperframe`, `Isometric Callout`).
    - Stykman action selector (`Walk Cycle`, `Scratch Head`, `Point to Chart`, `Victory Jump`).
    - UI Infographic selector (`Metric Pulse`, `Bar Chart Rise`, `Code Terminal`, `Badge Alert`).
    - Script editor with duration calculator and synchronized word timestamps.
- **Voice & Captions Card**:
  - Voice Persona selector (`Studio Narrator`, `Fast Creator`, `Warm Explainer`).
  - Caption preset switcher: `Dynamic TikTok Karaoke`, `Clean Lower-Third`, `Comic Speech Bubbles`, `Minimal Headline`.
- **Render Card**:
  - Draft (Half-Res) vs Master (Full 1080p).
  - Real-time client-side MediaRecorder progress bar and `<video>` player preview.

#### Tab 2 — Auto-Clip
- **Ingest Zone**: Upload or paste video/audio/script.
- **Viral Energy Scanner**: Displays analysis phases (`Transcribing` → `Energy Scan` → `Hook Scoring`).
- **Ranked Clip Cards**:
  - Circular score ring (e.g. `94/100`), title, timestamp range.
  - 5-criterion breakdown bars: Hook, Flow, Value, Trend, Shareability.
  - Recommended Stykman reaction badge (`Mind Blown`, `Facepalm`, `Pointing Alert`).
- **Style Panel & 9:16 Reframe Preview**:
  - Transcript editor with word-level highlight editing.
  - Kinetic typography styler (Font, color, shadow, bounce animation).
  - Stickman sticker overlay positioned directly over the clip.
  - Instant `Export Clip` or `Send to Pro Editor`.

#### Tab 3 — Pro Editor (The StykAnimate NLE)
- **Left Panel (240px) — Media Bin & Styk Drawer**:
  - Tabs: `Styk Rigs`, `Poses & Actions`, `SVG Props`, `Infographics`, `Audio`.
  - Styk Rig catalog: Classic B&W, Comic Pop, Whiteboard Doodle.
  - Poses catalog: Walk loop, Run loop, Jump, Point, Head scratch, Wave, Sit, Shocked.
  - Props catalog: Laptop, Coffee, Lightbulb, Smartphone, Chart Arrow, Shield, Checkmark.
  - Infographics catalog: Metric Counter, Progress Bar, Bar Chart, Terminal Card, Rating Stars.
- **Center Canvas & Timeline**:
  - **Canvas Stage**: Rendered at active aspect ratio with grid/guides toggle. Stick figures feature clickable **Neon Cyan IK Handles** on wrists, ankles, head, and pelvis for instant dragging.
  - **Infographic Layering**: Editable dynamic chart/counter overlays composited seamlessly with the stickman animations.
  - **Transport Bar**: Timecode `00:04:18`, Play/Pause, Step Back/Forward, Loop, Zoom slider.
  - **Multi-Track Timeline**:
    - Track V2 (UI Infographics & Props)
    - Track V1 (Stykman Animation with keyframe diamonds)
    - Track A1 (Voiceover & SFX with waveform rendering)
    - Track SUB (Word-level karaoke captions)
    - Editing tools: Split (`C`), Ripple Delete, Snap, Drag Keyframe.
- **Right Panel (280px) — Inspector & AI Checkpoints**:
  - Tabs: `Transform`, `Styk IK`, `Infographics`, `Color/LUT`, `History`.
  - **Transform**: Position X/Y, Scale, Rotation, Opacity.
  - **Styk IK Rig**: Node angle sliders, bone length, style switcher, facial expression.
  - **AI Prompt Bar**: *"Make the stickman jump when the metric counter hits 100%"* → Creates an instant branched checkpoint in the History rail with full Undo/Redo.

#### Supporting Modals & Views (Accessible via Global Header)
- **Settings View**:
  - Appearance: `Obsidian Dark` / `Pure Light`.
  - Brand Kit Manager: Logo upload, WCAG AA contrast validation, palette generator.
  - Brand Color Picker: Dominant hue extractor.
  - Export Folder Mirroring & Local Rembg Background Remover.

---

## 3. Key Technical Decisions & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cortexi App Architecture                        │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Global Workspace State  │  │ Radical Neon Styling Engine         │  │
│  │ • Active Tab (1 / 2 / 3)│  │ • Obsidian dark background          │  │
│  │ • Active Project / SB   │  │ • Electric Violet (#8B5CF6)         │  │
│  │ • Active Clip Selection │  │ • Neon Cyan IK Pins (#00F0FF)       │  │
│  │ • Timeline Playhead Pos │  │ • Laser Magenta Keyframes (#FF007F) │  │
│  │ • Checkpoint History    │  │ • Acid Emerald Audio (#10B981)      │  │
│  └────────────┬────────────┘  └─────────────────────────────────────┘  │
│               │                                                        │
│       ┌───────┴───────────────────────┬────────────────────────┐       │
│       ▼                               ▼                        ▼       │
│ ┌───────────────┐            ┌─────────────────┐      ┌──────────────┐ │
│ │ Tab 1:        │            │ Tab 2:          │      │ Tab 3:       │ │
│ │ Generate &    │            │ Auto-Clip       │      │ Pro Editor & │ │
│ │ Storyboard    │            │ Repurposer      │      │ Styk Canvas  │ │
│ └───────┬───────┘            └────────┬────────┘      └───────┬──────┘ │
│         │                             │                       │        │
│         └───────────────────────┬─────┴───────────────────────┘        │
│                                 │                                      │
│ ┌───────────────────────────────▼────────────────────────────────────┐ │
│ │               Core Engines (Client-Side & Hybrid)                  │ │
│ │  1. StykAnimate Engine: 12-Bone IK solver, Rig Posing, Onion Skin  │ │
│ │  2. Infographics Engine: Dynamic counters, animated charts & cards │ │
│ │  3. Caption Engine: Word-level phonetic karaoke sync               │ │
│ │  4. Audio Engine: Web Audio synthesis + speech voiceover generator │ │
│ │  5. Export Muxer: Canvas captureStream() + MediaRecorder (Local)   │ │
│ └───────────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Server API Route (/api/gemini/...)                    │
│  • /api/gemini/generate-storyboard: Gemini 3.8 Flash structured output │
│    with scenes, timing, Styk actions, infographic specs, & voiceover.  │
│  • /api/gemini/prompt-edit: Natural language timeline edits.           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps & Verification Plan

1. **Step 1: Core Layout & Navigation Framework**:
   - Establish the 3-tab navigation shell (`Generate / Storyboard`, `Auto-Clip`, `Editor`) with header, brand mark, engine status, settings modal, and theme system.
   - Configure CSS theme variables with obsidian dark foundation and radical neon accent tokens.
2. **Step 2: StykAnimate Engine & Infographic Core**:
   - Implement the 12-bone stickman rig model with forward/inverse kinematics.
   - Build the action preset engine (Walk, Run, Wave, Point, Jump, Sit, Scratch Head, Think, Celebrate) with keyframe interpolation.
   - Build the UI Infographics component library (Metric Counters, Bar Charts, Terminal Boxes, Alert Cards).
3. **Step 3: Tab 1 — Generate & Storyboard**:
   - Implement Intake form with Mode/Format/Aspect chips and SuperPrompt drawer.
   - Build `/api/gemini/generate-storyboard` using `@google/genai` with model `gemini-3.8-flash`.
   - Render interactive storyboard scenes with Stykman actions, infographics, and voiceover scripts.
   - Implement Speech Synthesis + word-level timing aligner and on-device MediaRecorder renderer.
4. **Step 4: Tab 2 — Auto-Clip Repurposing Studio**:
   - Implement file dropzone and script ingest.
   - Build clip extraction and scoring radar with 5 criteria (Hook, Flow, Value, Trend, Share).
   - Build 9:16 vertical reframe stage with transcript editor and reactive stickman overlay.
5. **Step 5: Tab 3 — Pro Editor & Styk Canvas**:
   - Build 4-region workspace: Left Media & Styk Drawer, Center Canvas Stage with interactive IK joint dragging, Multi-track Timeline with scrubbing playhead and keyframe manipulation, Right Inspector with Transform/Styk Rig/Color/History.
   - Implement AI prompt bar for checkpoint branching and edits.
6. **Step 6: Brand Kit, Settings & Verification**:
   - Implement BrandKitManager with WCAG AA contrast checking, BrandColorPicker, and folder mirror.
   - Run `compile_applet` to verify clean build without TypeScript or lint issues.
