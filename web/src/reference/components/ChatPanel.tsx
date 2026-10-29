/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Copy,
  Check,
  Square,
  Mic,
  Radio,
} from 'lucide-react';
import type { ChatMessage, CharacterConfig } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  character: CharacterConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  accentColor: string;
  interimTranscript?: string;
  isSpeaking?: boolean;
  onStopSpeech?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClearMessages,
  character,
  isExpanded: _isExpanded = true,
  onToggleExpand: _onToggleExpand,
  accentColor: _accentColor = '#f43f5e',
  interimTranscript,
  isSpeaking,
  onStopSpeech
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stonic Video Quick Prompts
  const quickPrompts = [
    "Hello Bou! Can you hear me?",
    "Alice ko dollar aur gold rate research pe lagao",
    "Neend nahi aa rahi hai, peaceful music chalao",
    "Camera me dekho maine kya pakda hai",
    "World Monitor kholo"
  ];

  const getActionBadge = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('music') || lower.includes('sleep') || lower.includes('peaceful') || lower.includes('ঘুম') || lower.includes('গান')) {
      return { label: 'agent: open_music_task', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    if (lower.includes('dollar') || lower.includes('gold') || lower.includes('alice') || lower.includes('rate') || lower.includes('ডলার') || lower.includes('স্বর্ণ')) {
      return { label: 'agent: open_search_task', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    if (lower.includes('camera') || lower.includes('marker') || lower.includes('দেখো')) {
      return { label: 'vision: object_recognition', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
    return { label: 'model: gemini-2.5-flash', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 overflow-hidden font-mono text-slate-200">
      {/* 1. SCROLLABLE MESSAGE STREAM */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs select-text"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <Radio className="w-8 h-8 text-rose-500/40 mb-2 animate-pulse" />
            <span className="font-bold text-slate-400">BOU NEURAL MATRIX READY</span>
            <span className="text-[10px] text-slate-600 mt-1">
              Speak via microphone or click a video quick command below.
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isAssistant = msg.sender === 'assistant';
            const actionBadge = isAssistant ? getActionBadge(msg.text) : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} group`}
              >
                {/* Message Header (matching Stonic video at 01:44 & 04:10) */}
                <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                  <span className={`font-bold tracking-wider uppercase ${isAssistant ? 'text-rose-400' : 'text-slate-300'}`}>
                    {isAssistant ? `BOU AI (${character.name})` : 'YOU / USER'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>

                  {actionBadge && (
                    <span className={`px-1.5 py-0.2 rounded border font-mono text-[9px] ${actionBadge.color}`}>
                      {actionBadge.label}
                    </span>
                  )}
                </div>

                {/* Message Bubble Card */}
                <div
                  className={`relative p-3 rounded-xl max-w-[94%] leading-relaxed font-sans text-xs sm:text-[13px] border transition-all ${
                    isAssistant
                      ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-md shadow-slate-950/40'
                      : 'bg-rose-950/30 border-rose-800/40 text-rose-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Actions Row */}
                  <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-[9px] text-slate-600">
                      {isAssistant ? 'SYNTHETIC AUDIO' : 'VOICE STREAM'}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-slate-200 transition-colors cursor-pointer"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. BOTTOM CONTROLS & INPUT DOCK */}
      <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-2 shrink-0">
        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:text-rose-300 text-slate-400 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Live Speech Recognition Transcript preview */}
        {interimTranscript && (
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-700/50 flex items-center gap-2 text-xs text-rose-200 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400 uppercase">Listening:</span>
            <span className="truncate italic font-sans text-xs">"{interimTranscript}"</span>
          </div>
        )}

        {/* Text Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type to Assistant (Bou Live)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-sans transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-30 text-slate-950 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {isSpeaking && onStopSpeech && (
            <button
              type="button"
              onClick={onStopSpeech}
              className="px-3 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Stop speech output"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearMessages}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer shrink-0"
            title="Clear dialogue feed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
