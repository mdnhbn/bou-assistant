/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { AgentInfo } from '../types';
import {
  Users,
  Eye,
  Hand,
  Bot,
  Play,
  Sparkles,
  Cpu
} from 'lucide-react';

interface AgentTownProps {
  agents: AgentInfo[];
  onDispatchTask: (agentId: string, taskDescription: string) => void;
  accentColor?: string;
  onOpenBrowser?: () => void;
}

export const AgentTown: React.FC<AgentTownProps> = ({
  agents,
  onDispatchTask,
  accentColor: _accentColor = '#f43f5e',
  onOpenBrowser
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'visual' | 'gesture'>('agents');
  const [walkerStep, setWalkerStep] = useState(0);

  // Animate walking / idle bobbing effect
  useEffect(() => {
    const interval = setInterval(() => {
      setWalkerStep((s) => (s + 1) % 4);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const alice = agents.find((a) => a.id === 'alice') || agents[0];

  return (
    <div className="w-full bg-[#0a0c12]/95 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-md">
      {/* Top Header Controls bar matching Stonic video (01:44 & 03:00) */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-wider text-rose-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            HABIT TOWN
          </span>
          <span className="text-[10px] font-mono text-slate-500">/ AGENT TOWN</span>
        </div>

        {/* Tab Switchers: [ agents ] [ visual tab ] [ gesture ] */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>agents</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('visual');
              if (onOpenBrowser) onOpenBrowser();
            }}
            className={`px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'visual'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>visual tab</span>
          </button>
          <button
            onClick={() => setActiveTab('gesture')}
            className={`px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'gesture'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3 h-3" />
            <span>gesture</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="text-emerald-400 font-semibold">4 AGENTS ACTIVE</span>
        </div>
      </div>

      {/* 2D RETRO PIXEL OFFICE CANVAS STAGE */}
      <div className="relative w-full h-56 sm:h-64 bg-[#111624] overflow-hidden select-none p-2 flex items-center justify-center">
        {/* Pixel Office Tile Floor Pattern */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
            backgroundSize: '16px 16px'
          }}
        />

        {/* Office Walls & Partitions */}
        <div className="absolute inset-x-2 top-2 h-6 border-b-2 border-slate-700 bg-slate-900/60 flex items-center justify-between px-3 text-[9px] font-mono text-slate-500">
          <span>RESEARCH & SYNTHESIS LAB • CUBICLE SECTOR-A</span>
          <span>SYSTEMS READY</span>
        </div>

        {/* CUBICLE DESK 1: Alice (Lead Researcher / Browser Agent) */}
        <div
          onClick={() => setSelectedAgent(alice)}
          className="absolute left-[8%] sm:left-[12%] top-[28%] w-32 sm:w-36 p-2 rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-rose-400/80 transition-all cursor-pointer shadow-lg group"
        >
          {/* Floating Live Speech / Thought Bubble (matching video at 02:28) */}
          {alice.speechBubble && (
            <div className="absolute -top-12 -left-4 right-0 z-20 animate-bounce duration-1000">
              <div className="bg-slate-900/95 border border-cyan-400/70 text-cyan-200 px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-xl flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[210px]">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span className="truncate">{alice.speechBubble}</span>
              </div>
              <div className="w-2 h-2 bg-slate-900 border-r border-b border-cyan-400 rotate-45 ml-6 -mt-1" />
            </div>
          )}

          {/* Computer Desk Graphic */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1">
              <Bot className="w-3 h-3 text-rose-400" />
              Alice (Researcher)
            </span>
            <span className={`w-2 h-2 rounded-full ${alice.status === 'working' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          </div>

          <div className="flex items-center gap-2">
            {/* Animated Pixel Sprite Avatar */}
            <div
              className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-xs font-bold text-rose-200 transition-transform"
              style={{ transform: `translateY(${walkerStep % 2 === 0 ? '-2px' : '0px'})` }}
            >
              👩‍💻
            </div>

            {/* Desktop Screen Glow */}
            <div className="flex-1 bg-slate-950 p-1 rounded border border-slate-800 font-mono text-[9px] text-cyan-400">
              <div className="h-2 w-full bg-cyan-500/20 rounded animate-pulse mb-0.5" />
              <span className="text-[8px] text-slate-400 truncate block">
                {alice.currentTask || 'Web Browser Standby'}
              </span>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="text-slate-500">Press E</span>
            <span className="text-cyan-400 group-hover:underline">Open Task</span>
          </div>
        </div>

        {/* CUBICLE DESK 2: Bob (Software Architect / Terminal Agent) */}
        <div
          onClick={() => setSelectedAgent(agents.find((a) => a.id === 'bob') || null)}
          className="absolute right-[8%] sm:right-[12%] top-[28%] w-32 sm:w-36 p-2 rounded-xl bg-slate-900/85 border border-slate-700/80 hover:border-amber-400/80 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-amber-400" />
              Bob (Architect)
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-xs font-bold text-amber-200 transition-transform"
              style={{ transform: `translateY(${walkerStep % 2 !== 0 ? '-2px' : '0px'})` }}
            >
              👨‍💻
            </div>
            <div className="flex-1 bg-slate-950 p-1 rounded border border-slate-800 font-mono text-[9px] text-amber-400">
              <div className="h-2 w-3/4 bg-amber-500/20 rounded mb-0.5" />
              <span className="text-[8px] text-slate-400 truncate block">
                Full-Stack Runtime
              </span>
            </div>
          </div>

          <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="text-slate-500">Terminal</span>
            <span className="text-amber-400 group-hover:underline">Online</span>
          </div>
        </div>

        {/* Water Cooler & Coffee Station Center Piece */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 p-1.5 rounded-xl bg-slate-900/70 border border-slate-800 text-[9px] font-mono text-slate-400">
          <span>☕ Break Zone</span>
          <span>•</span>
          <span className="text-slate-500">Water Cooler 98%</span>
          <span>•</span>
          <span className="text-rose-400 font-semibold cursor-pointer hover:underline" onClick={() => onDispatchTask('alice', 'Research USD to PKR and Gold prices')}>
            Quick Prompt: "Task Alice"
          </span>
        </div>
      </div>

      {/* Selected Agent Quick Dispatch Drawer */}
      {selectedAgent && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-bold text-rose-300">
              {selectedAgent.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <span>{selectedAgent.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {selectedAgent.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedAgent.currentTask || 'Idle and ready for command.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDispatchTask(selectedAgent.id, 'Research USD exchange rate and gold market');
                if (onOpenBrowser) onOpenBrowser();
              }}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Dispatch Research</span>
            </button>
            <button
              onClick={() => setSelectedAgent(null)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
