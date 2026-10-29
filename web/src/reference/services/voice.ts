/** Adapts the reference UI to the tested native/browser voice service. */
import type { VoiceItem, CharacterGender, LanguageId } from '../types';
import { getDesktopApi } from '../../services/desktop';
import { startSpeechToText as startExistingRecognition, speakText, stopSpeaking, listSystemVoices } from '../../services/voice';

export interface RecognitionController { stop: () => void; abort: () => void; }
export interface StartListeningOptions {
  language: LanguageId | string;
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}
export interface SentenceQueueOptions {
  voiceId?: string;
  languageId: LanguageId;
  characterGender: CharacterGender;
  onStart?: () => void;
  onEnd?: () => void;
  onAmplitudeChange?: (amplitude: number) => void;
}
export interface SpeechQueueController {
  enqueueChunk: (chunk: string) => void;
  finishStream: () => Promise<void>;
  stop: () => void;
}

export function startSpeechToText(options: StartListeningOptions): RecognitionController {
  const session = startExistingRecognition({
    language: options.language as LanguageId,
    onInterim: (text) => options.onTranscriptChange(text, false),
    onFinal: (text) => options.onTranscriptChange(text, true),
    onError: options.onError,
    onEnd: options.onEnd,
  });
  // Cancel does not submit an unfinished transcript when pausing or changing a turn.
  return { stop: session.cancel, abort: session.cancel };
}

export async function getAvailableVoiceItems(language: LanguageId): Promise<{ voices: VoiceItem[]; fallbackNotice: string | null }> {
  if (getDesktopApi()) {
    return {
      voices: (['female', 'male'] as CharacterGender[]).map((gender) => ({ id: `native-${language}-${gender}`, name: `${gender === 'female' ? 'Bou' : 'Aether'} · ${language.toUpperCase()} neural voice`, gender, languageId: language, provider: 'Native Edge TTS / Windows fallback' })),
      fallbackNotice: 'Native voice uses the selected language and character. Edge TTS receives reply text; Windows speech is the fallback.',
    };
  }
  const voices = listSystemVoices().filter((voice) => voice.lang.toLowerCase().startsWith(language)).map((voice, index) => ({ id: `system-${index}-${voice.name}`, name: voice.name, gender: (/male|guy|david|mark|james|george/i.test(voice.name) && !/female/i.test(voice.name) ? 'male' : 'female') as CharacterGender, languageId: language, provider: 'Device system voice', systemVoiceURI: voice.name }));
  return { voices, fallbackNotice: voices.length ? null : 'This browser has no installed voice for this language. Voice playback depends on device support.' };
}

export function createStreamingSpeechQueue(options: SentenceQueueOptions): SpeechQueueController {
  let buffer = '';
  let chain: Promise<void> = Promise.resolve();
  let stopped = false;
  let began = false;
  let finished = false;
  let failure: unknown;
  const enqueueSentence = (text: string) => {
    const sentence = text.trim();
    if (!sentence || stopped) return;
    chain = chain.then(async () => {
      if (stopped) return;
      if (!began) { began = true; options.onStart?.(); }
      await speakText({ text: sentence, language: options.languageId, characterId: options.characterGender === 'male' ? 'aether' : 'bou', voiceName: options.voiceId?.startsWith('native-') ? undefined : options.voiceId, onAmplitudeChange: options.onAmplitudeChange ?? (() => undefined) });
    }).catch((error: unknown) => { failure = error; });
  };
  return {
    enqueueChunk(chunk) {
      if (finished || stopped) return;
      buffer += chunk;
      const sentences = buffer.split(/(?<=[.!?।])\s+/u);
      if (sentences.length > 1) {
        sentences.slice(0, -1).forEach(enqueueSentence);
        buffer = sentences.at(-1) ?? '';
      }
    },
    async finishStream() {
      if (finished || stopped) return;
      finished = true;
      enqueueSentence(buffer);
      buffer = '';
      try { await chain; if (failure) throw failure; }
      finally { if (!stopped) { options.onAmplitudeChange?.(0); options.onEnd?.(); } }
    },
    stop() { stopped = true; buffer = ''; stopSpeaking(); options.onAmplitudeChange?.(0); },
  };
}
