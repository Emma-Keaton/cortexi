import { z } from 'zod';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './paths.js';

/**
 * Brand asset management.
 *
 * An "asset" is any user-supplied brand file (logo, product shot, background,
 * foreground overlay) plus the metadata needed to use it intelligently. The
 * registry persists to disk so a project's brand kit survives restarts.
 */

export const AssetRoleSchema = z.enum(['logo', 'product', 'background', 'foreground']);
export type AssetRole = z.infer<typeof AssetRoleSchema>;

export const BrandAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: AssetRoleSchema,
  /** Path relative to assets/, e.g. "uploads/abc123.png" */
  path: z.string().min(1),
  mimeType: z.string().default('image/png'),
  bytes: z.number().nonnegative().default(0),
  /** Dominant colour extracted client-side, e.g. "#7C3AED" */
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.number().default(() => Date.now()),
});
export type BrandAsset = z.infer<typeof BrandAssetSchema>;

const BRAND_FILE = path.join(ASSETS_DIR, 'brand-assets.json');

export async function listAssets(): Promise<BrandAsset[]> {
  if (!existsSync(BRAND_FILE)) return [];
  try {
    return z.array(BrandAssetSchema).parse(JSON.parse(await readFile(BRAND_FILE, 'utf-8')));
  } catch {
    return []; // A corrupt registry should not take the whole app down.
  }
}

async function persist(assets: BrandAsset[]): Promise<void> {
  await mkdir(ASSETS_DIR, { recursive: true });
  await writeFile(BRAND_FILE, JSON.stringify(assets, null, 2));
}

export async function registerAsset(input: z.input<typeof BrandAssetSchema>): Promise<BrandAsset> {
  const asset = BrandAssetSchema.parse({ ...input, id: input.id || `a${Date.now().toString(36)}` });
  const next = (await listAssets()).filter((a) => a.id !== asset.id);
  next.push(asset);
  await persist(next);
  return asset;
}

export async function removeAsset(id: string): Promise<boolean> {
  const assets = await listAssets();
  const next = assets.filter((a) => a.id !== id);
  await persist(next);
  return next.length !== assets.length;
}

// ---- Colour utilities ---------------------------------------------------------

export interface Rgb { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: ((h * 60) + 360) % 360, s, l };
}

export function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const table: Rgb[] = [
    { r: c, g: x, b: 0 }, { r: x, g: c, b: 0 }, { r: 0, g: c, b: x },
    { r: 0, g: x, b: c }, { r: x, g: 0, b: c }, { r: c, g: 0, b: x },
  ];
  const { r, g, b } = table[seg] ?? { r: 0, g: 0, b: 0 };
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

export function meetsContrast(fg: string, bg: string, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}

/** Pick whichever candidate reads best against `bg`. */
export function bestTextColor(bg: string, candidates: string[] = ['#FFFFFF', '#0A0A0E']): string {
  let best = candidates[0] ?? '#FFFFFF';
  let bestRatio = -1;
  for (const c of candidates) {
    const ratio = contrastRatio(c, bg);
    if (ratio > bestRatio) { bestRatio = ratio; best = c; }
  }
  return best;
}

/** Rotate hue to build a secondary brand colour that still harmonises. */
export function deriveSecondary(primary: string, degrees = 35): string {
  const { h, s, l } = rgbToHsl(hexToRgb(primary));
  const nextL = l > 0.6 ? l - 0.18 : l < 0.25 ? l + 0.18 : l;
  return rgbToHex(hslToRgb({ h: (h + degrees + 360) % 360, s, l: nextL }));
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  font: string;
  checks: {
    textOnBackground: number;
    textOnBackgroundPass: boolean;
    primaryOnBackground: number;
    primaryOnBackgroundPass: boolean;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build a complete, contrast-checked brand kit from whatever the user supplied.
 * Guarantees readable text even when the extracted primary is low-contrast.
 */
export function deriveBrandKit(opts: {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  font?: string;
}): BrandKit {
  const primaryColor = (opts.primaryColor ?? '#7C3AED').toUpperCase();
  const backgroundColor = (opts.backgroundColor ?? '#0A0A0E').toUpperCase();
  const secondaryColor = deriveSecondary(primaryColor);
  // Never trust a user/extracted text colour - fall back to whichever is readable.
  const textColor = opts.textColor && meetsContrast(opts.textColor, backgroundColor)
    ? opts.textColor.toUpperCase()
    : bestTextColor(backgroundColor);

  const textRatio = contrastRatio(textColor, backgroundColor);
  const primaryRatio = contrastRatio(primaryColor, backgroundColor);

  return {
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    font: opts.font ?? 'Inter, Arial, sans-serif',
    checks: {
      textOnBackground: round2(textRatio),
      textOnBackgroundPass: textRatio >= WCAG_AA_NORMAL,
      // Accent colours only need to clear the "large text" threshold (3:1).
      primaryOnBackground: round2(primaryRatio),
      primaryOnBackgroundPass: primaryRatio >= WCAG_AA_LARGE,
    },
  };
}

/** Compact prompt-ready description of the kit, for the LLM planner. */
export function describeBrandKit(kit: BrandKit, assets: BrandAsset[]): string {
  const byRole = assets.reduce<Record<string, string[]>>((acc, a) => {
    (acc[a.role] ??= []).push(a.name);
    return acc;
  }, {});
  const parts = [
    `Primary ${kit.primaryColor}, secondary ${kit.secondaryColor}, background ${kit.backgroundColor}, text ${kit.textColor}.`,
  ];
  for (const [role, names] of Object.entries(byRole)) parts.push(`${role}: ${names.join(', ')}`);
  return parts.join(' ');
}
