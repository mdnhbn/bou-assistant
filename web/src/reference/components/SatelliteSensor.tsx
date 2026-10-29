/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Globe2, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import type { ThreatHeadline } from '../types';

interface SatelliteSensorProps {
  onOpenWorldMonitor: () => void;
  accentColor?: string;
}

export const INITIAL_HEADLINES: ThreatHeadline[] = [
  {
    id: 'th-1',
    headline: 'Hurricane Lola strengthens, hitting Hawaii with high winds and causing power outages.',
    source: 'GHP Satellite Grid',
    severity: 'high',
    timestamp: 'Just now',
    region: 'Pacific'
  },
  {
    id: 'th-2',
    headline: 'Global cyber telemetry logs 420k attempted breaches targeting DNS root servers.',
    source: 'Cyber Recon',
    severity: 'medium',
    timestamp: '4m ago',
    region: 'North America'
  },
  {
    id: 'th-3',
    headline: 'Middle East conflict monitoring registers elevated drone reconnaissance vectors.',
    source: 'DEFCON Telemetry',
    severity: 'high',
    timestamp: '12m ago',
    region: 'Middle East'
  },
  {
    id: 'th-4',
    headline: 'Autonomous AI grid load balancing operating at 99.8% capacity across regional datacenters.',
    source: 'Bou Core',
    severity: 'low',
    timestamp: '18m ago',
    region: 'Global'
  }
];

export const SatelliteSensor: React.FC<SatelliteSensorProps> = ({
  onOpenWorldMonitor,
  accentColor: _accentColor = '#f43f5e'
}) => {
  const [rotation, setRotation] = useState(0);
  const [activeBlip, setActiveBlip] = useState(0);

  // Satellite radar rotation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setRotation((r) => (r + 1) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const blipTimer = setInterval(() => {
      setActiveBlip((b) => (b + 1) % 5);
    }, 2200);
    return () => clearInterval(blipTimer);
  }, []);

  return (
    <div className="w-full bg-[#0a0c12]/95 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-xl select-none backdrop-blur-md">
      {/* Sensor Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200">
            SATELLITE SENSOR
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
          DEMO SENSOR
        </span>
      </div>

      {/* Radar Globe Viewport with Orbiting Satellites */}
      <div className="relative w-full aspect-square max-h-44 bg-slate-950 rounded-xl border border-slate-800/90 overflow-hidden flex items-center justify-center group">
        {/* Radar concentric rings */}
        <div className="absolute w-36 h-36 rounded-full border border-slate-800 pointer-events-none" />
        <div className="absolute w-24 h-24 rounded-full border border-slate-800/70 pointer-events-none" />
        <div className="absolute w-12 h-12 rounded-full border border-slate-800/50 pointer-events-none" />

        {/* Crosshair lines */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/60 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/60 pointer-events-none" />

        {/* Rotating radar sweep beam */}
        <div
          className="absolute inset-0 pointer-events-none origin-center"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(from 0deg at 50% 50%, rgba(244, 63, 94, 0.25) 0deg, transparent 65deg, transparent 360deg)`
          }}
        />

        {/* Global Dark Earth Sphere with Blips */}
        <div className="relative w-28 h-28 rounded-full bg-[#0d1424] border border-cyan-500/30 flex items-center justify-center overflow-hidden shadow-inner shadow-cyan-950">
          {/* Faint continent silhouette representation */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Threat / Satellite Ping Blips (matching Stonic video) */}
          <div className={`absolute top-5 left-7 w-2 h-2 rounded-full bg-amber-400 ${activeBlip === 0 ? 'animate-ping' : ''}`} />
          <div className={`absolute bottom-6 right-8 w-2.5 h-2.5 rounded-full bg-rose-500 ${activeBlip === 1 ? 'animate-ping' : ''}`} />
          <div className={`absolute top-10 right-6 w-2 h-2 rounded-full bg-emerald-400 ${activeBlip === 2 ? 'animate-ping' : ''}`} />
          <div className={`absolute bottom-9 left-6 w-2 h-2 rounded-full bg-amber-400 ${activeBlip === 3 ? 'animate-ping' : ''}`} />

          <Globe2 className="w-12 h-12 text-slate-700/60" />
        </div>

        {/* Overlay Telemetry Readout */}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span>LAT: 34.05°N</span>
          <span>LONG: 71.52°E</span>
          <span className="text-emerald-400">GHP ACTIVE</span>
        </div>

        {/* Hover trigger for World Monitor Modal */}
        <button
          onClick={onOpenWorldMonitor}
          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono font-bold text-rose-300 backdrop-blur-xs cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>EXPAND WORLD MONITOR</span>
        </button>
      </div>

      {/* World Monitor Trigger Button */}
      <button
        onClick={onOpenWorldMonitor}
        className="w-full py-1.5 px-3 rounded-xl bg-rose-950/30 border border-rose-500/40 hover:bg-rose-900/40 text-rose-200 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/20 active:scale-98"
      >
        <Activity className="w-3.5 h-3.5 text-rose-400" />
        <span>WORLD MONITOR DASHBOARD</span>
      </button>

      {/* THREAT HEADLINES (Live geopolitical ticker from Stonic video) */}
      <div className="pt-1 border-t border-slate-800/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            THREAT HEADLINES
          </span>
          <span className="text-[9px] text-slate-600">DEMO FEED</span>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px] leading-snug">
          {INITIAL_HEADLINES.map((item) => (
            <div
              key={item.id}
              onClick={onOpenWorldMonitor}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer group"
            >
              <p className="text-slate-300 text-[11px] group-hover:text-rose-200 transition-colors line-clamp-2">
                {item.headline}
              </p>
              <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="text-rose-400/80 uppercase font-semibold">{item.region}</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
