/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';

interface AudioVisualizerProps {
  amplitude: number;
  accentColor: string;
  isSpeaking: boolean;
  onManualAmplitudeChange?: (val: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  amplitude,
  accentColor,
  isSpeaking,
  onManualAmplitudeChange
}) => {
  // 12 simulated equalizer bars
  const barCount = 12;

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>LIP-SYNC AMPLITUDE</span>
        </div>
        <span className="font-semibold tabular-nums" style={{ color: accentColor }}>
          {(amplitude * 100).toFixed(0)}%
        </span>
      </div>

      {/* Visualizer Equalizer Bar Strip */}
      <div className="flex items-end justify-center gap-1.5 h-8 w-full px-2">
        {Array.from({ length: barCount }).map((_, i) => {
          // Dynamic height calculated from amplitude and position wave
          const waveFactor = Math.sin((i / barCount) * Math.PI);
          const computedHeight = isSpeaking || amplitude > 0
            ? Math.max(15, amplitude * 100 * waveFactor + Math.random() * 15)
            : 10;

          return (
            <motion.div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: `${Math.min(100, computedHeight)}%`,
                backgroundColor: amplitude > 0.05 ? accentColor : '#334155',
                boxShadow: amplitude > 0.2 ? `0 0 8px ${accentColor}80` : 'none'
              }}
            />
          );
        })}
      </div>

      {/* Lip-Sync Calibration Slider (Dev / Testing) */}
      {onManualAmplitudeChange && (
        <div className="flex items-center gap-2 w-full pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
          <span>TEST:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={amplitude}
            onChange={(e) => onManualAmplitudeChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
