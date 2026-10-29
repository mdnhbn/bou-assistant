/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Globe,
  Code2,
  Video,
  MessageSquare,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { SkillItem } from '../types';

interface SkillsPanelProps {
  skills: SkillItem[];
  onToggleSkill: (skillId: string) => void;
  accentColor?: string;
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({
  skills,
  onToggleSkill,
  accentColor = '#06b6d4'
}) => {
  const getSkillIcon = (iconName: string) => {
    switch (iconName) {
      case 'Globe': return Globe;
      case 'Code2': return Code2;
      case 'Video': return Video;
      case 'MessageSquare': return MessageSquare;
      case 'Send': return Send;
      case 'Share2': return Share2;
      case 'ShieldAlert': return ShieldAlert;
      default: return Sparkles;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-300 leading-relaxed">
        <div className="font-semibold flex items-center gap-1.5 mb-1 text-cyan-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autonomous Skills & Tool Integrations (Mock Stubs)</span>
        </div>
        Skill toggles preview future integrations; coding/security cards provide response guidance. Browser, execution and messaging connectors remain TODOs.
        {/* TODO: Step 4 - Connect skills to autonomous tool-calling execution agents and MCP protocol */}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {skills.map((skill) => {
          const IconComp = getSkillIcon(skill.iconName);
          return (
            <div
              key={skill.id}
              onClick={() => onToggleSkill(skill.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                skill.enabled
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                  : 'bg-slate-950/50 border-slate-800/80 opacity-60 hover:opacity-85'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                style={{
                  backgroundColor: skill.enabled ? `${accentColor}18` : 'rgba(30, 41, 59, 0.5)',
                  borderColor: skill.enabled ? `${accentColor}44` : 'rgba(51, 65, 85, 0.4)',
                  color: skill.enabled ? accentColor : '#94a3b8'
                }}
              >
                <IconComp className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100 tracking-wide flex items-center gap-2">
                    <span>{skill.name}</span>
                    {skill.enabled && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        ACTIVE
                      </span>
                    )}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSkill(skill.id);
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {skill.enabled ? (
                      <ToggleRight className="w-6 h-6 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {skill.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
