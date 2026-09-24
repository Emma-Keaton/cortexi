import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
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
  const opacity = interpolate(chunkT, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' });

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
        return (
          <span
            key={i}
            style={{
              fontSize: width * 0.032,
              fontWeight: 800,
              color: active ? style.primaryColor : style.textColor,
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              transform: active ? 'scale(1.12)' : 'scale(1)',
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
