import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowLeft, ArrowRight, Check, Headphones, KeyRound, Mic2, Shield, Sparkles, UserRound, Volume2, Zap } from "lucide-react";
import { APP_NAME, CHARACTERS, LANGUAGES, type CharacterId, type DisplayMode, type LanguageId } from "../config/app";
import type { AppTheme } from "../config/preferences";
import type { VoiceOption } from "../services/voice";
import { CharacterStage } from "./CharacterStage";

export interface OnboardingPreferences {
  preferredName: string;
  characterId: CharacterId;
  mode: DisplayMode;
  language: LanguageId;
  voice: string;
  theme: AppTheme;
  accent: string;
}

const steps = ["System check", "Your name", "Voice", "Character", "First contact", "About you", "Connection", "Ready"];
const accents = ["#96f4d7", "#9eafff", "#ffa6c9", "#f6cf83", "#87d7ff"];
const titles = ["A quick system check", "What should I call you?", "Choose how we talk", "Meet your companion", "Your first hello", "A little about you", "Connect your assistant", "Your space is ready"];
const notes = [
  "আপনার assistant-এর local setup ও optional assets দেখুন।",
  "কথোপকথনে আপনাকে যেভাবে সম্বোধন করব, সেটি লিখুন।",
  "ভাষা ও device-এর system voice বেছে নিন।",
  "Bou বা Aether এবং আপনার পছন্দের display mode বেছে নিন।",
  "এই greeting-টাই প্রথমবার আপনার সামনে দেখানো হবে।",
  "Memory panel-এ এখন demo data আছে; কোনো ব্যক্তিগত তথ্য সংগ্রহ হচ্ছে না।",
  "Provider connection ঐচ্ছিক। Key পরে local server-এর .env-এ যোগ করা যাবে।",
  "আপনার পছন্দগুলো এই browser-এ সংরক্ষিত হবে।",
];

