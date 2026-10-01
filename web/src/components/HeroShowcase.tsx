import { EXAMPLES, type Example } from '../examples.js';

import React, { useState } from 'react';


export function HeroShowcase({ onSelectRecipe }: { onSelectRecipe: (prompt: string, aspect: any) => void }) {
  const [active, setActive] = useState<Example | null>(null);
  const pick = (ex: Example, useSuper = false) => { onSelectRecipe(useSuper ? ex.superPrompt : ex.prompt, ex.aspect); setActive(null); };
  return (
    <section style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.2),transparent 70%),var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--violet)' }}>Studio Output Showcase</div><h2 className="display-font" style={{ margin: '4px 0 0', fontSize: 20 }}>What Cortexi produces in 1 click</h2></div>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Click an example to clone its recipe</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {EXAMPLES.map(ex => (
          <article key={ex.id} onClick={() => onSelectRecipe(ex.prompt, ex.aspect)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <img src={ex.posterSrc} alt={ex.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={e => { e.stopPropagation(); setActive(ex); }} style={{ position: 'absolute', right: 10, bottom: 10, padding: '6px 12px', border: 0, borderRadius: 8, background: 'rgba(0,0,0,.78)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>▶ Watch</button>
              <span style={{ position: 'absolute', left: 10, top: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,.68)', color: 'var(--amber)', fontSize: 10, fontWeight: 700 }}>{ex.badge}</span>
              <span style={{ position: 'absolute', right: 10, top: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,.68)', color: '#fff', fontSize: 10, fontWeight: 700 }}>{ex.duration}</span>
            </div>
            <div style={{ padding: 14 }}><div style={{ fontWeight: 600, marginBottom: 4 }}>{ex.title}</div><p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{ex.prompt}</p><div style={{ marginTop: 10, fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>Load this recipe →</div></div>
          </article>
        ))}
      </div>
      {active && <div onClick={() => setActive(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(10px)' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 780, padding: 20, borderRadius: 16, border: '1px solid var(--border-strong)', background: 'var(--surface)', boxShadow: 'var(--shadow-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><div><h3 className="display-font" style={{ margin: 0, fontSize: 18 }}>{active.title}</h3><span style={{ fontSize: 12, color: 'var(--text2)' }}>{active.badge} · {active.aspect} · {active.duration}</span></div><button onClick={() => setActive(null)} style={{ border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, background: 'var(--input-bg)', color: 'var(--text)', cursor: 'pointer' }}>x</button></div>
          {/* WebM first, MP4 as a source fallback. Browsers pick the first they can play,
        so modern engines get the smaller VP9 file and older Safari falls back. */}
        <video controls autoPlay poster={active.posterSrc} style={{ width: '100%', maxHeight: '60vh', borderRadius: 10, background: '#000' }}>
          <source src={active.videoSrc} type="video/webm" />
          <source src={active.videoFallbackSrc} type="video/mp4" />
        </video>
          <details className="super-prompt-source">
            <summary>The super prompt behind this video</summary>
            <p>{active.superPrompt}</p>
          </details>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => pick(active)} className="secondary">Use short prompt</button>
            <button onClick={() => pick(active, true)} style={{ padding: '8px 18px', border: 0, borderRadius: 8, background: 'var(--gradient-btn)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Use super prompt</button>
          </div>
        </div>
      </div>}
    </section>
  );
}


