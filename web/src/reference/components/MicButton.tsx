/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Mic, Radio } from 'lucide-react';

interface MicButtonProps {
  isActive: boolean;
  onClick: () => void;
  accentColor: string;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export const MicButton: React.FC<MicButtonProps> = ({
  isActive,
  onClick,
  accentColor,
  assistantState: _assistantState
}) => {
  return (
    <div className="relative flex flex-col items-center">
      {/* Concentric ripple rings when microphone is active */}
      {isActive && (
        <>
          <motion.div
            className="absolute -inset-3 rounded-full border pointer-events-none"
            style={{ borderColor: accentColor }}
            animate={{
              scale: [1, 1.4, 1.7],
              opacity: [0.8, 0.4, 0]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          <motion.div
            className="absolute -inset-1 rounded-full border border-dashed pointer-events-none"
            style={{ borderColor: accentColor }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}

      {/* Main Big Microphone Button */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className="relative z-10 w-20 h-20 md:w-22 md:h-22 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        style={{
          backgroundColor: isActive ? accentColor : '#0f172a',
          border: `2px solid ${isActive ? '#ffffff' : accentColor}`,
          boxShadow: isActive
            ? `0 0 35px ${accentColor}, inset 0 0 15px rgba(255, 255, 255, 0.4)`
            : `0 0 20px ${accentColor}40`
        }}
        aria-label={isActive ? 'Stop listening' : 'Start voice input'}
      >
        {isActive ? (
          <Radio className="w-8 h-8 text-slate-950 animate-pulse" />
        ) : (
          <Mic className="w-8 h-8 text-white transition-colors duration-200" />
        )}
      </motion.button>

      {/* Status Tooltip / Kicker */}
      <span className="mt-2 text-[11px] font-mono tracking-wider text-slate-400 uppercase">
        {isActive ? 'LISTENING (CLICK TO STOP)' : 'PUSH TO TALK'}
      </span>
    </div>
  );
};
