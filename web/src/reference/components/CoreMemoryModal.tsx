/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
} from 'lucide-react';
import type { MemoryItem } from '../types';

interface CoreMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (text: string, category: MemoryItem['category']) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  accentColor?: string;
}

export const CoreMemoryModal: React.FC<CoreMemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
  accentColor: _accentColor = '#f43f5e'
}) => {
  const [search, setSearch] = useState('');
  const [newText, setNewText] = useState('');
  const [category] = useState<MemoryItem['category']>('preference');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredMemories = memories.filter((m) =>
    m.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddMemory(newText.trim(), category);
      setNewText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c101a] border border-rose-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-rose-950/60 font-mono text-slate-200">
        {/* Header Bar matching Stonic video (02:45 / 09:11) */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-widest text-white">
                  CORE MEMORY
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
                  64 / 2000 MEMORY SLOTS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                CONTINUOUSLY LEARNED • EDIT OR REMOVE BELOW
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-3.5 bg-rose-950/20 border-b border-rose-900/30 text-xs text-rose-200 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px]">
            This neural memory system automatically learns from your daily conversations. It remembers your work habits, sleep patterns, projects, city, and preferred communication style.
          </p>
        </div>

        {/* Search & Add New Memory Form */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter learned memory vectors..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
            />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Manually inject a permanent fact (e.g. Likes ambient music when working late)..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans"
            />
            <button
              type="submit"
              disabled={!newText.trim() || isSubmitting}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Store Fact</span>
            </button>
          </form>
        </div>

        {/* Memory List with categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No memories matching search query.
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans font-normal">
                    {mem.text}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.2 rounded uppercase tracking-wider text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
                      {mem.category}
                    </span>
                    <span>LEARNED: {mem.createdAt}</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      ACTIVE IN BRAIN
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                  title="Forget this memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
