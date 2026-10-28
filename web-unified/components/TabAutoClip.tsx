'use client';

import React, { useState } from 'react';
import { ViralClip, AspectRatio, StykAction } from '@/lib/types';
import { INITIAL_VIRAL_CLIPS } from '@/lib/mock-data';
import StykCanvas from './StykCanvas';
import StyleMixSelector from './StyleMixSelector';
import { playSFX } from '@/lib/audio-tts';
import {
  Scissors,
  Sparkles,
  Upload,
  Play,
  TrendingUp,
  Download,
  Flame,
  Layers,
  ChevronDown,
  Check,
  Filter,
} from 'lucide-react';

interface TabAutoClipProps {
  onSendToEditor: (clip: ViralClip) => void;
}

export default function TabAutoClip({ onSendToEditor }: TabAutoClipProps) {
  const [clips, setClips] = useState<ViralClip[]>(INITIAL_VIRAL_CLIPS);
  const [selectedClipId, setSelectedClipId] = useState<string>(clips[0]?.id || '');
  const [captionFont, setCaptionFont] = useState<'Inter' | 'Space G.' | 'JetBrains'>('Space G.');
  const [captionPreset, setCaptionPreset] = useState<'word-highlight' | 'bounce' | 'typewriter'>('word-highlight');
  const [captionColor, setCaptionColor] = useState<string>('#00F0FF');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isIngestExpanded, setIsIngestExpanded] = useState(false);
  const [subView, setSubView] = useState<'clips' | 'preview'>('clips');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0];

  const getReactionAction = (reaction: ViralClip['stykReaction']): StykAction => {
    switch (reaction) {
      case 'Mind Blown':
        return 'shocked';
      case 'Hyped Jump':
        return 'jump';
      case 'Facepalm':
        return 'scratch_head';
      case 'Pointing Alert':
        return 'point';
      case 'Skeptical Look':
      default:
        return 'idle';
    }
  };

  const handleSimulateScan = () => {
    setIsAnalyzing(true);
    playSFX('whoosh');

    setTimeout(() => {
      const newClip: ViralClip = {
        id: `clip_${Date.now()}`,
        title: 'The Dopamine Trap Unlocked',
        startTime: 12.0,
        endTime: 20.0,
        duration: 8.0,
        viralScore: 96,
        criteria: {
          hook: 98,
          flow: 94,
          value: 96,
          trend: 95,
          share: 97,
        },
        hookQuote: '"Why scrolling steals your focus before you wake up."',
        stykReaction: 'Mind Blown',
        suggestedCaption: 'THE 5-MINUTE DOPAMINE HACK FOR HIGH PERFORMERS ⚡',
        headline: 'Neurochemical Focus Reset',
        aspectRatio: '9:16',
      };
      setClips([newClip, ...clips]);
      setSelectedClipId(newClip.id);
      setIsAnalyzing(false);
      setIsIngestExpanded(false);
      playSFX('ding');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#0A0D14]">
      {/* Mobile/Tablet Subview Toggle (< 1200px) */}
      <div className="xl:hidden flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <button
            onClick={() => setSubView('clips')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
              subView === 'clips' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ranked Clips ({clips.length})</span>
          </button>
          <button
            onClick={() => setSubView('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
              subView === 'preview' ? 'bg-violet-600 text-white font-bold' : 'text-neutral-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Style & Stage</span>
          </button>
        </div>

        <button
          onClick={() => onSendToEditor(selectedClip)}
          className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
        >
          Send to Editor
        </button>
      </div>

      {/* Left Ingest & Ranked Clips Section */}
      <div
        className={`w-full xl:w-[460px] 2xl:w-[500px] border-r border-neutral-800 flex flex-col p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar shrink-0 ${
          subView === 'preview' ? 'hidden xl:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Auto-Clip Repurposing</h2>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">Scan 60fps</span>
        </div>

        {/* Ingest Accordion Drawer */}
        <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 overflow-hidden">
          <button
            onClick={() => setIsIngestExpanded(!isIngestExpanded)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-neutral-850 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">Ingest Source Media / URL</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isIngestExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isIngestExpanded && (
            <div className="p-3.5 pt-0 space-y-3 border-t border-neutral-800/60">
              <div
                onClick={handleSimulateScan}
                className="border-2 border-dashed border-neutral-700 hover:border-cyan-400/60 rounded-lg p-4 text-center bg-black/40 hover:bg-black/70 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-white">Drop MP4, MOV, or Paste YouTube URL</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Scans transcript & audio energy peaks</div>
              </div>

              <button
                onClick={handleSimulateScan}
                disabled={isAnalyzing}
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Scanning Energy Peaks...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    <span>Scan for Viral Hooks</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Ranked Clips List */}
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Ranked Viral Moments ({clips.length})
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Sorted by Hook Score</span>
          </div>

          {clips.map((clip) => {
            const isSelected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                onClick={() => {
                  setSelectedClipId(clip.id);
                  setSubView('preview');
                  playSFX('pop');
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 border-cyan-400 ring-1 ring-cyan-400/40 shadow'
                    : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-white line-clamp-1">{clip.title}</h4>
                    <p className="text-[11px] text-neutral-400 italic line-clamp-1 mt-0.5">
                      {clip.hookQuote}
                    </p>
                  </div>

                  {/* Circular Score Ring */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 rounded-full border-2 border-emerald-400 flex items-center justify-center bg-emerald-950/30 font-black text-xs text-emerald-300">
                      {clip.viralScore}
                    </div>
                    <span className="text-[8px] text-neutral-400 uppercase font-mono mt-0.5">VIRAL</span>
                  </div>
                </div>

                {/* 5-Criterion Bar Breakdown */}
                <div className="grid grid-cols-5 gap-1.5 pt-2 mt-2 border-t border-neutral-800 text-[9px] font-mono">
                  {Object.entries(clip.criteria).map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <div className="flex justify-between text-neutral-400">
                        <span className="uppercase text-[8px]">{key.slice(0, 3)}</span>
                        <span>{val}</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stickman Reaction Tag */}
                <div className="flex items-center justify-between pt-2 mt-1.5">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-800/40 font-mono">
                    Styk Reaction: {clip.stykReaction}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {clip.duration}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Stage & Styler Section (Flex-1) */}
      <div
        className={`flex-1 flex flex-col p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar ${
          subView === 'clips' ? 'hidden xl:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" />
              Style Viral Clip · {selectedClip.headline}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              9:16 vertical reframe with reactive stickman overlay & burned-in typography
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSendToEditor(selectedClip);
                playSFX('whoosh');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-semibold border border-neutral-700"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send to Editor</span>
            </button>

            <button
              onClick={() => {
                playSFX('ding');
                alert(`Exporting Viral Clip: "${selectedClip.title}" to device...`);
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/25"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 2-Column Split inside Style Section */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Canvas Stage */}
          <div className="flex items-center justify-center bg-black/60 rounded-xl border border-neutral-800 p-2 min-h-[380px]">
            <StykCanvas
              aspectRatio="9:16"
              action={getReactionAction(selectedClip.stykReaction)}
              style="comic_pop"
              expression={selectedClip.stykReaction === 'Mind Blown' ? 'shocked' : 'happy'}
              facing="right"
              propsList={['lightbulb']}
              captionText={selectedClip.suggestedCaption}
              captionStyle="karaoke"
              durationSec={selectedClip.duration}
              currentTimeSec={1.5}
              isPlaying={true}
              interactiveIK={true}
            />
          </div>

          {/* Styler Drawer Controls */}
          <div className="space-y-3.5 p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Hook Headline
              </label>
              <input
                type="text"
                value={selectedClip.headline}
                onChange={(e) => {
                  const updated = clips.map((c) =>
                    c.id === selectedClip.id ? { ...c, headline: e.target.value } : c
                  );
                  setClips(updated);
                }}
                className="w-full px-3 py-1.5 bg-black border border-neutral-800 rounded text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Burned-in Caption Script
              </label>
              <textarea
                value={selectedClip.suggestedCaption}
                onChange={(e) => {
                  const updated = clips.map((c) =>
                    c.id === selectedClip.id ? { ...c, suggestedCaption: e.target.value } : c
                  );
                  setClips(updated);
                }}
                rows={3}
                className="w-full p-2 bg-black border border-neutral-800 rounded text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Font
                </label>
                <select
                  value={captionFont}
                  onChange={(e) => setCaptionFont(e.target.value as 'Inter' | 'Space G.' | 'JetBrains')}
                  className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                >
                  <option value="Space G.">Space Grotesk</option>
                  <option value="Inter">Inter Tight</option>
                  <option value="JetBrains">JetBrains Mono</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Animation Preset
                </label>
                <select
                  value={captionPreset}
                  onChange={(e) => setCaptionPreset(e.target.value as 'word-highlight' | 'bounce' | 'typewriter')}
                  className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                >
                  <option value="word-highlight">Word Karaoke</option>
                  <option value="bounce">Kinetic Bounce</option>
                  <option value="typewriter">Typewriter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Accent Highlight Color
              </label>
              <div className="flex items-center gap-2.5">
                {['#00F0FF', '#FF007F', '#F59E0B', '#10B981', '#FFFFFF'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setCaptionColor(color)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      borderColor: captionColor === color ? '#FFFFFF' : 'transparent',
                    }}
                  >
                    {captionColor === color && <Check className="w-3 h-3 text-black" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <StyleMixSelector selectedStyles={selectedStyles} onChange={setSelectedStyles} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
