/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Sparkles,
  Clock,
} from 'lucide-react';
import type { MemoryItem } from '../types';

interface MemoryPanelProps {
  memories: MemoryItem[];
  onAddMemory: (text: string, category: MemoryItem['category']) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  accentColor?: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
  accentColor: _accentColor = '#06b6d4'
}) => {
  const [newText, setNewText] = useState('');
  const [category, setCategory] = useState<MemoryItem['category']>('preference');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const getCategoryBadgeClass = (cat: MemoryItem['category']) => {
    switch (cat) {
      case 'preference':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'identity':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'workflow':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Informational Header */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 leading-relaxed">
        <div className="font-semibold flex items-center gap-1.5 mb-1 text-purple-100">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span>আমার সম্পর্কে যা মনে রেখেছি (Things I remember about you)</span>
        </div>
        Long-term contextual recall entries injected into the assistant's neural memory prompt.
        {/* TODO: Step 3 - Connect to real semantic vector database / IndexedDB with embedding search */}
      </div>

      {/* Add New Memory Form */}
      <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>নতুন স্মৃতি যোগ করুন (Add New Memory)</span>
        </label>

        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="e.g., Prefers detailed architectural explanations with diagrams..."
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {(['preference', 'identity', 'workflow', 'fact'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] font-mono capitalize transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!newText.trim() || isSubmitting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Memory</span>
          </button>
        </div>
      </form>

      {/* Memory List */}
      <div className="space-y-2.5">
        {memories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No memories stored yet. Add one above.
          </div>
        ) : (
          memories.map((mem) => (
            <div
              key={mem.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-relaxed">{mem.text}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                  <span className={`px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${getCategoryBadgeClass(mem.category)}`}>
                    {mem.category}
                  </span>
                  {mem.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{mem.createdAt}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteMemory(mem.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer"
                title="Delete memory item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
