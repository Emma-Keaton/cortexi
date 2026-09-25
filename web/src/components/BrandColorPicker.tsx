import React, { useRef, useState } from 'react';

export function BrandColorPicker({ onPick }: { onPick: (color: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState('#7C3AED');
  const pick = (value: string) => { setColor(value); onPick(value); };
  const extract = (file: File) => {
    const img = new Image(); img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.drawImage(img, 0, 0, 64, 64); const data = ctx.getImageData(0, 0, 64, 64).data;
      const counts = new Map<string, number>();
      for (let i = 0; i < data.length; i += 16) { const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3]; if(a<180) continue; const hex=[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(); counts.set(hex,(counts.get(hex)??0)+1); }
      const best=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]; if (best) pick(`#${best}`);
    }; img.src = URL.createObjectURL(file);
  };
  return <section className="brand-colors" aria-label="Brand color identification"><div><h3>Identify brand colors</h3><p>Upload a logo or product photo. Cortexi samples it locally and extracts a dominant color.</p></div><div className="brand-color-actions"><input type="color" value={color} onChange={e=>pick(e.target.value)} aria-label="Brand color picker"/><input ref={input} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&extract(e.target.files[0])}/><button onClick={()=>input.current?.click()}>Analyze asset</button><code>{color}</code></div></section>;
}
