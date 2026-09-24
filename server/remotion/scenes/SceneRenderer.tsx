import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene, Storyboard } from '../../src/types';
import { assetUrl } from '../CortexiVideo';

type Props = { scene: Scene; style: Storyboard['style'] };

function useEntrance(animation: Scene['animation']) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  switch (animation) {
    case 'zoom':
      return { opacity, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})` };
    case 'slide-left':
      return { opacity, transform: `translateX(${interpolate(s, [0, 1], [120, 0])}px)` };
    default:
      return { opacity, transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)` };
  }
}

const Background: React.FC<{ style: Storyboard['style'] }> = ({ style }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 40]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          width: '70%',
          height: '70%',
          top: -80 - drift,
          right: -100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${style.primaryColor}55 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          bottom: -100,
          left: -80 + drift,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${style.primaryColor}33 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<Props> = ({ scene, style }) => {
  const { width, height } = useVideoConfig();
  const entrance = useEntrance(scene.animation);
  const base: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: width * 0.06,
    gap: height * 0.03,
  };

  const headlineSize =
    scene.template === 'title-card' ? width * 0.065 : scene.template === 'outro' ? width * 0.055 : width * 0.045;

  return (
    <AbsoluteFill>
      <Background style={style} />
      <AbsoluteFill style={{ ...base, ...entrance }}>
        {scene.image && (
          <Img
            src={assetUrl(scene.image)}
            style={{
              maxWidth: scene.template === 'feature' ? '45%' : '60%',
              maxHeight: height * 0.4,
              borderRadius: 16,
              objectFit: 'cover',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        )}
        {scene.template === 'feature' && (
          <div
            style={{
              width: 64,
              height: 6,
              borderRadius: 3,
              backgroundColor: style.primaryColor,
            }}
          />
        )}
        <h1
          style={{
            margin: 0,
            fontSize: headlineSize,
            fontWeight: 900,
            lineHeight: 1.1,
            color: style.textColor,
            maxWidth: '90%',
          }}
        >
          {scene.headline}
        </h1>
        {scene.body && scene.template !== 'feature' && (
          <p
            style={{
              margin: 0,
              fontSize: width * 0.026,
              fontWeight: 400,
              color: style.textColor,
              opacity: 0.85,
              maxWidth: '75%',
              lineHeight: 1.4,
            }}
          >
            {scene.body}
          </p>
        )}
        {scene.template === 'outro' && (
          <div
            style={{
              marginTop: height * 0.02,
              padding: `${height * 0.018}px ${width * 0.04}px`,
              borderRadius: 999,
              backgroundColor: style.primaryColor,
              color: '#fff',
              fontSize: width * 0.028,
              fontWeight: 800,
            }}
          >
            Learn More
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
