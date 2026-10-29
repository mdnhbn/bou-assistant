/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  User,
  Sliders,
  Key,
  Brain,
  Sparkles,
  Layers,
  Volume2,
  Trash2,
  Plus,
  Check,
  SwitchCamera,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAssistant } from '../store/assistantContext';
import { THEMES, LANGUAGES, VOICES } from '../config/appConfig';
import { SkillsPanel } from './SkillsPanel';
import { MemoryPanel } from './MemoryPanel';

export const SettingsPanel: React.FC = () => {
  const {
    character,
    setCharacter,
    renderMode,
    setRenderMode,
    theme,
    setThemeById,
    language,
    setLanguageById,
    voice,
    setVoiceById,
    availableVoices,
    voiceNotice,
    skills,
    toggleSkill,
    memories,
    addMemoryItem,
    deleteMemoryItem,
    apiKeys,
    addNewApiKey,
    deleteApiKey,
    selectActiveKey,
    autoSwitchKeys,
    toggleAutoSwitchKeys,
    isSettingsOpen,
    setIsSettingsOpen,
    defaultCurrency,
    setDefaultCurrency
  } = useAssistant();

  const [activeTab, setActiveTab] = useState<'character' | 'voice' | 'apikeys' | 'skills' | 'memory'>('character');

  // Form states
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyVal, setNewKeyVal] = useState('');
  const [keyNotice, setKeyNotice] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyVal.trim()) return;
    setKeyBusy(true);
    setKeyNotice('');
    try {
      await addNewApiKey(newKeyLabel || 'Gemini', newKeyVal);
      setNewKeyLabel('');
      setNewKeyVal('');
      setKeyNotice('Gemini key saved securely.');
    } catch (error) {
      setKeyNotice(error instanceof Error ? error.message : 'Key could not be saved. Please try again.');
    } finally { setKeyBusy(false); }
  };



  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsSettingsOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Slide-in Drawer Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative w-full max-w-xl h-full bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-10 text-slate-200"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5" style={{ color: theme.primary }} />
            <h2 className="text-base font-bold text-white tracking-wide">
              SYSTEM CONFIGURATION
            </h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800/80 px-4 bg-slate-900/30 overflow-x-auto scrollbar-none text-xs font-mono">
          {[
            { id: 'character', label: 'Character & Visuals', icon: User },
            { id: 'voice', label: 'Voice & Lang', icon: Volume2 },
            { id: 'apikeys', label: 'API Keys', icon: Key },
            { id: 'skills', label: 'Skills', icon: Sparkles },
            { id: 'memory', label: 'Memory', icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                style={{ borderColor: isActive ? theme.primary : 'transparent' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CHARACTER & VISUALS */}
          {activeTab === 'character' && (
            <div className="space-y-6">
              {/* Character Selector */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Active AI Persona
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Female Character (Bou) */}
                  <button
                    onClick={() => setCharacter('female')}
                    className={`relative p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      character.id === 'female'
                        ? 'bg-slate-900 border-cyan-400/80 ring-1 ring-cyan-400/50 shadow-lg'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                      <img
                        src="/models/bou.png"
                        alt="Bou"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">Bou</span>
                        {character.id === 'female' && (
                          <Check className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono block">UNIT-07</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        Empathetic neural synapse
                      </p>
                    </div>
                  </button>

                  {/* Male Character (Aether) */}
                  <button
                    onClick={() => setCharacter('male')}
                    className={`relative p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      character.id === 'male'
                        ? 'bg-slate-900 border-amber-400/80 ring-1 ring-amber-400/50 shadow-lg'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                      <img
                        src="/models/aether.png"
                        alt="Aether"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">Aether</span>
                        {character.id === 'male' && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono block">PRIME</span>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        Strategic analytical core
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Render Mode Toggle */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Character Stage Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRenderMode('3d')}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      renderMode === '3d'
                        ? 'bg-slate-900 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-5 h-5 mx-auto mb-1.5 text-cyan-400" />
                    <span className="font-semibold text-xs block">3D Three.js Model</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Fixed camera, breathing, lip-sync jaw
                    </span>
                  </button>

                  <button
                    onClick={() => setRenderMode('2d')}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      renderMode === '2d'
                        ? 'bg-slate-900 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <SwitchCamera className="w-5 h-5 mx-auto mb-1.5 text-cyan-400" />
                    <span className="font-semibold text-xs block">2D Layered Avatar</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Glow rings, audio pulse, portrait
                    </span>
                  </button>
                </div>
              </div>

              {/* Default Currency Preference Setting */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Default Currency for Financial Agent (Alice)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {(['BDT', 'PKR', 'INR', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setDefaultCurrency(curr)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        defaultCurrency === curr
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-mono block">{curr}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {curr === 'BDT' ? '৳ Taka' : curr === 'PKR' ? '₨ Rupee' : curr === 'INR' ? '₹ Rupee' : '$ Dollar'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Palette */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Cyber Accent Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {THEMES.map((th) => {
                    const isSelected = theme.id === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => setThemeById(th.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-slate-400 ring-2'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                        style={{
                          borderColor: isSelected ? th.primary : undefined,
                          boxShadow: isSelected ? `0 0 0 2px ${th.primary}` : undefined,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full shadow-md"
                          style={{ backgroundColor: th.primary }}
                        />
                        <span className="text-[10px] text-slate-400 font-mono truncate w-full text-center">
                          {th.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE & LANGUAGE */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Language Processing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => {
                    const isSelected = language.id === lang.id;
                    return (
                      <button
                        key={lang.id}
                        onClick={() => setLanguageById(lang.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-400 text-white'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <div>
                            <span className="text-xs font-semibold block">{lang.name}</span>
                            <span className="text-[10px] text-slate-400">{lang.nativeName}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Selector Dropdown */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                  Voice Synthesis Profile
                </label>

                {voiceNotice && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <Volume2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span className="leading-relaxed">{voiceNotice}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {(availableVoices.length > 0 ? availableVoices : VOICES.filter((v) => v.gender === character.id)).map((v) => {
                    const isSelected = voice.id === v.id || (v.systemVoiceURI && voice.systemVoiceURI === v.systemVoiceURI);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVoiceById(v.id)}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-400 text-white shadow-md'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium block text-white truncate">{v.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {v.provider} · {v.gender.toUpperCase()} · {v.languageId.toUpperCase()}
                              {v.isFallback && ' (Fallback)'}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS VAULT */}
          {activeTab === 'apikeys' && (
            <div className="space-y-6">
              {/* Auto Switch Toggle */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Auto-Switch Key on Quota Exhaustion
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    UI preference only · TODO: add secure server-side key rotation.
                  </p>
                </div>
                <button
                  onClick={() => toggleAutoSwitchKeys(!autoSwitchKeys)}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {autoSwitchKeys ? (
                    <ToggleRight className="w-7 h-7 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Add Key Form */}
              <form onSubmit={handleAddKey} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <span className="text-xs font-mono text-slate-300 uppercase tracking-wider block">
                  Gemini key · secure native storage
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Slot Label (e.g. Gemini Pro Slot)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="password"
                    value={newKeyVal}
                    onChange={(e) => setNewKeyVal(e.target.value)}
                    placeholder="API Key string (AIza...)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newKeyVal.trim() || keyBusy}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold rounded-xl text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{keyBusy ? 'Saving…' : 'Save Gemini Key'}</span>
                </button>
              </form>

              {keyNotice && <p role="status" className="text-xs text-cyan-300 px-1">{keyNotice}</p>}
              {/* Keys List */}
              <div className="space-y-2">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Configured Key Slots ({apiKeys.length})
                </label>
                {apiKeys.map((key) => {
                  const isActive = key.status === 'active';
                  return (
                    <div
                      key={key.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-slate-900/90 border-cyan-400/80 shadow-md'
                          : 'bg-slate-900/40 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{key.label}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : key.status === 'depleted'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {key.status}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{key.keyMasked}</span>
                          <span>·</span>
                          <span>
                            {key.limit > 0 ? `${key.callsCount} / ${key.limit} req` : 'Secure credential'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isActive && (
                          <button
                            onClick={() => { void selectActiveKey(key.id).catch((error: unknown) => setKeyNotice(error instanceof Error ? error.message : 'Selection failed.')); }}
                            className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => { void deleteApiKey(key.id).then(() => setKeyNotice('Key removed.')).catch((error: unknown) => setKeyNotice(error instanceof Error ? error.message : 'Removal failed.')); }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remove key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AUTONOMOUS SKILLS */}
          {activeTab === 'skills' && (
            <SkillsPanel
              skills={skills}
              onToggleSkill={toggleSkill}
              accentColor={theme.primary}
            />
          )}

          {/* TAB 5: MEMORY MATRIX */}
          {activeTab === 'memory' && (
            <MemoryPanel
              memories={memories}
              onAddMemory={addMemoryItem}
              onDeleteMemory={deleteMemoryItem}
              accentColor={theme.primary}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};
