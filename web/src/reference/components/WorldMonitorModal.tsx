/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Globe2,
  Video,
} from 'lucide-react';

interface WorldMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export const WorldMonitorModal: React.FC<WorldMonitorModalProps> = ({
  isOpen,
  onClose,
  accentColor: _accentColor = '#f43f5e'
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'cctv' | 'telemetry'>('map');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#07090e] border border-rose-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-rose-950/40 font-mono text-slate-300">
        {/* Top Title Bar (matching Stonic video at 06:48) */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="font-bold text-sm tracking-widest text-rose-400 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-rose-400" />
              <span>BOU GLOBAL SITUATION MONITOR (WORLD TELEMETRY)</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
              DEMO TELEMETRY
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switchers */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeTab === 'map' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Global Map
              </button>
              <button
                onClick={() => setActiveTab('cctv')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeTab === 'cctv' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                CCTV Feeds
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeTab === 'telemetry' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Event Logs
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Center Map Stage (matching Stonic video at 07:05) */}
          <div className="flex-1 relative bg-[#090d16] p-4 flex flex-col justify-between overflow-hidden">
            {/* Scanline & Grid Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

            {/* Strategic Map Graphic (SVG) */}
            <div className="relative flex-1 flex items-center justify-center p-4">
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full max-h-[500px] object-contain drop-shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              >
                {/* World Map Outlines Silhouette */}
                <rect width="1000" height="500" fill="transparent" />

                {/* Continents Vector Paths */}
                {/* North America */}
                <path
                  d="M150,100 Q200,80 260,110 Q280,180 220,240 Q160,200 120,150 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* South America */}
                <path
                  d="M240,250 Q290,260 270,360 Q230,420 210,340 Q210,280 240,250 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* Europe */}
                <path
                  d="M480,90 Q540,80 560,130 Q510,160 470,140 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* Africa with Sudan Highlighted (Red danger zone from video) */}
                <path
                  d="M470,170 Q560,160 560,260 Q520,360 480,310 Q440,230 470,170 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* Red Alert Zone 1: Sudan / Horn of Africa */}
                <path
                  d="M510,220 Q545,215 540,255 Q515,260 510,220 Z"
                  fill="#ef4444"
                  opacity="0.8"
                  className="animate-pulse"
                />
                <circle cx="530" cy="235" r="5" fill="#f87171" />

                {/* Asia with Middle East (Iran / Red danger zone from video) */}
                <path
                  d="M560,100 Q720,80 840,160 Q800,280 680,260 Q580,210 560,100 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {/* Red Alert Zone 2: Iran / Persian Gulf */}
                <path
                  d="M590,160 Q635,155 630,195 Q595,200 590,160 Z"
                  fill="#ef4444"
                  opacity="0.8"
                  className="animate-pulse"
                />
                <circle cx="610" cy="175" r="6" fill="#f87171" />

                {/* Red Alert Zone 3: Eastern Europe */}
                <circle cx="540" cy="120" r="5" fill="#f43f5e" className="animate-ping" />
                <circle cx="540" cy="120" r="4" fill="#f43f5e" />

                {/* Australia */}
                <path
                  d="M780,320 Q860,310 850,380 Q790,390 770,350 Z"
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth="1.5"
                />

                {/* Radar target reticle over Middle East (matching video) */}
                <g transform="translate(610, 175)">
                  <circle r="22" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
                  <circle r="38" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.6" />
                  <line x1="-45" y1="0" x2="45" y2="0" stroke="#ef4444" strokeWidth="0.8" opacity="0.7" />
                  <line x1="0" y1="-45" x2="0" y2="45" stroke="#ef4444" strokeWidth="0.8" opacity="0.7" />
                  <text x="30" y="-12" fill="#ef4444" fontSize="10" fontFamily="monospace">
                    HOTZONE: IRAN / SUDAN
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom Status Ticker on Map */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-400 font-bold">ACTIVE THREAT DETECTED:</span>
                <span className="text-slate-200">Iran, Sudan & Eastern Europe conflict corridors</span>
              </div>
              <div className="text-slate-400 text-[10px]">
                TELEMETRY SOURCE: GHP DEFCON SATELLITE MATRIX
              </div>
            </div>
          </div>

          {/* Right Telemetry & Live Feeds Sidebar (matching Stonic video at 07:12) */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#080b12] p-3.5 flex flex-col gap-3 overflow-y-auto">
            {/* Sector Summary Card */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">SELECTED SECTOR</span>
                <span className="text-[10px] font-bold text-rose-400">HIGH ALERT</span>
              </div>
              <h4 className="text-sm font-bold text-white">Persian Gulf & Red Sea</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Strategic choke points under 24/7 GHP synthetic satellite surveillance. Drone swarms and cyber reconnaissance active.
              </p>
            </div>

            {/* CCTV Simulation Feeds Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-slate-200">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  CCTV CAMERA SURVEILLANCE
                </span>
                <span className="text-[10px] text-emerald-400">DEMO FEED</span>
              </div>

              {/* Feed 1 */}
              <div className="relative rounded-lg bg-black border border-slate-800 overflow-hidden aspect-video flex items-center justify-center">
                <div className="absolute top-1 left-2 text-[9px] text-emerald-400 font-mono">
                  CAM-01 • TEHRAN HIGHWAY
                </div>
                <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono">
                  REC 1080P
                </div>
                {/* Simulated scanline animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-pulse pointer-events-none" />
                <span className="text-xs text-slate-600 font-mono">ENCRYPTED CCTV STREAM ACTIVE</span>
              </div>

              {/* Feed 2 */}
              <div className="relative rounded-lg bg-black border border-slate-800 overflow-hidden aspect-video flex items-center justify-center">
                <div className="absolute top-1 left-2 text-[9px] text-amber-400 font-mono">
                  CAM-02 • PORT SUDAN STRAIT
                </div>
                <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono">
                  SAT SENSOR
                </div>
                <span className="text-xs text-slate-600 font-mono">OPTICAL SATELLITE LOCK</span>
              </div>
            </div>

            {/* Live Security Log Stream */}
            <div className="flex-1 flex flex-col min-h-36">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                SYSTEM AUDIT LOGS
              </span>
              <div className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-900 text-[10px] space-y-1 text-slate-400 overflow-y-auto max-h-40">
                <div className="text-rose-400">[07:18:22] Hotzone telemetry synced to Bou Brain.</div>
                <div className="text-cyan-400">[07:18:05] Sat-08 orbit locked on Pacific weather cell.</div>
                <div className="text-slate-500">[07:17:42] 12 Satellites nominal. GHP latency: 28ms.</div>
                <div className="text-amber-400">[07:16:15] Proxy traffic routed via Swiss encryption node.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
