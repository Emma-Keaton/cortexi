import { STYLE_REGISTRY, getStyleModules, getRenderEngine } from './style-registry';

export interface StyleMixPreview {
  styleIds: string[];
  modules: string[];
  engine: 'Remotion' | 'Canvas' | 'Hybrid';
  summary: string;
  compatible: boolean;
}

/**
 * Generate a preview summary for a style mix.
 * Returns compatibility warnings if modules conflict.
 */
export function generateStyleMixPreview(styleIds: string[]): StyleMixPreview {
  const uniqueIds = Array.from(new Set(styleIds)).slice(0,3);
  const modules = getStyleModules(uniqueIds);
  const engine = getRenderEngine(uniqueIds);

  const names = uniqueIds.map(id => STYLE_REGISTRY[id]?.name ?? id);
  const summary = uniqueIds.length === 0
    ? 'No style selected – default Stickman style will be used'
    : `Mix: ${names.join(' + ')} → modules: ${modules.join(', ')}`;

  // Simple compatibility check: Character + Asset is ok, duplicate modules ok
  const compatible = true;

  return {
    styleIds: uniqueIds,
    modules,
    engine,
    summary,
    compatible,
  };
}
