import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { fitText } from '@remotion/layout-utils';
import type { Scene, Storyboard } from '../../src/types';
import { assetUrl } from '../CortexiVideo';

type Props = { scene: Scene; style: Storyboard['style'] };

/** Crisp ease-out for entrances; feels deliberate rather than mechanical. */
const ENTER = Easing.bezier(0.16, 1, 0.3, 1);
/** Accelerate away for exits. */
const EXIT = Easing.in(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const SceneRenderer: React.FC<Props> = ({ scene, style }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const totalFrames = Math.max(1, Math.round((scene.durationSec ?? 3) * fps));
  const enterFrames = Math.min(Math.round(fps * 0.6), Math.floor(totalFrames / 3));
  const exitFrames = Math.min(Math.round(fps * 0.35), Math.floor(totalFrames / 4));

  // One normalized progress value keeps every property on the same curve.
  const enter = interpolate(frame, [0, enterFrames], [0, 1], { easing: ENTER, ...clamp });
  const exit = interpolate(frame, [totalFrames - exitFrames, totalFrames], [0, 1], { easing: EXIT, ...clamp });
  const presence = 1 - exit;

  const entrance = scene.motion?.entrance ?? scene.animation;
  const intensity = scene.motion?.intensity ?? 0.45;

  const mediaScale = interpolate(enter, [0, 1], [1, 1 + intensity * 0.06]);
  const offset = interpolate(enter, [0, 1], [intensity * 160, 0]);
  const copyScale = interpolate(enter, [0, 1], [0.94, 1]);

  const motion = (() => {
    switch (entrance) {
      case 'zoom':
        return `scale(${interpolate(enter, [0, 1], [0.82, 1])})`;
      case 'slide-left':
        return `translateX(${offset}px)`;
      case 'slide-right':
        return `translateX(${-offset}px)`;
      case 'mask-reveal':
        return `clip-path: inset(0 ${(1 - enter) * 100}% 0 0)`;
      case 'fade-up':
      default:
        return `translateY(${offset}px)`;
    }
  })();

  const typ = scene.typography ?? { sizeScale: 1, weight: 800, tracking: 0, uppercase: false };
  const bg = scene.background ?? { type: 'color' as const, overlayOpacity: 0.2 };
  const layout = scene.layout ?? { align: 'center' as const, direction: 'center' as const };

  const bgStyle: React.CSSProperties =
    bg.type === 'gradient'
      ? { background: `linear-gradient(135deg, ${style.backgroundColor}, ${bg.secondaryColor ?? style.primaryColor})` }
      : bg.type === 'split'
        ? { background: `linear-gradient(90deg, ${style.backgroundColor} 50%, ${bg.secondaryColor ?? style.primaryColor} 50%)` }
        : { backgroundColor: style.backgroundColor };

  const horizontal = scene.template === 'split-feature' || scene.template === 'editorial-hero';
  const side = layout.direction === 'right' ? (horizontal ? 1 : -1) : layout.direction === 'left' ? (horizontal ? -1 : 1) : 0;

  // Fit the headline to its box so long brand names never overflow the frame.
  const baseHeadline =
    scene.template === 'title-card' ? width * 0.065 : scene.template === 'typography-statement' ? width * 0.072 : width * 0.042;
  let headlineSize = baseHeadline * typ.sizeScale;
  try {
    const { fontSize } = fitText({
      text: typ.uppercase ? scene.headline.toUpperCase() : scene.headline,
      withinWidth: horizontal ? width * 0.44 : width * 0.74,
      fontFamily: typ.font ?? style.font,
      fontWeight: String(typ.weight),
    } as never);
    headlineSize = Math.min(headlineSize, fontSize);
  } catch {
    // fitText throws if the font is not loaded yet; the default size is a safe fallback.
  }

  const media = scene.image ? (
    <Img
      src={assetUrl(scene.image)}
      style={{
        width: horizontal ? '48%' : scene.template === 'full-bleed' ? '100%' : '58%',
        height: scene.template === 'full-bleed' ? '100%' : '58%',
        objectFit: scene.template === 'full-bleed' ? 'cover' : 'contain',
        transform: `translateX(${side * offset * 0.35}px) scale(${mediaScale})`,
        filter: scene.imageRole === 'product' ? `drop-shadow(0 30px 35px ${style.primaryColor}55)` : undefined,
      }}
    />
  ) : null;

  const copy = (
    <div
      style={{
        width: horizontal ? '48%' : '78%',
        display: 'flex',
        flexDirection: 'column',
        gap: height * 0.018,
        textAlign: layout.align,
        transform: `${motion} translateY(${exit * height * -0.02}px) scale(${copyScale})`,
        opacity: enter * presence,
      }}
    >
      {scene.eyebrow && (
        <div style={{ color: style.primaryColor, textTransform: 'uppercase', letterSpacing: '.18em', fontSize: width * 0.013, fontWeight: 800 }}>
          {scene.eyebrow}
        </div>
      )}
      <div
        style={{
          fontFamily: typ.font ?? style.font,
          fontSize: headlineSize,
          lineHeight: 0.98,
          fontWeight: typ.weight,
          letterSpacing: `${typ.tracking}px`,
          color: style.textColor,
          textTransform: typ.uppercase ? 'uppercase' : 'none',
        }}
      >
        {scene.headline}
      </div>
      {scene.body && <div style={{ fontSize: width * 0.021, lineHeight: 1.4, color: style.textColor, opacity: 0.8 * presence }}>{scene.body}</div>}
      {(scene.ctaLabel || scene.template === 'outro' || scene.template === 'call-to-action') && (
        <div
          style={{
            alignSelf: layout.align === 'center' ? 'center' : 'flex-start',
            padding: `${height * 0.018}px ${width * 0.03}px`,
            background: style.primaryColor,
            color: '#fff',
            fontSize: width * 0.021,
            fontWeight: 800,
          }}
        >
          {scene.ctaLabel ?? 'Learn More'}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill style={{ ...bgStyle, color: style.textColor, overflow: 'hidden' }}>
      {bg.type === 'image' && bg.image && (
        <Img src={assetUrl(bg.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: bg.overlayOpacity }} />
      )}
      {(scene.template === 'full-bleed' || scene.template === 'product-spotlight') && (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: enter * presence }}>{media}</AbsoluteFill>
      )}
      {!(scene.template === 'full-bleed' || scene.template === 'product-spotlight') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: horizontal ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4%',
            padding: '6%',
          }}
        >
          {horizontal && media}
          {copy}
          {horizontal && side < 0 && media}
        </div>
      )}
      {scene.template === 'product-spotlight' && (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: height * 0.08 }}>{copy}</AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
