import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { AssistantProvider, useAssistant } from "./reference/store/assistantContext";
import { TopHeader } from "./reference/components/TopHeader";
import { StatusBar } from "./reference/components/StatusBar";
import { SettingsPanel } from "./reference/components/SettingsPanel";
import { OnboardingWizard, type OnboardingPreferences } from "./components/OnboardingWizard";
import { readUiPreferences, saveUiPreferences, type UiPreferences } from "./config/preferences";
import { getDesktopApi, watchDesktopApi, type DesktopStatus } from "./services/desktop";
import { listSystemVoices, watchSystemVoices, type VoiceOption } from "./services/voice";
import "./reference/index.css";

const CharacterStage = lazy(() => import("./reference/components/CharacterStage").then((module) => ({ default: module.CharacterStage })));

function Cockpit({ onOpenSetup }: { onOpenSetup: () => void }) {
  const { appName, character, setCharacter, renderMode, setRenderMode, setIsSettingsOpen,
    theme, apiKeys, assistantState, entityForm, setEntityForm, stopSpeech, stopMicrophone, nativeStatus, connectionReady } = useAssistant();
  const activeApiKey = apiKeys.find((item) => item.status === "active") ?? null;

  async function openClassic() {
    stopMicrophone();
    stopSpeech();
    const api = getDesktopApi();
    if (api) await api.open_classic();
  }

  function openSetup() {
    stopMicrophone();
    stopSpeech();
    onOpenSetup();
  }

  return <div data-testid="bou-cockpit" className="h-dvh w-full flex flex-col justify-between bg-[#07090e] text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
    <TopHeader appName={appName} character={character} mode={renderMode} onOpenSettings={() => setIsSettingsOpen(true)} accentColor={theme.primary} onOpenSetup={openSetup} onOpenClassic={getDesktopApi() ? openClassic : undefined} />
    <main data-testid="character-stage" className="flex-1 min-h-0 w-full flex flex-col relative z-10 overflow-hidden">
      <Suspense fallback={<div className="m-auto text-xs text-cyan-300 font-mono">PREPARING YOUR COCKPIT…</div>}><CharacterStage /></Suspense>
    </main>
    <StatusBar character={character} mode={renderMode} entityForm={entityForm}
      onCycleForm={() => setEntityForm(entityForm === "orb" ? "female" : entityForm === "female" ? "male" : "orb")}
      onToggleMode={() => setRenderMode(renderMode === "3d" ? "2d" : "3d")}
      onToggleCharacter={() => setCharacter(character.id === "female" ? "male" : "female")}
      activeApiKey={activeApiKey} assistantState={assistantState} accentColor={theme.primary}
      modelLabel={nativeStatus?.model ?? "GEMINI"} connectionLabel={connectionReady ? "LOCAL READY" : "OFFLINE"} />
    <SettingsPanel />
  </div>;
}

export default function App() {
  const [preferences, setPreferences] = useState<UiPreferences>(readUiPreferences);
  const [onboardingOpen, setOnboardingOpen] = useState(() => !preferences.onboardingComplete);
  const [nativeStatus, setNativeStatus] = useState<DesktopStatus | null>(null);
  const [serverReady, setServerReady] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(listSystemVoices);
  const [providerRevision, setProviderRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const unwatch = watchDesktopApi((api) => {
      const update = () => { void api.get_status().then((status) => {
        if (!alive) return;
        setNativeStatus(status);
        setServerReady(true);
        setKeyConfigured(status.configured);
      }).catch(() => undefined); };
      update();
      timer = window.setInterval(update, 1500);
    });
    void fetch("/api/health").then((response) => {
      if (!response.ok) throw new Error("offline");
      return response.json();
    }).then((health: { configured?: boolean }) => {
      if (alive) { setServerReady(true); setKeyConfigured(Boolean(health.configured)); }
    }).catch(() => undefined);
    return () => { alive = false; unwatch(); window.clearInterval(timer); };
  }, []);

  useEffect(() => watchSystemVoices(setVoiceOptions), []);

  function finishSetup(value?: OnboardingPreferences) {
    const next = { ...preferences, ...value, onboardingComplete: true };
    saveUiPreferences(next);
    setPreferences(next);
    setProviderRevision((revision) => revision + 1);
    setOnboardingOpen(false);
  }

  if (onboardingOpen) return <div className="app-shell" style={{ "--accent": preferences.accent, "--accent-soft": preferences.accent + "2e" } as CSSProperties}>
    <OnboardingWizard initial={preferences} voiceOptions={nativeStatus ? [] : voiceOptions}
      serverReady={serverReady} keyConfigured={keyConfigured} desktop={nativeStatus !== null}
      onComplete={finishSetup} onSkip={() => finishSetup()} />
  </div>;

  return <AssistantProvider key={providerRevision}><Cockpit onOpenSetup={() => { setPreferences(readUiPreferences()); setOnboardingOpen(true); }} /></AssistantProvider>;
}