export function OnboardingWizard({ initial, voiceOptions, serverReady, keyConfigured, onComplete, onSkip }: {
  initial: OnboardingPreferences;
  voiceOptions: VoiceOption[];
  serverReady: boolean;
  keyConfigured: boolean;
  onComplete: (preferences: OnboardingPreferences) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState(initial);
  const selected = CHARACTERS[preferences.characterId];

  function update<K extends keyof OnboardingPreferences>(key: K, value: OnboardingPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function continueSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) setStep((current) => current + 1);
    else onComplete(preferences);
  }

  return (
    <div className={"setup-overlay theme-" + preferences.theme} style={{ "--accent": preferences.accent, "--accent-soft": preferences.accent + "2e" } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="setup-shell">
        <header className="setup-topbar">
          <div className="setup-brand"><span className="setup-brand-mark"><Activity size={17} /></span><span><small>PERSONAL AI COMPANION</small><strong>{APP_NAME}<i>.</i></strong></span></div>
          <div className="setup-top-status"><span className="setup-live-dot" /> PRIVATE LOCAL SETUP</div>
          <button className="setup-skip" type="button" onClick={onSkip}>এখন পরে</button>
        </header>

        <main className="setup-main">
          <section className="setup-form-panel">
            <div className="setup-step-count">STEP {step + 1} <span>OF</span> {steps.length}</div>
            <h1 id="setup-title" key={titles[step]} className="setup-title">{titles[step]}</h1>
            <p className="setup-subtitle">{notes[step]}</p>

            <form className="setup-step-content" onSubmit={continueSetup}>
              {step === 0 && <div className="setup-checklist">
                <SetupCheck icon={<Check size={15} />} title="Interface ready" note="React, 3D scene ও local preferences" status="READY" />
                <SetupCheck icon={<Mic2 size={15} />} title="Microphone access" note="Mic button চাপলে browser permission চাইবে" status="ON REQUEST" />
                <SetupCheck icon={<UserRound size={15} />} title="Humanoid character" note={`${selected.name} VRM asset ঐচ্ছিক`} status="OPTIONAL" />
                <div className="setup-privacy-note"><Shield size={15} /><span>এটি PC dependency scan নয়। Installer প্রয়োজনীয় runtime আগেই যাচাই করে; এই wizard কোনো system data পড়ছে না।</span></div>
              </div>}

              {step === 1 && <label className="setup-field"><span>আপনাকে কী নামে ডাকব?</span><input autoFocus value={preferences.preferredName} maxLength={48} onChange={(event) => update("preferredName", event.target.value)} placeholder="যেমন, Nazmul" /><small>নামটি শুধু এই browser-এর local preferences-এ থাকবে।</small></label>}

              {step === 2 && <div className="setup-field-stack">
                <label className="setup-field"><span>কথোপকথনের ভাষা</span><select value={preferences.language} onChange={(event) => update("language", event.target.value as LanguageId)}>{LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}</select></label>
                <label className="setup-field"><span>Voice</span><select value={preferences.voice} onChange={(event) => update("voice", event.target.value)}><option value="">System voice · automatic</option>{voiceOptions.map((voice, index) => <option key={voice.name + voice.lang + index} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select></label>
                <div className="setup-inline-info"><Headphones size={15} /><span>Voice list এই device-এর browser থেকে আসে। এখনই কোনো audio চালু হবে না।</span></div>
              </div>}

              {step === 3 && <div className="setup-character-options">
                {Object.values(CHARACTERS).map((character) => <button type="button" key={character.id} aria-pressed={preferences.characterId === character.id} className={"setup-character-card" + (preferences.characterId === character.id ? " selected" : "")} onClick={() => update("characterId", character.id)}>
                  <span className={"setup-character-avatar avatar-" + character.id}>{character.id === "bou" ? "B" : "A"}</span><span><b>{character.name}</b><small>{character.description}</small></span>{preferences.characterId === character.id && <Check size={16} />}
                </button>)}
                <div className="setup-mode-row"><span>Character view</span><div><button type="button" aria-pressed={preferences.mode === "3d"} className={preferences.mode === "3d" ? "selected" : ""} onClick={() => update("mode", "3d")}>3D · VRM</button><button type="button" aria-pressed={preferences.mode === "2d"} className={preferences.mode === "2d" ? "selected" : ""} onClick={() => update("mode", "2d")}>2D · portrait</button></div></div>
                <div className="setup-appearance"><span>Theme</span><div className="setup-theme-buttons"><button type="button" aria-pressed={preferences.theme === "midnight"} className={preferences.theme === "midnight" ? "selected" : ""} onClick={() => update("theme", "midnight")}>Midnight</button><button type="button" aria-pressed={preferences.theme === "nebula"} className={preferences.theme === "nebula" ? "selected" : ""} onClick={() => update("theme", "nebula")}>Nebula</button></div><span>Accent</span><div className="setup-swatches">{accents.map((accent) => <button type="button" key={accent} aria-label={`Accent ${accent}`} aria-pressed={preferences.accent === accent} className={preferences.accent === accent ? "selected" : ""} style={{ background: accent }} onClick={() => update("accent", accent)} />)}</div></div>
              </div>}

              {step === 4 && <div className="setup-greeting-card"><span><Volume2 size={15} /> MOCK WELCOME</span><p>“হ্যালো, welcome! আমার নাম নাজমুল। {preferences.preferredName.trim() || "নাজমুল"}, কেমন আছো?”</p><small>শুধু preview। Setup শেষ করলেই microphone চালু হবে না; Mic button চাপলে শুরু হবে।</small></div>}

              {step === 5 && <div className="setup-memory-card"><span className="setup-memory-icon"><Sparkles size={16} /></span><div><b>আমার সম্পর্কে যা মনে রেখেছি</b><p>বাংলায় কথা বলতে পছন্দ করো <em>DEMO</em></p><p>উত্তর সংক্ষিপ্ত ও উষ্ণ হোক <em>DEMO</em></p><p>Long-term memory এখনো যুক্ত হয়নি <em>TODO</em></p></div><small>এই তথ্যগুলো sample card। Assistant এগুলো সংরক্ষণ বা ব্যবহার করছে না।</small></div>}

              {step === 6 && <div className="setup-connection-card"><span className={"setup-connection-icon" + (keyConfigured ? " connected" : "")}><KeyRound size={17} /></span><div><b>{serverReady ? keyConfigured ? "Provider key configured" : "Local service is ready" : "Demo / offline mode"}</b><p>{serverReady ? keyConfigured ? "Gemini connection status পাওয়া গেছে।" : "AI replies-এর জন্য local .env-এ Gemini key যোগ করুন।" : "Server পাওয়া যায়নি; UI এবং character preview ব্যবহার করা যাবে।"}</p></div><span className="setup-connection-pill">{keyConfigured ? "CONNECTED" : "OPTIONAL"}</span><small>এখানে কোনো sign-in, key entry বা network request করা হচ্ছে না। Key Settings panel-এর বাইরে configure করতে হবে।</small></div>}

              {step === 7 && <div className="setup-summary-card"><div className="setup-summary-avatar">{selected.name.slice(0, 1)}</div><div><small>YOUR COMPANION</small><h2>{selected.name}</h2><p>{preferences.preferredName.trim() || "Nazmul"} · {LANGUAGES.find((item) => item.id === preferences.language)?.label} · {preferences.mode.toUpperCase()}</p></div><span className="setup-ready-badge"><Zap size={13} /> READY</span></div>}

              <div className="setup-actions">
                <button type="button" className="setup-back" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={15} /> পেছনে</button>
                <button className="setup-continue" type="submit" disabled={step === 1 && !preferences.preferredName.trim()}>{step === steps.length - 1 ? "Bou খুলুন" : "চালিয়ে যান"}<ArrowRight size={15} /></button>
              </div>
            </form>

            <nav className="setup-progress" aria-label="Setup steps">{steps.map((item, index) => <button key={item} type="button" onClick={() => setStep(index)} aria-label={`${index + 1}. ${item}`} aria-current={index === step ? "step" : undefined} className={(index < step ? "done " : "") + (index === step ? "current" : "")}><span>{index < step ? <Check size={11} /> : index + 1}</span><small>{item}</small></button>)}</nav>
          </section>

          <section className="setup-visual" aria-label={`${selected.name} character preview`}>
            <div className="setup-orbit setup-orbit-one" /><div className="setup-orbit setup-orbit-two" /><div className="setup-crosshair crosshair-one" /><div className="setup-crosshair crosshair-two" />
            <div className="setup-visual-meta"><span><i /> CHARACTER PREVIEW</span><span>{selected.name.toUpperCase()} · {preferences.mode.toUpperCase()}</span></div>
            <CharacterStage characterId={preferences.characterId} mode={preferences.mode} status="idle" amplitude={0} />
            <div className="setup-visual-caption"><span className="setup-caption-line" /><div><small>YOUR COMPANION</small><b>{selected.name}</b></div><span className="setup-caption-line" /></div>
            <div className="setup-asset-hint">VRM: public/models/{preferences.characterId}.vrm</div>
          </section>
        </main>
        <footer className="setup-footer"><span><Shield size={13} /> LOCAL PREFERENCES · NO LOGIN REQUIRED</span><div>{steps.map((item, index) => <i key={item} className={index <= step ? "passed" : ""} />)}</div><span>SETUP PREVIEW · {String(step + 1).padStart(2, "0")} / 08</span></footer>
      </div>
    </div>
  );
}

function SetupCheck({ icon, title, note, status }: { icon: ReactNode; title: string; note: string; status: string }) {
  return <div className="setup-check-row"><span className="setup-check-icon">{icon}</span><span><b>{title}</b><small>{note}</small></span><em>{status}</em></div>;
}
