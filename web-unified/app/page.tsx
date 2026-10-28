'use client';

import React, { useState, useEffect } from 'react';
import { StoryboardProject, BrandKit, ViralClip } from '@/lib/types';
import { INITIAL_PROJECT, DEFAULT_BRAND_KIT } from '@/lib/mock-data';
import { loadProjectFromStorage } from '@/lib/storage';
import Header from '@/components/Header';
import TabGenerate from '@/components/TabGenerate';
import TabAutoClip from '@/components/TabAutoClip';
import TabEditor from '@/components/TabEditor';
import SettingsModal from '@/components/SettingsModal';
import { playSFX } from '@/lib/audio-tts';
import { Film, Scissors, Layers } from 'lucide-react';

export default function WorkstationPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'autoclip' | 'editor'>('generate');
  const [project, setProject] = useState<StoryboardProject>(() => {
    if (typeof window !== 'undefined') {
      const saved = loadProjectFromStorage();
      if (saved && saved.scenes && saved.scenes.length > 0) {
        return saved;
      }
    }
    return INITIAL_PROJECT;
  });
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Transition handler from Auto-Clip to Pro Editor
  const handleSendClipToEditor = (clip: ViralClip) => {
    const clipScene = {
      id: `sc_clip_${clip.id}`,
      title: clip.title,
      headline: clip.headline,
      duration: clip.duration,
      animation: 'kinetic' as const,
      voiceover: clip.suggestedCaption,
      words: [{ word: clip.headline, start: 0, end: clip.duration }],
      stykAction: (clip.stykReaction === 'Mind Blown' ? 'shocked' : 'jump') as StoryboardProject['scenes'][0]['stykAction'],
      stykFacing: 'right' as const,
      stykPosition: [200, 320] as [number, number],
      stykStyle: 'comic_pop' as const,
      expression: 'happy' as const,
      infographic: 'metric_counter' as const,
      infographicData: {
        label: 'VIRAL HOOK',
        value: `${clip.viralScore}/100`,
      },
      props: ['lightbulb'],
      captionStyle: 'karaoke' as const,
    };

    setProject({
      ...project,
      title: clip.title,
      durationTotal: clip.duration,
      aspectRatio: clip.aspectRatio,
      scenes: [clipScene],
    });

    setActiveTab('editor');
    playSFX('ding');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0D14] text-white overflow-hidden font-sans select-none antialiased">
      {/* Global Header with 3-Tab Controller */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          playSFX('pop');
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          playSFX('pop');
        }}
        onQuickExport={() => {
          setActiveTab('generate');
          playSFX('whoosh');
        }}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden relative no-scrollbar">
        {activeTab === 'generate' && (
          <TabGenerate
            project={project}
            onUpdateProject={setProject}
            onSendToEditor={() => {
              setActiveTab('editor');
              playSFX('pop');
            }}
          />
        )}

        {activeTab === 'autoclip' && (
          <TabAutoClip onSendToEditor={handleSendClipToEditor} />
        )}

        {activeTab === 'editor' && (
          <TabEditor
            project={project}
            onUpdateProject={setProject}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (< 640px) */}
      <nav className="sm:hidden h-12 border-t border-neutral-800 bg-[#0B0F17] flex items-center justify-around px-2 shrink-0 z-40">
        <button
          onClick={() => {
            setActiveTab('generate');
            playSFX('pop');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'generate' ? 'text-violet-400' : 'text-neutral-500'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Generate</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('autoclip');
            playSFX('pop');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'autoclip' ? 'text-cyan-400' : 'text-neutral-500'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Auto-Clip</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('editor');
            playSFX('pop');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
            activeTab === 'editor' ? 'text-rose-400' : 'text-neutral-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Editor</span>
        </button>
      </nav>

      {/* Workstation Settings & Brand Kit Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        brandKit={brandKit}
        onUpdateBrandKit={setBrandKit}
      />
    </div>
  );
}
