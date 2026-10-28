'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  StykRig,
  StykAction,
  StykExpression,
  StykStyle,
  AspectRatio,
  InfographicType,
  CaptionStyle,
  WordTimestamp,
  CameraConfig,
  SecondaryCharacterConfig,
  CustomProp,
} from '@/lib/types';
import {
  getPoseNodes,
  renderStykmanOnCanvas,
  renderPropOnCanvas,
  renderCustomPropOnCanvas,
  solve2BoneIK,
} from '@/lib/styk-engine';
import { renderInfographicOnCanvas } from '@/lib/infographics-engine';

interface StykCanvasProps {
  aspectRatio: AspectRatio;
  action: StykAction;
  style: StykStyle;
  expression: StykExpression;
  facing: 'left' | 'right';
  propsList: string[];
  camera?: CameraConfig;
  secondaryCharacter?: SecondaryCharacterConfig;
  customProps?: CustomProp[];
  infographic?: InfographicType;
  infographicData?: {
    label?: string;
    value?: string;
    subtext?: string;
    bars?: { label: string; height: number }[];
    terminalLines?: string[];
  };
  captionText?: string;
  words?: WordTimestamp[];
  captionStyle?: CaptionStyle;
  currentTimeSec?: number;
  durationSec?: number;
  isPlaying?: boolean;
  interactiveIK?: boolean;
  onionSkin?: boolean;
  showGrid?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onJointDrag?: (nodeId: string, x: number, y: number) => void;
}

