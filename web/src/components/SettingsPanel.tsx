import { useEffect, useState } from "react";
import { Check, ChevronDown, KeyRound, Palette, Plus, Settings2, Sparkles, UserRound, X } from "lucide-react";
import { APP_NAME, CHARACTERS, LANGUAGES, type CharacterId, type DisplayMode } from "../config/app";
import type { ApiKeySlot } from "../services/apiKeys";
import type { MemoryItem } from "../services/memory";
import type { SkillId, SkillItem } from "../services/skills";
import type { VoiceOption } from "../services/voice";
import type { DesktopStatus, NativeKeyResult } from "../services/desktop";
import { MemoryPanel } from "./MemoryPanel";
import { SkillsPanel } from "./SkillsPanel";

const accents = ["#96f4d7", "#9eafff", "#ffa6c9", "#f6cf83", "#87d7ff"];

export function SettingsPanel({
  open, onClose, characterId, onCharacterChange, mode, onModeChange, language, onLanguageChange,
  voice, onVoiceChange, voiceOptions, theme, onThemeChange, accent, onAccentChange, keys, activeKeyId,
  onSelectKey, onAddKey, onRemoveKey, autoRotate, onAutoRotateChange, memories,
  onDeleteMemory, skills, onToggleSkill, connectionLabel, desktop, nativeStatus, onSaveNativeKey, onOpenClassic,
}: {
  open: boolean;
  onClose: () => void;
  characterId: CharacterId;
  onCharacterChange: (id: CharacterId) => void;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  voiceOptions: VoiceOption[];
  theme: "midnight" | "nebula";
  onThemeChange: (theme: "midnight" | "nebula") => void;
  accent: string;
  onAccentChange: (color: string) => void;
  keys: ApiKeySlot[];
  activeKeyId: string;
  onSelectKey: (id: string) => void;
  onAddKey: (label: string) => void;
  onRemoveKey: (id: string) => void;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  memories: MemoryItem[];
  onDeleteMemory: (id: string) => void;
  skills: SkillItem[];
  onToggleSkill: (id: SkillId, enabled: boolean) => void;
  connectionLabel: string;
  desktop: boolean;
  nativeStatus: DesktopStatus | null;
  onSaveNativeKey: (key: string) => Promise<NativeKeyResult>;
  onOpenClassic: () => Promise<void>;
}) {
  const [newKeyName, setNewKeyName] = useState("");
  const [nativeKey, setNativeKey] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  useEffect(() => { if (!open) { setNativeKey(""); setKeyMessage(""); } }, [open]);

  async function saveKey(key: string) {
    setKeySaving(true); setKeyMessage("");
    try {
      const result = await onSaveNativeKey(key);
      setNativeKey("");
      setKeyMessage(result.persisted === false ? "Key শুধু চলতি session-এ রাখা হয়েছে।" : key ? "Key Windows Credential Manager-এ সংরক্ষিত।" : "সংরক্ষিত key মুছে দেওয়া হয়েছে।");
    } catch { setNativeKey(""); setKeyMessage("Key সংরক্ষণ করা যায়নি। Desktop secure storage যাচাই করুন।"); }
    finally { setKeySaving(false); }
  }

  return (
    <>
      <button disabled={!open} aria-hidden={!open} tabIndex={open ? 0 : -1} className={"settings-backdrop" + (open ? " is-visible" : "")} onClick={onClose} aria-label="সেটিংস বন্ধ করো" />
      <aside className={"settings-panel" + (open ? " is-open" : "")} aria-hidden={!open} inert={!open}>
        <header className="settings-header">
          <div className="settings-brand-icon"><Settings2 size={17} /></div>
          <div><span className="eyebrow">PERSONALIZE YOUR SPACE</span><h2>{APP_NAME} সেটিংস</h2></div>
          <button className="icon-button settings-close" onClick={onClose} aria-label="বন্ধ করো"><X size={19} /></button>
        </header>
        <div className="settings-scroll">
          <section className="settings-section">
            <div className="section-heading"><span className="section-icon"><UserRound size={15} /></span><div><h3>Character ও display</h3><p>{desktop ? "মডেল ফাইল desktop characters folder-এ রাখুন" : "মডেল ফাইল public/models-এ রাখো"}</p></div></div>
            <div className="settings-character-grid">
              {Object.values(CHARACTERS).map((character) => (
                <button className={"settings-character" + (characterId === character.id ? " selected" : "")} key={character.id} onClick={() => onCharacterChange(character.id)}>
                  <span className="settings-character-orb">{character.id === "bou" ? "B" : "A"}</span>
                  <span><b>{character.name}</b><small>{character.title}</small></span>
                  {characterId === character.id && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="settings-mode-row">
              <button className={mode === "3d" ? "selected" : ""} onClick={() => onModeChange("3d")}><span>3D</span><small>VRM humanoid</small></button>
              <button className={mode === "2d" ? "selected" : ""} onClick={() => onModeChange("2d")}><span>2D</span><small>portrait view</small></button>
            </div>
          </section>

          <section className="settings-section">
            <div className="section-heading"><span className="section-icon"><Palette size={15} /></span><div><h3>Theme ও accent</h3><p>এই device-এর local styling</p></div></div>
            <div className="theme-pills">
              <button className={theme === "midnight" ? "selected" : ""} onClick={() => onThemeChange("midnight")}><span className="theme-preview midnight-preview" /> Midnight</button>
              <button className={theme === "nebula" ? "selected" : ""} onClick={() => onThemeChange("nebula")}><span className="theme-preview nebula-preview" /> Nebula</button>
            </div>
            <div className="accent-row"><span>Accent color</span><div>{accents.map((color) => (
              <button className={"accent-swatch" + (accent === color ? " selected" : "")} key={color} style={{ background: color }} onClick={() => onAccentChange(color)} aria-label={"Accent " + color} />
            ))}</div></div>
          </section>

          <section className="settings-section settings-selects">
            <div className="section-heading"><span className="section-icon"><Sparkles size={15} /></span><div><h3>ভাষা ও voice</h3><p>{desktop ? "Local Whisper · native desktop speech" : "System voice · browser Speech API"}</p></div></div>
            <label className="select-field"><span>ভাষা</span><span className="select-wrap"><select value={language} onChange={(event) => onLanguageChange(event.target.value)}>{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={14} /></span></label>
            <label className="select-field"><span>Voice</span><span className="select-wrap"><select value={desktop ? "" : voice} disabled={desktop} onChange={(event) => onVoiceChange(event.target.value)}><option value="">{desktop ? "Desktop voice · automatic" : "System voice · automatic"}</option>{voiceOptions.map((item, index) => <option key={item.name + item.lang + index} value={item.name}>{item.name} · {item.lang}</option>)}</select><ChevronDown size={14} /></span></label>
            {!desktop && !voiceOptions.length && <p className="settings-inline-note">এই device-এ এখনো system voice পাওয়া যায়নি। Browser বা OS-এর voice settings দেখো।</p>}
          </section>

          {desktop ? <section className="settings-section">
            <div className="section-heading"><span className="section-icon"><KeyRound size={15} /></span><div><h3>Gemini provider key</h3><p>{nativeStatus?.configured ? "Key configured" : "General AI replies-এর জন্য আপনার key যোগ করুন"}</p></div></div>
            <p className="settings-inline-note">Key Windows Credential Manager-এ থাকে; browser storage বা chat-এ লেখা হয় না।</p>
            <form className="native-key-form" onSubmit={(event) => { event.preventDefault(); void saveKey(nativeKey.trim()); }}>
              <label className="select-field"><span>নতুন key</span><input type="password" autoComplete="off" spellCheck={false} value={nativeKey} onChange={(event) => setNativeKey(event.target.value)} aria-label="Gemini API key" placeholder="Gemini API key" /></label>
              <div className="native-key-actions"><button type="submit" disabled={keySaving || !nativeKey.trim()}>{keySaving ? "সংরক্ষণ হচ্ছে…" : "Key সংরক্ষণ"}</button><button type="button" disabled={keySaving || !nativeStatus?.configured} onClick={() => { void saveKey(""); }}>সংরক্ষিত key মুছুন</button></div>
              <p className="settings-inline-note" role="status">{keyMessage || "Key কখনো আবার দেখানো হবে না। Automatic key rotation এখনো placeholder।"}</p>
            </form>
          </section> : <section className="settings-section">
            <div className="section-heading"><span className="section-icon"><KeyRound size={15} /></span><div><h3>API key slots</h3><p>নিচের slot-গুলো demo; server key: {connectionLabel}</p></div></div>
            <p className="settings-inline-note">আসল GEMINI_API_KEY local .env-এ থাকে, UI বা GitHub-এ নয়।</p>
            <div className="key-list">
              {keys.map((key) => (
                <div className={"key-row" + (key.id === activeKeyId ? " key-active" : "")} key={key.id}>
                  <button className="key-select" onClick={() => onSelectKey(key.id)} aria-label={key.label + " সক্রিয় করো"}>
                    <span className="key-radio">{key.id === activeKeyId && <i />}</span>
                    <span className="key-copy"><b>{key.label}</b><small>{key.maskedKey}</small></span>
                  </button>
                  <button className="tiny-icon-button" onClick={() => onRemoveKey(key.id)} aria-label={key.label + " মুছুন"}><X size={14} /></button>
                </div>
              ))}
              <div className="add-key-row">
                <input value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} placeholder="Demo slot name" aria-label="নতুন demo slot-এর নাম" />
                <button onClick={() => { onAddKey(newKeyName); setNewKeyName(""); }}><Plus size={14} /> যোগ</button>
              </div>
            </div>
            <div className="setting-toggle-row">
              <div><b>একটা key-র limit শেষ হলে পরেরটায় নিজে থেকে চলে যাও</b><small>UI toggle · real key rotation পরে যুক্ত হবে</small></div>
              <button role="switch" aria-checked={autoRotate} className={"mini-switch" + (autoRotate ? " is-on" : "")} onClick={() => onAutoRotateChange(!autoRotate)} aria-label="পরের key-তে যাও toggle"><span /></button>
            </div>
          </section>}
          {desktop && <section className="settings-section">
            <div className="section-heading"><span className="section-icon"><Settings2 size={15} /></span><div><h3>Desktop tools</h3><p>Workers, archive, camera ও অনুমতিভিত্তিক PC control</p></div></div>
            <p className="settings-inline-note">Startup mic: {nativeStatus?.preferences.voice_auto_start ? "ON" : "OFF"} · Spoken greeting: {nativeStatus?.preferences.speech_out ? "ON" : "OFF"}। এই পছন্দগুলো desktop settings থেকে আসে।</p>
            <button type="button" className="settings-trigger" onClick={() => { void onOpenClassic(); }}>Desktop tools ও voice preferences খুলুন</button>
          </section>}
          <MemoryPanel memories={memories} onDelete={onDeleteMemory} />
          <SkillsPanel skills={skills} onToggle={onToggleSkill} />
          <div className="settings-note"><span>i</span><p>Memory এখন local placeholder। Skills উত্তর লেখার guidance দেয়; কোনো external action বা code চালায় না।</p></div>
        </div>
      </aside>
    </>
  );
}
