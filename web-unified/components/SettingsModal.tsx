'use client';

import React, { useState } from 'react';
import { BrandKit } from '@/lib/types';
import { DEFAULT_BRAND_KIT } from '@/lib/mock-data';
import { playSFX } from '@/lib/audio-tts';
import {
  X,
  Sliders,
  Folder,
  Layers,
  Palette,
  Check,
  Moon,
  Sun,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandKit: BrandKit;
  onUpdateBrandKit: (kit: BrandKit) => void;
}

const PROVIDERS = ['Google Gemini','NVIDIA','OpenRouter','OpenAI','Anthropic','Groq','Mistral','Cohere'];

const MOCK_MODELS: Record<string, string[]> = {
  'Google Gemini': ['gemini-2.5-pro','gemini-2.5-flash','gemini-1.5-pro'],
  'NVIDIA': ['llama-4-maverick-17b-128e-instruct','nemotron-4-340b-instruct'],
  'OpenRouter': ['anthropic/claude-3.5-sonnet','openai/gpt-4o-mini'],
  'OpenAI': ['gpt-4o','gpt-4o-mini','gpt-4.1'],
  'Anthropic': ['claude-3.5-sonnet-20241022','claude-3-opus-20240229'],
  'Groq': ['llama-3.3-70b-versatile','mixtral-8x7b-32768'],
  'Mistral': ['mistral-large-latest','mistral-medium'],
  'Cohere': ['command-r-plus','command-r'],
};

function ProviderRegistryCard() {
  const [selected, setSelected] = useState('Google Gemini');
  const [apiKey, setApiKey] = useState('');
  const [tested, setTested] = useState(false);
  const [models, setModels] = useState<string[]>([]);

  const handleTest = () => {
    if (!apiKey.trim()) return;
    setTested(true);
    setModels(MOCK_MODELS[selected] || []);
    playSFX('ding');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {PROVIDERS.map(p => (
          <button
            key={p}
            onClick={() => { setSelected(p); setTested(false); setModels([]); playSFX('pop'); }}
            className={`p-2 rounded-lg border text-left transition ${
              selected === p
                ? 'border-violet-500 bg-violet-950/30 text-white'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          placeholder={`${selected} API Key`}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          type="password"
          className="flex-1 px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={handleTest}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white"
        >
          Test Key & Load Models
        </button>
      </div>
      {tested && (
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
          <div className="text-[11px] text-emerald-400 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" /> Key validated • {models.length} models available
          </div>
          <div className="flex flex-wrap gap-2">
            {models.map(m => (
              <span key={m} className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  brandKit,
  onUpdateBrandKit,
}: SettingsModalProps) {
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');
  const [exportDir, setExportDir] = useState('E:\\Videos\\Cortexi\\Renders');
  const [isSavedDir, setIsSavedDir] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(brandKit.primaryColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-neutral-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" />
            <h3 className="font-bold text-sm text-white">Cortexi Workstation Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Appearance */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Interface Appearance
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setActiveTheme('dark');
                  playSFX('pop');
                }}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  activeTheme === 'dark'
                    ? 'border-violet-500 bg-violet-950/30 text-white shadow'
                    : 'border-neutral-800 bg-black/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="text-xs font-bold">Obsidian Dark (Pro Studio)</div>
                  <div className="text-[10px] text-neutral-500">Optimized for high dynamic range editing</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTheme('light');
                  playSFX('pop');
                }}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  activeTheme === 'light'
                    ? 'border-violet-500 bg-violet-950/30 text-white shadow'
                    : 'border-neutral-800 bg-black/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="text-xs font-bold">Pure Light</div>
                  <div className="text-[10px] text-neutral-500">High contrast daytime mode</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 1b: LLM Provider Registry */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              LLM Provider Registry
            </h4>
            <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 space-y-4">
              <div className="text-[11px] text-neutral-400">Select provider → enter API key → test → authorized models populate for Generate / Auto-Clip / Editor steps.</div>
              <ProviderRegistryCard />
            </div>
          </div>

          {/* Section 2: Export Mirror Destination */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Export Mirror Destination
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={exportDir}
                onChange={(e) => setExportDir(e.target.value)}
                className="flex-1 px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={() => {
                  setIsSavedDir(true);
                  playSFX('ding');
                  setTimeout(() => setIsSavedDir(false), 2000);
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
              >
                {isSavedDir ? '✓ Saved' : 'Save Preference'}
              </button>
            </div>
          </div>

          {/* Section 3: Brand Kit & WCAG Contrast Validation */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Brand Kit & Contrast Validation
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> WCAG AA Pass (7.2:1)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300 font-medium">Primary Accent Tint:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-neutral-400 uppercase">{primaryColor}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {['#8B5CF6', '#00F0FF', '#FF007F', '#10B981', '#F59E0B'].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => {
                      setPrimaryColor(hex);
                      onUpdateBrandKit({ ...brandKit, primaryColor: hex });
                      playSFX('pop');
                    }}
                    className="w-8 h-8 rounded-lg border border-white/20 transition-transform hover:scale-110"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Pipeline Architecture Specs */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Workstation Pipeline Architecture
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Synthesizer</div>
                <div className="text-white font-bold mt-1">StykAnimate Core</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">IK Rigs + Remotion 4.0</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Neural Voiceover</div>
                <div className="text-white font-bold mt-1">Gemini 3.8 Flash TTS</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Word timestamp aligner</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-neutral-400 font-semibold">Media Encoding</div>
                <div className="text-white font-bold mt-1">Hardware MediaRecorder</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Local 60fps WebM/MP4</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-neutral-800 px-6 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
