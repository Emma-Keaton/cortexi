export type StyleModule = 'Camera' | 'Character' | 'Asset' | 'Overlay' | 'Voice' | 'Transition';

export interface StyleDefinition {
  id: string;
  name: string;
  group: 'Simple Animations' | 'Film & Cinematic' | 'Explainers & Collage';
  modules: StyleModule[];
  description: string;
  sourceRepo?: string;
  renderEngine: 'Remotion' | 'Canvas';
}

export const STYLE_REGISTRY: Record<string, StyleDefinition> = {
  stickman_ik: {
    id: 'stickman_ik',
    name: 'Stickman IK',
    group: 'Simple Animations',
    modules: ['Character'],
    description: '2D stick figure with inverse kinematics',
    renderEngine: 'Canvas',
  },
  stickman_whiteboard: {
    id: 'stickman_whiteboard',
    name: 'Stickman Whiteboard',
    group: 'Simple Animations',
    modules: ['Character','Asset'],
    description: 'Sketch animation',
    renderEngine: 'Canvas',
  },
  stickman_motion: {
    id: 'stickman_motion',
    name: 'Stickman Motion',
    group: 'Simple Animations',
    modules: ['Character','Camera'],
    description: 'Pose-to-pose',
    renderEngine: 'Canvas',
  },
  hyper_frames: {
    id: 'hyper_frames',
    name: 'Hyper Frames',
    group: 'Simple Animations',
    modules: ['Camera','Transition'],
    description: 'Fast dynamic frames',
    renderEngine: 'Remotion',
  },
  ui_infographics: {
    id: 'ui_infographics',
    name: 'UI Infographics',
    group: 'Simple Animations',
    modules: ['Overlay'],
    description: 'Data viz overlays',
    renderEngine: 'Remotion',
  },
  cinematic_flow: {
    id: 'cinematic_flow',
    name: 'Cinematic Flow',
    group: 'Film & Cinematic',
    modules: ['Camera','Transition'],
    description: 'Film motion continuous take',
    sourceRepo: 'lemo-opuscar',
    renderEngine: 'Remotion',
  },
  one_take: {
    id: 'one_take',
    name: 'One Take',
    group: 'Film & Cinematic',
    modules: ['Camera','Transition'],
    description: 'Single shot camera motion',
    sourceRepo: 'onetake',
    renderEngine: 'Remotion',
  },
  watercolor: {
    id: 'watercolor',
    name: 'Watercolor Brush',
    group: 'Film & Cinematic',
    modules: ['Asset'],
    description: 'Painted frames',
    sourceRepo: 'lemo-opuscar',
    renderEngine: 'Remotion',
  },
  storybook_collage: {
    id: 'storybook_collage',
    name: 'Storybook Collage',
    group: 'Explainers & Collage',
    modules: ['Asset','Overlay'],
    description: 'Paper collage explainer',
    sourceRepo: 'VOX-COLLAGE-BROLL',
    renderEngine: 'Remotion',
  },
  whiteboard_explainer: {
    id: 'whiteboard_explainer',
    name: 'Whiteboard Explainer',
    group: 'Explainers & Collage',
    modules: ['Character','Asset'],
    description: 'Whiteboard drawing',
    sourceRepo: 'lemo-opuscar',
    renderEngine: 'Remotion',
  },
};

export function getStyleModules(styleIds: string[]): StyleModule[] {
  const modules = new Set<StyleModule>();
  for (const id of styleIds) {
    const def = STYLE_REGISTRY[id];
    if (def) def.modules.forEach(m => modules.add(m));
  }
  return Array.from(modules);
}

export function getRenderEngine(styleIds: string[]): 'Remotion' | 'Canvas' | 'Hybrid' {
  const engines = new Set(styleIds.map(id => STYLE_REGISTRY[id]?.renderEngine).filter(Boolean));
  if (engines.size === 1) return engines.values().next().value as any;
  return 'Hybrid';
}
