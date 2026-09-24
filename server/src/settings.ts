import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { SETTINGS_FILE } from './paths.js';

export interface Settings {
  /** Absolute folder where finished exports are also copied. Empty = disabled. */
  exportDir: string;
}

const DEFAULTS: Settings = { exportDir: '' };

let cache: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    if (existsSync(SETTINGS_FILE)) {
      cache = { ...DEFAULTS, ...JSON.parse(await readFile(SETTINGS_FILE, 'utf8')) };
      return cache!;
    }
  } catch {
    // fall through to defaults
  }
  cache = { ...DEFAULTS };
  return cache;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch };
  // Normalize: empty string or an absolute path only.
  if (next.exportDir) {
    next.exportDir = path.normalize(next.exportDir.replace(/\\\\/g, '\\'));
    if (!path.isAbsolute(next.exportDir)) {
      throw new Error('exportDir must be an absolute path (e.g. E:\\Videos\\Cortexi)');
    }
  }
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2));
  cache = next;
  return next;
}
