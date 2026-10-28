/**
 * Local Project Persistence, Autosave, Undo/Redo & .cortexi Bundle Manager
 */

import { StoryboardProject, Checkpoint } from './types';

const STORAGE_KEY_CURRENT = 'cortexi_project_current';
const STORAGE_KEY_CHECKPOINTS = 'cortexi_project_checkpoints';

export interface CortexiBundle {
  version: string;
  format: 'cortexi-project';
  exportedAt: string;
  project: StoryboardProject;
  checkpoints: Checkpoint[];
}

/**
 * Save project state to local storage
 */
export function saveProjectToStorage(project: StoryboardProject): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(project));
    return true;
  } catch (err) {
    console.warn('Failed to save project to localStorage:', err);
    return false;
  }
}

/**
 * Load project state from local storage
 */
export function loadProjectFromStorage(): StoryboardProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!raw) return null;
    return JSON.parse(raw) as StoryboardProject;
  } catch (err) {
    console.warn('Failed to load project from localStorage:', err);
    return null;
  }
}

/**
 * Export full project as downloadable .cortexi file
 */
export function exportCortexiBundle(project: StoryboardProject, checkpoints: Checkpoint[] = []): void {
  const bundle: CortexiBundle = {
    version: '1.0.0',
    format: 'cortexi-project',
    exportedAt: new Date().toISOString(),
    project,
    checkpoints,
  };

  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = (project.title || 'cortexi_project')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  a.download = `${sanitizedTitle}.cortexi`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded .cortexi file
 */
export async function parseCortexiBundleFile(file: File): Promise<CortexiBundle | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as CortexiBundle;
    if (parsed.format === 'cortexi-project' && parsed.project && Array.isArray(parsed.project.scenes)) {
      return parsed;
    }
    // Backward compatibility with raw StoryboardProject export
    if ((parsed as unknown as StoryboardProject).scenes && (parsed as unknown as StoryboardProject).title) {
      return {
        version: '1.0.0',
        format: 'cortexi-project',
        exportedAt: new Date().toISOString(),
        project: parsed as unknown as StoryboardProject,
        checkpoints: [],
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to parse .cortexi bundle:', err);
    return null;
  }
}

/**
 * Lightweight in-memory history manager for Undo / Redo
 */
export class HistoryManager<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private maxDepth: number;

  constructor(maxDepth = 30) {
    this.maxDepth = maxDepth;
  }

  push(state: T): void {
    // Clone state to prevent reference mutation
    const cloned = JSON.parse(JSON.stringify(state)) as T;
    this.undoStack.push(cloned);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // Clear redo on new action
    this.redoStack = [];
  }

  undo(currentState: T): T | null {
    if (this.undoStack.length === 0) return null;
    const prev = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(currentState)) as T);
    return prev;
  }

  redo(currentState: T): T | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(currentState)) as T);
    return next;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