export default function StykCanvas({
  aspectRatio = '9:16',
  action = 'idle',
  style = 'comic_pop',
  expression = 'neutral',
  facing = 'right',
  propsList = [],
  camera,
  secondaryCharacter,
  customProps = [],
  infographic = 'none',
  infographicData,
  captionText = '',
  words = [],
  captionStyle = 'karaoke',
  currentTimeSec = 0,
  durationSec = 5,
  isPlaying = false,
  interactiveIK = true,
  onionSkin = false,
  showGrid = false,
  onCanvasReady,
  onJointDrag,
}: StykCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeDraggingNode, setActiveDraggingNode] = useState<string | null>(null);
  const [customNodeOffsets, setCustomNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Canvas coordinate space base dimensions
  const baseWidth = aspectRatio === '9:16' ? 450 : aspectRatio === '16:9' ? 800 : 500;
  const baseHeight = aspectRatio === '9:16' ? 800 : aspectRatio === '16:9' ? 450 : 500;

  // Notify parent of canvas for recorder
  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // Handle Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    // Background
    ctx.fillStyle = '#0A0D14';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Optional Grid Guides
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x <= baseWidth; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, baseHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= baseHeight; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(baseWidth, y);
        ctx.stroke();
      }
      // Center crosshair
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(baseWidth / 2, 0);
      ctx.lineTo(baseWidth / 2, baseHeight);
      ctx.moveTo(0, baseHeight / 2);
      ctx.lineTo(baseWidth, baseHeight / 2);
      ctx.stroke();
    }

    // Apply 2D Dynamic Camera Transform
    ctx.save();
    let shakeX = 0;
    let shakeY = 0;
    if (camera && camera.shake > 0) {
      const shakeAmp = camera.shake * 2.8;
      shakeX = (Math.random() - 0.5) * shakeAmp;
      shakeY = (Math.random() - 0.5) * shakeAmp;
    }
    const camZoom = camera?.zoom || 1.0;
    const camX = (camera?.x || 0) + shakeX;
    const camY = (camera?.y || 0) + shakeY;

    if (camZoom !== 1.0 || camX !== 0 || camY !== 0) {
      ctx.translate(baseWidth / 2, baseHeight / 2);
      ctx.scale(camZoom, camZoom);
      ctx.translate(-baseWidth / 2 + camX, -baseHeight / 2 + camY);
    }

    // Determine current phase (0 to 1) based on current time or continuous loop
    const progress = durationSec > 0 ? (currentTimeSec % durationSec) / durationSec : 0;
    const loopPhase = (currentTimeSec * 1.5) % 1;

    // Calculate base stickman position in canvas
    const charX = aspectRatio === '9:16' ? baseWidth / 2 : baseWidth * 0.35;
    const charY = aspectRatio === '9:16' ? baseHeight * 0.62 : baseHeight * 0.68;
    const charScale = aspectRatio === '9:16' ? 1.35 : 1.25;

    // 1. Render Infographics (if present)
    if (infographic && infographic !== 'none') {
      const infoW = aspectRatio === '9:16' ? baseWidth - 48 : 280;
      const infoH = 130;
      const infoX = aspectRatio === '9:16' ? 24 : baseWidth * 0.58;
      const infoY = aspectRatio === '9:16' ? baseHeight * 0.16 : baseHeight * 0.22;

      renderInfographicOnCanvas(
        ctx,
        infographic,
        infographicData,
        infoX,
        infoY,
        infoW,
        infoH,
        progress
      );
    }

    // 2. Render Secondary Actor (if enabled)
    if (secondaryCharacter && secondaryCharacter.enabled) {
      const secX = secondaryCharacter.stykPosition?.[0] ?? (aspectRatio === '9:16' ? baseWidth * 0.25 : baseWidth * 0.18);
      const secY = secondaryCharacter.stykPosition?.[1] ?? (aspectRatio === '9:16' ? baseHeight * 0.66 : baseHeight * 0.70);
      const secScale = charScale * 0.92;
      const secNodes = getPoseNodes(
        secondaryCharacter.stykAction || 'idle',
        loopPhase,
        secondaryCharacter.stykFacing || 'right'
      );

      const secRig: StykRig = {
        id: 'char_secondary',
        name: secondaryCharacter.name || 'Co-Actor',
        style: secondaryCharacter.stykStyle || 'comic_pop',
        expression: secondaryCharacter.expression || 'neutral',
        position: [secX, secY],
        scale: secScale,
        facing: secondaryCharacter.stykFacing || 'right',
        nodes: secNodes,
      };

      renderStykmanOnCanvas(ctx, secRig, {
        showIKHandles: false,
        onionSkinAlpha: 1.0,
        timestampSec: currentTimeSec,
      });
    }

    // 3. Render Props (Desk, Laptop, etc.)
    for (const prop of propsList) {
      if (prop === 'desk') {
        renderPropOnCanvas(ctx, 'desk', charX + (facing === 'right' ? 20 : -20), charY + 50, charScale, currentTimeSec);
      } else if (prop === 'laptop') {
        renderPropOnCanvas(ctx, 'laptop', charX + (facing === 'right' ? 28 : -28), charY + 28, charScale, currentTimeSec);
      } else if (prop === 'coffee') {
        renderPropOnCanvas(ctx, 'coffee', charX + (facing === 'right' ? -38 : 38), charY + 36, charScale, currentTimeSec);
      } else if (prop === 'lightbulb') {
        renderPropOnCanvas(ctx, 'lightbulb', charX + (facing === 'right' ? 35 : -35), charY - 180, charScale, currentTimeSec);
      } else if (prop === 'clock') {
        renderPropOnCanvas(ctx, 'clock', charX + (facing === 'right' ? -70 : 70), charY - 130, charScale, currentTimeSec);
      }
    }

    // 4. Render Onion Skinning (Previous frame trail)
    if (onionSkin && isPlaying) {
      const prevPhase = Math.max(0, loopPhase - 0.15);
      const prevNodes = getPoseNodes(action, prevPhase, facing);
      const onionRig: StykRig = {
        id: 'char_onion',
        name: 'Stickman Onion',
        style,
        expression,
        position: [charX, charY],
        scale: charScale,
        facing,
        nodes: prevNodes,
      };
      renderStykmanOnCanvas(ctx, onionRig, {
        onionSkinAlpha: 0.22,
        showIKHandles: false,
      });
    }

    // 5. Render Primary Stykman Rig
    const baseNodes = getPoseNodes(action, loopPhase, facing);

    // Apply any interactive drag overrides
    const finalNodes = { ...baseNodes };
    Object.entries(customNodeOffsets).forEach(([id, offset]) => {
      if (finalNodes[id]) {
        finalNodes[id] = {
          ...finalNodes[id],
          x: offset.x,
          y: offset.y,
        };
      }
    });

    const activeRig: StykRig = {
      id: 'char_main',
      name: 'Main Actor',
      style,
      expression,
      position: [charX, charY],
      scale: charScale,
      facing,
      nodes: finalNodes,
    };

    renderStykmanOnCanvas(ctx, activeRig, {
      showIKHandles: interactiveIK,
      selectedNodeId: activeDraggingNode,
      onionSkinAlpha: 1.0,
      timestampSec: currentTimeSec,
    });

    // 6. Render Attached Custom Props (Crown, Shield, Star, etc.)
    if (customProps && customProps.length > 0) {
      customProps.forEach((cProp) => {
        const parentNode = finalNodes[cProp.parentBone] || finalNodes['head'];
        if (parentNode) {
          const propCanvasX = charX + parentNode.x * charScale;
          const propCanvasY = charY + parentNode.y * charScale - (cProp.parentBone === 'head' ? 20 : 0);
          renderCustomPropOnCanvas(ctx, cProp, propCanvasX, propCanvasY, charScale);
        }
      });
    }

    // Restore camera transform before rendering fixed overlays/captions
    ctx.restore();

    // 7. Render Captions & Dynamic Typography
    if (captionText) {
      renderCaptions(
        ctx,
        captionText,
        words,
        captionStyle,
        currentTimeSec,
        baseWidth,
        baseHeight,
        charX,
        charY
      );
    }
  }, [
    aspectRatio,
    action,
    style,
    expression,
    facing,
    propsList,
    camera,
    secondaryCharacter,
    customProps,
    infographic,
    infographicData,
    captionText,
    words,
    captionStyle,
    currentTimeSec,
    durationSec,
    isPlaying,
    interactiveIK,
    onionSkin,
    showGrid,
    activeDraggingNode,
    customNodeOffsets,
    baseWidth,
    baseHeight,
  ]);

  // Interactive IK node dragging handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactiveIK) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const charX = aspectRatio === '9:16' ? baseWidth / 2 : baseWidth * 0.35;
    const charY = aspectRatio === '9:16' ? baseHeight * 0.62 : baseHeight * 0.68;
    const charScale = aspectRatio === '9:16' ? 1.35 : 1.25;

    // Check hit test on IK joints
    const loopPhase = (currentTimeSec * 1.5) % 1;
    const nodes = getPoseNodes(action, loopPhase, facing);
    const ikKeys = ['hand_l', 'hand_r', 'foot_l', 'foot_r', 'head', 'pelvis'];

    for (const key of ikKeys) {
      const node = customNodeOffsets[key] || nodes[key];
      if (!node) continue;

      const jointCanvasX = charX + node.x * charScale;
      const jointCanvasY = charY + node.y * charScale;

      const dist = Math.hypot(mouseX - jointCanvasX, mouseY - jointCanvasY);
      if (dist <= 18) {
        setActiveDraggingNode(key);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDraggingNode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const charX = aspectRatio === '9:16' ? baseWidth / 2 : baseWidth * 0.35;
    const charY = aspectRatio === '9:16' ? baseHeight * 0.62 : baseHeight * 0.68;
    const charScale = aspectRatio === '9:16' ? 1.35 : 1.25;

    const relX = (mouseX - charX) / charScale;
    const relY = (mouseY - charY) / charScale;

    setCustomNodeOffsets((prev) => ({
      ...prev,
      [activeDraggingNode]: { x: relX, y: relY },
    }));

    onJointDrag?.(activeDraggingNode, relX, relY);
  };

  const handlePointerUp = () => {
    setActiveDraggingNode(null);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full p-2 select-none">
      <div
        className="relative overflow-hidden rounded-lg shadow-2xl border border-neutral-800 bg-[#0A0D14]"
        style={{
          aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1',
          maxHeight: '100%',
          maxWidth: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          width={baseWidth}
          height={baseHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* Live IK Joint badge reminder */}
        {interactiveIK && (
          <div className="absolute top-2 right-2 pointer-events-none px-2 py-1 rounded bg-black/60 backdrop-blur border border-cyan-500/30 text-[10px] text-cyan-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            IK RIG READY (DRAG JOINTS)
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-renderer for Dynamic Captions & Kinetic Typography
function renderCaptions(
  ctx: CanvasRenderingContext2D,
  text: string,
  words: WordTimestamp[],
  style: CaptionStyle,
  time: number,
  canvasW: number,
  canvasH: number,
  charX: number,
  charY: number
) {
  ctx.save();

  if (style === 'speech_bubble') {
    // Stickman Speech Bubble above head
    const bubbleX = charX + 20;
    const bubbleY = charY - 170;
    const bWidth = Math.min(canvasW - 40, 230);
    const bHeight = 60;

    // Bubble Background
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bubbleX - bWidth / 2, bubbleY - bHeight / 2, bWidth, bHeight, 12) : ctx.rect(bubbleX - bWidth / 2, bubbleY - bHeight / 2, bWidth, bHeight);
    ctx.fill();
    ctx.stroke();

    // Bubble Tail to Head
    ctx.beginPath();
    ctx.moveTo(bubbleX - 10, bubbleY + bHeight / 2);
    ctx.lineTo(charX + 5, charY - 95);
    ctx.lineTo(bubbleX + 6, bubbleY + bHeight / 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();

    // Text in Bubble
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0, 48) + (text.length > 48 ? '...' : ''), bubbleX, bubbleY + 4);
    ctx.restore();
    return;
  }

  if (style === 'minimal') {
    // Minimal Headline at top
    ctx.font = '700 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, canvasW / 2, 42);
    ctx.restore();
    return;
  }

  if (style === 'lower_third') {
    // Clean broadcast lower third bar
    const barY = canvasH - 72;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(20, barY, canvasW - 40, 48);
    ctx.strokeRect(20, barY, canvasW - 40, 48);

    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvasW / 2, barY + 28);
    ctx.restore();
    return;
  }

  // Default: Dynamic TikTok / Reels Karaoke with Word Highlighting
  const activeWordObj = words.find((w) => time >= w.start && time <= w.end);
  const activeWord = activeWordObj?.word || '';

  // Render centered punchy caption container near bottom
  const capY = canvasH - 100;
  const splitWords = text.split(/\s+/).slice(0, 10); // Display chunk of words

  ctx.textAlign = 'center';

  // Draw semi-translucent backdrop pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  const pillW = Math.min(canvasW - 32, 380);
  ctx.roundRect ? ctx.roundRect(canvasW / 2 - pillW / 2, capY - 24, pillW, 46, 12) : ctx.rect(canvasW / 2 - pillW / 2, capY - 24, pillW, 46);
  ctx.fill();

  // Draw words with active highlighting
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';

  // Compute total line width to space out words
  const wordWidths = splitWords.map((w) => ctx.measureText(w + ' ').width);
  const totalLineW = wordWidths.reduce((a, b) => a + b, 0);
  let startX = canvasW / 2 - totalLineW / 2;

  splitWords.forEach((word) => {
    const isCurrent = activeWord.toLowerCase().replace(/[^a-z0-9]/g, '') === word.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (isCurrent) {
      // Glow and scale up
      ctx.fillStyle = '#00F0FF'; // Neon Cyan
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.font = '900 17px system-ui, -apple-system, sans-serif';
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      ctx.font = '700 14px system-ui, -apple-system, sans-serif';
    }

    ctx.textAlign = 'left';
    ctx.fillText(word, startX, capY + 5);

    startX += ctx.measureText(word + ' ').width;
  });

  ctx.restore();
}
