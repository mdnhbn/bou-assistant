import type { CharacterId, DisplayMode, LanguageId } from "./app";

export type AppTheme = "midnight" | "nebula";
export interface UiPreferences {
  onboardingComplete: boolean;
  preferredName: string;
  characterId: CharacterId;
  mode: DisplayMode;
  language: LanguageId;
  voice: string;
  theme: AppTheme;
  accent: string;
}

const STORAGE_KEY = "bou.ui-preferences.v1";
const defaults: UiPreferences = { onboardingComplete: false, preferredName: "Nazmul", characterId: "bou", mode: "3d", language: "bn", voice: "", theme: "midnight", accent: "#96f4d7" };

/** Reads only display preferences from this browser; no profile data leaves the device. */
export function readUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      onboardingComplete: saved.onboardingComplete === true,
      preferredName: typeof saved.preferredName === "string" ? saved.preferredName : defaults.preferredName,
      characterId: saved.characterId === "aether" ? "aether" : "bou",
      mode: saved.mode === "2d" ? "2d" : "3d",
      language: ["bn", "en", "ar", "hi", "ur"].includes(saved.language ?? "") ? saved.language as LanguageId : defaults.language,
      voice: typeof saved.voice === "string" ? saved.voice : defaults.voice,
      theme: saved.theme === "nebula" ? "nebula" : "midnight",
      accent: /^#[\da-f]{6}$/i.test(saved.accent ?? "") ? saved.accent! : defaults.accent,
    };
  } catch { return defaults; }
}

/** TODO: Replace local preference storage with an explicitly consented sync provider, if desired. */
export function saveUiPreferences(preferences: UiPreferences): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
  catch { /* Keep the current session usable when browser storage is unavailable. */ }
}
