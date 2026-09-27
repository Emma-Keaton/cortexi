import React from 'react';
import { API_BASE, apiUrl } from '../api.js';

export type BrandKit = {
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
};

export type BrandAsset = {
  id: string;
  name: string;
  role: 'logo' | 'product' | 'background' | 'foreground';
  path: string;
  primaryColor?: string;
  tags: string[];
};

const ROLES: Array<BrandAsset['role']> = ['logo', 'product', 'background', 'foreground'];

/** Sample the dominant colour of an image entirely in the browser. */
function extractColor(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(undefined);
      ctx.drawImage(img, 0, 0, 48, 48);
      const data = ctx.getImageData(0, 0, 48, 48).data;
      const counts = new Map<string, number>();
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 180) continue;
        const hex = [data[i], data[i + 1], data[i + 2]]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      resolve(best ? `#${best}` : undefined);
    };
    img.onerror = () => resolve(undefined);
    img.src = URL.createObjectURL(file);
  });
}

type Props = {
  onApply: (style: { primaryColor: string; backgroundColor: string; textColor: string; font: string }) => void;
};

/**
 * Brand asset manager: upload, tag by role, extract a dominant colour, and derive a
 * contrast-checked brand kit. Colour decisions happen server-side so the same WCAG
 * rules apply whether the kit came from a logo or a typed hex value.
 */
export function BrandKitManager({ onApply }: Props) {
  const [assets, setAssets] = React.useState<BrandAsset[]>([]);
  const [kit, setKit] = React.useState<BrandKit | null>(null);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const roleRef = React.useRef<HTMLSelectElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brand-assets`);
      const data = await res.json();
      if (Array.isArray(data.assets)) setAssets(data.assets);
    } catch {
      // Offline is fine; the panel simply shows no assets.
    }
  }, []);

  const recompute = React.useCallback(
    async (overrides: Record<string, string> = {}) => {
      try {
        const base = kit
          ? {
              primaryColor: kit.primaryColor,
              backgroundColor: kit.backgroundColor,
              textColor: kit.textColor,
              font: kit.font,
            }
          : {};
        const res = await fetch(apiUrl('/brand-kit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, ...overrides }),
        });
        const data = await res.json();
        if (res.ok && data.kit) setKit(data.kit as BrandKit);
      } catch {
        // Keep the previous kit on failure.
      }
    },
    [kit],
  );

  React.useEffect(() => {
    void refresh();
    void recompute();
  }, [refresh, recompute]);

  const onUpload = async (file: File) => {
    setBusy('Uploading');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      const uploaded = await up.json();
      if (!up.ok) throw new Error(uploaded.error ?? 'Upload failed');

      const primaryColor = await extractColor(file);
      const reg = await fetch(apiUrl('/brand-assets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          role: (roleRef.current?.value ?? 'product') as BrandAsset['role'],
          path: uploaded.path,
          mimeType: file.type || 'image/png',
          bytes: file.size,
          primaryColor,
          tags: [],
        }),
      });
      if (!reg.ok) throw new Error((await reg.json()).error ?? 'Could not register asset');
      await refresh();
      await recompute(primaryColor ? { primaryColor } : {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/api/brand-assets/${id}`, { method: 'DELETE' });
    await refresh();
    await recompute();
  };

  const fieldFor = (label: string) =>
    label === 'Primary' ? 'primaryColor' : label === 'Background' ? 'backgroundColor' : 'textColor';

  const swatch = (label: string, value?: string) => (
    <label className="swatch" key={label}>
      <span className="swatch-label">{label}</span>
      <input
        type="color"
        value={value ?? '#000000'}
        aria-label={`${label} colour`}
        onChange={(e) => void recompute({ [fieldFor(label)]: e.target.value })}
      />
      <code>{value ?? '--'}</code>
    </label>
  );

  return (
    <section className="brand-kit" aria-label="Brand assets">
      <div className="brand-kit-head">
        <div>
          <h3>Brand kit</h3>
          <p>Upload a logo or product shot. Colours are extracted locally and contrast-checked to WCAG AA.</p>
        </div>
        <div className="brand-kit-actions">
          <select ref={roleRef} defaultValue="logo" aria-label="Asset role">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void onUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy || 'Add asset'}</button>
        </div>
      </div>

      {error && <p className="brand-kit-error">{error}</p>}

      <div className="brand-kit-body">
        <div className="brand-asset-list">
          {assets.length === 0 && <span className="muted">No assets yet.</span>}
          {assets.map((a) => (
            <div key={a.id} className="brand-asset">
              <img src={`${API_BASE}/assets/${a.path}`} alt={a.name} />
              <div className="brand-asset-meta">
                <strong>{a.name}</strong>
                <span>{a.role}{a.primaryColor ? ` · ${a.primaryColor}` : ''}</span>
              </div>
              <button className="ghost" onClick={() => void remove(a.id)} aria-label={`Remove ${a.name}`}>x</button>
            </div>
          ))}
        </div>

        <div className="brand-kit-palette">
          {swatch('Primary', kit?.primaryColor)}
          {swatch('Background', kit?.backgroundColor)}
          {swatch('Text', kit?.textColor)}
          {kit && (
            <div className="contrast-row">
              <span className={kit.checks.textOnBackgroundPass ? 'pass' : 'fail'}>
                text {kit.checks.textOnBackground.toFixed(2)}:1 {kit.checks.textOnBackgroundPass ? 'AA' : 'FAIL'}
              </span>
              <span className={kit.checks.primaryOnBackgroundPass ? 'pass' : 'warn'}>
                accent {kit.checks.primaryOnBackground.toFixed(2)}:1 {kit.checks.primaryOnBackgroundPass ? 'AA large' : 'large only'}
              </span>
            </div>
          )}
          <button
            className="primary"
            disabled={!kit}
            onClick={() =>
              kit &&
              onApply({
                primaryColor: kit.primaryColor,
                backgroundColor: kit.backgroundColor,
                textColor: kit.textColor,
                font: kit.font,
              })
            }
          >
            Apply to storyboard
          </button>
        </div>
      </div>
    </section>
  );
}
