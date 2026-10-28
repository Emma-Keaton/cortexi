'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Scissors,
  Layers,
  Settings as SettingsIcon,
  Play,
  ChevronDown,
  Check,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'generate' | 'autoclip' | 'editor';
  onTabChange: (tab: 'generate' | 'autoclip' | 'editor') => void;
  onOpenSettings: () => void;
  onQuickExport: () => void;
  isRendering?: boolean;
}

const TAB_OPTIONS = [
  {
    id: 'generate' as const,
    label: 'Generate / Storyboard',
    shortLabel: 'Storyboard',
    icon: Film,
    colorClass: 'text-violet-400',
    bgActive: 'bg-violet-600',
  },
  {
    id: 'autoclip' as const,
    label: 'Viral Auto-Clip',
    shortLabel: 'Auto-Clip',
    icon: Scissors,
    colorClass: 'text-cyan-400',
    bgActive: 'bg-cyan-500 text-black',
  },
  {
    id: 'editor' as const,
    label: 'Pro Editor & Canvas',
    shortLabel: 'Editor',
    icon: Layers,
    colorClass: 'text-rose-400',
    bgActive: 'bg-rose-500',
  },
];

export default function Header({
  activeTab,
  onTabChange,
  onOpenSettings,
  onQuickExport,
  isRendering = false,
}: HeaderProps) {
  const [isTabletDropdownOpen, setIsTabletDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const activeOption = TAB_OPTIONS.find((t) => t.id === activeTab) || TAB_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTabletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="h-13 sm:h-14 border-b border-neutral-800 bg-[#0B0F17]/95 backdrop-blur px-3 sm:px-4 flex items-center justify-between gap-3 sticky top-0 z-50 select-none">
      {/* Left: Brand & Engine Tag */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img src="/logo.jpeg" alt="Cortexi" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-md shadow-violet-600/20" />
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-sm sm:text-base tracking-wider">
            CORTEXI
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 border border-cyan-500/30 px-1 py-0.5 rounded hidden sm:inline">
            Studio
          </span>
        </div>
      </div>

      {/* Center 1: Desktop Full 3-Tab Segmented Control (>= 1024px) */}
      <div className="hidden lg:flex items-center p-1 bg-neutral-900/90 rounded-lg border border-neutral-800 shadow-inner">
        {TAB_OPTIONS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? `${tab.bgActive} text-white shadow-md`
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Center 2: Tablet Mode Selector Dropdown (640px to 1024px) */}
      {/* On mobile (< 640px), this is completely hidden because the bottom navigation bar handles tab switching */}
      <div className="hidden sm:flex lg:hidden relative" ref={dropdownRef}>
        <button
          onClick={() => setIsTabletDropdownOpen(!isTabletDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700/80 hover:border-neutral-600 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <ActiveIcon className={`w-3.5 h-3.5 ${activeOption.colorClass}`} />
          <span>{activeOption.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isTabletDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu Modal for Tablet */}
        {isTabletDropdownOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 p-1.5 rounded-xl bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Switch Workstation View
            </div>
            {TAB_OPTIONS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsTabletDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    isSelected
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${tab.colorClass}`} />
                    <span>{tab.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors"
          title="Workstation Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          onClick={onQuickExport}
          disabled={isRendering}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-95 shadow-md shadow-violet-600/25 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
        >
          {isRendering ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="hidden sm:inline">Rendering...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Export</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
