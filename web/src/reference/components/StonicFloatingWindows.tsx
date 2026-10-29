/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Music2,
  Play,
  Pause,
  Globe,
  Camera,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

import { useAssistant } from '../store/assistantContext';


interface StonicFloatingWindowsProps {
  isMusicOpen: boolean;
  onCloseMusic: () => void;
  isBrowserOpen: boolean;
  onCloseBrowser: () => void;
  isCameraVisionOpen: boolean;
  onCloseCameraVision: () => void;
  accentColor?: string;
}

export const StonicFloatingWindows: React.FC<StonicFloatingWindowsProps> = ({
  isMusicOpen,
  onCloseMusic,
  isBrowserOpen,
  onCloseBrowser,
  isCameraVisionOpen,
  onCloseCameraVision,
  accentColor: _accentColor = '#f43f5e'
}) => {
  const { defaultCurrency } = useAssistant();
  // TODO: Connect an actual media playback adapter. These controls preview UI only.
  // Music Player State (matching Stonic video at 04:18 & 05:25)
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const [musicProgress, setMusicProgress] = useState(24);

  // Browser Agent State (matching Stonic video at 03:22)
  const [searchQuery] = useState('1 USD to PKR open market rate gold price today');
  const [isScraping, setIsScraping] = useState(false);

  // Camera Vision PIP State (matching Stonic video at 07:25)

  // Music progress timer simulation
  useEffect(() => {
    if (!isPlayingMusic || !isMusicOpen) return;
    const timer = setInterval(() => {
      setMusicProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlayingMusic, isMusicOpen]);

  return (
    <>
      {/* 1. BOU NEURAL PLAYER (Floating Media Window from video 04:18) */}
      {isMusicOpen && (
        <div className="fixed top-24 left-4 sm:left-12 z-40 w-[92vw] sm:w-[420px] bg-[#0c101a]/95 border border-rose-500/50 rounded-2xl overflow-hidden shadow-2xl shadow-rose-950/60 backdrop-blur-xl font-mono text-slate-200 select-none animate-in fade-in zoom-in-95 duration-200">
          {/* OS Window Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            {/* Mac-like Window Controls (matching video) */}
            <div className="flex items-center gap-2">
              <button
                onClick={onCloseMusic}
                className="w-3 h-3 rounded-full bg-rose-500 hover:brightness-125 transition-all cursor-pointer"
                title="Close Player"
              />
              <button
                onClick={() => setIsPlayingMusic(!isPlayingMusic)}
                className="w-3 h-3 rounded-full bg-amber-500 hover:brightness-125 transition-all cursor-pointer"
                title="Minimize / Pause"
              />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>

            <span className="text-[11px] font-bold tracking-widest text-rose-400 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5" />
              BOU NEURAL PLAYER
            </span>

            <div className="text-[10px] text-emerald-400 font-semibold">PLAYER UI DEMO</div>
          </div>

          {/* Album / Video Thumbnail Preview (Relaxing Sleep Music) */}
          <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
            {/* Ambient Nature / Waterfall Video Backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-70 scale-105 transition-transform duration-10000"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 40% 30%, #35606b, #152b45 48%, #090f1c 85%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Pulsing Sound Spectrum Waves */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-1 h-8 pointer-events-none">
              {[40, 80, 55, 90, 70, 35, 85, 95, 60, 45, 75, 50, 90, 65, 80, 40].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-rose-500 to-amber-300 rounded-t transition-all duration-300"
                  style={{
                    height: isPlayingMusic ? `${(h * (isPlayingMusic ? 1 : 0.2))}%` : '4px',
                    opacity: isPlayingMusic ? 0.85 : 0.3
                  }}
                />
              ))}
            </div>

            {/* Play / Pause Center Overlay Button */}
            <button
              onClick={() => setIsPlayingMusic(!isPlayingMusic)}
              className="relative z-10 w-12 h-12 rounded-full bg-rose-500/90 hover:bg-rose-400 text-slate-950 flex items-center justify-center shadow-lg shadow-rose-950/60 transition-transform active:scale-95 cursor-pointer"
            >
              {isPlayingMusic ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Player Metadata & Controls */}
          <div className="p-3.5 space-y-2.5">
            <div>
              <h4 className="text-xs font-bold text-white truncate">
                Flying: Relaxing Sleep Music for Meditation, Stress Relief
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Peder B. Helland • Soothing Ambient Synthesis
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${musicProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>02:14</span>
                <span className="text-rose-400 font-semibold">NEURAL SLEEP CYCLE</span>
                <span>45:00</span>
              </div>
            </div>

            {/* Assistant Whisper Prompt Quote from video (05:25) */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-rose-300 italic flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>"হৃদয় শান্ত করো, চোখ বন্ধ করে ধীরে ধীরে শ্বাস নাও... Sweet dreams."</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. AGENT BROWSER WINDOW (Web Search simulation from video 03:22) */}
      {isBrowserOpen && (
        <div className="fixed top-28 right-4 sm:right-16 z-40 w-[92vw] sm:w-[500px] bg-[#0c101a]/95 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/60 backdrop-blur-xl font-mono text-slate-200 select-none animate-in fade-in zoom-in-95 duration-200">
          {/* Browser Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onCloseBrowser}
                className="w-3 h-3 rounded-full bg-rose-500 hover:brightness-125 cursor-pointer"
              />
              <button className="w-3 h-3 rounded-full bg-amber-500 hover:brightness-125" />
              <button className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>

            {/* URL Search Bar */}
            <div className="flex-1 mx-3 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-[10px] text-cyan-300 truncate">
              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">google.com/search?q={encodeURIComponent(searchQuery)}</span>
            </div>

            <span className="text-[10px] text-cyan-400 font-bold">ALICE BOT</span>
          </div>

          {/* Browser Content Frame */}
          <div className="p-4 bg-white text-slate-900 max-h-80 overflow-y-auto font-sans select-text">
            {/* Google Header Simulation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
              <span className="text-lg font-bold text-blue-600 font-mono">Google</span>
              <div className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Demo financial cards · not live
              </div>
            </div>

            {/* Currency Card Result (Dynamic Currency Preference) */}
            {(() => {
              let curName = 'Pakistani Rupee (USD to PKR)';
              let curRate = '278.40 PKR';
              let goldRate = 'PKR 4,53,700 / tola';
              let source = 'State Bank & Open Market Demo';

              if (defaultCurrency === 'BDT') {
                curName = 'Bangladeshi Taka (USD to BDT)';
                curRate = '117.50 BDT';
                goldRate = 'BDT 1,18,500 / vori';
                source = 'Bangladesh Bank Interbank Demo';
              } else if (defaultCurrency === 'INR') {
                curName = 'Indian Rupee (USD to INR)';
                curRate = '83.25 INR';
                goldRate = 'INR 72,400 / 10g';
                source = 'Reserve Bank of India Demo';
              } else if (defaultCurrency === 'USD') {
                curName = 'US Dollar Base';
                curRate = '1.00 USD';
                goldRate = '$ 2,350.00 / oz';
                source = 'Federal Reserve / COMEX Demo';
              }

              return (
                <>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Exchange Rate: US Dollar to {curName}
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                      <span>{curRate}</span>
                      <span className="text-xs font-semibold text-emerald-600">+0.15 (+0.05%)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Open Market Currency Rates • {source}
                    </p>
                  </div>

                  {/* Gold Price Card Result */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div className="text-xs text-amber-900 uppercase font-semibold">
                      24K Gold Price Demo ({defaultCurrency === 'BDT' ? '1 Vori / 11.66g' : '1 Tola / 11.66g'})
                    </div>
                    <div className="text-2xl font-black text-amber-950 mt-1">
                      {goldRate}
                    </div>
                    <p className="text-[11px] text-amber-900/80 mt-0.5">
                      Local Bullion Association • Illustrative values only
                    </p>
                  </div>
                </>
              );
            })()}

            {/* Agent Feedback Badge */}
            <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Research preview only · connector TODO
              </span>
              <button
                onClick={() => {
                  setIsScraping(true);
                  setTimeout(() => setIsScraping(false), 1200);
                }}
                className="text-[11px] underline text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                {isScraping ? 'Refreshing demo…' : 'Refresh Demo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CAMERA VISION PIP WINDOW (from video 07:25 - 08:05) */}
      {isCameraVisionOpen && (
        <div className="fixed bottom-20 left-4 sm:left-12 z-40 w-[92vw] sm:w-[380px] bg-[#0c101a]/95 border border-emerald-500/50 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/60 backdrop-blur-xl font-mono text-slate-200 select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onCloseCameraVision}
                className="w-3 h-3 rounded-full bg-rose-500 hover:brightness-125 cursor-pointer"
              />
              <span className="text-[11px] font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                NEURAL VISION PREVIEW
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              VISION DEMO · CAMERA OFF
            </span>
          </div>

          {/* Webcam Vision Canvas with AI Bounding Box Overlay */}
          <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
            {/* Camera Frame Preview representation */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-85"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 55% 35%, #153e38, #0d211d 50%, #060d10 85%)'
              }}
            />
            <div className="absolute inset-0 bg-slate-950/50" />

            {/* Computer Vision Bounding Box Overlay (matching video 07:44) */}
            <div className="absolute top-[20%] left-[25%] w-[50%] h-[55%] border-2 border-emerald-400 rounded-lg shadow-[0_0_15px_rgba(52,211,153,0.5)] flex flex-col justify-between p-1.5">
              <div className="flex items-center justify-between text-[9px] bg-emerald-950/90 text-emerald-300 px-1 rounded border border-emerald-500/50">
                <span>DRY ERASE MARKER</span>
                <span className="font-bold">98.4%</span>
              </div>
              <div className="text-[8px] text-cyan-300 font-mono text-right bg-slate-950/80 px-1 rounded">
                COLOR: WHITE + RED
              </div>
            </div>

            {/* Target Reticle */}
            <div className="absolute w-8 h-8 rounded-full border border-dashed border-emerald-400 pointer-events-none animate-spin duration-3000" />
          </div>

          <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300">Sample target:</span>
              <span className="text-[10px] text-slate-400">Camera connector TODO</span>
            </div>
            <p className="text-[11px] text-slate-300">
              "You are holding a white and red dry-erase marker with black cap."
            </p>
          </div>
        </div>
      )}
    </>
  );
};
