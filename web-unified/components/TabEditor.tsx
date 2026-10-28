'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StoryboardProject,
  StoryboardScene,
  StykAction,
  StykExpression,
  StykStyle,
  InfographicType,
  Checkpoint,
  EasingType,
  CustomProp,
  CameraConfig,
  SecondaryCharacterConfig,
} from '@/lib/types';
import StykCanvas from './StykCanvas';
import StyleMixSelector from './StyleMixSelector';
import { playSFX } from '@/lib/audio-tts';
import {
  startVoiceRecording,
  stopVoiceRecording,
  generateSyntheticWaveform,
} from '@/lib/audio-recorder';
import {
  recordCanvasToVideo,
  generateSRTContent,
  triggerDownload,
  RenderProgressUpdate,
} from '@/lib/video-recorder';
import {
  saveProjectToStorage,
  exportCortexiBundle,
  parseCortexiBundleFile,
} from '@/lib/storage';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Grid,
  Eye,
  Sliders,
  History,
  Wand2,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Sparkles,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Diamond,
  FileVideo,
  BarChart3,
  Music,
  Mic,
  MicOff,
  Download,
  Upload,
  Activity,
  Camera,
  Crown,
  Shield,
  Star,
  Check,
  CheckCircle2,
  Loader2,
  FileDown,
} from 'lucide-react';

interface TabEditorProps {
  project: StoryboardProject;
  onUpdateProject: (updated: StoryboardProject) => void;
}

