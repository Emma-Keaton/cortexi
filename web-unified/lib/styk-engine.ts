import { StykRig, StykNode, StykBone, StykAction, StykExpression, StykStyle } from './types';

export const BONE_LENGTHS = {
  headRadius: 22,
  neck: 16,
  spine: 68,
  shoulderWidth: 26,
  upperArm: 40,
  lowerArm: 38,
  hipWidth: 20,
  thigh: 52,
  shin: 50,
  foot: 16,
};

export const DEFAULT_BONES: StykBone[] = [
  { id: 'neck', from: 'head', to: 'neck_joint', thickness: 4 },
  { id: 'spine', from: 'neck_joint', to: 'pelvis', thickness: 5 },
  { id: 'shoulder_l', from: 'neck_joint', to: 'shoulder_l', thickness: 3 },
  { id: 'arm_l_upper', from: 'shoulder_l', to: 'elbow_l', thickness: 4 },
  { id: 'arm_l_lower', from: 'elbow_l', to: 'hand_l', thickness: 3 },
  { id: 'shoulder_r', from: 'neck_joint', to: 'shoulder_r', thickness: 3 },
  { id: 'arm_r_upper', from: 'shoulder_r', to: 'elbow_r', thickness: 4 },
  { id: 'arm_r_lower', from: 'elbow_r', to: 'hand_r', thickness: 3 },
  { id: 'hip_l', from: 'pelvis', to: 'hip_l', thickness: 4 },
  { id: 'leg_l_thigh', from: 'hip_l', to: 'knee_l', thickness: 5 },
  { id: 'leg_l_shin', from: 'knee_l', to: 'foot_l', thickness: 4 },
  { id: 'hip_r', from: 'pelvis', to: 'hip_r', thickness: 4 },
  { id: 'leg_r_thigh', from: 'hip_r', to: 'knee_r', thickness: 5 },
  { id: 'leg_r_shin', from: 'knee_r', to: 'foot_r', thickness: 4 },
];

export function solve2BoneIK(
  root: { x: number; y: number },
  target: { x: number; y: number },
  len1: number,
  len2: number,
  flipBend: boolean = false
): { mid: { x: number; y: number }; reached: boolean } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const maxReach = len1 + len2 - 0.001;
  const clampedDist = Math.max(Math.abs(len1 - len2) + 0.001, Math.min(dist, maxReach));
  const baseAngle = Math.atan2(dy, dx);
  const cosAngle1 = (len1 * len1 + clampedDist * clampedDist - len2 * len2) / (2 * len1 * clampedDist);
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));
  const finalAngle = flipBend ? baseAngle - angle1 : baseAngle + angle1;

  const midX = root.x + Math.cos(finalAngle) * len1;
  const midY = root.y + Math.sin(finalAngle) * len1;

  return {
    mid: { x: midX, y: midY },
    reached: dist <= maxReach,
  };
}

