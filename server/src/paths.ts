import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Anchored project paths — never derived from process.cwd().
 * Override the repo root with CORTEXI_ROOT if you move assets elsewhere.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url)); // <root>/server/src
export const ROOT = process.env.CORTEXI_ROOT ?? path.resolve(HERE, '..', '..');
export const SERVER_DIR = path.resolve(HERE, '..');
export const ASSETS_DIR = path.join(ROOT, 'assets');
export const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
export const UPLOAD_DIR = path.join(ASSETS_DIR, 'uploads');
export const OUT_DIR = path.join(ASSETS_DIR, 'output');
export const SETTINGS_FILE = process.env.CORTEXI_SETTINGS_FILE ?? path.join(ASSETS_DIR, 'settings.json');
export const WEB_DIST = path.join(ROOT, 'web', 'dist');
export const REMOTION_ENTRY = path.join(SERVER_DIR, 'remotion', 'index.ts');
