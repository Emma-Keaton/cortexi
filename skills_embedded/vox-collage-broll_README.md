# VOX-COLLAGE-BROLL - Embedded Summary

Source: https://github.com/MegaTroll222/VOX-COLLAGE-BROLL

## Overview
Claude Code skill that turns a single spoken sentence into premium editorial paper-collage explainer video – 9:16, 5s, halftone cut-outs assembling piece by piece on bold color field, optional voiceover.

## Core Pipeline
- Three-gate approval: metaphors → stills → video
- Locked visual language: flat bold paper fields, B&W halftone cut-outs, colored cardstock accents, cream keylines, paper grain
- Assemble-from-empty motion with ffmpeg first/last frame prep
- Self-QA: contact sheets, first-frame purity, end-frame compare
- Voiceover fitting optional

## Requirements
- Claude Code + ffmpeg
- MaxFusion MCP for image/video/speech

## Integration Points
- Style module: Asset + Overlay
- Friendly name: Storybook Collage
- Use in Generate/Auto-Clip for explainer b-roll
- Engine: Remotion montage with Ken Burns + paper texture overlay

## Embedded Artifacts
SKILL.md and prompt templates copied to `skills_embedded/vox-collage-broll/`
