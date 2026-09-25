import React, { useState } from 'react';

type Example = { id: string; title: string; badge: string; aspect: string; duration: string; videoSrc: string; posterSrc: string; prompt: string };
const EXAMPLES: Example[] = [
  { id: 'brand-launch', title: 'Aurora Coffee Club', badge: 'Brand Launch', aspect: '16:9', duration: '7s', videoSrc: '/examples/brand-launch.mp4', posterSrc: '/examples/brand-launch.jpg', prompt: 'An explainer video for a coffee subscription brand that delivers fresh beans weekly' },
  { id: 'product-explainer', title: 'NovaFit Pocket Coach', badge: 'Product Tour', aspect: '16:9', duration: '39s', videoSrc: '/examples/product-explainer.mp4', posterSrc: '/examples/product-explainer.jpg', prompt: 'A bold, punchy product video introducing an AI-adaptive workout app with real-time rep tracking' },
  { id: 'feature-spotlight', title: 'Vesper Micro-SaaS', badge: 'Feature Spotlight', aspect: '16:9', duration: '10s', videoSrc: '/examples/feature-spotlight.mp4', posterSrc: '/examples/feature-spotlight.jpg', prompt: 'A sleek, modern SaaS promo showcasing instant database sync and offline-first workflows' },
];

export function HeroShowcase({ onSelectRecipe }: { onSelectRecipe: (prompt: string, aspect: any) => void }) {
  const [active, setActive] = useState<Example | null>(null);
  const pick = (ex: Example) => { onSelectRecipe(ex.prompt, ex.aspect); setActive(null); };
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><div><h3 className="display-font" style={{ margin: 0, fontSize: 18 }}>{active.title}</h3><span style={{ fontSize: 12, color: 'var(--text2)' }}>Remotion + Edge-TTS showcase</span></div><button onClick={() => setActive(null)} style={{ border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, background: 'var(--input-bg)', color: 'var(--text)', cursor: 'pointer' }}>✕</button></div>
          <video controls autoPlay src={active.videoSrc} style={{ width: '100%', maxHeight: '60vh', borderRadius: 10, background: '#000' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><button onClick={() => pick(active)} style={{ padding: '8px 18px', border: 0, borderRadius: 8, background: 'var(--gradient-btn)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Use this prompt in Studio</button></div>
        </div>
      </div>}
    </section>
  );
}
