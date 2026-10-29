/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Brain, Volume2, Shield } from 'lucide-react';
import type { AssistantState } from '../types';

interface AssistantStateIndicatorProps {
  state: AssistantState;
  onStateSelect?: (state: AssistantState) => void;
  audioAmplitude: number;
  accentColor: string;
}

export const AssistantStateIndicator: React.FC<AssistantStateIndicatorProps> = ({
  state,
  onStateSelect,
  audioAmplitude,
  accentColor
}) => {
  const stateMeta = {
    idle: {
      label: 'IDLE',
      icon: Shield,
      color: '#64748b'
    },
    listening: {
      label: 'LISTENING',
      icon: Mic,
      color: '#06b6d4'
    },
    thinking: {
      label: 'THINKING',
      icon: Brain,
      color: '#8b5cf6'
    },
    speaking: {
      label: 'SPEAKING',
      icon: Volume2,
      color: accentColor || '#10b981'
    }
  };

  const current = stateMeta[state];
  const CurrentIcon = current.icon;

  return (
    <div className="flex items-center gap-2 p-1 bg-slate-950/70 border border-slate-800/80 rounded-full backdrop-blur-md shadow-lg shadow-black/40">
      {/* Active State Pill */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all duration-300"
        style={{
          backgroundColor: `${current.color}18`,
          color: current.color,
          borderColor: `${current.color}40`
        }}
      >
        <motion.div
          animate={
            state === 'speaking'
              ? { scale: [1, 1 + audioAmplitude * 0.4, 1] }
              : state === 'listening'
              ? { scale: [1, 1.3, 1] }
              : state === 'thinking'
              ? { rotate: 360 }
              : { scale: 1 }
          }
          transition={{
            duration: state === 'thinking' ? 2 : 1,
            repeat: Infinity,
            ease: state === 'thinking' ? 'linear' : 'easeInOut'
          }}
        >
          <CurrentIcon className="w-3.5 h-3.5" />
        </motion.div>
        <span className="tracking-wider">{current.label}</span>
      </div>

      {/* State Switcher Buttons (Discreet) */}
      {onStateSelect && (
        <div className="flex items-center gap-0.5 pr-1">
          {(['idle', 'listening', 'thinking', 'speaking'] as AssistantState[]).map((s) => {
            const isActive = state === s;
            return (
              <button
                key={s}
                onClick={() => onStateSelect(s)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded-full capitalize transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
