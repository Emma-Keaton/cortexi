import React, { useEffect, useState } from 'react';
import { HeroShowcase } from './components/HeroShowcase.js';
import { FolderPickerModal } from './components/FolderPickerModal.js';
import { BrandColorPicker } from './components/BrandColorPicker.js';
import { FaqView, AdSlot } from './components/FaqView.js';
import { renderOnDevice, downloadBlob, type ClientStoryboard, type ExportFormat, type RenderProgress } from './clientRender.js';
import type { Scene, Storyboard } from './AppTypes.js';
import { apiUrl, api } from './api.js';
import { BrandKitManager } from './components/BrandKitManager.js';
import { SuperPromptPanel } from './components/SuperPromptPanel.js';

export default function App() {
  const [prompt, setPrompt] = useState('An explainer video for a coffee subscription brand that delivers fresh beans weekly');
  const [aspect, setAspect] = useState<Storyboard['aspect']>('16:9');
  const [apiKey, setApiKey] = useState(localStorage.getItem('cortexi_key') ?? '');
  const [provider, setProvider] = useState<'' | 'groq' | 'gemini' | 'huggingface'>('');
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [voices, setVoices] = useState<Array<{ engine: string; id: string }>>([]);
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cutoutSource, setCutoutSource] = useState('');
  const [cutoutResult, setCutoutResult] = useState('');

  useEffect(() => {
    const ping = () =>
      fetch(apiUrl('/health'))
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

  const saveExportDir = () => run('Saving settingsï¿½', async () => {
    const res = await fetch(apiUrl('/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportDir }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save');
    setExportDir(data.exportDir ?? '');
    setSettingsMsg('Destination updated');
    window.setTimeout(() => setSettingsMsg(''), 3000);
  });

  useEffect(() => {
    fetch(apiUrl('/voices')).then((r) => r.json()).then((data) => { setVoices(data.combined ?? []); const first = (data.combined ?? [])[0]; if (first) setSb((current) => current ? { ...current, voice: { engine: first.engine, voice: first.id } } : current); }).catch(() => {});
    fetch(apiUrl('/settings')).then((r) => r.json()).then((s) => setExportDir(s.exportDir ?? '')).catch(() => {});
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  };

  const generatePlan = () => run('Architecting storyboard with AIâ€¦', async () => {
    localStorage.setItem('cortexi_key', apiKey);
    // Empty provider = let the backend use its shared (free) key route.
    const plan = await api('/plan', { prompt, aspect, apiKey, provider: provider || undefined });
    setSb(plan);
    setJob(null);
  });

  const removeBackground = () => run('Removing background locally with rembgâ€¦', async () => {
    if (!cutoutSource) throw new Error('Upload a product image first');
    const result = await api('/cutout', { path: cutoutSource });
    setCutoutResult(result.path);
  });

  const generateVoice = () => run('Synthesizing neural voiceover + timing wordsï¿½', async () => {
    if (!sb) return;
    setSb(await api('/voice', { storyboard: sb }));
  });

  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [deviceVideoUrl, setDeviceVideoUrl] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');

  const render = (quality: 'draft' | 'final') => run('Rendering on this device', async () => {
    if (!sb) return;
    setDeviceVideoUrl('');
    const result = await renderOnDevice(sb as unknown as ClientStoryboard, quality, exportFormat, setRenderProgress);
    const safeTitle = sb.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cortexi-video';
    downloadBlob(result.blob, `cortexi-${safeTitle}-${quality}.${result.extension}`);
    const url = URL.createObjectURL(result.blob);
    setDeviceVideoUrl(url);
    setJob({ id: 'device', status: 'done', progress: 100, output: result.extension });
  });
  const upload = async (file: File): Promise<string> => {
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg'];
    if (file.size > 50 * 1024 * 1024) throw new Error('File too large (max 50 MB).');
    if (file.type && !okTypes.includes(file.type)) throw new Error(`File type not allowed: ${file.type}`);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(apiUrl('/upload'), { method: 'POST', body: fd });
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

  const uploadSafe = async (file: File): Promise<string | null> => {
    try {
      return await upload(file);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const step1Done = !!sb;
  const step2Done = !!sb && sb.scenes.length > 0;
  const step3Done = !!sb && sb.scenes.some((s) => s.audioFile);
  const step4Done = !!job && job.status === 'done';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Global Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/logo.jpeg"
              alt="Cortexi logo"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
                border: '1px solid var(--border-accent)',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="display-font" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>CORTEXI</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(124, 58, 237, 0.15)',
                  color: 'var(--violet)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}>Studio v0.1</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                Local-first AI video synthesis workstation
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontSize: 12,
              color: online ? 'var(--emerald)' : 'var(--rose)',
            }}>
              <span className="pulse-dot" style={{ background: online ? 'var(--emerald)' : 'var(--rose)' }} />
              {online ? 'Engine Ready' : 'Server Disconnected'}
            </div>

            <nav style={{
              display: 'inline-flex',
              padding: 3,
              background: 'var(--input-bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => setView('wizard')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: view === 'wizard' ? 'var(--gradient-btn)' : 'transparent',
                  color: view === 'wizard' ? '#FFFFFF' : 'var(--text2)',
                  transition: 'all 0.15s ease',
                }}
              >
                Studio
              </button>
              <button
                onClick={() => setView('settings')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: view === 'settings' ? 'var(--gradient-btn)' : 'transparent',
                  color: view === 'settings' ? '#FFFFFF' : 'var(--text2)',
                  transition: 'all 0.15s ease',
                }}
              >
                Settings
              </button>
            </nav>

            <button
              onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? '☀' : '☾'} mode`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface-elevated)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}>
            <span><strong>Notice:</strong> {error}</span>
            <button
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
            >
              ?
            </button>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              boxShadow: 'var(--shadow-card)',
            }}>
              <h3 className="display-font" style={{ margin: '0 0 6px', fontSize: 17 }}>Interface Appearance</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text2)' }}>
                Select your preferred workstation theme. Preserved in your browser session.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => applyTheme('dark')}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: theme === 'dark' ? '1px solid var(--violet)' : '1px solid var(--border)',
                    background: theme === 'dark' ? 'rgba(124, 58, 237, 0.16)' : 'var(--input-bg)',
                    color: theme === 'dark' ? '#FFFFFF' : 'var(--text2)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ? Obsidian Dark
                </button>
                <button
                  onClick={() => applyTheme('light')}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: theme === 'light' ? '1px solid var(--violet)' : '1px solid var(--border)',
                    background: theme === 'light' ? 'rgba(124, 58, 237, 0.16)' : 'var(--input-bg)',
                    color: theme === 'light' ? 'var(--text)' : 'var(--text2)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ? Pure Light
                </button>
              </div>
            </div>

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 className="display-font" style={{ margin: '0 0 6px', fontSize: 17 }}>Export Mirror Destination</h3>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text2)', maxWidth: 620 }}>
                    Every render is kept in <code className="mono-font" style={{ color: 'var(--amber)' }}>assets/output/</code>. Configure a dedicated disk directory here to automatically mirror a finalized copy after each render.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  style={{
                    flex: '1 1 320px',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: 13,
                  }}
                  className="mono-font"
                  placeholder="e.g. E:\Videos\Cortexi (or choose folder)"
                  value={exportDir}
                  onChange={(e) => setExportDir(e.target.value)}
                />
                <button
                  onClick={() => setPickerOpen(true)}
                  style={{
                    padding: '11px 18px',
                    borderRadius: 10,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-elevated)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Browseï¿½
                </button>
                <button
                  onClick={saveExportDir}
                  disabled={!!busy}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--gradient-btn)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Preference
                </button>
                {settingsMsg && (
                  <span style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 600 }}>
                    ? {settingsMsg}
                  </span>
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              boxShadow: 'var(--shadow-card)',
            }}>
              <h3 className="display-font" style={{ margin: '0 0 6px', fontSize: 17 }}>Pipeline Architecture</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text2)' }}>
                System runtime dependencies and rendering backend topology.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}>
                <div style={{ padding: 14, background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Synthesizer</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Remotion 4.0</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Headless Chromium / React</div>
                </div>
                <div style={{ padding: 14, background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Voiceover</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Kokoro-82M</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Choose any voice configured by the backend</div>
                </div>
                <div style={{ padding: 14, background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Media Processing</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>FFmpeg / ffprobe</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Hardware-accelerated muxing</div>
                </div>
              </div>
            </div>
            <section style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
              <h3 className="display-font" style={{ margin:'0 0 6px', fontSize:17 }}>Product Cutout Â· Local rembg</h3>
              <p style={{ margin:'0 0 14px', color:'var(--text2)', fontSize:13 }}>Remove a product background privately on this computer, then reuse the transparent PNG in any scene.</p>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const f=e.target.files?.[0]; if(!f)return; const form=new FormData(); form.append('file',f); const data=await fetch(apiUrl('/upload'),{method:'POST',body:form}).then(r=>r.json()); setCutoutSource(data.path); }} />
              <button onClick={removeBackground} disabled={!!busy || !cutoutSource} style={{ marginLeft:10, padding:'10px 16px', borderRadius:9, border:0, background:'var(--gradient-btn)', color:'#fff', cursor:'pointer' }}>Remove background</button>
              {cutoutResult && <img src={`/assets/${cutoutResult}`} alt="Transparent product cutout" style={{ display:'block', marginTop:16, maxWidth:'100%', maxHeight:320, backgroundImage:'linear-gradient(45deg,#333 25%,transparent 25%),linear-gradient(-45deg,#333 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#333 75%),linear-gradient(-45deg,transparent 75%,#333 75%)', backgroundSize:'20px 20px', backgroundPosition:'0 0,0 10px,10px -10px,-10px 0' }} />}
            </section>


          </div>
        )}

        {/* STUDIO WIZARD VIEW */}
        {view === 'wizard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             <SuperPromptPanel onUse={(t) => setPrompt(t)} onPromptChange={setPrompt} />
             <FaqView />
             <AdSlot provider="Adsterra" />
             <AdSlot provider="Monetag" />

             <BrandKitManager
               onApply={(style) => setSb((current) => current ? { ...current, style: { ...current.style, ...style } } : current)}
             />
             <BrandColorPicker onPick={(color) => sb && setSb({ ...sb, style: { ...sb.style, primaryColor: color } })} />
             {/* Showcase Gallery */}
            {/* Showcase Gallery */}
            <HeroShowcase
              onSelectRecipe={(newPrompt, newAspect) => {
                setPrompt(newPrompt);
                setAspect(newAspect);
              }}
            />

            {/* Step Rail Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'var(--surface)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              overflowX: 'auto',
              gap: 8,
            }}>
              {[
                { n: '01', label: 'Prompt & Blueprint', active: true, done: step1Done },
                { n: '02', label: 'Storyboard Scenes', active: step1Done, done: step2Done },
                { n: '03', label: 'Neural Voiceover', active: step2Done, done: step3Done },
                { n: '04', label: 'Remotion Render', active: step3Done, done: step4Done },
              ].map((st, i) => (
                <div key={st.n} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: st.active ? 1 : 0.45 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: st.done ? 'var(--emerald)' : st.active ? 'var(--violet)' : 'var(--input-bg)',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)',
                  }}>
                    {st.done ? '?' : st.n}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                  {i < 3 && <span style={{ color: 'var(--text3)', margin: '0 4px' }}>?</span>}
                </div>
              ))}
            </div>

            {/* Step 1: Prompt */}
            <section style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'var(--violet)',
                    color: '#FFF',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>STEP 01</span>
                  <h3 className="display-font" style={{ margin: 0, fontSize: 17 }}>Describe Your Video</h3>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>AI-driven storyboard synthesis</span>
              </div>

              <textarea
                style={{
                  width: '100%',
                  minHeight: 88,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your brand, feature, or explainer..."
              />

              <div style={{
                display: 'flex',
                gap: 12,
                marginTop: 14,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Aspect Ratio</label>
                  <select
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as any)}
                  >
                    <option value="16:9">16:9 Landscape (YouTube / Desktop)</option>
                    <option value="9:16">9:16 Vertical (Shorts / Reels / TikTok)</option>
                    <option value="1:1">1:1 Square (Feed / Social)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>AI Blueprint Engine</label>
                  <select
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                  >
                    <option value="">Automatic (free shared model)</option>
                    <option value="huggingface">Hugging Face Router (lightweight)</option>
                    <option value="groq">GPT-OSS 120B - Groq (bring your key)</option>
                    <option value="gemini">Google Gemini Flash (bring your key)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>API Key (Optional if set on server)</label>
                  <input
                    type="password"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                    placeholder="gsk_... or AIza..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 18 }}>
                  <button
                    onClick={generatePlan}
                    disabled={!!busy}
                    style={{
                      padding: '11px 24px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--gradient-btn)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 18px rgba(124, 58, 237, 0.35)',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? busy : 'Generate Storyboard ?'}
                  </button>
                </div>
              </div>
            </section>

            {/* Step 2: Storyboard */}
            {sb && (
              <section style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'var(--violet)',
                      color: '#FFF',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>STEP 02</span>
                    <h3 className="display-font" style={{ margin: 0, fontSize: 17 }}>
                      Storyboard: {sb.title}
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      ({sb.scenes.length} scenes)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      Accent
                      <input
                        type="color"
                        style={{ border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                        value={sb.style.primaryColor}
                        onChange={(e) => setSb({ ...sb, style: { ...sb.style, primaryColor: e.target.value } })}
                      />
                    </label>

                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      Background
                      <input
                        type="color"
                        style={{ border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                        value={sb.style.backgroundColor}
                        onChange={(e) => setSb({ ...sb, style: { ...sb.style, backgroundColor: e.target.value } })}
                      />
                    </label>

                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={sb.captions}
                        onChange={(e) => setSb({ ...sb, captions: e.target.checked })}
                      />
                      Karaoke Captions
                    </label>

                    <label style={{
                      fontSize: 12,
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span>Upload Soundtrack</span>
                      <input
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f && sb) {
                            const p = await uploadSafe(f);
                            if (p) setSb({ ...sb, music: { file: p, volume: 0.12 } });
                          }
                        }}
                      />
                    </label>
                    {sb.music && <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>? Soundtrack attached</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {sb.scenes.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        borderLeft: '4px solid var(--violet)',
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: 'rgba(124, 58, 237, 0.15)',
                          color: 'var(--violet)',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          Scene {i + 1} ï¿½ {s.template}
                        </span>

                        <input
                          style={{
                            flex: '2 1 200px',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                          value={s.headline}
                          onChange={(e) => updateScene(i, { headline: e.target.value })}
                          placeholder="Headline"
                        />

                        <select
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: 12,
                          }}
                          value={s.animation}
                          onChange={(e) => updateScene(i, { animation: e.target.value })}
                        >
                          <option value="fade-up">fade-up</option>
                          <option value="zoom">zoom</option>
                          <option value="slide-left">slide-left</option>
                        </select>

                        <label style={{
                          fontSize: 12,
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span>{s.image ? 'Replace Image' : 'Attach Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const p = await uploadSafe(f);
                                if (p) updateScene(i, { image: p });
                              }
                            }}
                          />
                        </label>

                        {s.durationSec && (
                          <span className="mono-font" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
                            ? {s.durationSec.toFixed(1)}s
                          </span>
                        )}
                      </div>

                      <textarea
                        style={{
                          width: '100%',
                          minHeight: 52,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                        value={s.body ?? ''}
                        placeholder="Voiceover script for this scene..."
                        onChange={(e) => updateScene(i, { body: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Step 3: Neural Voiceover */}
            {sb && (
              <section style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'var(--violet)',
                      color: '#FFF',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>STEP 03</span>
                    <h3 className="display-font" style={{ margin: 0, fontSize: 17 }}>Voiceover & Word Sync</h3>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Piper / Kokoro / Microsoft Neural Voices</span>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                    value={sb.voice.engine}
                    onChange={(e) => setSb({ ...sb, voice: { ...sb.voice, engine: e.target.value } })}
                  >
                    <option value="piper">Piper (local, offline - default)</option>
                     <option value="kokoro">Kokoro-82M (local, higher quality)</option>
                    <option value="none">Mute / No Voiceover</option>
                  </select>

                  <select
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      minWidth: 220,
                    }}
                    value={sb.voice.voice}
                    onChange={(e) => setSb({ ...sb, voice: { ...sb.voice, voice: e.target.value } })}
                  >
                    {voices.filter((v) => v.engine === sb.voice.engine).map((v) => (
                      <option key={`${v.engine}:${v.id}`} value={v.id}>{v.id}</option>
                    ))}
                  </select>

                  <button
                    onClick={generateVoice}
                    disabled={!!busy}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--gradient-btn)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Synthesize Speech & Word Timings ?
                  </button>

                  {sb.scenes.some((s) => s.audioFile) && (
                    <span style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="pulse-dot" style={{ background: 'var(--emerald)' }} />
                      Voiceover & word timings ready
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Step 4: Render */}
            {sb && (
              <section style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-card)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'var(--violet)',
                      color: '#FFF',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>STEP 04</span>
                    <h3 className="display-font" style={{ margin: 0, fontSize: 17 }}>On-Device Render & Download</h3>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Browser Canvas + MediaRecorder</span>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => render('draft')}
                    disabled={!!busy}
                    style={{
                      padding: '11px 20px',
                      borderRadius: 10,
                      border: '1px solid var(--border-strong)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ? Draft Render (Fast, Half-Res)
                  </button>

                  <button
                    onClick={() => render('final')}
                    disabled={!!busy}
                    style={{
                      padding: '11px 24px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--gradient-btn)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 18px rgba(124, 58, 237, 0.35)',
                    }}
                  >
                    ? Master Render (Full 1080p)
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 6 }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Download Format</label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                      style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
                    >
                      <option value="mp4">MP4 (H.264) — recommended</option>
                      <option value="webm">WebM (VP9) — smaller file</option>
                    </select>
                  </div>

                  {busy && (
                    <span style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>
                      {busy}
                    </span>
                  )}
                </div>

                {renderProgress && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ width: `${renderProgress.percent}%`, height: '100%', background: 'var(--gradient-btn)', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: renderProgress.phase === 'done' ? 'var(--emerald)' : 'var(--text2)', fontWeight: 600 }}>
                      <span>On-device {renderProgress.phase === 'encoding' ? 'MP4 conversion' : 'render'}: {renderProgress.percent}%</span>
                      <span>Runs entirely in your browser</span>
                    </div>
                  </div>
                )}

                {deviceVideoUrl && (
                  <div style={{ marginTop: 20 }}>
                    <video controls src={deviceVideoUrl} style={{ width: '100%', borderRadius: 14, border: '1px solid var(--border)', background: '#000', boxShadow: 'var(--shadow-card)' }} />
                    <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text2)' }}>
                      This file was generated and downloaded on your device. The server never processed the video.
                    </p>
                  </div>
                )}
              </section>
            )}

          </div>
        )}

      </div>

      {/* Cross-Device Folder Picker Modal */}
      <FolderPickerModal
        isOpen={pickerOpen}
        initialPath={exportDir}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => setExportDir(path)}
      />

    </div>
  );
}





















