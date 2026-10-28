'use client';

import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { playSFX } from '@/lib/audio-tts';

export type StyleGroup = 'Simple Animations' | 'Film & Cinematic' | 'Explainers & Collage';

export interface StyleOption {
  id: string;
  name: string;
  group: StyleGroup;
  modules: string[];
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  // Simple Animations
  { id: 'stickman_ik', name: 'Stickman IK', group: 'Simple Animations', modules: ['Character'], description: '2D stick figure with inverse kinematics' },
  { id: 'stickman_whiteboard', name: 'Stickman Whiteboard', group: 'Simple Animations', modules: ['Character','Asset'], description: 'Sketch animation' },
  { id: 'stickman_motion', name: 'Stickman Motion', group: 'Simple Animations', modules: ['Character','Camera'], description: 'Pose-to-pose' },
  { id: 'hyper_frames', name: 'Hyper Frames', group: 'Simple Animations', modules: ['Camera','Transition'], description: 'Fast dynamic frames' },
  { id: 'ui_infographics', name: 'UI Infographics', group: 'Simple Animations', modules: ['Overlay'], description: 'Data viz overlays' },
  
  // Film & Cinematic
  { id: 'cinematic_flow', name: 'Cinematic Flow', group: 'Film & Cinematic', modules: ['Camera','Transition'], description: 'Film motion continuous take' },
  { id: 'one_take', name: 'One Take', group: 'Film & Cinematic', modules: ['Camera','Transition'], description: 'Single shot camera motion' },
  { id: 'watercolor', name: 'Watercolor Brush', group: 'Film & Cinematic', modules: ['Asset'], description: 'Painted frames' },

  // Explainers & Collage
  { id: 'storybook_collage', name: 'Storybook Collage', group: 'Explainers & Collage', modules: ['Asset','Overlay'], description: 'Paper collage explainer' },
  { id: 'whiteboard_explainer', name: 'Whiteboard Explainer', group: 'Explainers & Collage', modules: ['Character','Asset'], description: 'Whiteboard drawing' },
];

export default function StyleMixSelector({
  selectedStyles,
  onChange,
  max = 3,
}: {
  selectedStyles: string[];
  onChange: (styles: string[]) => void;
  max?: number;
}) {
  const [expandedGroup, setExpandedGroup] = useState<StyleGroup | 'all'>('all');

  const toggleStyle = (id: string) => {
    let next: string[];
    if (selectedStyles.includes(id)) {
      next = selectedStyles.filter(s => s !== id);
    } else {
      if (selectedStyles.length >= max) {
        // replace oldest
        next = [...selectedStyles.slice(1), id];
      } else {
        next = [...selectedStyles, id];
      }
    }
    playSFX('pop');
    onChange(next);
  };

  const groups: StyleGroup[] = ['Simple Animations','Film & Cinematic','Explainers & Collage'];

  const filteredOptions = expandedGroup === 'all' 
    ? STYLE_OPTIONS 
    : STYLE_OPTIONS.filter(s => s.group === expandedGroup);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
          Style Mix
        </label>
        <span className="text-[10px] text-neutral-500">{selectedStyles.length}/{max} selected</span>
      </div>

      <div className="flex gap-1.5 mb-2">
        <button
          onClick={() => setExpandedGroup('all')}
          className={`px-2 py-1 rounded-md text-[11px] ${expandedGroup==='all' ? 'bg-violet-600 text-white' : 'bg-neutral-900 text-neutral-300'}`}
        >
          All
        </button>
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setExpandedGroup(g)}
            className={`px-2 py-1 rounded-md text-[11px] ${expandedGroup===g ? 'bg-violet-600 text-white' : 'bg-neutral-900 text-neutral-300'}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
        {filteredOptions.map(opt => {
          const active = selectedStyles.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleStyle(opt.id)}
              className={`text-left p-3 rounded-lg border transition ${
                active 
                  ? 'border-violet-500 bg-violet-950/30' 
                  : 'border-neutral-800 bg-black/40 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {opt.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{opt.description}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{opt.modules.join(' • ')}</div>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${active ? 'bg-violet-600 border-violet-500' : 'border-neutral-700'}`}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-neutral-500">
        Selected: {selectedStyles.length === 0 ? 'None – single style will use default Stickman style' : selectedStyles.map(id => STYLE_OPTIONS.find(s=>s.id===id)?.name).join(', ')}
      </div>
    </div>
  );
}