export default function TabEditor({ project, onUpdateProject }: TabEditorProps) {
  // Navigation & Workspace State
  const [activeBinTab, setActiveBinTab] = useState<'styk' | 'poses' | 'infographics' | 'props' | 'audio'>('styk');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'styk_ik' | 'camera' | 'video' | 'infographic' | 'history'>('styk_ik');

  // Sidebar Visibility (Pro NLE Collapsible Docks)
  const [isLeftBinOpen, setIsLeftBinOpen] = useState(true);
  const [isRightInspectorOpen, setIsRightInspectorOpen] = useState(true);

  // Timeline & Playback
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [timelineZoom, setTimelineZoom] = useState(1.0);
  const [onionSkin, setOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [activeTool, setActiveTool] = useState<'select' | 'split'>('select');
  const [activeEasing, setActiveEasing] = useState<EasingType>('ease-in-out');

  // Canvas Reference & Real-Time Video Muxer Export
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgressUpdate | null>(null);

  // Microphone Voiceover Recording
  const [isRecordingMic, setIsRecordingMic] = useState(false);

  // Bottom AI Prompt Dock State
  const [promptEditInput, setPromptEditInput] = useState('');
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);

  // Checkpoints Rail (Undo/Redo)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    {
      id: 'cp_init',
      timestamp: 'Initial Take',
      promptSnippet: 'Initial generated storyboard',
      description: 'Project baseline with scenes',
      projectState: JSON.parse(JSON.stringify(project)),
    },
  ]);
  const [undoStack, setUndoStack] = useState<StoryboardProject[]>([]);
  const [redoStack, setRedoStack] = useState<StoryboardProject[]>([]);

  // Hidden File Input for .cortexi Bundle Import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync active scene with playhead position dynamically
  let accTime = 0;
  let computedIdx = 0;
  for (let i = 0; i < project.scenes.length; i++) {
    accTime += project.scenes[i].duration;
    if (playheadTime <= accTime) {
      computedIdx = i;
      break;
    }
  }

  const effectiveSceneIndex = isPlaying ? computedIdx : selectedSceneIndex;
  const currentScene = project.scenes[effectiveSceneIndex] || project.scenes[0];

  // Playback loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayheadTime((prev) => {
          const next = prev + 0.05;
          if (next >= project.durationTotal) {
            return isLooping ? 0 : project.durationTotal;
          }
          return next;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, project.durationTotal, isLooping]);

  // Autosave project to localStorage
  useEffect(() => {
    saveProjectToStorage(project);
  }, [project]);

  // Push undo state helper
  const pushUndoState = (prevProject: StoryboardProject) => {
    setUndoStack((prev) => [JSON.parse(JSON.stringify(prevProject)), ...prev.slice(0, 25)]);
    setRedoStack([]);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[0];
    const newUndo = undoStack.slice(1);
    setRedoStack((r) => [JSON.parse(JSON.stringify(project)), ...r]);
    setUndoStack(newUndo);
    onUpdateProject(prev);
    playSFX('ding');
  }, [undoStack, project, onUpdateProject]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    setUndoStack((u) => [JSON.parse(JSON.stringify(project)), ...u]);
    setRedoStack(newRedo);
    onUpdateProject(next);
    playSFX('ding');
  }, [redoStack, project, onUpdateProject]);

  // Global Undo / Redo keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Microphone Voiceover Recording
  const handleToggleRecordMic = async () => {
    if (!isRecordingMic) {
      const started = await startVoiceRecording();
      if (started) {
        setIsRecordingMic(true);
        playSFX('ding');
      } else {
        alert('Could not access microphone. Please verify browser permissions.');
      }
    } else {
      setIsRecordingMic(false);
      const result = await stopVoiceRecording();
      if (result) {
        pushUndoState(project);
        const updatedScenes = [...project.scenes];
        updatedScenes[selectedSceneIndex] = {
          ...updatedScenes[selectedSceneIndex],
          userRecordedAudioUrl: result.audioUrl,
          duration: Math.max(result.duration, 2),
          audioWaveform: result.waveform,
        };
        const totalDur = updatedScenes.reduce((acc, s) => acc + s.duration, 0);
        onUpdateProject({ ...project, scenes: updatedScenes, durationTotal: totalDur });
        playSFX('ding');
      }
    }
  };

  // Real In-Browser Canvas & Web Audio Muxer Video Export
  const handleExportMasterVideo = async () => {
    const canvas = canvasElementRef.current;
    if (!canvas) {
      alert('Monitor canvas is initializing. Please wait a moment.');
      return;
    }
    setIsRenderingVideo(true);
    playSFX('whoosh');

    setIsPlaying(true);
    setPlayheadTime(0);

    const videoBlob = await recordCanvasToVideo(
      canvas,
      project.durationTotal || 5,
      (update) => {
        setRenderProgress(update);
      }
    );

    setIsPlaying(false);

    if (videoBlob) {
      const sanitizedTitle = (project.title || 'cortexi_render')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      triggerDownload(videoBlob, `${sanitizedTitle}.webm`);

      const srtText = generateSRTContent(project.scenes);
      const srtBlob = new Blob([srtText], { type: 'text/plain' });
      triggerDownload(srtBlob, `${sanitizedTitle}.srt`);

      playSFX('ding');
    } else {
      playSFX('buzzer');
    }

    setTimeout(() => {
      setIsRenderingVideo(false);
      setRenderProgress(null);
    }, 1500);
  };

  // .cortexi Bundle Import / Export
  const handleExportBundle = () => {
    exportCortexiBundle(project, checkpoints);
    playSFX('ding');
  };

  const handleImportBundleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const bundle = await parseCortexiBundleFile(file);
    if (bundle && bundle.project) {
      pushUndoState(project);
      onUpdateProject(bundle.project);
      if (bundle.checkpoints && bundle.checkpoints.length > 0) {
        setCheckpoints(bundle.checkpoints);
      }
      playSFX('ding');
    } else {
      alert('Invalid or incompatible .cortexi project file');
      playSFX('buzzer');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle AI Prompt Edit at Bottom Dock
  const handleRunAIPromptEdit = async () => {
    if (!promptEditInput.trim()) return;
    setIsApplyingPrompt(true);
    playSFX('whoosh');
    pushUndoState(project);

    try {
      const res = await fetch('/api/gemini/prompt-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editPrompt: promptEditInput,
          currentScene,
          projectTitle: project.title,
        }),
      });

      if (!res.ok) throw new Error('Edit failed');
      const data = await res.json();

      const updatedScenes = [...project.scenes];
      updatedScenes[selectedSceneIndex] = {
        ...updatedScenes[selectedSceneIndex],
        title: data.title || currentScene.title,
        headline: data.headline || currentScene.headline,
        stykAction: (data.stykAction as StykAction) || currentScene.stykAction,
        expression: (data.expression as StykExpression) || currentScene.expression,
        infographic: (data.infographic as InfographicType) || currentScene.infographic,
        props: data.props || currentScene.props,
      };

      const updatedProject = { ...project, scenes: updatedScenes };
      onUpdateProject(updatedProject);

      const newCp: Checkpoint = {
        id: `cp_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        promptSnippet: promptEditInput,
        description: data.changeSummary || 'Applied AI Scene Adjustment',
        projectState: JSON.parse(JSON.stringify(updatedProject)),
      };
      setCheckpoints([newCp, ...checkpoints]);

      setPromptEditInput('');
      playSFX('ding');
    } catch (err) {
      console.error(err);
      playSFX('buzzer');
    } finally {
      setIsApplyingPrompt(false);
    }
  };

  // Quick Attachment Helpers for the Bottom Bar
  const handleAddStykAction = (action: StykAction) => {
    pushUndoState(project);
    const updated = [...project.scenes];
    updated[selectedSceneIndex].stykAction = action;
    onUpdateProject({ ...project, scenes: updated });
    playSFX('pop');
  };

  const handleAddInfographic = (type: InfographicType) => {
    pushUndoState(project);
    const updated = [...project.scenes];
    updated[selectedSceneIndex].infographic = type;
    onUpdateProject({ ...project, scenes: updated });
    playSFX('pop');
  };

  const handleAttachCustomProp = (prop: CustomProp) => {
    pushUndoState(project);
    const updated = [...project.scenes];
    const existing = updated[selectedSceneIndex].customProps || [];
    // Toggle or add
    const exists = existing.find((p) => p.name === prop.name);
    if (exists) {
      updated[selectedSceneIndex].customProps = existing.filter((p) => p.name !== prop.name);
    } else {
      updated[selectedSceneIndex].customProps = [...existing, prop];
    }
    onUpdateProject({ ...project, scenes: updated });
    playSFX('pop');
  };

  const handleSplitAtPlayhead = () => {
    playSFX('whoosh');
    alert(`Split keyframe created at ${playheadTime.toFixed(2)}s with ${activeEasing} easing`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0D14] select-none text-white font-sans">
      {/* 1. TOP NLE WORKSPACE: Media Bin (Left) + Monitor (Center) + Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden border-b border-neutral-800">
        {/* Left Panel: Media / Asset Bin (DaVinci/CapCut style) */}
        {isLeftBinOpen && (
          <aside className="w-60 xl:w-64 border-r border-neutral-800 bg-[#0B0F17] flex flex-col shrink-0 no-scrollbar">
            {/* Bin Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-800 p-1 gap-0.5 text-[10px] font-semibold bg-neutral-950">
              {(['styk', 'poses', 'infographics', 'props', 'audio'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveBinTab(tab);
                    playSFX('pop');
                  }}
                  className={`flex-1 py-1 rounded capitalize transition-colors ${
                    activeBinTab === tab
                      ? 'bg-neutral-800 text-cyan-400 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab === 'styk' ? 'Rigs' : tab}
                </button>
              ))}
            </div>

            {/* Asset Bin Cards */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 no-scrollbar text-xs">
              {activeBinTab === 'styk' && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Stykman Rig Presets
                  </span>
                  {[
                    { id: 'comic_pop', label: 'Comic Pop Rig', color: '#FF007F', desc: 'Neon boots, gloves & drop shadow' },
                    { id: 'classic_bw', label: 'Classic B&W', color: '#FFFFFF', desc: 'Minimalist ink pen style' },
                    { id: 'doodle', label: 'Whiteboard Doodle', color: '#00F0FF', desc: 'Hand-drawn marker jitter' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        const updated = [...project.scenes];
                        updated[selectedSceneIndex].stykStyle = r.id as StykStyle;
                        onUpdateProject({ ...project, scenes: updated });
                        playSFX('pop');
                      }}
                      className={`w-full p-2 text-left rounded-lg border transition-all ${
                        currentScene.stykStyle === r.id
                          ? 'border-cyan-400 bg-cyan-950/30 text-white font-bold'
                          : 'border-neutral-800/80 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                        <span>{r.label}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {activeBinTab === 'poses' && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Motion Loop Presets
                  </span>
                  {[
                    { id: 'walk', label: 'Walk Cycle' },
                    { id: 'run', label: 'Sprint Run' },
                    { id: 'point', label: 'Point to Target' },
                    { id: 'scratch_head', label: 'Scratch Head' },
                    { id: 'jump', label: 'Jump Triumph' },
                    { id: 'celebrate', label: 'Celebrate Victory' },
                    { id: 'shocked', label: 'Shocked / Panic' },
                    { id: 'wave', label: 'Wave Arm' },
                    { id: 'sit', label: 'Sit at Desk' },
                    { id: 'idle', label: 'Idle Breathe' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddStykAction(p.id as StykAction)}
                      className={`w-full p-2 text-left rounded-lg border text-xs transition-all ${
                        currentScene.stykAction === p.id
                          ? 'border-rose-500 bg-rose-950/30 text-rose-300 font-bold'
                          : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {activeBinTab === 'infographics' && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Motion Infographics
                  </span>
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'metric_counter', label: 'Metric Pulse (+340%)' },
                    { id: 'bar_chart', label: 'Rising Bar Chart' },
                    { id: 'terminal', label: 'Dev Terminal Window' },
                    { id: 'alert_card', label: 'Alert Warning Card' },
                    { id: 'sparkline', label: 'Real-Time Sparkline' },
                  ].map((info) => (
                    <button
                      key={info.id}
                      onClick={() => handleAddInfographic(info.id as InfographicType)}
                      className={`w-full p-2 text-left rounded-lg border text-xs transition-all ${
                        currentScene.infographic === info.id
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                          : 'border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              )}

              {activeBinTab === 'props' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                      Parented Custom Props
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Crown', shapeType: 'crown' as const, parentBone: 'head' as const, icon: Crown, color: 'text-amber-400' },
                        { name: 'Star', shapeType: 'star' as const, parentBone: 'head' as const, icon: Star, color: 'text-yellow-400' },
                        { name: 'Shield', shapeType: 'shield' as const, parentBone: 'hand_l' as const, icon: Shield, color: 'text-cyan-400' },
                        { name: 'Badge', shapeType: 'badge' as const, parentBone: 'torso' as const, icon: CheckCircle2, color: 'text-violet-400' },
                      ].map((cp) => {
                        const isAttached = currentScene.customProps?.some((p) => p.name === cp.name);
                        const Icon = cp.icon;
                        return (
                          <button
                            key={cp.name}
                            onClick={() =>
                              handleAttachCustomProp({
                                id: `cp_${cp.name.toLowerCase()}`,
                                name: cp.name,
                                shapeType: cp.shapeType,
                                parentBone: cp.parentBone,
                              })
                            }
                            className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                              isAttached
                                ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                                : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Icon className={`w-3.5 h-3.5 ${cp.color}`} />
                              <span className="text-[9px] font-mono text-neutral-500">
                                {isAttached ? '✓' : `+ ${cp.parentBone}`}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-white">{cp.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                      Scene SVG Objects
                    </span>
                    {['laptop', 'lightbulb', 'coffee', 'desk', 'phone', 'clock'].map((prop) => {
                      const has = currentScene.props.includes(prop);
                      return (
                        <button
                          key={prop}
                          onClick={() => {
                            const updated = [...project.scenes];
                            const cur = updated[selectedSceneIndex].props;
                            updated[selectedSceneIndex].props = has
                              ? cur.filter((p) => p !== prop)
                              : [...cur, prop];
                            onUpdateProject({ ...project, scenes: updated });
                            playSFX('pop');
                          }}
                          className={`w-full p-1.5 mb-1 rounded-lg border text-xs flex items-center justify-between capitalize transition-all ${
                            has
                              ? 'border-violet-500 bg-violet-950/40 text-violet-300 font-bold'
                              : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <span>{prop}</span>
                          <span className="text-[9px] font-mono">{has ? 'Attached' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeBinTab === 'audio' && (
                <div className="space-y-3">
                  {/* Live Mic Voiceover Card */}
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                      Scene Voice Narration
                    </span>
                    <button
                      onClick={handleToggleRecordMic}
                      className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md ${
                        isRecordingMic
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isRecordingMic ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span>Stop Recording</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>Record Scene Voice</span>
                        </>
                      )}
                    </button>
                    {currentScene.userRecordedAudioUrl && (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Live Mic Take Attached ({currentScene.duration}s)</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                      Procedural SFX
                    </span>
                    {[
                      { id: 'pop', label: 'Pop / Click' },
                      { id: 'whoosh', label: 'Whoosh Sweep' },
                      { id: 'ding', label: 'Crystal Ding' },
                      { id: 'step', label: 'Footstep Tap' },
                      { id: 'buzzer', label: 'Retro Buzzer' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => playSFX(s.id as 'pop' | 'whoosh' | 'ding' | 'step' | 'buzzer')}
                        className="w-full p-1.5 mb-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-neutral-300 hover:text-cyan-400 text-xs flex items-center justify-between"
                      >
                        <span>{s.label}</span>
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Center: Main Monitor / Canvas Player */}
        <section className="flex-1 flex flex-col overflow-hidden bg-[#07090E] relative">
          {/* Monitor Top Status & Dock Controls */}
          <div className="h-9 border-b border-neutral-800 bg-neutral-950/90 px-3 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLeftBinOpen(!isLeftBinOpen)}
                className={`p-1 rounded hover:bg-neutral-800 transition-colors ${isLeftBinOpen ? 'text-cyan-400' : 'text-neutral-500'}`}
                title="Toggle Media Bin"
              >
                {isLeftBinOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              </button>
              <span className="text-white font-bold truncate max-w-[120px] sm:max-w-xs">{project.title}</span>
              <span className="text-neutral-500">[{project.aspectRatio}]</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setOnionSkin(!onionSkin)}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                  onionSkin ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Toggle Onion Skinning"
              >
                <Eye className="w-3 h-3" /> Onion
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                  showGrid ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Toggle Guides Grid"
              >
                <Grid className="w-3 h-3" /> Grid
              </button>

              {/* .cortexi Bundle Export / Import */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".cortexi,.json"
                onChange={handleImportBundleFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[10px] font-semibold text-neutral-300 hover:text-white flex items-center gap-1"
                title="Import .cortexi project file"
              >
                <Upload className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={handleExportBundle}
                className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[10px] font-semibold text-neutral-300 hover:text-white flex items-center gap-1"
                title="Save & Download .cortexi bundle"
              >
                <FileDown className="w-3 h-3 text-violet-400" />
                <span className="hidden sm:inline">.cortexi</span>
              </button>

              {/* Real Client-Side Video Muxer Export */}
              <button
                onClick={handleExportMasterVideo}
                disabled={isRenderingVideo}
                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Record Canvas & Export WebM/MP4 + SRT Subtitles"
              >
                {isRenderingVideo ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Muxing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Render Video</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsRightInspectorOpen(!isRightInspectorOpen)}
                className={`p-1 rounded hover:bg-neutral-800 transition-colors ${isRightInspectorOpen ? 'text-rose-400' : 'text-neutral-500'}`}
                title="Toggle Inspector"
              >
                {isRightInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Canvas Viewport Frame */}
          <div className="flex-1 flex items-center justify-center p-3 overflow-hidden relative">
            <div className="w-full h-full flex items-center justify-center max-h-[360px] lg:max-h-[440px]">
              <StykCanvas
                aspectRatio={project.aspectRatio}
                action={currentScene.stykAction}
                style={currentScene.stykStyle}
                expression={currentScene.expression}
                facing={currentScene.stykFacing}
                propsList={currentScene.props}
                camera={currentScene.camera}
                secondaryCharacter={currentScene.secondaryCharacter}
                customProps={currentScene.customProps}
                infographic={currentScene.infographic}
                infographicData={currentScene.infographicData}
                captionText={currentScene.voiceover}
                words={currentScene.words}
                captionStyle={currentScene.captionStyle}
                currentTimeSec={playheadTime}
                durationSec={currentScene.duration}
                isPlaying={isPlaying}
                interactiveIK={true}
                onionSkin={onionSkin}
                showGrid={showGrid}
                onCanvasReady={(canvas) => {
                  canvasElementRef.current = canvas;
                }}
              />
            </div>
          </div>

          {/* Monitor Bottom Transport Bar (DaVinci/CapCut style) */}
          <div className="h-9 border-t border-neutral-800 bg-neutral-950 px-3 flex items-center justify-between shrink-0">
            {/* Transport Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setPlayheadTime(0)}
                className="p-1 text-neutral-400 hover:text-white"
                title="Start (Home)"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              <button
                onClick={() => setPlayheadTime(Math.max(0, playheadTime - 0.5))}
                className="p-1 text-neutral-400 hover:text-white"
                title="Step 1 Frame Back"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30"
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => setPlayheadTime(Math.min(project.durationTotal, playheadTime + 0.5))}
                className="p-1 text-neutral-400 hover:text-white"
                title="Step 1 Frame Forward"
              >
                <ChevronRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => setPlayheadTime(project.durationTotal)}
                className="p-1 text-neutral-400 hover:text-white"
                title="End"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>

            {/* Timecode display: SMPTE style */}
            <div className="font-mono text-xs font-bold text-cyan-400">
              00:{playheadTime < 10 ? '0' : ''}{playheadTime.toFixed(2)} : 00 / 00:{project.durationTotal < 10 ? '0' : ''}{project.durationTotal.toFixed(2)} : 00
            </div>

            {/* Loop & Audio Volume Indicator */}
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1 rounded ${isLooping ? 'text-cyan-400' : 'text-neutral-600'}`}
                title="Loop Playback"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </section>

        {/* Right Panel: Context-Aware Inspector (Properties / Transform / IK / Camera) */}
        {isRightInspectorOpen && (
          <aside className="w-64 xl:w-72 border-l border-neutral-800 bg-[#0B0F17] flex flex-col shrink-0 no-scrollbar">
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center border-b border-neutral-800 p-1 gap-0.5 text-[10px] font-semibold bg-neutral-950">
              {(['styk_ik', 'camera', 'video', 'infographic', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveInspectorTab(tab);
                    playSFX('pop');
                  }}
                  className={`flex-1 py-1 rounded capitalize transition-colors ${
                    activeInspectorTab === tab
                      ? 'bg-neutral-800 text-white font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab === 'styk_ik' ? 'IK Rig' : tab === 'camera' ? 'Camera' : tab}
                </button>
              ))}
            </div>

            {/* Inspector Tab Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar text-xs">
              <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                <StyleMixSelector selectedStyles={selectedStyles} onChange={setSelectedStyles} />
              </div>

              {activeInspectorTab === 'styk_ik' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                      Primary Actor
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">12 Bones</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Pose Loop</label>
                    <select
                      value={currentScene.stykAction}
                      onChange={(e) => {
                        pushUndoState(project);
                        const updated = [...project.scenes];
                        updated[selectedSceneIndex].stykAction = e.target.value as StykAction;
                        onUpdateProject({ ...project, scenes: updated });
                        playSFX('pop');
                      }}
                      className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white text-xs font-semibold"
                    >
                      <option value="walk">Walk Cycle</option>
                      <option value="run">Sprint Run</option>
                      <option value="point">Point to Chart</option>
                      <option value="scratch_head">Scratch Head</option>
                      <option value="jump">Jump Triumph</option>
                      <option value="celebrate">Celebrate Victory</option>
                      <option value="shocked">Shocked Reaction</option>
                      <option value="wave">Wave Arm</option>
                      <option value="sit">Sit at Desk</option>
                      <option value="idle">Idle Breathe</option>
                    </select>
                  </div>

                  {/* Co-Actor / Secondary Figure Composition Toggle */}
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-violet-400 font-bold uppercase">
                        Co-Actor (Dual Rig)
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(currentScene.secondaryCharacter?.enabled)}
                        onChange={(e) => {
                          pushUndoState(project);
                          const updated = [...project.scenes];
                          const existing = updated[selectedSceneIndex].secondaryCharacter;
                          updated[selectedSceneIndex].secondaryCharacter = {
                            enabled: e.target.checked,
                            name: existing?.name || 'Guest',
                            stykAction: existing?.stykAction || 'wave',
                            stykFacing: existing?.stykFacing || 'left',
                            stykPosition: existing?.stykPosition || [110, 310],
                            stykStyle: existing?.stykStyle || 'doodle',
                            expression: existing?.expression || 'happy',
                            props: existing?.props || [],
                          };
                          onUpdateProject({ ...project, scenes: updated });
                          playSFX('ding');
                        }}
                        className="accent-violet-500 rounded cursor-pointer"
                      />
                    </div>

                    {currentScene.secondaryCharacter?.enabled && (
                      <div className="p-2 rounded bg-neutral-950 border border-violet-900/40 space-y-2">
                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Co-Actor Action</label>
                          <select
                            value={currentScene.secondaryCharacter.stykAction}
                            onChange={(e) => {
                              pushUndoState(project);
                              const updated = [...project.scenes];
                              if (updated[selectedSceneIndex].secondaryCharacter) {
                                updated[selectedSceneIndex].secondaryCharacter!.stykAction = e.target.value as StykAction;
                                onUpdateProject({ ...project, scenes: updated });
                              }
                            }}
                            className="w-full p-1 bg-black border border-neutral-800 rounded text-xs text-violet-300"
                          >
                            <option value="wave">Wave Arm</option>
                            <option value="point">Point / Debate</option>
                            <option value="shocked">Shocked</option>
                            <option value="celebrate">Celebrate</option>
                            <option value="sit">Sit Down</option>
                            <option value="idle">Idle</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] text-neutral-400 block mb-0.5">Facing</label>
                            <select
                              value={currentScene.secondaryCharacter.stykFacing}
                              onChange={(e) => {
                                pushUndoState(project);
                                const updated = [...project.scenes];
                                if (updated[selectedSceneIndex].secondaryCharacter) {
                                  updated[selectedSceneIndex].secondaryCharacter!.stykFacing = e.target.value as 'left' | 'right';
                                  onUpdateProject({ ...project, scenes: updated });
                                }
                              }}
                              className="w-full p-1 bg-black border border-neutral-800 rounded text-[11px]"
                            >
                              <option value="left">Left (Facing Main)</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-neutral-400 block mb-0.5">Style</label>
                            <select
                              value={currentScene.secondaryCharacter.stykStyle}
                              onChange={(e) => {
                                pushUndoState(project);
                                const updated = [...project.scenes];
                                if (updated[selectedSceneIndex].secondaryCharacter) {
                                  updated[selectedSceneIndex].secondaryCharacter!.stykStyle = e.target.value as StykStyle;
                                  onUpdateProject({ ...project, scenes: updated });
                                }
                              }}
                              className="w-full p-1 bg-black border border-neutral-800 rounded text-[11px]"
                            >
                              <option value="doodle">Doodle</option>
                              <option value="comic_pop">Comic Pop</option>
                              <option value="classic_bw">Classic B&W</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Facing</label>
                      <div className="flex gap-1">
                        {(['left', 'right'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => {
                              const updated = [...project.scenes];
                              updated[selectedSceneIndex].stykFacing = dir;
                              onUpdateProject({ ...project, scenes: updated });
                            }}
                            className={`flex-1 py-1 rounded text-[11px] font-bold capitalize border ${
                              currentScene.stykFacing === dir
                                ? 'border-cyan-400 bg-cyan-950/30 text-white'
                                : 'border-neutral-800 text-neutral-400'
                            }`}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Expression</label>
                      <select
                        value={currentScene.expression}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].expression = e.target.value as StykExpression;
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white text-xs"
                      >
                        <option value="neutral">Neutral</option>
                        <option value="happy">Happy</option>
                        <option value="confused">Confused</option>
                        <option value="shocked">Shocked</option>
                        <option value="thinking">Thinking</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/60 border border-neutral-800/80 text-[11px] text-neutral-400">
                    💡 <strong className="text-cyan-400">Direct IK Handles:</strong> Drag cyan nodes on the monitor canvas to pose arms and legs directly.
                  </div>
                </div>
              )}

              {activeInspectorTab === 'camera' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Dynamic 2D Camera
                    </span>
                    <button
                      onClick={() => {
                        pushUndoState(project);
                        const updated = [...project.scenes];
                        updated[selectedSceneIndex].camera = { zoom: 1.0, x: 0, y: 0, shake: 0 };
                        onUpdateProject({ ...project, scenes: updated });
                        playSFX('pop');
                      }}
                      className="text-[9px] text-neutral-400 hover:text-white underline"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Zoom Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                      <span>Camera Zoom</span>
                      <span className="font-mono text-cyan-300">
                        {(currentScene.camera?.zoom || 1.0).toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.5}
                      step={0.1}
                      value={currentScene.camera?.zoom || 1.0}
                      onChange={(e) => {
                        const updated = [...project.scenes];
                        const cam = updated[selectedSceneIndex].camera || { zoom: 1.0, x: 0, y: 0, shake: 0 };
                        updated[selectedSceneIndex].camera = { ...cam, zoom: Number(e.target.value) };
                        onUpdateProject({ ...project, scenes: updated });
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* Pan X and Pan Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[9px] text-neutral-400 mb-0.5">
                        <span>Pan X</span>
                        <span className="font-mono text-neutral-300">{currentScene.camera?.x || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={-150}
                        max={150}
                        step={5}
                        value={currentScene.camera?.x || 0}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          const cam = updated[selectedSceneIndex].camera || { zoom: 1.0, x: 0, y: 0, shake: 0 };
                          updated[selectedSceneIndex].camera = { ...cam, x: Number(e.target.value) };
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full accent-neutral-400 h-1 bg-neutral-800 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] text-neutral-400 mb-0.5">
                        <span>Pan Y</span>
                        <span className="font-mono text-neutral-300">{currentScene.camera?.y || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={-150}
                        max={150}
                        step={5}
                        value={currentScene.camera?.y || 0}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          const cam = updated[selectedSceneIndex].camera || { zoom: 1.0, x: 0, y: 0, shake: 0 };
                          updated[selectedSceneIndex].camera = { ...cam, y: Number(e.target.value) };
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full accent-neutral-400 h-1 bg-neutral-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Screen Shake Impact Trigger */}
                  <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                    <span className="text-[10px] text-neutral-400 block font-semibold">Cinematic Effects</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          playSFX('whoosh');
                          const updated = [...project.scenes];
                          const cam = updated[selectedSceneIndex].camera || { zoom: 1.0, x: 0, y: 0, shake: 0 };
                          updated[selectedSceneIndex].camera = { ...cam, shake: 6 };
                          onUpdateProject({ ...project, scenes: updated });

                          // Decays after 350ms
                          setTimeout(() => {
                            const decayed = [...project.scenes];
                            if (decayed[selectedSceneIndex]?.camera) {
                              decayed[selectedSceneIndex].camera = { ...decayed[selectedSceneIndex].camera!, shake: 0 };
                              onUpdateProject({ ...project, scenes: decayed });
                            }
                          }, 350);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-rose-500/50 text-[11px] font-semibold text-rose-300 flex items-center justify-center gap-1 transition-all"
                      >
                        <Activity className="w-3.5 h-3.5 text-rose-400" />
                        <span>Screen Shake</span>
                      </button>

                      <button
                        onClick={() => {
                          playSFX('pop');
                          const updated = [...project.scenes];
                          const cam = updated[selectedSceneIndex].camera || { zoom: 1.0, x: 0, y: 0, shake: 0 };
                          updated[selectedSceneIndex].camera = {
                            ...cam,
                            zoom: cam.zoom > 1.2 ? 1.0 : 1.65,
                          };
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-[11px] font-semibold text-cyan-300 flex items-center justify-center gap-1 transition-all"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Punch-In 1.6x</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeInspectorTab === 'video' && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block pb-1 border-b border-neutral-800">
                    Transform Coordinates
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] text-neutral-500 block mb-1">Position X</label>
                      <input
                        type="number"
                        value={currentScene.stykPosition[0]}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].stykPosition = [
                            Number(e.target.value),
                            currentScene.stykPosition[1],
                          ];
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-500 block mb-1">Position Y</label>
                      <input
                        type="number"
                        value={currentScene.stykPosition[1]}
                        onChange={(e) => {
                          const updated = [...project.scenes];
                          updated[selectedSceneIndex].stykPosition = [
                            currentScene.stykPosition[0],
                            Number(e.target.value),
                          ];
                          onUpdateProject({ ...project, scenes: updated });
                        }}
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">On-Screen Headline</label>
                    <input
                      type="text"
                      value={currentScene.headline}
                      onChange={(e) => {
                        const updated = [...project.scenes];
                        updated[selectedSceneIndex].headline = e.target.value;
                        onUpdateProject({ ...project, scenes: updated });
                      }}
                      className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {activeInspectorTab === 'infographic' && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block pb-1 border-b border-neutral-800">
                    Infographic Overlay
                  </span>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Type</label>
                    <select
                      value={currentScene.infographic}
                      onChange={(e) => {
                        const updated = [...project.scenes];
                        updated[selectedSceneIndex].infographic = e.target.value as InfographicType;
                        onUpdateProject({ ...project, scenes: updated });
                      }}
                      className="w-full p-1.5 bg-black border border-neutral-800 rounded text-white text-xs"
                    >
                      <option value="none">None</option>
                      <option value="metric_counter">Metric Counter</option>
                      <option value="bar_chart">Bar Chart</option>
                      <option value="terminal">Code Terminal</option>
                      <option value="alert_card">Alert Banner</option>
                      <option value="sparkline">Sparkline Flow</option>
                    </select>
                  </div>

                  {currentScene.infographic !== 'none' && (
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Metric Metric/Header</label>
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
                        className="w-full p-1.5 bg-black border border-neutral-800 rounded text-cyan-400 font-bold font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeInspectorTab === 'history' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold flex items-center gap-1.5 pb-1 border-b border-neutral-800">
                    <History className="w-3 h-3 text-violet-400" />
                    Checkpoint History
                  </span>
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-2 rounded bg-black/60 border border-neutral-800 space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-neutral-400 font-mono text-[9px]">
                        <span>{cp.timestamp}</span>
                        <button
                          onClick={() => {
                            onUpdateProject(cp.projectState);
                            playSFX('ding');
                          }}
                          className="text-violet-400 hover:text-violet-300 font-bold"
                        >
                          Restore
                        </button>
                      </div>
                      <div className="font-semibold text-white text-[11px]">{cp.description}</div>
                      <div className="text-[9px] text-neutral-500 italic line-clamp-1">
                        &ldquo;{cp.promptSnippet}&rdquo;
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 2. MIDDLE NLE WORKSPACE: Full-Width Multi-Track Timeline (CapCut/DaVinci) */}
      <div className="h-44 sm:h-48 bg-[#090C12] border-b border-neutral-800 flex flex-col shrink-0 select-none">
        {/* Timeline Header & Pro Toolbar */}
        <div className="h-8 border-b border-neutral-800 bg-neutral-950 px-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-1 rounded text-xs flex items-center gap-1 ${
                activeTool === 'select' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Selection Tool (V)"
            >
              <MousePointer className="w-3 h-3" />
            </button>

            <button
              onClick={() => {
                setActiveTool('split');
                handleSplitAtPlayhead();
              }}
              className={`p-1 rounded text-xs flex items-center gap-1 ${
                activeTool === 'split' ? 'bg-neutral-800 text-rose-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Split Tool (C)"
            >
              <Scissors className="w-3 h-3" />
              <span className="text-[10px]">Split</span>
            </button>

            <button
              onClick={handleSplitAtPlayhead}
              className="p-1 rounded text-neutral-400 hover:text-rose-400 text-xs flex items-center gap-1"
              title="Add Keyframe (◇)"
            >
              <Diamond className="w-3 h-3 text-[#FF007F]" />
              <span className="text-[10px]">Keyframe</span>
            </button>

            {/* Bezier Easing Motion Curve Selector */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-neutral-800">
              <span className="text-[9px] font-mono text-neutral-500">Curve:</span>
              <select
                value={activeEasing}
                onChange={(e) => {
                  setActiveEasing(e.target.value as EasingType);
                  playSFX('pop');
                }}
                className="bg-black border border-neutral-800 rounded px-1.5 py-0.5 text-[9px] font-mono text-cyan-400 focus:outline-none"
              >
                <option value="ease-in-out">Ease In-Out</option>
                <option value="bounce">Elastic Bounce</option>
                <option value="anticipation">Anticipation</option>
                <option value="linear">Linear</option>
              </select>
            </div>
          </div>

          {/* Timeline Zoom Slider */}
          <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono">
            <ZoomOut className="w-3 h-3 text-neutral-500" />
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(Number(e.target.value))}
              className="w-16 accent-rose-500 h-1 bg-neutral-800 rounded"
            />
            <ZoomIn className="w-3 h-3 text-neutral-500" />
          </div>
        </div>

        {/* Tracks Area */}
        <div className="flex-1 overflow-x-auto relative flex flex-col p-2 space-y-1.5 no-scrollbar">
          {/* Time Ruler */}
          <div className="h-4 border-b border-neutral-800/80 relative text-[8px] font-mono text-neutral-500 flex items-end">
            {Array.from({ length: Math.ceil(project.durationTotal) + 1 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute bottom-0 border-l border-neutral-700 pl-0.5 h-2.5"
                style={{ left: `${(sec / project.durationTotal) * 100}%` }}
              >
                {sec}s
              </div>
            ))}
          </div>

          {/* Playhead Red Needle */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none shadow-md shadow-rose-500/50"
            style={{ left: `${(playheadTime / project.durationTotal) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[4px] -mt-1 shadow" />
          </div>

          {/* Track 1: V2 Infographics & Overlays */}
          <div className="h-6 bg-neutral-900/80 rounded border border-neutral-800 flex items-center px-2 relative overflow-hidden">
            <div className="w-20 shrink-0 flex items-center gap-1.5 text-[9px] font-mono text-amber-400 font-bold">
              <BarChart3 className="w-3 h-3" />
              <span>V2 INFO</span>
            </div>
            <div className="flex-1 h-4 rounded bg-amber-950/30 border border-amber-500/30 flex items-center px-1.5 text-[9px] text-amber-300 font-mono truncate">
              {currentScene.infographic !== 'none' ? `Infographic: ${currentScene.infographic}` : 'No Overlay'}
            </div>
          </div>

          {/* Track 2: V1 Stykman Animation Rig (with Keyframe Diamonds) */}
          <div className="h-7 bg-neutral-900 rounded border border-neutral-800 flex items-center px-2 relative overflow-hidden">
            <div className="w-20 shrink-0 flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 font-bold">
              <FileVideo className="w-3 h-3" />
              <span>V1 STYK</span>
            </div>
            <div className="flex-1 h-5 rounded bg-cyan-950/30 border border-cyan-500/40 flex items-center px-2 text-[9px] text-cyan-300 font-mono relative">
              <span className="truncate">Rig: {currentScene.stykAction} {currentScene.secondaryCharacter?.enabled ? '+ Co-Actor' : ''}</span>
              {/* Draggable Laser Magenta Keyframes */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#FF007F] border border-white shadow-sm cursor-grab"
                style={{ left: '20%' }}
                title="Action Keyframe"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#FF007F] border border-white shadow-sm cursor-grab"
                style={{ left: '65%' }}
                title="Expression Keyframe"
              />
            </div>
          </div>

          {/* Track 3: A1 Voiceover Audio Waveform with Live Mic Button */}
          <div className="h-7 bg-neutral-900/80 rounded border border-neutral-800 flex items-center px-2 relative overflow-hidden">
            <div className="w-20 shrink-0 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 font-bold">
              <button
                onClick={handleToggleRecordMic}
                className="hover:text-white"
                title="Record Scene Voice"
              >
                {isRecordingMic ? (
                  <MicOff className="w-3 h-3 text-rose-500 animate-pulse" />
                ) : (
                  <Music className="w-3 h-3" />
                )}
              </button>
              <span>A1 AUDIO</span>
            </div>
            <div className="flex-1 h-5 rounded bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between px-2 text-[9px] text-emerald-300 font-mono relative overflow-hidden">
              {/* Waveform Bars Visualizer */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center gap-[2px] px-1 opacity-60 pointer-events-none">
                {(currentScene.audioWaveform || generateSyntheticWaveform(45, selectedSceneIndex + 1)).map((val, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-emerald-600 to-cyan-400 rounded-full"
                    style={{ height: `${Math.max(12, val * 85)}%` }}
                  />
                ))}
              </div>
              <span className="relative z-10 truncate font-semibold">
                {currentScene.userRecordedAudioUrl ? '🎙️ Mic Take (Recorded)' : currentScene.voiceover}
              </span>
              <span className="relative z-10 text-[8px] text-emerald-400 shrink-0 bg-neutral-900/80 px-1 rounded ml-1">
                {currentScene.duration}s
              </span>
            </div>
          </div>

          {/* Track 4: SUB Dynamic Captions */}
          <div className="h-5 bg-neutral-900/60 rounded border border-neutral-800 flex items-center px-2 relative overflow-hidden">
            <div className="w-20 shrink-0 text-[8px] font-mono text-violet-400 font-bold">
              SUB
            </div>
            <div className="flex-1 h-3.5 rounded bg-violet-950/30 border border-violet-500/20 flex items-center px-1.5 text-[8px] text-violet-300 font-mono truncate">
              Karaoke Word Timing Sync
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM DOCKED ZONE: Attachment Buttons + AI Prompt Bar (NEW & PROMINENT) */}
      <footer className="h-14 sm:h-16 bg-[#080B10] border-t border-neutral-800/90 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20">
        {/* Attachment Buttons Group */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleAddStykAction('jump')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 text-[11px] font-semibold text-neutral-300 hover:text-cyan-400 transition-colors whitespace-nowrap shadow-sm"
            title="Attach a new Stickman action"
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>Styk Rig</span>
          </button>

          <button
            onClick={() => handleAddInfographic('bar_chart')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-[11px] font-semibold text-neutral-300 hover:text-amber-400 transition-colors whitespace-nowrap shadow-sm"
            title="Attach a UI infographic or chart"
          >
            <BarChart3 className="w-3 h-3 text-amber-400" />
            <span>Infographic</span>
          </button>

          <button
            onClick={() => playSFX('ding')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 text-[11px] font-semibold text-neutral-300 hover:text-emerald-400 transition-colors whitespace-nowrap shadow-sm"
            title="Attach a sound effect"
          >
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span>SFX</span>
          </button>
        </div>

        {/* AI Prompt Input Bar */}
        <div className="flex-1 max-w-2xl flex items-center gap-2">
          <div className="relative flex-1">
            <Wand2 className="w-3.5 h-3.5 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={promptEditInput}
              onChange={(e) => setPromptEditInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAIPromptEdit()}
              placeholder="Prompt an edit (e.g. 'split at 4.2s, add a rising bar chart, make stickman celebrate')..."
              className="w-full bg-black/70 border border-neutral-700/80 hover:border-neutral-600 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 shadow-inner transition-colors"
            />
          </div>

          <button
            onClick={handleRunAIPromptEdit}
            disabled={isApplyingPrompt || !promptEditInput.trim()}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-violet-600/30 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run Edit</span>
          </button>
        </div>

        {/* Undo / Redo & Checkpoint Actions */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 text-neutral-400">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
            title="Undo (Ctrl+Z / Cmd+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
            title="Redo (Ctrl+Y / Cmd+Shift+Z)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Real In-Browser Video Rendering Progress Modal */}
      {isRenderingVideo && renderProgress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F17] border border-cyan-500/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Rendering Master Video</h4>
                <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[220px]">
                  {renderProgress.message}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold">{renderProgress.phase.toUpperCase()}</span>
                <span className="text-white">{renderProgress.progress}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-200"
                  style={{ width: `${renderProgress.progress}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 font-mono text-center">
              Muxing 30fps canvas stream + Web Audio destination directly in browser
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
