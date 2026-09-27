/**
 * Single source of truth for the backend origin.
 *
 * Empty in local dev (the Vite proxy handles it); set VITE_API_TARGET on Vercel
 * to the Render backend so every /api and /assets call resolves cross-origin.
 */
export const API_BASE = (import.meta as any).env?.VITE_API_TARGET ?? '';

export const apiUrl = (path: string) => `${API_BASE}/api${path}`;

/** Resolve a path returned by the server (e.g. "uploads/x.png") to a full URL. */
export const assetUrl = (path?: string) => {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  return `${API_BASE}/assets/${String(path).replace(/^\/+/, '')}`;
};

/** POST JSON to the backend and throw a useful message on failure. */
export const api = async (path: string, body?: unknown): Promise<any> => {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Cannot reach the Cortexi server. If it is a free host it may be waking up - retry in ~30 seconds.',
    );
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
