/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Sparkles,
  Camera,
  Monitor,
  Radio,
  Brain,
  Wrench,
  Volume2,
  Sliders,
  Square,
} from 'lucide-react';
import { ParticleCharacter } from './ParticleCharacter';
import { Character3D } from './Character3D';
import { Character2D } from './Character2D';



import { ChatPanel } from './ChatPanel';
import { AgentTown } from './AgentTown';
import { SatelliteSensor } from './SatelliteSensor';
import { WorldMonitorModal } from './WorldMonitorModal';
import { CoreMemoryModal } from './CoreMemoryModal';
import { StonicSkillsModal } from './StonicSkillsModal';
import { WhatsAppModal } from './WhatsAppModal';
import { StonicFloatingWindows } from './StonicFloatingWindows';
import { useAssistant } from '../store/assistantContext';


export const CharacterStage: React.FC = () => {
  const {
    assistantState,
    renderMode,
    setRenderMode,
    character,
    setCharacter,
    entityForm,
    setEntityForm,
    audioAmplitude,
    isMicActive,
    toggleMic,
    messages,
    sendMessage,
    clearMessages,
    theme,
    windowState,
    toggleWindow,
    agents,
    dispatchAgentTask,
    setIsSettingsOpen,
    memories,
    addMemoryItem,
    deleteMemoryItem,
    skills,
    toggleSkill,
    stopSpeech
  } = useAssistant();

  // Mode: 'orb' (Stonica Glowing Cosmic Core) | 'vrm' (VRM 3D humanoid) | '2d' (Portrait)
  const stageStyle = entityForm === 'orb' ? 'orb' : renderMode === '3d' ? 'vrm' : '2d';
  const setStageStyle = (style: 'orb' | 'vrm' | '2d') => {
    if (style === 'orb') setEntityForm('orb');
    else { setEntityForm(character.id); setRenderMode(style === 'vrm' ? '3d' : '2d'); }
  };

  const isSpeaking = assistantState === 'speaking';

  const handleToggleCharacter = (gender: 'female' | 'male') => {
    setCharacter(gender);
    setEntityForm(gender);
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-[#05070c] flex flex-col">
      {/* 1. Deep Space Cosmic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.12),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 holo-grid pointer-events-none opacity-20" />

      {/* Radial Nebula behind the Central Core */}
      <div
        className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none blur-3xl opacity-20 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${theme.primary} 0%, rgba(244,63,94,0.15) 50%, transparent 70%)`
        }}
      />

      {/* 2. BOU 3-COLUMN COCKPIT LAYOUT (Matching Stonic AI video) */}
      <div className="relative z-10 w-full h-full p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden">

        {/* LEFT COLUMN: Satellite Sensor & Threat Radar (Cols 1-3) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-3 overflow-y-auto pr-1">
          {/* Satellite Sensor & Global Telemetry */}
          <SatelliteSensor
            onOpenWorldMonitor={() => toggleWindow('worldMonitor', true)}
            accentColor={theme.primary}
          />

          {/* Quick Stonic Video Shortcuts */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 font-mono text-[11px] space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              QUICK COMMANDS (VIDEO PRESETS)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => sendMessage("Hello Bou! Can you hear me?")}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/30 border border-slate-800 text-left text-slate-300 hover:text-rose-300 transition-colors cursor-pointer truncate"
              >
                1. "Hello Bou! Can you hear me?"
              </button>
              <button
                onClick={() => sendMessage("Alice ko kaam pe lagao ki dollar rate aur gold rate research kare")}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/30 border border-slate-800 text-left text-slate-300 hover:text-rose-300 transition-colors cursor-pointer truncate"
              >
                2. "Alice ko dollar aur gold rate research pe lagao"
              </button>
              <button
                onClick={() => sendMessage("Neend nahi aa rahi hai, peaceful music chalao")}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/30 border border-slate-800 text-left text-slate-300 hover:text-rose-300 transition-colors cursor-pointer truncate"
              >
                3. "Neend nahi aa rahi hai, peaceful music chalao"
              </button>
              <button
                onClick={() => sendMessage("Camera me dekho maine kya pakda hua hai")}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/30 border border-slate-800 text-left text-slate-300 hover:text-rose-300 transition-colors cursor-pointer truncate"
              >
                4. "Camera me dekho maine kya pakda hai"
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Central Neural Core & Agent Town Virtual Office (Cols 4-8) */}
        <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">

          {/* Top Half: Central Neural Core Stage (matching video 01:44 & 07:25) */}
          <div className="relative flex-1 min-h-[280px] bg-[#07090e]/95 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl backdrop-blur-md">

            {/* Top Stage Bar: Mode, Character, Cam & Screen Toggles */}
            <div className="relative z-20 px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              {/* Character Switcher: [ Bou (Female) ] [ Aether (Male) ] */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => handleToggleCharacter('female')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    character.id === 'female'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  <span>BOU</span>
                </button>
                <button
                  onClick={() => handleToggleCharacter('male')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    character.id === 'male'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3 text-amber-400" />
                  <span>AETHER</span>
                </button>
              </div>

              {/* View Render Mode: [ ORB CORE ] [ 3D VRM ] [ 2D ] */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => {
                    setStageStyle('orb');
                    setEntityForm('orb');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    stageStyle === 'orb'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ORB CORE
                </button>
                <button
                  onClick={() => {
                    setStageStyle('vrm');
                    setRenderMode('3d');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    stageStyle === 'vrm'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  VRM 3D
                </button>
                <button
                  onClick={() => {
                    setStageStyle('2d');
                    setRenderMode('2d');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    stageStyle === '2d'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2D
                </button>
              </div>

              {/* Camera Vision & Screen Share Toggles (matching Stonic video) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleWindow('cameraVision')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    windowState.cameraVision
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle AI Camera Vision Stream"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alert('Screen sharing preview only. TODO: connect a native screen-sharing adapter.')}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="OBS Screen Share Link"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Central Visual Stage Area */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
              {/* Connected Left Glowing Neural Node Lines (matching Stonic video at 01:44 & 07:25) */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 font-mono text-[10px]">
                <button
                  onClick={() => toggleWindow('coreMemory')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-cyan-300 hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-md cursor-pointer group"
                >
                  <Brain className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>MEMORY</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
                </button>

                <button
                  onClick={() => toggleWindow('skillsModal')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-amber-400 text-amber-300 hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-md cursor-pointer group"
                >
                  <Wrench className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>SKILLS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-emerald-400 text-emerald-300 hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-md cursor-pointer group"
                >
                  <Volume2 className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>VOICES</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-rose-400 text-rose-300 hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-md cursor-pointer group"
                >
                  <Sliders className="w-3 h-3 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span>SETTING</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 ml-0.5" />
                </button>
              </div>

              {/* 3D WebGL / Particle Canvas */}
              <AnimatePresence mode="wait">
                {stageStyle === 'orb' ? (
                  <motion.div
                    key="stage-orb"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full absolute inset-0"
                  >
                    <ParticleCharacter
                      form="orb"
                      audioAmplitude={audioAmplitude}
                      assistantState={assistantState}
                      accentColor={theme.primary}
                    />
                  </motion.div>
                ) : stageStyle === 'vrm' ? (
                  <motion.div
                    key={`stage-vrm-${character.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full absolute inset-0"
                  >
                    <Character3D
                      character={character}
                      audioAmplitude={audioAmplitude}
                      assistantState={assistantState}
                      onSwitchTo2D={() => setStageStyle('2d')}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`stage-2d-${character.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full absolute inset-0 flex items-center justify-center"
                  >
                    <Character2D
                      character={character}
                      audioAmplitude={audioAmplitude}
                      assistantState={assistantState}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Core Action Button: [ TERMINATE ] or [ START AI ] (matching Stonic video) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {isSpeaking ? (
                  <button
                    onClick={stopSpeech}
                    className="px-5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500 text-rose-300 font-mono text-xs font-bold tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all active:scale-95 cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>TERMINATE</span>
                  </button>
                ) : (
                  <button
                    onClick={toggleMic}
                    aria-pressed={isMicActive}
                    aria-label={isMicActive ? "Pause microphone" : "Start microphone"}
                    className="px-5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 cursor-pointer"
                  >
                    <Radio className="w-3 h-3 text-emerald-400" />
                    <span>{isMicActive ? 'PAUSE MIC' : 'START AI'}</span>
                  </button>
                )}
                {isSpeaking && <button type="button" onClick={toggleMic} aria-pressed={isMicActive} className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono cursor-pointer">{isMicActive ? 'MIC ON · PAUSE' : 'MIC OFF'}</button>}
              </div>
            </div>
          </div>

          {/* Bottom Half: Agent Town (Retro 2D Virtual Office from video 01:44 & 03:00) */}
          <div className="h-64 sm:h-72">
            <AgentTown
              agents={agents}
              onDispatchTask={dispatchAgentTask}
              accentColor={theme.primary}
              onOpenBrowser={() => toggleWindow('browser', true)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Dialogue Feed, Stonic Message Badges & Input (Cols 9-12) */}
        <div className="lg:col-span-3 flex flex-col h-full bg-[#07090e]/95 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Top Tabs: [ VOICE ] [ AGENT ] [ NOTES ] */}
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between font-mono text-xs select-none">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button className="px-3 py-1 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                VOICE
              </button>
              <button
                onClick={() => toggleWindow('browser', true)}
                className="px-3 py-1 rounded text-slate-400 hover:text-white"
              >
                AGENT
              </button>
              <button
                onClick={() => toggleWindow('coreMemory', true)}
                className="px-3 py-1 rounded text-slate-400 hover:text-white"
              >
                NOTES
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-[10px] font-bold uppercase text-slate-300">
                {assistantState === 'idle' ? 'SYSTEM READY' : assistantState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Dialogue / Subtitle Transcription Feed with Stonic AI Badges */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              onClearMessages={clearMessages}
              character={character}
              isExpanded={true}
              onToggleExpand={() => {}}
              accentColor={theme.primary}
              isSpeaking={isSpeaking}
              onStopSpeech={stopSpeech}
            />
          </div>
        </div>
      </div>

      {/* 3. BOU FLOATING RETRO OS WINDOWS (Neural Player, Browser, Vision) */}
      <StonicFloatingWindows
        isMusicOpen={windowState.musicPlayer}
        onCloseMusic={() => toggleWindow('musicPlayer', false)}
        isBrowserOpen={windowState.browser}
        onCloseBrowser={() => toggleWindow('browser', false)}
        isCameraVisionOpen={windowState.cameraVision}
        onCloseCameraVision={() => toggleWindow('cameraVision', false)}
        accentColor={theme.primary}
      />

      {/* 4. MODALS (World Monitor, Core Memory, Skills, WhatsApp) */}
      <WorldMonitorModal
        isOpen={windowState.worldMonitor}
        onClose={() => toggleWindow('worldMonitor', false)}
        accentColor={theme.primary}
      />

      <CoreMemoryModal
        isOpen={windowState.coreMemory}
        onClose={() => toggleWindow('coreMemory', false)}
        memories={memories}
        onAddMemory={addMemoryItem}
        onDeleteMemory={deleteMemoryItem}
        accentColor={theme.primary}
      />

      <StonicSkillsModal
        isOpen={windowState.skillsModal}
        onClose={() => toggleWindow('skillsModal', false)}
        skills={skills}
        onToggleSkill={toggleSkill}
        accentColor={theme.primary}
      />

      <WhatsAppModal
        isOpen={windowState.whatsappModal}
        onClose={() => toggleWindow('whatsappModal', false)}
        accentColor={theme.primary}
      />
    </div>
  );
};
