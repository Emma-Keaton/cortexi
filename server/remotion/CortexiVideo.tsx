import React from 'react';
import { AbsoluteFill, Audio, Series, useVideoConfig } from 'remotion';
import type { Storyboard } from '../src/types';
import { SceneRenderer } from './scenes/SceneRenderer';
import { Captions } from './Captions';

export const assetUrl = (p: string) =>
  p.startsWith('http') ? p : `http://localhost:${process.env.CORTEXI_PORT ?? 8787}/assets/${p}`;

export const CortexiVideo: React.FC<{ storyboard: Storyboard }> = ({ storyboard: sb }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: sb.style.backgroundColor, fontFamily: sb.style.font }}>
      <Series>
        {sb.scenes.map((scene, i) => {
          const dur = Math.max(15, Math.round((scene.durationSec ?? 3) * fps));
          // Absolute start frame, so a visual's exit can be timed against the
          // whole video rather than a scene-relative clock that restarts.
          const from = sb.scenes
            .slice(0, i)
            .reduce((a, s) => a + Math.max(15, Math.round((s.durationSec ?? 3) * fps)), 0);
          return (
            <Series.Sequence key={scene.id} durationInFrames={dur}>
              <AbsoluteFill>
                <SceneRenderer scene={scene} style={sb.style} from={from} />
                {scene.audioFile && <Audio src={assetUrl(scene.audioFile)} />}
                {sb.captions && scene.words && scene.words.length > 0 && (
                  <Captions words={scene.words} style={sb.style} />
                )}
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
      {sb.music && (
        <Audio src={assetUrl(sb.music.file)} volume={sb.music.volume} loop />
      )}
    </AbsoluteFill>
  );
};
