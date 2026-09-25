import React, { useState } from 'react';

const faqs = [
  ['What kinds of brand videos can I make?', 'Create product launches, feature spotlights, explainers, social ads, app intros, and customer stories in landscape, vertical, or square formats.'],
  ['Do I need an API key?', 'No. A free lightweight storyboard mode is available. For richer AI blueprints or batch projects, bring a Groq or Gemini key.'],
  ['What resolution and lengths are supported?', 'Draft renders are fast and suitable for review. Final renders are 1080p MP4; keep clips concise and scene-driven for the best result.'],
  ['How do I make a brand video?', 'Upload your logo or product image, identify the brand color, write a clear benefit-led prompt, generate a storyboard, synthesize voiceover, then render draft or final.'],
  ['Can I use Cortexi for free?', 'Yes. Free daily limits protect shared capacity. Batch work requires your own provider key and is subject to provider quotas.'],
  ['Where can I find a free API key?', 'Create an account with Groq or Google AI Studio, choose a free tier model, create a secret key, and paste it in the API field. Never commit keys to source control.'],
];
export function FaqView() { const [open,setOpen]=useState(0); return <section style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:24}}><h2 className="display-font" style={{margin:'0 0 6px',fontSize:20}}>Cortexi FAQ</h2><p style={{color:'var(--text2)',margin:'0 0 18px'}}>Answers about creating, rendering, and publishing your brand video.</p>{faqs.map(([q,a],i)=><div key={q} style={{borderTop:'1px solid var(--border)'}}><button onClick={()=>setOpen(open===i?-1:i)} style={{width:'100%',padding:'16px 0',background:'none',border:0,color:'var(--text)',textAlign:'left',cursor:'pointer',fontWeight:600}}>{q}<span style={{float:'right'}}>{open===i?'−':'+'}</span></button>{open===i&&<p style={{color:'var(--text2)',padding:'0 0 16px',margin:0}}>{a}</p>}</div>)}</section>; }
export function AdSlot({ provider }: { provider: 'Adsterra'|'Monetag' }) { return <aside data-ad-provider={provider} aria-label={`${provider} advertisement`} style={{minHeight:90,border:'1px dashed var(--border-strong)',borderRadius:12,padding:14,color:'var(--text3)',fontSize:11,textAlign:'center'}}>Advertisement · {provider} script loads here when approved</aside>; }
