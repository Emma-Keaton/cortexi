---
name: Cortexi Studio Design System
version: 1.0.0
colors:
  bg: "#0A0A0E"
  bg-subtle: "#121218"
  surface: "#14141B"
  surface-elevated: "#1B1B24"
  surface-hover: "#22222E"
  border: "#272733"
  border-strong: "#3D3D4E"
  border-accent: "rgba(124, 58, 237, 0.45)"
  input-bg: "#0D0D13"
  text: "#F4F4F6"
  text-muted: "#8E8E9E"
  text-subtle: "#5F5F70"
  violet: "#7C3AED"
  violet-hover: "#6D28D9"
  indigo: "#6366F1"
  amber: "#F59E0B"
  emerald: "#10B981"
  rose: "#EF4444"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontWeight: "700"
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: "400"
  mono:
    fontFamily: "JetBrains Mono, Menlo, monospace"
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 20px
  xl: 32px
---

# Cortexi Design System Rationale

## Core Identity & Voice
Cortexi is an **unapologetically focused, desktop-grade AI video creation suite** in the vein of modern creative engines like Runway, Descript, and Luma. It replaces generic cloud dashboards with a dark-first, typography-driven workstation that treats video synthesis as a disciplined craft.

### Rules of Engagement
1. **Never use cheap marketing tags**: Badges like `"Free"` are banned. Quality speaks through performance and craft. We say *Zero subscription required*, *Runs locally*, or omit billing entirely.
2. **Step Rail Architecture**: The wizard flows linearly:
   - **01 Prompt & Blueprint**
   - **02 Storyboard Scenes**
   - **03 Neural Voiceover**
   - **04 Remotion Master Output**
3. **Physical-grade surfaces**: Deep Obsidian (#0A0A0E) base with subtly raised zinc cards (#14141B), 1px graphite borders, and a distinct Hyper Violet-to-Indigo accent rail.
4. **Content-forward Hero Showcase**: Before the user writes a single prompt, they see real rendered outputs looping smoothly with audio previews and prompt recipes to clone directly.
5. **Universal Portability**: Folder pickers and modals must work across remote desktop, tablet, and mobile browsers by resolving file-system hierarchies server-side without relying on brittle browser-only APIs.
