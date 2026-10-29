import { useEffect, useRef, useState, type FormEvent, type CSSProperties } from "react";
import { AudioLines, AudioWaveform, Check, ChevronDown, MessageSquareText, Settings2, Sparkles, Square, UserRound } from "lucide-react";
import { APP_NAME, CHARACTERS, type CharacterId, type DisplayMode, type LanguageId } from "./config/app";
import { CharacterStage } from "./components/CharacterStage";
import { ChatPanel } from "./components/ChatPanel";
import { MicButton } from "./components/MicButton";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import { useAssistantStore } from "./store/AssistantStore";
import type { AssistantStatus, ChatMessage } from "./store/types";
import { BrainError, streamBrainReply } from "./services/brain";
import { createMockApiKey, deleteMockApiKey, getMockApiKeys, type ApiKeySlot } from "./services/apiKeys";
import { deleteMockMemory, getMockMemories, type MemoryItem } from "./services/memory";
import { getSkills, setSkillEnabled, type SkillItem } from "./services/skills";
import { listSystemVoices, startSpeechToText, speakText, stopSpeaking, watchSystemVoices, type SpeechSession, type VoiceOption } from "./services/voice";

const stateLabels: Record<AssistantStatus, string> = { idle: "অপেক্ষা", listening: "শুনছে", thinking: "ভাবছে", speaking: "বলছে" };

