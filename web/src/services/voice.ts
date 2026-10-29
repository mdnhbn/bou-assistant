import type { CharacterId, LanguageId } from "../config/app";
import { getDesktopApi, type DesktopApi } from "./desktop";

export interface VoiceOption { name: string; lang: string; }
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface RecognitionResultItem { transcript: string; }
interface RecognitionResult { isFinal: boolean; 0: RecognitionResultItem; }
interface RecognitionResultEvent { resultIndex: number; results: ArrayLike<RecognitionResult>; }
type RecognitionConstructor = new () => SpeechRecognitionLike;
interface RecognitionWindow extends Window {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}
export interface SpeechSession { stop: () => void; cancel: () => void; }
interface ListenOptions {
  language: LanguageId;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}

const SPEECH_CODES: Record<LanguageId, string> = { bn: "bn-BD", en: "en-US", ar: "ar-SA", hi: "hi-IN", ur: "ur-PK" };
let nativeSpeechGeneration = 0;
let nativeStopPromise: Promise<unknown> = Promise.resolve();
let nativeListenControlPromise: Promise<unknown> = Promise.resolve();

function stopNativeListening(api: DesktopApi, sessionId: () => number | undefined): Promise<unknown> {
  const stopped = nativeListenControlPromise.then(() => { const id = sessionId(); return id === undefined ? undefined : api.stop_listening(id); });
  nativeListenControlPromise = stopped.catch(() => undefined);
  return stopped;
}

export function listSystemVoices(): VoiceOption[] {
  if (typeof window === "undefined" || !window.speechSynthesis || getDesktopApi()) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({ name: voice.name, lang: voice.lang }));
}

export function watchSystemVoices(onChange: (voices: VoiceOption[]) => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  const update = () => onChange(listSystemVoices());
  window.speechSynthesis.addEventListener("voiceschanged", update);
  update();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}

function startNativeSpeechToText(api: DesktopApi, options: ListenOptions): SpeechSession {
  let finished = false;
  let sessionId: number | undefined;
  const currentSession = () => sessionId;
  let cancelled = false;
  let started = false;
  let polling = false;
  const finish = () => { finished = true; window.clearInterval(timer); };
  const fail = (message: string) => {
    if (finished) return;
    finish();
    void stopNativeListening(api, currentSession).catch(() => undefined);
    options.onError(message);
  };
  const poll = async () => {
    if (finished || !started || polling) return;
    polling = true;
    try {
      const events = await api.poll_voice_events();
      if (finished) return;
      for (const event of events) {
        if (event.type === "error") { fail(event.message); break; }
        if (event.type === "transcript" && event.text.trim()) {
          finish();
          // Pause capture before sending/speaking, so the assistant cannot hear its own reply.
          try { await stopNativeListening(api, currentSession); }
          catch { if (!cancelled) options.onError("Microphone থামানো যায়নি। Session আবার চালু করুন।"); return; }
          if (cancelled) return;
          options.onInterim("");
          options.onEnd?.();
          options.onFinal(event.text.trim());
          break;
        }
      }
    } catch (error) { fail(error instanceof Error ? error.message : "Desktop microphone সংযোগ বন্ধ হয়েছে।"); }
    finally { polling = false; }
  };
  const timer = window.setInterval(() => { void poll(); }, 250);
  const starting = nativeListenControlPromise.then(() => {
    if (cancelled) return null;
    return api.start_listening(options.language);
  }).then((status) => { if (status) sessionId = status.voice.sessionId; return status; });
  nativeListenControlPromise = starting.catch(() => undefined);
  void starting.then((status) => {
    // Cancellation already queued its stop behind this start. Never stop a newer session here.
    if (!status || finished) return;
    started = true;
    if (status.voice.error) fail(status.voice.error);
    else void poll();
  }).catch((error: unknown) => fail(error instanceof Error ? error.message : "Local Whisper শুরু করা যায়নি।"));
  const cancel = () => { cancelled = true; if (!finished) { finish(); void stopNativeListening(api, currentSession).catch(() => undefined); } };
  return { stop: () => { cancel(); options.onEnd?.(); }, cancel };
}

