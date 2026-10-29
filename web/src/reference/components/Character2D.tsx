/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CharacterConfig } from '../types';
const SnapshotCharacter = lazy(() => import('../../components/Character3D').then((module) => ({ default: module.Character3D })));

interface Character2DProps {
  character: CharacterConfig;
  audioAmplitude: number;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export const Character2D: React.FC<Character2DProps> = ({
  character,
  audioAmplitude,
  assistantState,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    `/models/${character.id === 'female' ? 'bou.png' : 'aether.png'}`
  );
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [portraitMissing, setPortraitMissing] = useState(false);

  // Update image source when character changes
  useEffect(() => {
    setImgSrc(`/models/${character.id === 'female' ? 'bou.png' : 'aether.png'}`);
    setPortraitMissing(false);
  }, [character.id]);

  // Periodic natural blinking cycle (every 3.8 - 5.0 seconds)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let closeTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const triggerBlink = () => {
      setIsBlinking(true);
      closeTimeoutId = setTimeout(() => {
        setIsBlinking(false);
      }, 150); // Eyelid closure duration: 150ms

      const nextInterval = 3400 + Math.random() * 2200;
      timeoutId = setTimeout(triggerBlink, nextInterval);
    };

    timeoutId = setTimeout(triggerBlink, 3000);
    return () => { clearTimeout(timeoutId); if (closeTimeoutId) clearTimeout(closeTimeoutId); };
  }, [character.id]);

  const isSpeaking = assistantState === 'speaking';
  const isListening = assistantState === 'listening';
  const isThinking = assistantState === 'thinking';

  // Audio-reactive scale multiplier
  const reactiveScale = 1 + (isSpeaking ? audioAmplitude * 0.08 : 0);

  return (
    <div className="w-full h-full flex items-center justify-center relative select-none overflow-hidden">
      {/* Dynamic Ambient Glow Behind Avatar */}
      <motion.div
        className="absolute rounded-full pointer-events-none blur-3xl opacity-40"
        style={{
          width: '460px',
          height: '460px',
          backgroundColor: character.accentColor,
        }}
        animate={{
          scale: [1, 1.18, 1],
          opacity: isSpeaking ? [0.45, 0.75, 0.45] : [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: isSpeaking ? 0.5 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Outer Rotating Futuristic Tech HUD Rings */}
      <div className="absolute w-[380px] h-[380px] md:w-[500px] md:h-[500px] pointer-events-none flex items-center justify-center">
        {/* Ring 1 - Dashed Slow Spin */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-slate-700/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />

        {/* Ring 2 - Segmented Tech Accents */}
        <motion.div
          className="absolute inset-4 rounded-full border border-slate-800"
          style={{ borderColor: `${character.accentColor}33` }}
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full"
            style={{ backgroundColor: character.accentColor }}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full"
            style={{ backgroundColor: character.accentColor }}
          />
        </motion.div>

        {/* Ring 3 - Audio Ripple in Speaking / Listening State */}
        {(isSpeaking || isListening) && (
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: character.accentColor }}
            animate={{
              scale: [1, 1.25, 1.45],
              opacity: [0.8, 0.3, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </div>

      {/* Layered Avatar Card Container with Breathing & Parallax */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center"
        animate={{
          y: [-7, 7, -7],
          scale: reactiveScale,
        }}
        transition={{
          y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.1, ease: 'easeOut' },
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={character.id}
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Front-Facing Portrait Avatar Frame */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl p-1.5 overflow-hidden bg-gradient-to-b from-slate-700/50 via-slate-900/80 to-slate-950 border border-slate-700/70 shadow-2xl shadow-cyan-950/50">
              {/* Dynamic Rim Border Glow */}
              <div
                className="absolute inset-0 rounded-3xl opacity-35 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 35px ${character.accentColor}`,
                }}
              />

              {/* Portrait Image */}
              {portraitMissing ? <Suspense fallback={<div className="m-auto text-xs text-cyan-300">Preparing VRM snapshot…</div>}>
                <SnapshotCharacter characterId={character.id === 'female' ? 'bou' : 'aether'} status={assistantState} amplitude={audioAmplitude} gaze={{ x: 0, y: 0 }} snapshotOnly />
              </Suspense> : <img
                src={imgSrc}
                alt={character.name}
                onError={() => {
                  // Use the matching VRM snapshot if the optional portrait is missing.
                  setPortraitMissing(true);
                }}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2xl select-none"
              />}

              {/* Natural Eyelid Blink Overlay (Eyelid shutter over the eye horizon) */}
              <div
                className={`absolute inset-x-0 top-[28%] h-[24%] pointer-events-none transition-transform duration-75 ease-in-out ${
                  isBlinking ? 'scale-y-100 opacity-80' : 'scale-y-0 opacity-0'
                }`}
                style={{
                  transformOrigin: 'top',
                  background:
                    'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
                  backdropFilter: 'blur(2px)',
                }}
              />

              {/* Synthetic HUD Scanline Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent bg-[length:100%_4px] opacity-60" />

              {/* Lip-Sync Pulse Overlay on Avatar Mouth Area */}
              {isSpeaking && (
                <motion.div
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full pointer-events-none blur-md"
                  style={{ backgroundColor: character.accentColor }}
                  animate={{
                    opacity: [0.2, 0.7 * audioAmplitude, 0.2],
                    scale: [0.9, 1 + audioAmplitude * 0.45, 0.9],
                  }}
                  transition={{ duration: 0.12, repeat: Infinity }}
                />
              )}

              {/* Thinking State Scanning Beam */}
              {isThinking && (
                <motion.div
                  className="absolute inset-x-0 h-1 pointer-events-none shadow-lg"
                  style={{
                    backgroundColor: character.accentColor,
                    boxShadow: `0 0 15px ${character.accentColor}`,
                  }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                />
              )}

              {/* Corner Sci-Fi Tech Brackets */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />
            </div>

            {/* Floating Character Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-200 font-semibold tracking-wider uppercase">
                {character.name}
              </span>
              <span>·</span>
              <span>{character.codename}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
