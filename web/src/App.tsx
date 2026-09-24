import React, { useEffect, useRef, useState } from 'react';

type Word = { word: string; start: number; end: number };
type Scene = {
  id: string;
  template: 'title-card' | 'feature' | 'outro';
  headline: string;
  body?: string;
  image?: string;
  animation: string;
  audioFile?: string;
  durationSec?: number;
  words?: Word[];
};
type Storyboard = {
  title: string;
  aspect: '16:9' | '9:16' | '1:1';
  fps: number;
  style: { primaryColor: string; backgroundColor: string; textColor: string; font: string };
  voice: { engine: string; voice: string };
  music?: { file: string; volume: number };
  captions: boolean;
  scenes: Scene[];
};

const api = async (path: string, body?: any) => {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the Cortexi server — is it still running?');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
  padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-card)',
};
const input: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)',
  color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
};
const btn = (primary = true): React.CSSProperties => ({
  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700,
  fontSize: 14, background: primary ? 'var(--gradient-btn)' : 'var(--border)', color: primary ? '#fff' : 'var(--text)',
});

export default function App() {
  const [prompt, setPrompt] = useState('An explainer video for a coffee subscription brand that delivers fresh beans weekly');
  const [aspect, setAspect] = useState<Storyboard['aspect']>('16:9');
  const [apiKey, setApiKey] = useState(localStorage.getItem('cortexi_key') ?? '');
  const [provider, setProvider] = useState<'groq' | 'gemini'>('groq');
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('cortexi_theme') as 'dark' | 'light') ?? 'dark'
  );
  const [view, setView] = useState<'wizard' | 'settings'>('wizard');
  const [exportDir, setExportDir] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [online, setOnline] = useState(true);

  // Server health banner — poll every 15s.
  useEffect(() => {
    const ping = () =>
      fetch('/api/health')
        .then((r) => r.ok)
        .catch(() => false)
        .then(setOnline);
    ping();
    const t = window.setInterval(ping, 15000);
    return () => window.clearInterval(t);
  }, []);

  const applyTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    localStorage.setItem('cortexi_theme', next);
    document.documentElement.dataset.theme = next;
  };

  const saveExportDir = () => run('Saving settings…', async () => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportDir }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save');
    setExportDir(data.exportDir ?? '');
    setSettingsMsg('Saved.');
    window.setTimeout(() => setSettingsMsg(''), 3000);
  });

  useEffect(() => {
    fetch('/api/voices').then((r) => r.json()).then(setVoices).catch(() => {});
    fetch('/api/settings').then((r) => r.json()).then((s) => setExportDir(s.exportDir ?? '')).catch(() => {});
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };

  const generatePlan = () => run('Generating storyboard…', async () => {
    localStorage.setItem('cortexi_key', apiKey);
    const plan = await api('/plan', { prompt, aspect, apiKey, provider });
    setSb(plan);
    setJob(null);
  });

  const generateVoice = () => run('Generating voiceover (edge-tts)…', async () => {
    if (!sb) return;
    setSb(await api('/voice', { storyboard: sb }));
  });

  const render = (quality: 'draft' | 'final') => run('Starting render…', async () => {
    if (!sb) return;
    const { jobId } = await api('/render', { storyboard: sb, quality });
    const started = Date.now();
    const poll = async (): Promise<void> => {
      if (Date.now() - started > 15 * 60 * 1000) {
        setError('Render timed out after 15 minutes.');
        setBusy('');
        return;
      }
      let j: any;
      try {
        j = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
      } catch {
        setError('Lost contact with the server while waiting for the render.');
        setBusy('');
        return;
      }
      setJob(j);
      if (j.status === 'rendering' || j.status === 'queued') window.setTimeout(poll, 1500);
      else setBusy('');
    };
    poll();
  });

  const upload = async (file: File): Promise<string> => {
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg'];
    if (file.size > 50 * 1024 * 1024) throw new Error('File too large (max 50 MB).');
    if (file.type && !okTypes.includes(file.type)) throw new Error(`File type not allowed: ${file.type}`);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data.path;
  };

  const updateScene = (i: number, patch: Partial<Scene>) => {
    if (!sb) return;
    const scenes = [...sb.scenes];
    scenes[i] = { ...scenes[i], ...patch };
    setSb({ ...sb, scenes });
  };

  /** Upload with error surfaced in the banner instead of an unhandled rejection. */
  const uploadSafe = async (file: File): Promise<string | null> => {
    try {
      return await upload(file);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', padding: 24, transition: 'background 0.2s ease, color 0.2s ease' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src='/logo.jpeg' alt='Cortexi logo' style={{ width: 52, height: 52, borderRadius: 14, boxShadow: 'var(--shadow-card)' }} />
            <div>
              <h1 style={{ margin: '0 0 4px' }}>Cortexi</h1>
              <p style={{ color: 'var(--text2)', margin: 0 }}>Free AI video generator - brand, explainer and intro videos</p>
            </div>
          </div>
          <button onClick={() => setView(view === 'settings' ? 'wizard' : 'settings')} style={{ ...btn(view !== 'settings'), fontSize: 13 }}>
            {view === 'settings' ? '<- Back to studio' : 'Settings'}
          </button>
        </div>

        {!online && (
          <div style={{ ...card, marginTop: 16, borderColor: '#e74c3c', color: '#ff8a80' }}>
            ⚠ Cannot reach the Cortexi server — start it with <code>pnpm dev:server</code> (port 8787).
          </div>
        )}

        {error && <div style={{ ...card, marginTop: 16, borderColor: '#e74c3c', color: '#ff8a80' }}>Error: {error}</div>}

        {view === 'settings' && (
          <>
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Appearance</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button style={btn(theme === 'dark')} onClick={() => applyTheme('dark')}>Dark</button>
                <button style={btn(theme === 'light')} onClick={() => applyTheme('light')}>Light</button>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Current: {theme} mode (saved in this browser)</span>
              </div>
            </div>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Export destination</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 0 }}>Finished videos are always kept in the built-in assets/output folder. Set a folder here to also copy each exported MP4 to a destination of your choice (absolute path on this machine).</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input style={{ ...input, flex: 1, minWidth: 280 }} placeholder="e.g. E:\Videos\Cortexi (leave empty to disable)" value={exportDir} onChange={(e) => setExportDir(e.target.value)} />
                <button style={btn()} onClick={saveExportDir} disabled={!!busy}>Save</button>
                {settingsMsg && <span style={{ fontSize: 13, color: 'var(--emerald)' }}>{settingsMsg}</span>}
              </div>
            </div>
          </>
        )}

        {view === 'wizard' && (<>        <div style={{ ...card, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>1. Describe your video</h3>
          <textarea style={{ ...input, width: '100%', minHeight: 70 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={input} value={aspect} onChange={(e) => setAspect(e.target.value as any)}>
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Shorts/Reels</option>
              <option value="1:1">1:1 Square</option>
            </select>
            <select style={input} value={provider} onChange={(e) => setProvider(e.target.value as any)}>
              <option value="groq">Groq (free)</option>
              <option value="gemini">Gemini (free)</option>
            </select>
            <input style={{ ...input, flex: 1, minWidth: 200 }} type="password" placeholder="API key (optional)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <button style={btn()} onClick={generatePlan} disabled={!!busy}>Generate Storyboard</button>
          </div>
        </div>

        {sb && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>2. Storyboard - {sb.title} ({sb.scenes.length} scenes)</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 13 }}>Brand <input type="color" value={sb.style.primaryColor} onChange={(e) => setSb({ ...sb, style: { ...sb.style, primaryColor: e.target.value } })} /></label>
              <label style={{ fontSize: 13 }}>Background <input type="color" value={sb.style.backgroundColor} onChange={(e) => setSb({ ...sb, style: { ...sb.style, backgroundColor: e.target.value } })} /></label>
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={sb.captions} onChange={(e) => setSb({ ...sb, captions: e.target.checked })} /> Captions</label>
              <label style={{ fontSize: 13, ...btn(false), padding: '8px 14px' }}>Add music
                <input type="file" accept="audio/*" hidden onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f && sb) {
                    const p = await uploadSafe(f);
                    if (p) setSb({ ...sb, music: { file: p, volume: 0.12 } });
                  }
                }} />
              </label>
              {sb.music && <span style={{ fontSize: 12, color: 'var(--amber)' }}>♪ music added</span>}
            </div>
            {sb.scenes.map((s, i) => (
              <div key={s.id} style={{ borderTop: '1px solid var(--border)', borderLeft: '3px solid var(--violet)', padding: '12px 0 12px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...btn(false), padding: '4px 10px', fontSize: 12, color: 'var(--violet)' }}>{s.template}</span>
                  <input style={{ ...input, flex: 2, minWidth: 180 }} value={s.headline} onChange={(e) => updateScene(i, { headline: e.target.value })} />
                  <select style={input} value={s.animation} onChange={(e) => updateScene(i, { animation: e.target.value })}>
                    <option value="fade-up">fade-up</option>
                    <option value="zoom">zoom</option>
                    <option value="slide-left">slide-left</option>
                  </select>
                  <label style={{ fontSize: 12, ...btn(false), padding: '8px 12px' }}>Image
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const p = await uploadSafe(f);
                        if (p) updateScene(i, { image: p });
                      }
                    }} />
                  </label>
                  {s.durationSec ? <span style={{ fontSize: 12, color: 'var(--amber)' }}>{s.durationSec.toFixed(1)}s</span> : null}
                </div>
                <textarea style={{ ...input, width: '100%', marginTop: 8, minHeight: 44 }} value={s.body ?? ''} placeholder="Voiceover text" onChange={(e) => updateScene(i, { body: e.target.value })} />
              </div>
            ))}
          </div>
        )}

        {sb && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>3. Voiceover</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={input} value={sb.voice.engine} onChange={(e) => setSb({ ...sb, voice: { ...sb.voice, engine: e.target.value } })}>
                <option value="edge-tts">edge-tts (free neural voices)</option>
                <option value="none">No voiceover</option>
              </select>
              <select style={input} value={sb.voice.voice} onChange={(e) => setSb({ ...sb, voice: { ...sb.voice, voice: e.target.value } })}>
                {voices.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button style={btn()} onClick={generateVoice} disabled={!!busy}>Generate Voice + Captions</button>
              {sb.scenes.some((s) => s.audioFile) && <span style={{ fontSize: 12, color: 'var(--emerald)' }}>● voiceover ready</span>}
            </div>
          </div>
        )}

        {sb && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>4. Render</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={btn(false)} onClick={() => render('draft')} disabled={!!busy}>Draft (fast, half-res)</button>
              <button style={btn()} onClick={() => render('final')} disabled={!!busy}>Final (1080p)</button>
              {busy && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{busy}</span>}
            </div>
            {job && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: job.progress + '%', height: '100%', background: 'var(--gradient-btn)', transition: 'width 0.5s' }} />
                </div>
                <p style={{ fontSize: 13, color: job.status === 'done' ? 'var(--emerald)' : job.status === 'error' ? '#e74c3c' : 'var(--text2)' }}>{job.status} {job.status === 'rendering' ? job.progress + '%' : ''} {job.error ?? ''}</p>
                {job.status === 'done' && job.output && (
                  <>
                    <video controls style={{ width: '100%', borderRadius: 12, marginTop: 8 }} src={'/assets/' + job.output} />
                    <a href={'/assets/' + job.output} download style={{ ...btn(), display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Download MP4</a>
                    {job.exportedTo && <p style={{ fontSize: 12, color: 'var(--text2)' }}>Exported copy: {job.exportedTo}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
