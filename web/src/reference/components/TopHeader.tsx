/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  SlidersHorizontal,
  PlayCircle,
  Palette,
  ChevronDown
} from 'lucide-react';
import type { CharacterConfig, RenderMode } from '../types';
import { THEMES } from '../config/appConfig';
import { useAssistant } from '../store/assistantContext';

interface TopHeaderProps {
  appName: string;
  character: CharacterConfig;
  mode: RenderMode;
  onOpenSettings: () => void;
  accentColor: string;
  onOpenSetup?: () => void;
  onOpenClassic?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  appName,
  character,
  mode,
  onOpenSettings,
  accentColor,
  onOpenSetup,
  onOpenClassic
}) => {
  const { theme, setThemeById } = useAssistant();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  return (
    <header className="w-full bg-[#05070c]/90 border-b border-slate-800/80 px-2 sm:px-6 py-2.5 backdrop-blur-md z-30 select-none font-mono">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Title & Links (matching Stonic video header) */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
            <span className="text-base font-black tracking-widest text-white whitespace-nowrap">
              {appName.toUpperCase()}.AI
            </span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
              NEURAL COCKPIT
            </span>
          </div>

          {/* Links: Demo Video & Feedback */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={onOpenSetup}
              className="hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              <PlayCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Setup</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={onOpenClassic}
              className="hover:text-slate-200 transition-colors text-[11px] cursor-pointer"
            >
              Classic tools
            </button>
          </div>
        </div>

        {/* Center: System Telemetry */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-slate-400">
          <span>
            ACTIVE NEURAL CORE: <strong className="text-white uppercase">{character.name}</strong>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            VIEW: <strong className="text-emerald-400">{mode.toUpperCase()}</strong>
          </span>
        </div>

        {/* Right: Theme Selector, Credits, Profile & Settings */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Theme Dropdown (matching Stonic video at 09:02) */}
          <div className="relative">
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Theme:</span>
              <span className="hidden min-[380px]:inline text-white font-semibold capitalize">{theme.id}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-2xl z-50 text-xs">
                <div className="text-[10px] text-slate-500 px-2 py-1 font-bold">
                  BOU INTERFACE THEMES
                </div>
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      setThemeById(th.id);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                      theme.id === th.id
                        ? 'bg-rose-500/20 text-rose-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span>{th.name.split(' ')[0]}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-slate-700"
                      style={{ backgroundColor: th.primary }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cloud Balance (e.g. 937 Credits from video 03:58) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <span className="text-rose-400 font-bold">937</span>
            <span className="text-[10px] text-slate-500">DEMO CREDITS</span>
          </div>

          {onOpenSetup && <button type="button" onClick={onOpenSetup} title="Open setup" aria-label="Open setup" className="md:hidden p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"><PlayCircle className="w-3.5 h-3.5" /></button>}
          {onOpenClassic && <button type="button" onClick={onOpenClassic} title="Classic tools" aria-label="Classic tools" className="md:hidden p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"><Settings className="w-3.5 h-3.5" /></button>}
          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Open Control Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
