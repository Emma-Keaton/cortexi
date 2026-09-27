import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { Storyboard, WordTiming } from '../src/types';

const CHUNK = 4;

/** Word-by-word animated captions, current word highlighted in brand color. */
export const Captions: React.FC<{ words: WordTiming[]; style: Storyboard['style'] }> = ({ words, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;

  const activeIdx = words.findIndex((w) => t >= w.start && t < w.end);
  const idx = activeIdx === -1 ? (t < (words[0]?.start ?? 0) ? -1 : words.length - 1) : activeIdx;
  if (idx === -1) return null;

  const chunkStart = Math.floor(idx / CHUNK) * CHUNK;
  const chunk = words.slice(chunkStart, chunkStart + CHUNK);
  const chunkT = t - chunk[0].start;
  // Eased fade + a springy pop on the active word reads better than a hard swap.
  const opacity = interpolate(chunkT, [0, 0.15], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pop = interpolate(chunkT, [0, 0.12], [0.6, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: width * 0.008,
        opacity,
        padding: '0 6%',
        flexWrap: 'wrap',
      }}
    >
      {chunk.map((w, i) => {
        const active = chunkStart + i === idx;
        // Ease each word in so the highlight does not snap.
        const wordIn = interpolate(t, [w.start, Math.min(w.end, w.start + 0.12)], [0.85, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <span
            key={i}
            style={{
              fontSize: width * 0.032,
              fontWeight: 800,
              color: active ? style.primaryColor : style.textColor,
              transform: `scale(${active ? pop * 1.12 : wordIn})`,
              display: 'inline-block',
              transition: 'none',
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};

