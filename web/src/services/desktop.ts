/** Only the packaged desktop window receives this typed pywebview bridge. */
export interface DesktopStatus {
  version: string;
  model: string;
  configured: boolean;
  characterModelsPath: string;
  preferences: { voice_auto_start: boolean; speech_out: boolean };
  voice: { sessionId: number; active: boolean; preparing: boolean; speaking: boolean; error?: string };
}
export type NativeVoiceEvent =
  | { type: "transcript"; text: string }
  | { type: "error"; message: string }
  | { type: "state"; state: string };
export interface NativeKeyResult { configured: boolean; persisted?: boolean; }
export interface DesktopApi {
  get_status(): Promise<DesktopStatus>;
  set_api_key(key: string): Promise<NativeKeyResult>;
  start_listening(language?: string): Promise<DesktopStatus>;
  stop_listening(sessionId?: number): Promise<DesktopStatus>;
  speak(text: string, language: string, characterId: string): Promise<boolean>;
  stop_speaking(): Promise<boolean>;
  poll_voice_events(): Promise<NativeVoiceEvent[]>;
  open_classic(): Promise<boolean>;
}

declare global {
  interface Window { pywebview?: { api: DesktopApi }; }
}

export function getDesktopApi(): DesktopApi | null {
  return typeof window !== "undefined" && typeof window.pywebview?.api?.get_status === "function"
    ? window.pywebview.api : null;
}

/** pywebview can inject its API after React has mounted. */
export function watchDesktopApi(onReady: (api: DesktopApi) => void): () => void {
  let delivered = false;
  const check = () => {
    const api = getDesktopApi();
    if (api && !delivered) { delivered = true; window.clearInterval(timer); onReady(api); }
  };
  window.addEventListener("pywebviewready", check);
  const timer = window.setInterval(check, 150);
  check();
  return () => { window.removeEventListener("pywebviewready", check); window.clearInterval(timer); };
}
