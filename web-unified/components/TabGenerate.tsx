'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  StoryboardProject,
  StoryboardScene,
  StykAction,
  StykExpression,
  StykStyle,
  AspectRatio,
  CaptionStyle,
  InfographicType,
} from '@/lib/types';
import { SUPER_PROMPT_RECIPES } from '@/lib/mock-data';
import { calculateWordTimestamps, speakVoiceover, playSFX } from '@/lib/audio-tts';
import StykCanvas from './StykCanvas';
import StyleMixSelector from './StyleMixSelector';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Download,
  Plus,
  Trash2,
  Clock,
  Wand2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  MonitorPlay,
  Film,
} from 'lucide-react';

interface TabGenerateProps {
  project: StoryboardProject;
  onUpdateProject: (updated: StoryboardProject) => void;
  onSendToEditor: () => void;
}

export default function TabGenerate({
  project,
  onUpdateProject,
  onSendToEditor,
}: TabGenerateProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [promptInput, setPromptInput] = useState(project.prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isRecipesExpanded, setIsRecipesExpanded] = useState(false);
  const [mobileView, setMobileView] = useState<'blueprint' | 'stage'>('blueprint');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Scene Inspector Tab inside Step 2
  const [sceneInspectorTab, setSceneInspectorTab] = useState<'actor' | 'infographic' | 'props'>('actor');

  // Preview & Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Render & Export State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  // Continuous playback tick
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.05;
          if (next >= project.durationTotal) {
            return 0; // loop
          }
          return next;
        });
      }, 50);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, project.durationTotal]);

  // Derive current scene index dynamically from currentTime
  let accumulatedTime = 0;
  let dynamicSceneIndex = 0;
  for (let i = 0; i < project.scenes.length; i++) {
    accumulatedTime += project.scenes[i].duration;
    if (currentTime <= accumulatedTime) {
      dynamicSceneIndex = i;
      break;
    }
  }

  const effectiveSceneIndex = isPlaying ? dynamicSceneIndex : selectedSceneIndex;
  const currentScene = project.scenes[effectiveSceneIndex] || project.scenes[0];

  // AI Storyboard Generator API call
  const handleGenerateAI = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    playSFX('whoosh');

    try {
      const res = await fetch('/api/gemini/generate-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          mode: project.mode,
          format: project.format,
          duration: project.durationTotal,
          aspectRatio: project.aspectRatio,
          style: currentScene?.stykStyle || 'comic_pop',
        }),
      });

      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

      if (data.scenes && Array.isArray(data.scenes)) {
        let currentOffset = 0;
        const newScenes: StoryboardScene[] = data.scenes.map((s: Record<string, unknown>, idx: number) => {
          const dur = Number(s.duration) || 5;
          const vo = String(s.voiceover || '');
          const words = calculateWordTimestamps(vo, dur, currentOffset);
          currentOffset += dur;

          return {
            id: `sc_${Date.now()}_${idx}`,
            title: String(s.title || `Scene 0${idx + 1}`),
            headline: String(s.headline || ''),
            duration: dur,
            animation: (s.animation as StoryboardScene['animation']) || 'fade-up',
            voiceover: vo,
            words,
            stykAction: (s.stykAction as StykAction) || 'walk',
            stykFacing: (s.stykFacing as 'left' | 'right') || 'right',
            stykPosition: [200, 320],
            stykStyle: currentScene?.stykStyle || 'comic_pop',
            expression: (s.expression as StykExpression) || 'neutral',
            infographic: (s.infographic as InfographicType) || 'none',
            infographicData: {
              label: String(s.infographicLabel || ''),
              value: String(s.infographicValue || ''),
            },
            props: Array.isArray(s.props) ? (s.props as string[]) : ['laptop'],
            captionStyle: (s.captionStyle as CaptionStyle) || 'karaoke',
          };
        });

        const totalDur = newScenes.reduce((a, b) => a + b.duration, 0);

        onUpdateProject({
          ...project,
          title: data.title || project.title,
          prompt: promptInput,
          durationTotal: totalDur,
          scenes: newScenes,
        });

        setActiveStep(2);
        playSFX('ding');
      }
    } catch (err) {
      console.error(err);
      playSFX('buzzer');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestVoice = () => {
    playSFX('pop');
    if (!currentScene) return;

    speakVoiceover(currentScene.voiceover, {
      rate: 1.05,
      pitch: 1.0,
      onWord: () => {},
      onEnd: () => {},
    });
  };

  const handleRenderVideo = async (isMaster: boolean) => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;

    setIsRendering(true);
    setRenderProgress(0);
    setRenderedVideoUrl(null);
    playSFX('whoosh');

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRenderedVideoUrl(url);
        setIsRendering(false);
        setRenderProgress(100);
        playSFX('ding');
      };

      recorder.start();

      setIsPlaying(true);
      setCurrentTime(0);

      const totalMs = project.durationTotal * 1000;
      const intervalMs = 100;
      let elapsed = 0;

      const progressInterval = setInterval(() => {
        elapsed += intervalMs;
        const pct = Math.min(99, Math.round((elapsed / totalMs) * 100));
        setRenderProgress(pct);

        if (elapsed >= totalMs) {
          clearInterval(progressInterval);
          setIsPlaying(false);
          recorder.stop();
        }
      }, intervalMs);
    } catch (err) {
      console.error('Render error:', err);
      setIsRendering(false);
      playSFX('buzzer');
    }
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#0A0D14]">
      {/* Mobile/Tablet View Switcher Bar (when screen is narrow) */}
      <div className="xl:hidden flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800">
          <button
            onClick={() => setMobileView('blueprint')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
              mobileView === 'blueprint' ? 'bg-violet-600 text-white' : 'text-neutral-400'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Blueprint & Scenes</span>
          </button>
          <button
            onClick={() => setMobileView('stage')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
              mobileView === 'stage' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Stage Preview</span>
          </button>
        </div>

        <button
          onClick={onSendToEditor}
          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
        >
          <span>Editor</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Left 60%: Wizard & Controls */}
      <div
        className={`flex-1 flex flex-col overflow-y-auto border-r border-neutral-800/80 p-4 sm:p-5 lg:p-6 space-y-5 no-scrollbar ${
          mobileView === 'stage' ? 'hidden xl:flex' : 'flex'
        }`}
      >
        {/* Step Rail Indicator - Clean Horizontal Stack */}
        <div className="grid grid-cols-4 gap-1.5 pb-2 border-b border-neutral-800 text-center">
          {[
            { num: 1, label: '01 Blueprint' },
            { num: 2, label: '02 Scenes' },
            { num: 3, label: '03 Voice & Sync' },
            { num: 4, label: '04 Render' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num as 1 | 2 | 3 | 4)}
              className={`p-2 rounded-lg transition-all border ${
                activeStep === s.num
                  ? 'border-violet-500 bg-violet-500/10 text-white font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="text-[11px] font-mono tracking-wider truncate">
                {s.label}
              </div>
            </button>
          ))}
        </div>

        {/* STEP 01: Intake & Blueprint */}
        {activeStep === 1 && (
          <div className="space-y-4">
            {/* Collapsible SuperPrompt Recipe Drawer */}
            <div className="rounded-xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
              <button
                onClick={() => setIsRecipesExpanded(!isRecipesExpanded)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-neutral-850 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-neutral-200">
                    Prompt Recipes & Templates ({SUPER_PROMPT_RECIPES.length})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span>{isRecipesExpanded ? 'Collapse' : 'Browse Presets'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRecipesExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isRecipesExpanded && (
                <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-neutral-800/60">
                  {SUPER_PROMPT_RECIPES.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPromptInput(r.prompt);
                        onUpdateProject({
                          ...project,
                          format: r.format,
                          aspectRatio: r.aspect,
                          durationTotal: r.duration,
                        });
                        setIsRecipesExpanded(false);
                        playSFX('pop');
                      }}
                      className="p-2.5 text-left rounded-lg bg-neutral-950/70 border border-neutral-800 hover:border-violet-500/50 hover:bg-violet-950/20 transition-all group"
                    >
                      <div className="font-semibold text-xs text-white group-hover:text-violet-300">
                        {r.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                        {r.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Input Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Describe Your Video Story
                </label>
                <span className="text-[10px] text-neutral-400 font-mono">Gemini 3.8 Flash</span>
              </div>

              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g. Explain why people procrastinate in 30 seconds using comic pop stickman and rising bar charts..."
                rows={3}
                className="w-full p-3 rounded-lg bg-black/60 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />

              {/* Stacked Compact Controls in Responsive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Intake Mode
                  </label>
                  <select
                    value={project.mode}
                    onChange={(e) => onUpdateProject({ ...project, mode: e.target.value as StoryboardProject['mode'] })}
                    className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Idea">Idea</option>
                    <option value="Script">Script</option>
                    <option value="URL">URL</option>
                    <option value="Document">Document</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={project.aspectRatio}
                    onChange={(e) => onUpdateProject({ ...project, aspectRatio: e.target.value as AspectRatio })}
                    className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="9:16">9:16 (Vertical Reel)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Duration
                  </label>
                  <select
                    value={project.durationTotal}
                    onChange={(e) => onUpdateProject({ ...project, durationTotal: Number(e.target.value) })}
                    className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-violet-500 font-mono"
                  >
                    <option value={15}>15s (Short)</option>
                    <option value={22}>22s (Standard)</option>
                    <option value={30}>30s (Explainer)</option>
                    <option value={45}>45s (Deep Dive)</option>
                    <option value={60}>60s (Long-form)</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <StyleMixSelector selectedStyles={selectedStyles} onChange={setSelectedStyles} />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !promptInput.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing Storyboard...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Storyboard & Rigs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 02: Storyboard Scenes - Streamlined & Decluttered */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  Storyboard: {project.title}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {project.scenes.length} Scenes · Runtime: {project.durationTotal}s
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newScene: StoryboardScene = {
                      id: `sc_${Date.now()}`,
                      title: `Scene 0${project.scenes.length + 1}`,
                      headline: 'New Action Sequence',
                      duration: 5,
                      animation: 'fade-up',
                      voiceover: 'And here is what happens next in our story.',
                      words: calculateWordTimestamps('And here is what happens next in our story.', 5, 0),
                      stykAction: 'walk',
                      stykFacing: 'right',
                      stykPosition: [200, 320],
                      stykStyle: currentScene?.stykStyle || 'comic_pop',
                      expression: 'happy',
                      infographic: 'none',
                      props: ['laptop'],
                      captionStyle: 'karaoke',
                    };
                    onUpdateProject({
                      ...project,
                      scenes: [...project.scenes, newScene],
                      durationTotal: project.durationTotal + 5,
                    });
                    playSFX('ding');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-medium border border-neutral-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Scene</span>
                </button>

                <button
                  onClick={() => setActiveStep(3)}
                  className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-bold shadow-md shadow-violet-600/20"
                >
                  Voiceover ▸
                </button>
              </div>
            </div>

            {/* Split View: Compact Scenes List on Left + Focused Scene Inspector on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compact Scene List Cards */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                  Select Scene to Inspect:
                </span>
                {project.scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    onClick={() => {
                      setSelectedSceneIndex(idx);
                      playSFX('pop');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedSceneIndex === idx
                        ? 'bg-neutral-900 border-violet-500 ring-1 ring-violet-500/40 shadow'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-mono text-[10px] font-bold">
                          SC 0{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white line-clamp-1">
                          {scene.headline || scene.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                        {scene.duration}s
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400 line-clamp-1 italic">
                      &ldquo;{scene.voiceover}&rdquo;
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/30">
                        {scene.stykAction}
                      </span>
                      {scene.infographic !== 'none' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/30">
                          {scene.infographic}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Scene Editor Drawer (Right Side of Step 2) */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400" />
                    Inspect Scene 0{selectedSceneIndex + 1}
                  </span>
                  {project.scenes.length > 1 && (
                    <button
                      onClick={() => {
                        const filtered = project.scenes.filter((_, i) => i !== selectedSceneIndex);
                        onUpdateProject({
                          ...project,
                          scenes: filtered,
                          durationTotal: filtered.reduce((a, b) => a + b.duration, 0),
                        });
                        setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1));
                        playSFX('buzzer');
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-tabs for clean layout stacking */}
                <div className="flex p-0.5 bg-black/50 rounded-lg border border-neutral-800 text-[10px] font-semibold">
                  {(['actor', 'infographic', 'props'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSceneInspectorTab(t)}
                      className={`flex-1 py-1 rounded capitalize ${
                        sceneInspectorTab === t ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Sub-tab 1: Actor & Action */}
                {sceneInspectorTab === 'actor' && (
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Headline Text</label>
                      <input
                        type="text"
                        value={currentScene.headline}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].headline = e.target.value;
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded font-semibold text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Styk Action</label>
                        <select
                          value={currentScene.stykAction}
                          onChange={(e) => {
                            const updated = [...project.scenes];
                            updated[selectedSceneIndex].stykAction = e.target.value as StykAction;
                            onUpdateProject({ ...project, scenes: updated });
                            playSFX('pop');
                          }}
                          className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                        >
                          <option value="walk">Walk Cycle</option>
                          <option value="run">Run Sprint</option>
                          <option value="point">Point to Chart</option>
                          <option value="scratch_head">Scratch Head</option>
                          <option value="jump">Jump / Triumph</option>
                          <option value="celebrate">Celebrate Victory</option>
                          <option value="shocked">Shocked / Panic</option>
                          <option value="wave">Wave Arm</option>
                          <option value="sit">Sit at Desk</option>
                          <option value="idle">Idle Breathe</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Expression</label>
                        <select
                          value={currentScene.expression}
                          onChange={(e) => {
                            const updated = [...project.scenes];
                            updated[selectedSceneIndex].expression = e.target.value as StykExpression;
                            onUpdateProject({ ...project, scenes: updated });
                            playSFX('pop');
                          }}
                          className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                        >
                          <option value="neutral">Neutral</option>
                          <option value="happy">Happy</option>
                          <option value="confused">Confused</option>
                          <option value="shocked">Shocked</option>
                          <option value="thinking">Thinking</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Voiceover Narration</label>
                      <textarea
                        value={currentScene.voiceover}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          const newVo = e.target.value;
                          updated[selectedSceneIndex].voiceover = newVo;
                          updated[selectedSceneIndex].words = calculateWordTimestamps(newVo, currentScene.duration, 0);
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        rows={2}
                        className="w-full p-2 bg-black border border-neutral-800 rounded text-xs text-neutral-300 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Infographic */}
                {sceneInspectorTab === 'infographic' && (
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Infographic Type</label>
                      <select
                        value={currentScene.infographic}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].infographic = e.target.value as InfographicType;
                          onUpdateProject({ ...project, scenes: updated });
                          playSFX('pop');
                        }}
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                      >
                        <option value="none">None</option>
                        <option value="metric_counter">Metric Counter (+340%)</option>
                        <option value="bar_chart">Bar Chart</option>
                        <option value="terminal">Code Terminal</option>
                        <option value="alert_card">Alert Banner</option>
                        <option value="sparkline">Sparkline Flow</option>
                      </select>
                    </div>

                    {currentScene.infographic !== 'none' && (
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Metric Value / Header</label>
                        <input
                          type="text"
                          value={currentScene.infographicData?.value || '+340%'}
                          onChange={(e) => {
                            const updated = [...project.scenes];
                            updated[selectedSceneIndex].infographicData = {
                              ...updated[selectedSceneIndex].infographicData,
                              value: e.target.value,
                            };
                            onUpdateProject({ ...project, scenes: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded font-bold text-cyan-400"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 3: Props & Captions */}
                {sceneInspectorTab === 'props' && (
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Caption Presentation</label>
                      <select
                        value={currentScene.captionStyle}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].captionStyle = e.target.value as CaptionStyle;
                          onUpdateProject({ ...project, scenes: updated });
                          playSFX('pop');
                        }}
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white"
                      >
                        <option value="karaoke">TikTok Dynamic Karaoke</option>
                        <option value="lower_third">Clean Lower-Third</option>
                        <option value="speech_bubble">Comic Speech Bubble</option>
                        <option value="minimal">Minimal Headline</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Attach Props</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['laptop', 'lightbulb', 'coffee', 'desk', 'phone', 'clock'].map((p) => {
                          const has = currentScene.props.includes(p);
                          return (
                            <button
                              key={p}
                              onClick={() => {
                                const updated = [...project.scenes];
                                const cur = updated[selectedSceneIndex].props;
                                updated[selectedSceneIndex].props = has
                                  ? cur.filter((item) => item !== p)
                                  : [...cur, p];
                                onUpdateProject({ ...project, scenes: updated });
                                playSFX('pop');
                              }}
                              className={`p-1.5 rounded border text-[10px] capitalize transition-all ${
                                has
                                  ? 'bg-violet-950/40 border-violet-500 text-violet-300 font-bold'
                                  : 'bg-black/40 border-neutral-800 text-neutral-400'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 03: Neural Voiceover & Captions */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Neural Voiceover & Word-Level Timing Sync
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Aligns synthesized speech phonemes with dynamic kinetic karaoke highlights
                  </p>
                </div>
                <button
                  onClick={handleTestVoice}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Voice Engine
                  </label>
                  <select className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white">
                    <option>Gemini 3.8 Flash TTS</option>
                    <option>Kokoro-82M (Edge Synthesizer)</option>
                    <option>Piper Neural Engine</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Narrator Persona
                  </label>
                  <select className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white">
                    <option>Studio Narrator (Warm, Articulate)</option>
                    <option>Fast Creator (Hyped, Energetic)</option>
                    <option>Documentary Broadcaster</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Soundtrack BGM
                  </label>
                  <select className="w-full p-2 bg-black border border-neutral-800 rounded-lg text-xs font-semibold text-white">
                    <option>Lo-Fi Focus Beat (85 BPM)</option>
                    <option>Cinematic Synthwave Pulse</option>
                    <option>Upbeat Tech Acoustic</option>
                    <option>None (Voice Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveStep(4)}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-bold shadow-md shadow-violet-600/20"
                >
                  Proceed to On-Device Render ▸
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 04: On-Device Render */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-violet-400" />
                    On-Device Render & Download
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Hardware-accelerated client-side encoding via MediaRecorder + WebM/MP4
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleRenderVideo(false)}
                  disabled={isRendering}
                  className="p-3.5 rounded-xl border border-neutral-700 bg-neutral-800/60 hover:bg-neutral-800 text-left transition-all group disabled:opacity-50"
                >
                  <div className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300">
                    Draft Render (Fast, Half-Res)
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Rapid social preview with canvas capture.
                  </div>
                </button>

                <button
                  onClick={() => handleRenderVideo(true)}
                  disabled={isRendering}
                  className="p-3.5 rounded-xl border border-violet-500/50 bg-violet-950/20 hover:bg-violet-900/30 text-left transition-all group disabled:opacity-50"
                >
                  <div className="font-bold text-xs sm:text-sm text-violet-300 group-hover:text-violet-200">
                    Master Render (Full 1080p)
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Crystal-sharp 60fps export with audio muxing.
                  </div>
                </button>
              </div>

              {isRendering && (
                <div className="space-y-2 p-3.5 rounded-lg bg-black/60 border border-neutral-800">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Capturing Canvas Stream & Encoding...
                    </span>
                    <span className="text-white font-bold">{renderProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all duration-100"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {renderedVideoUrl && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Video Synthesis Complete!
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Downloaded to your device storage.
                    </div>
                  </div>
                  <a
                    href={renderedVideoUrl}
                    download={`${project.title.toLowerCase().replace(/\s+/g, '_')}.webm`}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right 40%: Realtime Preview Canvas & Transport */}
      <div
        className={`w-full xl:w-[460px] 2xl:w-[500px] flex flex-col border-t xl:border-t-0 border-neutral-800 bg-[#0B0F17] p-4 sm:p-5 no-scrollbar ${
          mobileView === 'blueprint' ? 'hidden xl:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Canvas Stage Preview
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-400">
              {project.aspectRatio}
            </span>
          </div>

          <button
            onClick={onSendToEditor}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            <span>Open in Pro Editor</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 flex items-center justify-center min-h-[360px] sm:min-h-[420px] max-h-[540px] bg-neutral-950/60 rounded-xl border border-neutral-800 overflow-hidden relative">
          <StykCanvas
            aspectRatio={project.aspectRatio}
            action={currentScene?.stykAction || 'idle'}
            style={currentScene?.stykStyle || 'comic_pop'}
            expression={currentScene?.expression || 'neutral'}
            facing={currentScene?.stykFacing || 'right'}
            propsList={currentScene?.props || []}
            camera={currentScene?.camera}
            secondaryCharacter={currentScene?.secondaryCharacter}
            customProps={currentScene?.customProps}
            infographic={currentScene?.infographic}
            infographicData={currentScene?.infographicData}
            captionText={currentScene?.voiceover}
            words={currentScene?.words}
            captionStyle={currentScene?.captionStyle}
            currentTimeSec={currentTime}
            durationSec={currentScene?.duration || 5}
            isPlaying={isPlaying}
            interactiveIK={true}
            onionSkin={false}
            showGrid={true}
            onCanvasReady={(c) => {
              canvasElementRef.current = c;
            }}
          />
        </div>

        {/* Transport Controls Bar */}
        <div className="mt-3 p-2.5 sm:p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setCurrentTime(0);
                playSFX('pop');
              }}
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                playSFX('pop');
              }}
              className="p-1.5 sm:p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />}
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={project.durationTotal}
              step={0.1}
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>

          <div className="font-mono text-xs font-bold text-cyan-400 shrink-0">
            {currentTime.toFixed(1)}s / {project.durationTotal}s
          </div>
        </div>
      </div>
    </div>
  );
}