export default function App() {
  const { state, dispatch } = useAssistantStore();
  useEffect(() => { document.title = APP_NAME + " — AI Voice Companion"; }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState<LanguageId>("bn");
  const [voice, setVoice] = useState("");
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(() => listSystemVoices());
  const [theme, setTheme] = useState<"midnight" | "nebula">("midnight");
  const [accent, setAccent] = useState("#96f4d7");
  const [apiKeys, setApiKeys] = useState<ApiKeySlot[]>(() => getMockApiKeys());
  const [activeKeyId, setActiveKeyId] = useState("slot-01");
  const [autoRotate, setAutoRotate] = useState(true);
  const [memories, setMemories] = useState<MemoryItem[]>(() => getMockMemories());
  const [skills, setSkills] = useState<SkillItem[]>(() => getSkills());
  const [amplitude, setAmplitude] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [model, setModel] = useState("gemini");
  const recognitionRef = useRef<SpeechSession | null>(null);
  const responseAbortRef = useRef<AbortController | null>(null);
  const speechChainRef = useRef<Promise<void>>(Promise.resolve());
  const speechGenerationRef = useRef(0);

  useEffect(() => {
    let alive = true;
    void fetch("/api/health").then((response) => response.json()).then((health: { configured?: boolean; model?: string }) => {
      if (!alive) return;
      setServerReady(true);
      setKeyConfigured(Boolean(health.configured));
      setModel(health.model ?? "gemini");
    }).catch(() => { if (alive) { setServerReady(false); setKeyConfigured(false); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => watchSystemVoices(setVoiceOptions), []);
  useEffect(() => () => {
    recognitionRef.current?.cancel();
    responseAbortRef.current?.abort();
    speechGenerationRef.current += 1;
    stopSpeaking();
  }, []);

  function setStatus(status: AssistantStatus) { dispatch({ type: "set-status", status }); }

  function addMessage(role: ChatMessage["role"], text: string) {
    const message = { id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), role, text, createdAt: Date.now() };
    dispatch({ type: "add-message", message });
    return message.id;
  }

  function updateMessage(id: string, text: string) {
    dispatch({ type: "update-message", id, text });
  }

  function cancelSpeechQueue() {
    speechGenerationRef.current += 1;
    speechChainRef.current = Promise.resolve();
    stopSpeaking();
    setAmplitude(0);
  }

  function queueSentence(sentence: string, languageForSpeech: LanguageId, characterForSpeech: CharacterId, generation: number) {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) return;
    speechChainRef.current = speechChainRef.current.then(async () => {
      if (generation !== speechGenerationRef.current) return;
      await speakText({
        text: cleanSentence,
        language: languageForSpeech,
        characterId: characterForSpeech,
        voiceName: voice,
        onAmplitudeChange: setAmplitude,
      });
    }).catch(() => {
      if (generation === speechGenerationRef.current) addMessage("assistant", "এই device-এ voice playback চালানো যায়নি। Voice settings যাচাই করো।");
    });
  }

  function beginListening() {
    try {
      recognitionRef.current = startSpeechToText({
        language,
        onInterim: setDraft,
        onFinal: (text) => {
          recognitionRef.current = null;
          setDraft("");
          setStatus("idle");
          if (text) void sendTurn(text, true);
        },
        onError: (message) => {
          recognitionRef.current = null;
          setStatus("idle");
          addMessage("assistant", message);
        },
        onEnd: () => {
          recognitionRef.current = null;
          setStatus("idle");
        },
      });
      setStatus("listening");
    } catch (error) {
      setStatus("idle");
      addMessage("assistant", error instanceof Error ? error.message : "Speech recognition চালু করা যায়নি।");
    }
  }

  async function sendTurn(text: string, fromVoice = false) {
    const cleanText = text.trim();
    if (!cleanText) return;
    if (recognitionRef.current && !fromVoice) {
      recognitionRef.current.cancel();
      recognitionRef.current = null;
    }
    responseAbortRef.current?.abort();
    cancelSpeechQueue();
    const requestGeneration = speechGenerationRef.current;
    const controller = new AbortController();
    responseAbortRef.current = controller;
    const userMessage: ChatMessage = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      text: cleanText,
      createdAt: Date.now(),
    };
    const assistantMessageId = "msg-" + Date.now() + "-assistant";
    dispatch({ type: "add-message", message: userMessage });
    dispatch({ type: "add-message", message: { id: assistantMessageId, role: "assistant", text: "", createdAt: Date.now() + 1 } });
    setDraft("");
    setStatus("thinking");

    const history = [...state.messages, userMessage].slice(-20).map((message) => ({ role: message.role, text: message.text }));
    const selectedCharacter = state.characterId;
    let fullText = "";
    let sentenceBuffer = "";

    try {
      await streamBrainReply({
        messages: history,
        characterId: selectedCharacter,
        language,
        enabledSkills: skills.filter((skill) => skill.enabled).map((skill) => skill.id),
        signal: controller.signal,
        onToken: (token) => {
          if (controller.signal.aborted || responseAbortRef.current !== controller) return;
          fullText += token;
          sentenceBuffer += token;
          updateMessage(assistantMessageId, fullText);
          setStatus("speaking");
          const parts = sentenceBuffer.split(/(?<=[.!?।])\s+/u);
          if (parts.length > 1) {
            parts.slice(0, -1).forEach((sentence) => queueSentence(sentence, language, selectedCharacter, requestGeneration));
            sentenceBuffer = parts[parts.length - 1] ?? "";
          }
        },
      });
      if (sentenceBuffer.trim()) queueSentence(sentenceBuffer, language, selectedCharacter, requestGeneration);
      if (!fullText.trim()) updateMessage(assistantMessageId, "এবার কোনো উত্তর আসেনি। আবার চেষ্টা করো।");
      await speechChainRef.current;
      if (requestGeneration !== speechGenerationRef.current) {
        setAmplitude(0);
        setStatus("idle");
        return;
      }
      setAmplitude(0);
      if (fromVoice) beginListening();
      else setStatus("idle");
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof BrainError ? error.message : "একটি সমস্যা হয়েছে। আবার চেষ্টা করো।";
      if (fullText) addMessage("assistant", message);
      else updateMessage(assistantMessageId, message);
      setAmplitude(0);
      setStatus("idle");
    }
  }

  function toggleListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setStatus("idle");
      return;
    }
    if (state.status === "speaking") {
      cancelSpeechQueue();
      responseAbortRef.current?.abort();
    }
    beginListening();
  }

  function stopAssistantVoice() {
    cancelSpeechQueue();
    if (state.status === "speaking") setStatus("idle");
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendTurn(draft);
  }

  function chooseCharacter(characterId: CharacterId) { dispatch({ type: "set-character", characterId }); }
  function chooseMode(mode: DisplayMode) { dispatch({ type: "set-mode", mode }); }

  const selectedCharacter = CHARACTERS[state.characterId];
  const connectionLabel = !serverReady ? "OFFLINE" : keyConfigured ? "GEMINI KEY SET" : "KEY NEEDED";
  const serverKeyLabel = !serverReady ? "SERVER OFFLINE" : keyConfigured ? "ENV KEY SET" : "NO ENV KEY";

  return (
    <div className={"app-shell flex flex-col theme-" + theme} style={{ "--accent": accent, "--accent-soft": accent + "2e" } as CSSProperties}>
      <div className="ambient ambient-top" /><div className="ambient ambient-bottom" />
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-emblem"><AudioWaveform size={19} strokeWidth={1.8} /></div><div className="brand-name-wrap"><span>AI VOICE COMPANION</span><strong>{APP_NAME}<i>.</i></strong></div></div>
        <div className="topbar-center"><span className="system-pulse"><i /> LOCAL BRAIN · {model.toUpperCase()}</span><span className="topbar-divider" /><span className="topbar-status">{stateLabels[state.status]}</span></div>
        <div className="topbar-actions">
          <button className="icon-button chat-open-button" onClick={() => setChatOpen(true)} aria-label="কথোপকথন দেখো"><MessageSquareText size={17} /><span>{state.messages.length}</span></button>
          <button className="settings-trigger" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /><span>সেটিংস</span></button>
        </div>
      </header>

      <main className="main-layout">
        <aside className="character-rail">
          <div className="rail-heading"><span>COMPANION</span><span className="rail-line" /></div>
          {Object.values(CHARACTERS).map((character) => (
            <button key={character.id} className={"character-choice" + (state.characterId === character.id ? " active" : "")} onClick={() => chooseCharacter(character.id)}>
              <span className={"character-chip chip-" + character.id}><UserRound size={17} /></span>
              <span className="character-choice-copy"><b>{character.name}</b><small>{character.id === "bou" ? "FEMALE · VRM" : "MALE · VRM"}</small></span>
              {state.characterId === character.id && <Check size={14} className="character-check" />}
            </button>
          ))}
          <div className="rail-separator" />
          <div className="rail-heading"><span>STATE PREVIEW</span><span className="rail-line" /></div>
          <div className="state-list">
            {(["idle", "listening", "thinking", "speaking"] as AssistantStatus[]).map((status) => (
              <button key={status} className={"state-choice" + (state.status === status ? " is-current" : "")} onClick={() => setStatus(status)}>
                <span className={"state-mark state-mark-" + status}><i /></span><span>{stateLabels[status]}</span>{state.status === status && <span className="state-current-dot" />}
              </button>
            ))}
          </div>
          <div className="rail-hint"><Sparkles size={14} /><p>State-গুলোতে চাপ দিয়ে character-এর expression preview করো।</p></div>
          <div className="rail-version">BOU / LOCAL BRAIN <span>V 0.2</span></div>
        </aside>

        <section className="stage-column">
          <div className="stage-toolbar">
            <div className="stage-mode-switch" role="group" aria-label="Character display mode">
              <button className={state.mode === "3d" ? "selected" : ""} onClick={() => chooseMode("3d")}><span className="mode-glyph">3</span> 3D</button>
              <button className={state.mode === "2d" ? "selected" : ""} onClick={() => chooseMode("2d")}><span className="mode-glyph">▧</span> 2D</button>
            </div>
            <div className="stage-toolbar-tag"><span /> {selectedCharacter.name.toUpperCase()} · {state.mode.toUpperCase()}</div>
            <button className="stage-more" onClick={() => setSettingsOpen(true)} aria-label="আরও display সেটিংস"><ChevronDown size={15} /></button>
          </div>

          <CharacterStage characterId={state.characterId} mode={state.mode} status={state.status} amplitude={amplitude} />

          <div className="composer">
            <div className="composer-hint"><span className="composer-hint-dot" /> BROWSER VOICE <span>·</span> {state.status === "listening" ? "কথা শেষ হলে নিজে থেকে পাঠাবে" : "লিখে পাঠাও বা কথা বলো"}</div>
            <form className="composer-form" onSubmit={submitMessage}>
              <button type="button" className="composer-attach" aria-label="voice settings খুলুন" onClick={() => setSettingsOpen(true)}><AudioLines size={17} /></button>
              <input maxLength={8000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Bou-কে কিছু জিজ্ঞেস করো..." aria-label="মেসেজ লেখো" />
              <MicButton listening={state.status === "listening"} onClick={toggleListening} />
              {state.status === "speaking" && <button type="button" className="send-button stop-voice-button" onClick={stopAssistantVoice} aria-label="কথা থামাও"><Square size={14} /><span>থামাও</span></button>}
              <button className="send-button" type="submit" disabled={!draft.trim()} aria-label="মেসেজ পাঠাও"><span>পাঠাও</span><span>↗</span></button>
            </form>
            <p className="composer-disclaimer">Speech recognition browser-এর service-এ audio পাঠাতে পারে; privacy note README-তে আছে।</p>
          </div>
        </section>

        <ChatPanel messages={state.messages} status={state.status} mobileOpen={chatOpen} onClose={() => setChatOpen(false)} characterName={selectedCharacter.name} connectionLabel={connectionLabel} />
      </main>

      <StatusBar characterId={state.characterId} mode={state.mode} status={state.status} connection={connectionLabel} keyLabel={serverKeyLabel} />

      <SettingsPanel
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        characterId={state.characterId} onCharacterChange={chooseCharacter}
        mode={state.mode} onModeChange={chooseMode}
        language={language} onLanguageChange={(value) => setLanguage(value as LanguageId)}
        voice={voice} onVoiceChange={setVoice} voiceOptions={voiceOptions}
        theme={theme} onThemeChange={setTheme}
        accent={accent} onAccentChange={setAccent}
        keys={apiKeys} activeKeyId={activeKeyId} onSelectKey={setActiveKeyId}
        onAddKey={(label) => setApiKeys((items) => [...items, createMockApiKey(label)])}
        onRemoveKey={(id) => {
          setApiKeys((items) => deleteMockApiKey(items, id));
          if (activeKeyId === id) setActiveKeyId(apiKeys.find((item) => item.id !== id)?.id ?? "");
        }}
        autoRotate={autoRotate} onAutoRotateChange={setAutoRotate}
        memories={memories}
        onDeleteMemory={(id) => setMemories((items) => deleteMockMemory(id).filter((item) => items.some((old) => old.id === item.id)))}
        skills={skills}
        onToggleSkill={(id, enabled) => setSkills((items) => setSkillEnabled(items, id, enabled))}
        connectionLabel={connectionLabel}
      />
    </div>
  );
}