export function getPoseNodes(
  action: StykAction,
  phase: number = 0,
  facing: 'left' | 'right' = 'right'
): Record<string, StykNode> {
  const dir = facing === 'right' ? 1 : -1;
  const t = phase * Math.PI * 2;

  let pelvis = { x: 0, y: 0 };
  let headY = -120;
  let headX = 0;
  let neckY = -95;
  let neckX = 0;

  let handLX = -25 * dir;
  let handLY = -40;
  let handRX = 25 * dir;
  let handRY = -40;

  let footLX = -20 * dir;
  let footLY = 100;
  let footRX = 20 * dir;
  let footRY = 100;

  switch (action) {
    case 'idle': {
      const breath = Math.sin(t) * 3;
      pelvis.y += breath * 0.5;
      headY += breath;
      neckY += breath * 0.8;
      handLY += breath;
      handRY += breath;
      break;
    }

    case 'walk': {
      const bob = Math.abs(Math.sin(t)) * 6;
      pelvis.y -= bob;
      headY -= bob;
      neckY -= bob;

      const stride = 36 * dir;
      const legCycleL = Math.sin(t);
      const legCycleR = Math.sin(t + Math.PI);

      footLX = stride * legCycleL;
      footLY = 100 - Math.max(0, -legCycleL) * 14;
      footRX = stride * legCycleR;
      footRY = 100 - Math.max(0, -legCycleR) * 14;

      handLX = -stride * legCycleL * 0.8;
      handLY = -45 + Math.abs(legCycleL) * 4;
      handRX = -stride * legCycleR * 0.8;
      handRY = -45 + Math.abs(legCycleR) * 4;
      break;
    }

    case 'run': {
      const bob = Math.abs(Math.sin(t * 1.5)) * 12;
      pelvis.y -= bob;
      pelvis.x += 8 * dir;
      headX += 14 * dir;
      headY -= bob + 6;
      neckX += 10 * dir;

      const stride = 50 * dir;
      const cycleL = Math.sin(t * 1.5);
      const cycleR = Math.sin(t * 1.5 + Math.PI);

      footLX = stride * cycleL;
      footLY = 95 - Math.max(0, -cycleL) * 28;
      footRX = stride * cycleR;
      footRY = 95 - Math.max(0, -cycleR) * 28;

      handLX = -stride * cycleL * 0.9;
      handLY = -55 - Math.max(0, cycleL) * 15;
      handRX = -stride * cycleR * 0.9;
      handRY = -55 - Math.max(0, cycleR) * 15;
      break;
    }

    case 'wave': {
      const waveAngle = Math.sin(t * 2) * 18;
      handRX = (35 + waveAngle) * dir;
      handRY = -115;
      handLX = -20 * dir;
      handLY = -40;
      break;
    }

    case 'point': {
      handRX = 72 * dir;
      handRY = -80;
      headX += 6 * dir;
      handLX = -18 * dir;
      handLY = -35;
      break;
    }

    case 'sit': {
      pelvis.y = 35;
      headY = -75;
      neckY = -55;
      footLX = 30 * dir;
      footLY = 100;
      footRX = 30 * dir;
      footRY = 100;
      handLX = 35 * dir;
      handLY = -10;
      handRX = 45 * dir;
      handRY = -10;
      break;
    }

    case 'scratch_head': {
      handRX = 12 * dir;
      handRY = -130;
      headX -= 6 * dir;
      handLX = -20 * dir;
      handLY = -30;
      break;
    }

    case 'jump': {
      const jumpProgress = Math.sin(t);
      const jumpHeight = Math.max(0, jumpProgress) * 45;
      pelvis.y -= jumpHeight;
      headY -= jumpHeight;
      neckY -= jumpHeight;

      if (jumpHeight > 10) {
        footLX = -15 * dir;
        footLY = 80 - jumpHeight;
        footRX = 15 * dir;
        footRY = 80 - jumpHeight;
        handLX = -45 * dir;
        handLY = -120 - jumpHeight * 0.5;
        handRX = 45 * dir;
        handRY = -120 - jumpHeight * 0.5;
      }
      break;
    }

    case 'shocked': {
      pelvis.x -= 15 * dir;
      headX -= 18 * dir;
      headY -= 5;
      handLX = -10 * dir;
      handLY = -105;
      handRX = 10 * dir;
      handRY = -105;
      footLX = -35 * dir;
      footRX = 15 * dir;
      break;
    }

    case 'celebrate': {
      const pump = Math.sin(t * 2) * 8;
      handLX = -42 * dir;
      handLY = -125 + pump;
      handRX = 42 * dir;
      handRY = -125 - pump;
      headY -= 6;
      break;
    }
  }

  const shoulderLRoot = { x: neckX - 12 * dir, y: neckY + 4 };
  const shoulderRRoot = { x: neckX + 12 * dir, y: neckY + 4 };
  const hipLRoot = { x: pelvis.x - 10 * dir, y: pelvis.y + 10 };
  const hipRRoot = { x: pelvis.x + 10 * dir, y: pelvis.y + 10 };

  const armLIK = solve2BoneIK(shoulderLRoot, { x: handLX, y: handLY }, 38, 36, dir > 0);
  const armRIK = solve2BoneIK(shoulderRRoot, { x: handRX, y: handRY }, 38, 36, dir < 0);
  const legLIK = solve2BoneIK(hipLRoot, { x: footLX, y: footLY }, 50, 48, dir < 0);
  const legRIK = solve2BoneIK(hipRRoot, { x: footRX, y: footRY }, 50, 48, dir < 0);

  const nodes: Record<string, StykNode> = {
    head: { id: 'head', name: 'Head', x: headX, y: headY },
    neck_joint: { id: 'neck_joint', name: 'Neck Joint', x: neckX, y: neckY },
    pelvis: { id: 'pelvis', name: 'Pelvis', x: pelvis.x, y: pelvis.y, pinned: true },
    shoulder_l: { id: 'shoulder_l', name: 'Left Shoulder', x: shoulderLRoot.x, y: shoulderLRoot.y },
    elbow_l: { id: 'elbow_l', name: 'Left Elbow', x: armLIK.mid.x, y: armLIK.mid.y },
    hand_l: { id: 'hand_l', name: 'Left Hand', x: handLX, y: handLY },
    shoulder_r: { id: 'shoulder_r', name: 'Right Shoulder', x: shoulderRRoot.x, y: shoulderRRoot.y },
    elbow_r: { id: 'elbow_r', name: 'Right Elbow', x: armRIK.mid.x, y: armRIK.mid.y },
    hand_r: { id: 'hand_r', name: 'Right Hand', x: handRX, y: handRY },
    hip_l: { id: 'hip_l', name: 'Left Hip', x: hipLRoot.x, y: hipLRoot.y },
    knee_l: { id: 'knee_l', name: 'Left Knee', x: legLIK.mid.x, y: legLIK.mid.y },
    foot_l: { id: 'foot_l', name: 'Left Foot', x: footLX, y: footLY },
    hip_r: { id: 'hip_r', name: 'Right Hip', x: hipRRoot.x, y: hipRRoot.y },
    knee_r: { id: 'knee_r', name: 'Right Knee', x: legRIK.mid.x, y: legRIK.mid.y },
    foot_r: { id: 'foot_r', name: 'Right Foot', x: footRX, y: footRY },
  };

  return nodes;
}

