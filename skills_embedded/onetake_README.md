# onetake - Embedded Summary

Source: https://github.com/feitangyuan/onetake

## Overview
Claude Agent Skill for motion films that never cut – one continuous take where every beat grows out of the previous. Product launch, teasers, feature demos.

## Core Concepts
- Continuity measured, not hoped: carry score per boundary
- One camera holds all: no cuts, follows subject, whips to next
- Real UI rebuilt in HTML on camera plane
- Measured moves: ~38 moves with speed curves
- Real motion blur via multi-capture averaging
- Sound in one room with ducking

## Files
- SKILL.md – protocol and hard rules
- lib/motion.js, lib/ui_kit.js – move library
- scripts/ – render, verify, probe, narration, sound
- cases/ – 11 films with breakdowns

## Integration Points
- Style module: Camera + Transition
- Friendly name: One Take
- Use in Film & Cinematic group
- Engine: Remotion Sequence with camera keyframes and carry logic

## Embedded Artifacts
SKILL.md, motion library summary, continuity guidelines copied to `skills_embedded/onetake/`
