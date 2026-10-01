import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { drawVisual } from '../../../shared/visuals';
import type { SceneVisual, StoryboardStyle } from '../../../shared/types';

type Props = {
  visual: SceneVisual;
  style: StoryboardStyle;
  /** ms since this scene started. */
  sceneMs: number;
  /** ms since the whole video started - drives the exit. */
  globalMs: number;
  sceneDurationMs: number;
};

const noop = { kind: 'none' } as SceneVisual;

/**
 * The visual layer for the Remotion path.
 *
 * Remotion renders in a browser, so it can host a real canvas and call the exact
 * same `drawVisual` the client encoder uses. That is the whole point: one draw
 * function, two render paths. The alternative - reimplementing the infographics
 * as DOM inside Remotion - is how the two paths quietly drift and why so much
 * Remotion code ends up subtly different from the preview.
 *
 * Drawn imperatively rather than declaratively because canvas is not a React
 * concern. We draw exactly once per frame, at the frame Remotion is on, so the
 * output is frame-accurate without a spring ever being integrated against a clock.
 */
export const VisualCanvas: React.FC<Props> = ({
  visual,
  style,
  sceneMs,
  globalMs,
  sceneDurationMs,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = 1;
    const w = Math.round(width);
    const h = Math.round(height);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!visual || visual.kind === 'none' || visual.kind === 'lottie') return;
    drawVisual({
      ctx,
      w,
      h,
      t: sceneMs,
      globalT: globalMs,
      sceneDurationMs,
      fps,
      style,
      visual,
      font: style.font || 'Inter, sans-serif',
      quality: 'high',
    });
  }, [frame, width, height, fps, visual, style, sceneMs, globalMs, sceneDurationMs]);

  if (!visual || visual.kind === 'none') return null;
  return (
    <AbsoluteFill>
      <canvas
        ref={ref}
        style={{
          width: '100%',
          height: '100%',
          // The canvas is transparent: the scene background is drawn beneath it.
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export { noop as EMPTY_VISUAL };