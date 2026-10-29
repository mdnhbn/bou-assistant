/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  ArrowRight
} from 'lucide-react';
import type { SkillItem } from '../types';

interface StonicSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillItem[];
  onToggleSkill: (skillId: string) => void;
  accentColor?: string;
}

export const StonicSkillsModal: React.FC<StonicSkillsModalProps> = ({
  isOpen,
  onClose,
  skills,
  onToggleSkill,
  accentColor: _accentColor = '#f43f5e'
}) => {
  const [search, setSearch] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');

  if (!isOpen) return null;

  const filtered = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c101a] border border-rose-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-rose-950/60 font-mono text-slate-200">
        {/* Header Bar matching Stonic video (08:11 - 08:32) */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm tracking-widest text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>SKILLS & WORKFLOWS</span>
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
              GIVE YOUR AI AGENTS CUSTOM WORKFLOWS & AUTOMATIONS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingNew ? 'View All' : '+ New Skill'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Create Skill Form (matching Stonic video at 08:25) */}
        {isCreatingNew ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-rose-300 block mb-1">
                SKILL NAME *
              </label>
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. Write Weekly Market & Currency Report"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-300 block mb-1">
                DESCRIPTION *
              </label>
              <input
                type="text"
                value={newSkillDesc}
                onChange={(e) => setNewSkillDesc(e.target.value)}
                placeholder="What does this skill do? (AI will decide when to activate it)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-300 block mb-1">
                STEP-BY-STEP INSTRUCTIONS (HOW AI SHOULD EXECUTE) *
              </label>
              <textarea
                rows={5}
                value={newSkillInstructions}
                onChange={(e) => setNewSkillInstructions(e.target.value)}
                placeholder={`Example:\n1. Ask the user for the report date and asset.\n2. Dispatch Alice in Agent Town to fetch live market exchange rates.\n3. Write a professional bilingual summary report.`}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Demo skill preview saved for this session. TODO: connect a workflow runner.');
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Save Skill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agent capabilities..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
                />
              </div>
            </div>

            {/* Skills List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filtered.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => onToggleSkill(skill.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    skill.enabled
                      ? 'bg-slate-900/80 border-rose-500/50 shadow-lg shadow-rose-950/20'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {skill.name}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 font-sans font-normal">
                      {skill.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSkill(skill.id);
                    }}
                    className="text-rose-400 hover:text-rose-300 shrink-0"
                  >
                    {skill.enabled ? (
                      <ToggleRight className="w-6 h-6 text-rose-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
