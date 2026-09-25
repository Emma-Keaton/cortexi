import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene, Storyboard } from '../../src/types';
import { assetUrl } from '../CortexiVideo';

type Props = { scene: Scene; style: Storyboard['style'] };
const entranceFor = (scene: Scene) => scene.motion?.entrance ?? scene.animation;
const motionTransform = (kind: string, value: number, intensity: number) => {
  const d = Math.max(0, 1 - value) * 160 * intensity;
  if (kind === 'zoom') return `scale(${0.82 + value * .18})`;
  if (kind === 'slide-left') return `translateX(${d}px)`;
  if (kind === 'slide-right') return `translateX(${-d}px)`;
  if (kind === 'fade-up') return `translateY(${d}px)`;
  if (kind === 'mask-reveal') return `clip-path: inset(0 ${(1-value)*100}% 0 0)`;
  return 'none';
};

export const SceneRenderer: React.FC<Props> = ({ scene, style }) => {
  const frame = useCurrentFrame(); const { width, height, fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const opacity = interpolate(frame, [0, fps * .4], [0, 1], { extrapolateRight: 'clamp' });
  const motion = motionTransform(entranceFor(scene), p, scene.motion?.intensity ?? .45);
  const typ = scene.typography ?? { sizeScale: 1, weight: 800, tracking: 0, uppercase: false };
  const bg = scene.background ?? { type: 'color' as const, overlayOpacity: .2 };
  const layout = scene.layout ?? { align: 'center' as const, direction: 'center' as const };
  const bgStyle: React.CSSProperties = bg.type === 'gradient' ? { background: `linear-gradient(135deg, ${style.backgroundColor}, ${bg.secondaryColor ?? style.primaryColor})` } : bg.type === 'split' ? { background: `linear-gradient(90deg, ${style.backgroundColor} 50%, ${bg.secondaryColor ?? style.primaryColor} 50%)` } : { backgroundColor: style.backgroundColor };
  const horizontal = scene.template === 'split-feature' || scene.template === 'editorial-hero';
  const side = layout.direction === 'right' ? (horizontal ? 1 : -1) : layout.direction === 'left' ? (horizontal ? -1 : 1) : 0;
  const textSize = (scene.template === 'title-card' ? width*.065 : scene.template === 'typography-statement' ? width*.072 : width*.042) * typ.sizeScale;
  const media = scene.image ? <Img src={assetUrl(scene.image)} style={{ width: horizontal ? '48%' : scene.template === 'full-bleed' ? '100%' : '58%', height: scene.template === 'full-bleed' ? '100%' : '58%', objectFit: scene.template === 'full-bleed' ? 'cover' : 'contain', transform: `translateX(${side*p*35}px) scale(${1+p*.035})`, filter: scene.imageRole === 'product' ? `drop-shadow(0 30px 35px ${style.primaryColor}55)` : undefined }} /> : null;
  const copy = <div style={{ width: horizontal ? '48%' : '78%', display:'flex', flexDirection:'column', gap:height*.018, textAlign: layout.align, transform:motion, opacity }}>
    {scene.eyebrow && <div style={{ color:style.primaryColor, textTransform:'uppercase', letterSpacing:'.18em', fontSize:width*.013, fontWeight:800 }}>{scene.eyebrow}</div>}
    <div style={{ fontFamily:typ.font ?? style.font, fontSize:textSize, lineHeight:.98, fontWeight:typ.weight, letterSpacing:`${typ.tracking}px`, color:style.textColor, textTransform:typ.uppercase?'uppercase':'none' }}>{scene.headline}</div>
    {scene.body && <div style={{ fontSize:width*.021, lineHeight:1.4, color:style.textColor, opacity:.8 }}>{scene.body}</div>}
    {(scene.ctaLabel || scene.template === 'outro' || scene.template === 'call-to-action') && <div style={{ alignSelf: layout.align==='center'?'center':'flex-start', padding:`${height*.018}px ${width*.03}px`, background:style.primaryColor, color:'#fff', fontSize:width*.021, fontWeight:800 }}>{scene.ctaLabel ?? 'Learn More'}</div>}
  </div>;
  return <AbsoluteFill style={{ ...bgStyle, color:style.textColor, overflow:'hidden' }}>
    {bg.type==='image' && bg.image && <Img src={assetUrl(bg.image)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:bg.overlayOpacity}} />}
    {(scene.template==='full-bleed'||scene.template==='product-spotlight') && <AbsoluteFill style={{display:'flex',alignItems:'center',justifyContent:'center',opacity}}>{media}</AbsoluteFill>}
    {!(scene.template==='full-bleed'||scene.template==='product-spotlight') && <div style={{position:'absolute',inset:0,display:'flex',flexDirection:horizontal?'row':'column',alignItems:'center',justifyContent:'center',gap:'4%',padding:'6%'}}>{horizontal && media}{copy}{horizontal && side<0 && media}</div>}
    {scene.template==='product-spotlight' && <AbsoluteFill style={{display:'flex',alignItems:'flex-end',justifyContent:'center',paddingBottom:height*.08}}>{copy}</AbsoluteFill>}
  </AbsoluteFill>;
};

