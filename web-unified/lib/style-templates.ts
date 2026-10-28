export interface StyleTemplate {
  id: string;
  name: string;
  intent: 'explainer' | 'funny skit' | 'product' | 'brand' | 'intro' | 'education';
  suggestedStyles: string[];
  description: string;
  locked: false; // templates are suggestions only
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'explainer',
    name: 'Explainer',
    intent: 'explainer',
    suggestedStyles: ['storybook_collage','stickman_ik','ui_infographics'],
    description: 'Paper collage + stick figure + data overlays',
    locked: false,
  },
  {
    id: 'funny_skit',
    name: 'Funny Skit',
    intent: 'funny skit',
    suggestedStyles: ['stickman_motion','hyper_frames','cinematic_flow'],
    description: 'Stickman motion with fast frames and cinematic handheld',
    locked: false,
  },
  {
    id: 'product',
    name: 'Product Video',
    intent: 'product',
    suggestedStyles: ['cinematic_flow','one_take','ui_infographics'],
    description: 'Cinematic continuous take with data overlays',
    locked: false,
  },
  {
    id: 'brand',
    name: 'Brand Video',
    intent: 'brand',
    suggestedStyles: ['storybook_collage','cinematic_flow'],
    description: 'Collage storytelling with cinematic camera',
    locked: false,
  },
  {
    id: 'intro',
    name: 'Introduction',
    intent: 'intro',
    suggestedStyles: ['stickman_whiteboard','hyper_frames'],
    description: 'Whiteboard sketch with dynamic frames',
    locked: false,
  },
  {
    id: 'education',
    name: 'Education',
    intent: 'education',
    suggestedStyles: ['storybook_collage','ui_infographics','stickman_ik'],
    description: 'Collage assets + infographics + character',
    locked: false,
  },
];

export function applyTemplate(templateId: string, currentSelection: string[]): string[] {
  const tmpl = STYLE_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return currentSelection;
  // Return suggested styles as starting point, user can modify freely
  return tmpl.suggestedStyles;
}