export function startSpeechToText(options: ListenOptions): SpeechSession {
  const desktopApi = getDesktopApi();
  if (desktopApi) return startNativeSpeechToText(desktopApi, options);
  const speechWindow = window as RecognitionWindow;
  const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!Constructor) throw new Error("এই browser-এ speech recognition নেই। সর্বশেষ Chrome বা Edge ব্যবহার করো।");
  const recognition = new Constructor();
  let finalText = "";
  let finished = false;
  recognition.lang = SPEECH_CODES[options.language];
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (!result?.[0]) continue;
      if (result.isFinal) finalText += result[0].transcript + " ";
      else interim += result[0].transcript;
    }
    options.onInterim(interim.trim());
  };
  recognition.onerror = (event) => {
    options.onError(event.error === "not-allowed" || event.error === "service-not-allowed"
      ? "মাইক্রোফোনের অনুমতি বন্ধ। Browser-এর site permissions থেকে অনুমতি দাও।"
      : event.error === "no-speech" ? "কোনো কথা ধরা পড়েনি। আবার চেষ্টা করো।" : "Speech recognition বন্ধ হয়েছে। Browser support ও connection যাচাই করো।");
  };
  recognition.onend = () => {
    if (finished) return;
    finished = true;
    options.onInterim("");
    options.onEnd?.();
    if (finalText.trim()) options.onFinal(finalText.trim());
  };
  try { recognition.start(); }
  catch { throw new Error("মাইক্রোফোন শুরু করা যায়নি। Browser permission ও secure localhost সংযোগ যাচাই করো।"); }
  return { stop: () => { if (!finished) recognition.stop(); }, cancel: () => { if (!finished) { finished = true; recognition.abort(); } } };
}

export async function speakText(options: {
  text: string;
  language: LanguageId;
  characterId: CharacterId;
  voiceName?: string;
  onAmplitudeChange: (amplitude: number) => void;
}): Promise<boolean> {
  const desktopApi = getDesktopApi();
  if (desktopApi) {
    const generation = nativeSpeechGeneration;
    await nativeStopPromise;
    await nativeListenControlPromise;
    if (generation !== nativeSpeechGeneration) return false;
    let phase = 0;
    // TODO: Replace synthetic lip-sync amplitude with native output audio analysis.
    const timer = window.setInterval(() => {
      if (generation !== nativeSpeechGeneration) { window.clearInterval(timer); options.onAmplitudeChange(0); return; }
      phase += .32;
      options.onAmplitudeChange(Math.max(.06, Math.min(.8, .24 + (Math.sin(phase) + 1) * .2)));
    }, 90);
    try { return await desktopApi.speak(options.text, options.language, options.characterId); }
    finally { window.clearInterval(timer); options.onAmplitudeChange(0); }
  }
  if (!window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.lang = SPEECH_CODES[options.language];
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => voice.name === options.voiceName) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(options.language));
  if (preferred) utterance.voice = preferred;
  return new Promise((resolve, reject) => {
    let phase = 0;
    let pulseTimer = 0;
    utterance.onstart = () => { pulseTimer = window.setInterval(() => { phase += .32; options.onAmplitudeChange(Math.max(.06, Math.min(.8, .24 + (Math.sin(phase) + 1) * .2))); }, 90); };
    utterance.onboundary = () => { options.onAmplitudeChange(.5); window.setTimeout(() => options.onAmplitudeChange(.16), 100); };
    utterance.onend = () => { window.clearInterval(pulseTimer); options.onAmplitudeChange(0); resolve(true); };
    utterance.onerror = (event) => {
      window.clearInterval(pulseTimer); options.onAmplitudeChange(0);
      if (event.error === "canceled" || event.error === "interrupted") resolve(false);
      else reject(new Error("এই ডিভাইসে voice playback চালানো যায়নি।"));
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  nativeSpeechGeneration += 1;
  const api = getDesktopApi();
  if (api) nativeStopPromise = api.stop_speaking().catch(() => undefined);
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
