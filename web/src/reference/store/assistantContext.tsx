/**
 * @license SPDX-License-Identifier: Apache-2.0
 * Reference cockpit state backed by Bou's bounded native/browser adapters.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AssistantState, RenderMode, EntityForm, CharacterGender, CharacterConfig, ChatMessage, ThemeConfig, LanguageConfig, VoiceItem, SkillItem, MemoryItem, ApiKeyItem, AgentInfo, StonicWindowState, CurrencyCode } from '../types';
import { APP_NAME, CHARACTERS, THEMES, LANGUAGES, VOICES } from '../config/appConfig';
import { readUiPreferences, saveUiPreferences } from '../../config/preferences';
import { watchDesktopApi, type DesktopStatus } from '../../services/desktop';
import { speakText, stopSpeaking } from '../../services/voice';
import { sendPromptToBrain } from '../services/brain';
import { startSpeechToText, createStreamingSpeechQueue, getAvailableVoiceItems, type RecognitionController, type SpeechQueueController } from '../services/voice';
import { getMemories, saveMemory, deleteMemory as removeMemoryService } from '../services/memory';
import { getSkills, toggleSkillState } from '../services/skills';
import { getApiKeys, addApiKey as addApiKeyService, removeApiKey as removeApiKeyService, setActiveApiKey as setActiveApiKeyService, getAutoSwitchPreference, setAutoSwitchPreference } from '../services/apiKeys';

interface AssistantContextType {
  appName: string;
  assistantState: AssistantState;
  setAssistantState: (state: AssistantState) => void;
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
  character: CharacterConfig;
  setCharacter: (gender: CharacterGender) => void;
  entityForm: EntityForm;
  setEntityForm: (form: EntityForm) => void;
  audioAmplitude: number;
  setAudioAmplitude: (amplitude: number) => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  isMicActive: boolean;
  toggleMic: () => void;
  stopMicrophone: () => void;
  interimTranscript: string;
  stopSpeech: () => void;
  theme: ThemeConfig;
  setThemeById: (id: string) => void;
  language: LanguageConfig;
  setLanguageById: (id: string) => void;
  voice: VoiceItem;
  setVoiceById: (id: string) => void;
  availableVoices: VoiceItem[];
  voiceNotice: string | null;
  skills: SkillItem[];
  toggleSkill: (id: string) => void;
  memories: MemoryItem[];
  addMemoryItem: (text: string, category: MemoryItem['category']) => Promise<void>;
  deleteMemoryItem: (id: string) => Promise<void>;
  apiKeys: ApiKeyItem[];
  addNewApiKey: (label: string, key: string) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  selectActiveKey: (id: string) => Promise<void>;
  autoSwitchKeys: boolean;
  toggleAutoSwitchKeys: (enabled: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isChatExpanded: boolean;
  setIsChatExpanded: (expanded: boolean) => void;
  windowState: StonicWindowState;
  toggleWindow: (key: keyof StonicWindowState, forceVal?: boolean) => void;
  agents: AgentInfo[];
  dispatchAgentTask: (id: string, task: string) => void;
  defaultCurrency: CurrencyCode;
  setDefaultCurrency: (code: CurrencyCode) => void;
  nativeStatus: DesktopStatus | null;
  connectionReady: boolean;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);
const displayStorage = 'bou.reference.display.v1';
function savedDisplay(): { themeId?: string; currency?: CurrencyCode } {
  try { const value: unknown = JSON.parse(localStorage.getItem(displayStorage) ?? '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const demoAgents: AgentInfo[] = [
  { id: 'alice', name: 'Alice', role: 'Research preview', status: 'idle', currentTask: 'DEMO · browser connector TODO', speechBubble: 'Research workspace preview', avatarColor: '#f43f5e', deskIndex: 0 },
  { id: 'bob', name: 'Bob', role: 'Software guidance', status: 'idle', currentTask: 'DEMO · no code execution connected', speechBubble: 'Architecture workspace preview', avatarColor: '#f59e0b', deskIndex: 1 },
  { id: 'carol', name: 'Carol', role: 'Communication preview', status: 'idle', currentTask: 'DEMO · messaging connectors TODO', speechBubble: 'No account linked', avatarColor: '#10b981', deskIndex: 2 },
  { id: 'dave', name: 'Dave', role: 'Security guidance', status: 'idle', currentTask: 'DEMO · no active scan', speechBubble: 'Defensive guidance preview', avatarColor: '#06b6d4', deskIndex: 3 },
];

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(readUiPreferences);
  const [display] = useState(savedDisplay);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [renderMode, setRenderMode] = useState<RenderMode>(saved.mode);
  const [character, setCharacterConfig] = useState<CharacterConfig>(saved.characterId === 'aether' ? CHARACTERS.male : CHARACTERS.female);
  const [entityForm, setEntityFormState] = useState<EntityForm>(saved.characterId === 'aether' ? 'male' : 'female');
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', sender: 'assistant', text: `আমি ${saved.characterId === 'aether' ? 'Aether' : APP_NAME}। লিখে পাঠান বা Mic চালু করে কথা বলুন।`, timestamp: stamp() }]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [theme, setTheme] = useState<ThemeConfig>(THEMES.find((item) => item.id === display.themeId) ?? THEMES.find((item) => item.primary === saved.accent) ?? THEMES[0]);
  const [language, setLanguage] = useState<LanguageConfig>(LANGUAGES.find((item) => item.id === saved.language) ?? LANGUAGES[0]);
  const [voice, setVoice] = useState<VoiceItem>(VOICES[0]);
  const [availableVoices, setAvailableVoices] = useState<VoiceItem[]>([]);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [autoSwitchKeys, setAutoSwitchState] = useState(getAutoSwitchPreference);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [defaultCurrency, setCurrency] = useState<CurrencyCode>(display.currency && ['BDT','PKR','INR','USD'].includes(display.currency) ? display.currency : 'BDT');
  const [windowState, setWindowState] = useState<StonicWindowState>({ musicPlayer: false, browser: false, cameraVision: false, worldMonitor: false, coreMemory: false, skillsModal: false, whatsappModal: false });
  const [agents, setAgents] = useState<AgentInfo[]>(demoAgents);
  const [nativeStatus, setNativeStatus] = useState<DesktopStatus | null>(null);
  const [connectionReady, setConnectionReady] = useState(false);
  const recognition = useRef<RecognitionController | null>(null);
  const speechQueue = useRef<SpeechQueueController | null>(null);
  const request = useRef<AbortController | null>(null);
  const listeningIntent = useRef(false);
  const speaking = useRef(false);
  const turnBusy = useRef(false);
  const generation = useRef(0);
  const startupStarted = useRef(false);
  const mounted = useRef(true);
  const messageRef = useRef(messages);
  const latest = useRef({ character, language, voice, skills, nativeStatus });
  latest.current = { character, language, voice, skills, nativeStatus };
  const sendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const listenRef = useRef<() => void>(() => undefined);
  const startupRef = useRef<() => Promise<void>>(async () => undefined);

  function append(message: ChatMessage) {
    const next = [...messageRef.current, message]; messageRef.current = next; setMessages(next);
  }
  function notice(text: string) { append({ id: `notice-${Date.now()}-${Math.random()}`, sender: 'assistant', text, timestamp: stamp(), characterId: latest.current.character.id }); }
  function updateMessage(id: string, text: string) { const next = messageRef.current.map((item) => item.id === id ? { ...item, text } : item); messageRef.current = next; setMessages(next); }
  function cancelTurn() {
    generation.current += 1;
    request.current?.abort(); request.current = null;
    speechQueue.current?.stop(); speechQueue.current = null;
    stopSpeaking(); speaking.current = false; turnBusy.current = false; setAudioAmplitude(0);
  }
  function pauseCapture() { recognition.current?.abort(); recognition.current = null; setInterimTranscript(''); }
  function stopMicrophone() { listeningIntent.current = false; setIsMicActive(false); pauseCapture(); if (!turnBusy.current && !speaking.current) setAssistantState('idle'); }
  function startListeningSession() {
    if (!mounted.current || !listeningIntent.current || recognition.current || speaking.current || turnBusy.current) return;
    setIsMicActive(true); setAssistantState('listening');
    try {
      recognition.current = startSpeechToText({
        language: latest.current.language.id,
        onTranscriptChange: (text, final) => {
          if (!mounted.current || !listeningIntent.current) return;
          if (!final) { setInterimTranscript(text); return; }
          recognition.current = null; setInterimTranscript('');
          if (text.trim()) void sendRef.current(text);
        },
        onError: (message) => {
          if (!mounted.current) return;
          listeningIntent.current = false; recognition.current = null; setIsMicActive(false); setInterimTranscript(''); setAssistantState('idle'); notice(message);
        },
        onEnd: () => { recognition.current = null; if (!listeningIntent.current && !turnBusy.current && !speaking.current) setAssistantState('idle'); },
      });
    } catch (error) {
      stopMicrophone(); notice(error instanceof Error ? error.message : 'Microphone could not start.');
    }
  }
  listenRef.current = startListeningSession;
  function toggleMic() {
    if (listeningIntent.current) { stopMicrophone(); return; }
    cancelTurn(); listeningIntent.current = true; setIsMicActive(true); listenRef.current();
  }
  function stopSpeech() {
    cancelTurn(); setAssistantState('idle');
    if (listeningIntent.current) listenRef.current();
  }

  async function sendMessage(text: string) {
    const clean = text.trim(); if (!clean) return;
    cancelTurn(); pauseCapture();
    const epoch = generation.current;
    const controller = new AbortController(); request.current = controller;
    turnBusy.current = true; setAssistantState('thinking');
    const current = latest.current;
    const user: ChatMessage = { id: `user-${Date.now()}-${epoch}`, sender: 'user', text: clean, timestamp: stamp() };
    append(user);
    const history = messageRef.current.slice(-20);
    const id = `assistant-${Date.now()}-${epoch}`;
    append({ id, sender: 'assistant', text: '', timestamp: stamp(), characterId: current.character.id });
    const queue = createStreamingSpeechQueue({
      voiceId: current.voice.systemVoiceURI || current.voice.id, languageId: current.language.id, characterGender: current.character.id,
      onStart: () => { if (generation.current === epoch) { speaking.current = true; setAssistantState('speaking'); } },
      onEnd: () => { if (generation.current === epoch) { speaking.current = false; setAudioAmplitude(0); } },
      onAmplitudeChange: (amplitude) => { if (generation.current === epoch) setAudioAmplitude(amplitude); },
    });
    speechQueue.current = queue;
    try {
      const response = await sendPromptToBrain({
        prompt: clean, characterId: current.character.id, languageId: current.language.id, conversationHistory: history,
        enabledSkills: current.skills.filter((skill) => skill.enabled).map((skill) => skill.id), signal: controller.signal,
        onChunk: (chunk, accumulated) => { if (generation.current !== epoch || controller.signal.aborted) return; updateMessage(id, accumulated); queue.enqueueChunk(chunk); },
      });
      if (generation.current !== epoch || controller.signal.aborted) return;
      if (response.error) { queue.stop(); updateMessage(id, response.replyText); }
      else { if (!messageRef.current.find((message) => message.id === id)?.text) updateMessage(id, response.replyText); await queue.finishStream(); }
    } catch (error) {
      if (!controller.signal.aborted && generation.current === epoch) { queue.stop(); updateMessage(id, error instanceof Error ? error.message : 'The reply could not be completed.'); }
    } finally {
      if (generation.current === epoch && mounted.current) {
        request.current = null; speechQueue.current = null; speaking.current = false; turnBusy.current = false; setAudioAmplitude(0); setAssistantState('idle');
        if (listeningIntent.current) listenRef.current();
      }
    }
  }
  sendRef.current = sendMessage;

  async function startDesktopSession() {
    const status = latest.current.nativeStatus; if (!status || !mounted.current) return;
    const epoch = generation.current;
    listeningIntent.current = status.preferences.voice_auto_start; setIsMicActive(listeningIntent.current);
    const text = `হ্যালো, welcome! আমার নাম নাজমুল। ${saved.preferredName.trim() || 'নাজমুল'}, কেমন আছো?`;
    notice(text);
    if (status.preferences.speech_out) {
      speaking.current = true; setAssistantState('speaking');
      try { await speakText({ text, language: latest.current.language.id, characterId: latest.current.character.id === 'male' ? 'aether' : 'bou', onAmplitudeChange: setAudioAmplitude }); }
      catch { if (mounted.current && generation.current === epoch) notice('Startup speech is unavailable. Mic and text chat remain available.'); }
    }
    if (!mounted.current || generation.current !== epoch) return;
    speaking.current = false; setAssistantState('idle'); setAudioAmplitude(0); if (listeningIntent.current) listenRef.current();
  }
  startupRef.current = startDesktopSession;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; listeningIntent.current = false; recognition.current?.abort(); recognition.current = null; generation.current += 1; request.current?.abort(); speechQueue.current?.stop(); stopSpeaking(); };
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', theme.primary);
    document.documentElement.style.setProperty('--accent-secondary', theme.secondary);
    document.documentElement.style.setProperty('--accent-glow', theme.glow);
    try { localStorage.setItem(displayStorage, JSON.stringify({ themeId: theme.id, currency: defaultCurrency })); } catch { /* Session styling stays usable. */ }
    saveUiPreferences({ ...saved, characterId: character.id === 'male' ? 'aether' : 'bou', mode: renderMode, language: language.id, accent: theme.primary });
  }, [theme, defaultCurrency, character.id, renderMode, language.id, saved]);
  useEffect(() => {
    let alive = true;
    void Promise.all([getMemories(), getSkills(), getApiKeys()]).then(([memory, catalog, keys]) => { if (alive) { setMemories(memory); setSkills(catalog); setApiKeys(keys); } }).catch(() => { if (alive) setVoiceNotice('Local UI data could not be loaded.'); });
    void fetch('/api/health').then((response) => { if (alive) setConnectionReady(response.ok); }).catch(() => { if (alive) setConnectionReady(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true; let timer = 0;
    const unsubscribe = watchDesktopApi((api) => {
      const refresh = () => { void api.get_status().then((status) => { if (!alive) return; setNativeStatus(status); setConnectionReady(true); document.title = `${APP_NAME} — Desktop ${status.version}`; void getApiKeys().then((keys) => { if (alive) setApiKeys(keys); }); }).catch(() => { if (alive) setConnectionReady(false); }); };
      refresh(); timer = window.setInterval(refresh, 1500);
    });
    return () => { alive = false; unsubscribe(); window.clearInterval(timer); };
  }, []);
  const nativeReady = nativeStatus !== null;
  useEffect(() => {
    if (!nativeReady || startupStarted.current) return;
    const timer = window.setTimeout(() => { startupStarted.current = true; void startupRef.current(); }, 350);
    return () => window.clearTimeout(timer);
  }, [nativeReady]);
  useEffect(() => {
    let alive = true;
    void getAvailableVoiceItems(language.id).then(({ voices, fallbackNotice }) => {
      if (!alive) return; setAvailableVoices(voices); const selected = voices.find((item) => item.gender === character.id) ?? voices[0]; if (selected) setVoice(selected); setVoiceNotice(fallbackNotice);
    });
    return () => { alive = false; };
  }, [language.id, character.id, nativeReady]);

  function setCharacter(gender: CharacterGender) { stopMicrophone(); cancelTurn(); setAssistantState('idle'); setCharacterConfig(CHARACTERS[gender]); setEntityFormState(gender); }
  function setEntityForm(form: EntityForm) { setEntityFormState(form); if (form === 'female' || form === 'male') setCharacter(form); }
  function setThemeById(id: string) { const selected = THEMES.find((item) => item.id === id); if (selected) setTheme(selected); }
  function setLanguageById(id: string) { const selected = LANGUAGES.find((item) => item.id === id); if (selected) { stopMicrophone(); cancelTurn(); setAssistantState('idle'); setLanguage(selected); } }
  function setVoiceById(id: string) { const selected = availableVoices.find((item) => item.id === id) ?? VOICES.find((item) => item.id === id); if (selected) setVoice(selected); }
  async function toggleSkill(id: string) { const selected = skills.find((item) => item.id === id); if (selected) setSkills(await toggleSkillState(id, !selected.enabled)); }
  async function addMemoryItem(text: string, category: MemoryItem['category']) { const item = await saveMemory(text, category); setMemories((current) => [item, ...current]); }
  async function deleteMemoryItem(id: string) { await removeMemoryService(id); setMemories((current) => current.filter((item) => item.id !== id)); }
  async function addNewApiKey(label: string, key: string) { setApiKeys(await addApiKeyService(label, key)); }
  async function deleteApiKey(id: string) { setApiKeys(await removeApiKeyService(id)); }
  async function selectActiveKey(id: string) { setApiKeys(await setActiveApiKeyService(id)); }
  function toggleAutoSwitchKeys(enabled: boolean) { setAutoSwitchState(enabled); setAutoSwitchPreference(enabled); }
  function clearMessages() { cancelTurn(); messageRef.current = []; setMessages([]); setAssistantState('idle'); }
  function toggleWindow(key: keyof StonicWindowState, forceVal?: boolean) { setWindowState((current) => ({ ...current, [key]: forceVal ?? !current[key] })); }
  function dispatchAgentTask(id: string, task: string) { setAgents((current) => current.map((agent) => agent.id === id ? { ...agent, status: 'idle', currentTask: `DEMO · ${task}`, speechBubble: 'TODO: real worker connector' } : agent)); }

  return <AssistantContext.Provider value={{ appName: APP_NAME, assistantState, setAssistantState, renderMode, setRenderMode, character, setCharacter, entityForm, setEntityForm, audioAmplitude, setAudioAmplitude, messages, sendMessage, clearMessages, isMicActive, toggleMic, stopMicrophone, interimTranscript, stopSpeech, theme, setThemeById, language, setLanguageById, voice, setVoiceById, availableVoices, voiceNotice, skills, toggleSkill, memories, addMemoryItem, deleteMemoryItem, apiKeys, addNewApiKey, deleteApiKey, selectActiveKey, autoSwitchKeys, toggleAutoSwitchKeys, isSettingsOpen, setIsSettingsOpen, isChatExpanded, setIsChatExpanded, windowState, toggleWindow, agents, dispatchAgentTask, defaultCurrency, setDefaultCurrency: setCurrency, nativeStatus, connectionReady }}>{children}</AssistantContext.Provider>;
}

export function useAssistant() { const context = useContext(AssistantContext); if (!context) throw new Error('useAssistant must be used within an AssistantProvider'); return context; }
