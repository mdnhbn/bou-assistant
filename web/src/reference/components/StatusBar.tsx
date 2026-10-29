/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Wifi, Cpu, Layers, KeyRound, Sparkles, CircleDot } from 'lucide-react';
import type { CharacterConfig, RenderMode, ApiKeyItem, EntityForm } from '../types';

interface StatusBarProps {
  character: CharacterConfig;
  mode: RenderMode;
  entityForm?: EntityForm;
  onCycleForm?: () => void;
  onToggleMode: () => void;
  onToggleCharacter: () => void;
  activeApiKey: ApiKeyItem | null;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
  accentColor: string;
  connectionLabel?: string;
  modelLabel?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  character,
  mode,
  entityForm = 'female',
  onCycleForm,
  onToggleMode,
  onToggleCharacter,
  activeApiKey,
  assistantState,
  accentColor,
  connectionLabel = 'LOCAL',
  modelLabel = 'GEMINI'
}) => {
  return (
    <footer className="w-full bg-slate-950/80 border-t border-slate-800/80 px-4 py-2.5 backdrop-blur-md text-[11px] font-mono text-slate-400 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Character & Stonica Form */}
        <div className="flex items-center gap-3">
          {onCycleForm ? (
            <button
              onClick={onCycleForm}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Click to cycle entity form: ORB -> FEMALE -> MALE"
            >
              {entityForm === 'orb' ? (
                <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
              )}
              <span>FORM:</span>
              <span className="font-semibold uppercase tracking-wider text-white">
                {entityForm}
              </span>
              <span className="text-[10px] text-slate-500">({character.name})</span>
            </button>
          ) : (
            <button
              onClick={onToggleCharacter}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Click to toggle character (Male / Female)"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="font-semibold uppercase tracking-wider text-white">
                {character.name}
              </span>
              <span className="text-[10px] text-slate-400">({character.codename})</span>
            </button>
          )}

          {/* Quick 3D / 2D Mode Switcher */}
          <button
            onClick={onToggleMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Toggle between 3D Canvas and 2D Avatar"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>MODE:</span>
            <span className="font-bold uppercase text-white">{mode}</span>
          </button>
        </div>

        {/* Center: Real-time Assistant Subsystem State */}
        <div className="hidden md:flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>BRAIN:</span>
            <span className="text-slate-200">{modelLabel.toUpperCase()}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{connectionLabel}:</span>
            <span className="text-emerald-400 font-semibold uppercase">
              {assistantState === 'idle' ? 'STANDBY' : assistantState.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right: Active API Key Slot & Model Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>API KEY:</span>
            <span className="text-slate-200 font-semibold">
              {activeApiKey ? activeApiKey.label.split(' ')[0] : 'NOT SET'}
            </span>
            {activeApiKey && activeApiKey.limit > 0 && (
              <span className="text-[10px] text-slate-400">
                ({activeApiKey.callsCount}/{activeApiKey.limit})
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