export function renderStykmanOnCanvas(
  ctx: CanvasRenderingContext2D,
  rig: StykRig,
  options: {
    showIKHandles?: boolean;
    selectedNodeId?: string | null;
    onionSkinAlpha?: number;
    highlightBones?: boolean;
    timestampSec?: number;
  } = {}
) {
  const {
    showIKHandles = false,
    selectedNodeId = null,
    onionSkinAlpha = 1.0,
    highlightBones = false,
  } = options;

  ctx.save();
  ctx.globalAlpha = onionSkinAlpha;

  const [posX, posY] = rig.position;
  ctx.translate(posX, posY);
  ctx.scale(rig.scale, rig.scale);

  const style = rig.style;
  const isDoodle = style === 'doodle';
  const isComic = style === 'comic_pop';

  let strokeColor = '#FFFFFF';

  if (style === 'classic_bw') {
    strokeColor = '#FFFFFF';
  } else if (isComic) {
    strokeColor = '#FFFFFF';
  } else if (isDoodle) {
    strokeColor = '#E2E8F0';
  }

  // Draw shadow in comic mode
  if (isComic) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 102, 38, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.restore();
  }

  // Draw Bones
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const bone of DEFAULT_BONES) {
    const nodeFrom = rig.nodes[bone.from];
    const nodeTo = rig.nodes[bone.to];
    if (!nodeFrom || !nodeTo) continue;

    ctx.beginPath();

    if (isDoodle) {
      const jitter = Math.sin(bone.id.length * 10) * 1.2;
      ctx.moveTo(nodeFrom.x + jitter, nodeFrom.y);
      ctx.lineTo(nodeTo.x - jitter, nodeTo.y);
      ctx.lineWidth = bone.thickness * 1.1;
      ctx.strokeStyle = strokeColor;
    } else if (isComic) {
      ctx.moveTo(nodeFrom.x, nodeFrom.y);
      ctx.lineTo(nodeTo.x, nodeTo.y);
      ctx.lineWidth = bone.thickness * 1.3;
      ctx.strokeStyle = highlightBones ? '#00F0FF' : strokeColor;
    } else {
      ctx.moveTo(nodeFrom.x, nodeFrom.y);
      ctx.lineTo(nodeTo.x, nodeTo.y);
      ctx.lineWidth = bone.thickness;
      ctx.strokeStyle = strokeColor;
    }

    ctx.stroke();
  }

  // Draw Head
  const head = rig.nodes['head'];
  if (head) {
    const headRadius = BONE_LENGTHS.headRadius;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);

    if (isComic) {
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    } else if (isDoodle) {
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }

    drawFacialExpression(ctx, head.x, head.y, headRadius, rig.expression, rig.facing);
  }

  // Draw comic pop accents
  if (isComic) {
    const hands = [rig.nodes['hand_l'], rig.nodes['hand_r']];
    for (const hand of hands) {
      if (hand) {
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF007F';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    const feet = [rig.nodes['foot_l'], rig.nodes['foot_r']];
    for (const foot of feet) {
      if (foot) {
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#00F0FF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // Draw Interactive IK Handles (Cyan rings)
  if (showIKHandles) {
    const ikNodeKeys = ['hand_l', 'hand_r', 'foot_l', 'foot_r', 'head', 'pelvis'];

    for (const key of ikNodeKeys) {
      const node = rig.nodes[key];
      if (!node) continue;

      const isSelected = selectedNodeId === key;

      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#FF007F' : '#00F0FF';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 12 : 9, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? 'rgba(255,0,127,0.6)' : 'rgba(0,240,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFacialExpression(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  r: number,
  expression: StykExpression,
  facing: 'left' | 'right'
) {
  const dir = facing === 'right' ? 1 : -1;
  const eyeOffset = 6 * dir;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;

  switch (expression) {
    case 'happy': {
      ctx.beginPath();
      ctx.arc(hx + eyeOffset - 4, hy - 2, 3, Math.PI, 0);
      ctx.arc(hx + eyeOffset + 4, hy - 2, 3, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + eyeOffset, hy + 2, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();
      break;
    }

    case 'confused': {
      ctx.beginPath();
      ctx.arc(hx + eyeOffset - 4, hy - 4, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffset + 4, hy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + eyeOffset - 6, hy + 8);
      ctx.lineTo(hx + eyeOffset, hy + 5);
      ctx.lineTo(hx + eyeOffset + 6, hy + 9);
      ctx.stroke();
      break;
    }

    case 'shocked': {
      ctx.beginPath();
      ctx.arc(hx + eyeOffset - 4, hy - 3, 3.5, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffset + 5, hy - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + eyeOffset, hy + 7, 3, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'thinking': {
      ctx.beginPath();
      ctx.arc(hx + eyeOffset - 4, hy - 4, 2, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffset + 4, hy - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + eyeOffset - 4, hy + 6);
      ctx.lineTo(hx + eyeOffset + 4, hy + 6);
      ctx.stroke();
      break;
    }

    case 'neutral':
    default: {
      ctx.beginPath();
      ctx.arc(hx + eyeOffset - 3, hy - 2, 2, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffset + 3, hy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + eyeOffset - 4, hy + 5);
      ctx.lineTo(hx + eyeOffset + 4, hy + 5);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function renderPropOnCanvas(
  ctx: CanvasRenderingContext2D,
  propName: string,
  x: number,
  y: number,
  scale: number = 1.0,
  animatedVal: number = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  switch (propName) {
    case 'laptop': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-22, 10, 44, 4);
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.fillRect(-20, -18, 40, 28);
      ctx.strokeRect(-20, -18, 40, 28);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(-16, -14, 22, 2);
      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(-16, -9, 30, 2);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-16, -4, 18, 2);
      break;
    }

    case 'lightbulb': {
      const glow = Math.sin(animatedVal * 4) * 0.2 + 0.8;
      ctx.beginPath();
      ctx.arc(0, -10, 18 * glow, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -10, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.lineTo(0, -14);
      ctx.lineTo(4, -10);
      ctx.strokeStyle = '#FEF3C7';
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(-5, 2, 10, 5);
      break;
    }

    case 'coffee': {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.beginPath();
      ctx.arc(10, 0, 6, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      const steamY = Math.sin(animatedVal * 3) * 3;
      ctx.beginPath();
      ctx.moveTo(-4, -14 + steamY);
      ctx.quadraticCurveTo(-6, -20, -2, -24);
      ctx.moveTo(3, -13 - steamY);
      ctx.quadraticCurveTo(5, -19, 1, -23);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'desk': {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-60, 0, 120, 8);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-60, 0, 120, 8);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-54, 8, 5, 55);
      ctx.fillRect(49, 8, 5, 55);
      break;
    }

    case 'phone': {
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -16, 16, 32);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-6, -13, 12, 23);
      break;
    }

    case 'clock': {
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.stroke();
      const secAngle = animatedVal * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(secAngle) * 10, Math.sin(secAngle) * 10);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -6);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function renderCustomPropOnCanvas(
  ctx: CanvasRenderingContext2D,
  prop: { shapeType?: string; name: string },
  x: number,
  y: number,
  scale: number = 1.0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  switch (prop.shapeType) {
    case 'crown': {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-7, -5);
      ctx.lineTo(0, -15);
      ctx.lineTo(7, -5);
      ctx.lineTo(14, -12);
      ctx.lineTo(14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(0, -5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'star': {
      ctx.fillStyle = '#EAB308';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const outerX = Math.cos(outerAngle) * 12;
        const outerY = Math.sin(outerAngle) * 12;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'shield': {
      ctx.fillStyle = '#06B6D4';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(10, -12);
      ctx.lineTo(10, 2);
      ctx.quadraticCurveTo(10, 14, 0, 18);
      ctx.quadraticCurveTo(-10, 14, -10, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'badge':
    default: {
      ctx.fillStyle = '#8B5CF6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', 0, 1);
      break;
    }
  }

  ctx.restore();
}

export function applyEasing(
  t: number,
  type: 'linear' | 'ease-in-out' | 'bounce' | 'anticipation' = 'linear'
): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'ease-in-out':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;

    case 'anticipation': {
      const s = 1.70158;
      return clamped * clamped * ((s + 1) * clamped - s);
    }

    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let p = clamped;

      if (p < 1 / d1) {
        return n1 * p * p;
      } else if (p < 2 / d1) {
        p -= 1.5 / d1;
        return n1 * p * p + 0.75;
      } else if (p < 2.5 / d1) {
        p -= 2.25 / d1;
        return n1 * p * p + 0.9375;
      } else {
        p -= 2.625 / d1;
        return n1 * p * p + 0.984375;
      }
    }

    case 'linear':
    default:
      return clamped;
  }
}
