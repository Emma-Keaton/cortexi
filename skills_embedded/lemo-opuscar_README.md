# lemo-opuscar - Embedded Summary

Source: https://github.com/lemomo-ai/lemo-opuscar

## Overview
Film style toolbox with 59+ ready-to-use code-driven styles. Frames, music, voice generated frame-by-frame in code. No video generation, no stock footage.

## Core Files
- DIRECTOR.md – story, sound, rhythm, camera, performance
- TECHNIQUE.md – frame-by-frame rendering, voice, music, mixing
- styles/<style>/STYLE.md – style definition
- plugin/skills/lemo-opuscar/ – skill for Claude

## Key Styles for Ingestion
- Watercolor Brush
- Whiteboard Explainer
- Cinematic Flow / Continuous Take
- One-line Drawing
- Swiss Motion Graphics

## Integration Points
- Style module: Camera + Character + Asset + Overlay
- Use in Generate tab as Film & Cinematic group
- Prompt format: "Make a 45-second film in <style> about ..."
- Engine: Remotion timeline with camera path interpolation

## Embedded Artifacts
Style definitions and prompts copied to `skills_embedded/lemo-opuscar/styles/`
