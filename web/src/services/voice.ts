import type { CharacterId, LanguageId } from "../config/app";

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

const SPEECH_CODES: Record<LanguageId, string> = { bn: "bn-BD", en: "en-US", ar: "ar-SA", hi: "hi-IN", ur: "ur-PK" };

export function listSystemVoices(): VoiceOption[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({ name: voice.name, lang: voice.lang }));
}

export function watchSystemVoices(onChange: (voices: VoiceOption[]) => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  const update = () => onChange(listSystemVoices());
  window.speechSynthesis.addEventListener("voiceschanged", update);
  update();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}

export function startSpeechToText(options: {
  language: LanguageId;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}): SpeechSession {
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
    const message = event.error === "not-allowed" || event.error === "service-not-allowed"
      ? "মাইক্রোফোনের অনুমতি বন্ধ। Browser-এর site permissions থেকে অনুমতি দাও।"
      : event.error === "no-speech"
        ? "কোনো কথা ধরা পড়েনি। আবার চেষ্টা করো।"
        : "Speech recognition বন্ধ হয়েছে। Browser support ও connection যাচাই করো।";
    options.onError(message);
  };
  recognition.onend = () => {
    if (finished) return;
    finished = true;
    options.onInterim("");
    const result = finalText.trim();
    options.onEnd?.();
    if (result) options.onFinal(result);
  };
  try {
    recognition.start();
  } catch {
    throw new Error("মাইক্রোফোন শুরু করা যায়নি। Browser permission ও secure localhost সংযোগ যাচাই করো।");
  }
  return {
    stop: () => { if (!finished) recognition.stop(); },
    cancel: () => { if (!finished) { finished = true; recognition.abort(); } },
  };
}

export function speakText(options: {
  text: string;
  language: LanguageId;
  characterId: CharacterId;
  voiceName?: string;
  onAmplitudeChange: (amplitude: number) => void;
}): Promise<boolean> {
  if (!window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) return Promise.resolve(false);
  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.lang = SPEECH_CODES[options.language];
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => voice.name === options.voiceName)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(options.language));
  if (preferred) utterance.voice = preferred;

  return new Promise((resolve, reject) => {
    let phase = 0;
    let pulseTimer = 0;
    utterance.onstart = () => {
      pulseTimer = window.setInterval(() => {
        phase += 0.32;
        options.onAmplitudeChange(Math.max(0.06, Math.min(0.8, 0.24 + (Math.sin(phase) + 1) * 0.2)));
      }, 90);
    };
    utterance.onboundary = () => {
      options.onAmplitudeChange(0.5);
      window.setTimeout(() => options.onAmplitudeChange(0.16), 100);
    };
    utterance.onend = () => {
      window.clearInterval(pulseTimer);
      options.onAmplitudeChange(0);
      resolve(true);
    };
    utterance.onerror = (event) => {
      window.clearInterval(pulseTimer);
      options.onAmplitudeChange(0);
      if (event.error === "canceled" || event.error === "interrupted") resolve(false);
      else reject(new Error("এই ডিভাইসে voice playback চালানো যায়নি।"));
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
