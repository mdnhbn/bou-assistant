/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { getDesktopApi, watchDesktopApi, type DesktopApi, type DesktopStatus, type NativeVoiceEvent } from "./desktop";
import { speakText, startSpeechToText, stopSpeaking, type SpeechRecognitionLike } from "./voice";

const status: DesktopStatus = {
  version: "1.11.0", model: "gemini", configured: false, characterModelsPath: "C:/local/characters",
  preferences: { voice_auto_start: true, speech_out: true }, voice: { sessionId: 7, active: true, preparing: false, speaking: false },
};
function mockApi(overrides: Partial<DesktopApi> = {}): DesktopApi {
  return { get_status: async () => status, set_api_key: async () => ({ configured: true, persisted: true }),
    start_listening: async () => status, stop_listening: async () => status, speak: async () => true,
    stop_speaking: async () => true, poll_voice_events: async () => [], open_classic: async () => true, ...overrides };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function installWindow(api?: DesktopApi) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = new Map<number, () => void>(); const listeners = new Map<string, () => void>(); let timerId = 0;
  const fake = { pywebview: api ? { api } : undefined,
    setInterval: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearInterval: (id: number) => { timers.delete(id); },
    addEventListener: (event: string, callback: () => void) => { listeners.set(event, callback); },
    removeEventListener: (event: string) => { listeners.delete(event); } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fake });
  return { fake, timers, emit: (event: string) => listeners.get(event)?.(), restore: () => {
    if (prior) Object.defineProperty(globalThis, "window", prior); else Reflect.deleteProperty(globalThis, "window");
  } };
}

test("desktop injection is discovered once and readiness polling is cleaned up", () => {
  const scope = installWindow();
  try {
    assert.equal(getDesktopApi(), null); let calls = 0;
    const cleanup = watchDesktopApi(() => { calls += 1; });
    scope.fake.pywebview = { api: mockApi() }; scope.emit("pywebviewready"); scope.emit("pywebviewready");
    assert.equal(calls, 1); assert.equal(scope.timers.size, 0); cleanup();
  } finally { scope.restore(); }
});

test("native transcript closes capture before final callback and honors selected language", async () => {
  const calls: string[] = []; const events: NativeVoiceEvent[] = [{ type: "transcript", text: "আমি ভালো আছি" }];
  let releaseStop: (() => void) | undefined;
  const scope = installWindow(mockApi({
    start_listening: async (language) => { calls.push("start:" + language); return status; },
    poll_voice_events: async () => events.splice(0),
    stop_listening: (id) => { assert.equal(id, 7); calls.push("stop"); return new Promise((resolve) => { releaseStop = () => resolve(status); }); },
  }));
  try {
    startSpeechToText({ language: "bn", onInterim: () => undefined, onFinal: (text) => { calls.push(text); }, onError: assert.fail });
    await flush(); assert.deepEqual(calls, ["start:bn", "stop"]); assert.equal(scope.timers.size, 0);
    releaseStop?.(); await flush(); assert.deepEqual(calls, ["start:bn", "stop", "আমি ভালো আছি"]);
  } finally { scope.restore(); }
});

test("pausing while native capture closes suppresses its pending transcript", async () => {
  let delivered = false; let releaseStop: (() => void) | undefined;
  const scope = installWindow(mockApi({
    poll_voice_events: async () => [{ type: "transcript", text: "pending words" }],
    stop_listening: () => new Promise((resolve) => { releaseStop = () => resolve(status); }),
  }));
  try {
    const session = startSpeechToText({ language: "ar", onInterim: () => undefined, onFinal: () => { delivered = true; }, onError: assert.fail });
    await flush(); session.cancel(); releaseStop?.(); await flush(); assert.equal(delivered, false);
  } finally { scope.restore(); }
});

test("native speech waits for preceding stop and bypasses browser speech APIs", async () => {
  let spoke = false; let releaseStop: (() => void) | undefined; const amplitudes: number[] = [];
  const scope = installWindow(mockApi({
    stop_speaking: () => new Promise((resolve) => { releaseStop = () => resolve(true); }),
    speak: async (text, language, character) => { assert.deepEqual([text, language, character], ["Hello", "en", "aether"]); spoke = true; return true; },
  }));
  try {
    stopSpeaking(); const completion = speakText({ text: "Hello", language: "en", characterId: "aether", onAmplitudeChange: (value) => amplitudes.push(value) });
    await flush(); assert.equal(spoke, false); releaseStop?.(); assert.equal(await completion, true);
    assert.equal(spoke, true); assert.equal(amplitudes.at(-1), 0);
  } finally { scope.restore(); }
});


test("rapid cancel and restart cannot let a stale start stop the newer session", async () => {
  const calls: string[] = [];
  let releaseStart: (() => void) | undefined;
  const scope = installWindow(mockApi({
    start_listening: (language) => {
      calls.push("start:" + language);
      return language === "bn" ? new Promise((resolve) => { releaseStart = () => resolve(status); }) : Promise.resolve(status);
    },
    stop_listening: async () => { calls.push("stop"); return status; },
  }));
  try {
    const first = startSpeechToText({ language: "bn", onInterim: () => undefined, onFinal: assert.fail, onError: assert.fail });
    await flush(); first.cancel();
    const second = startSpeechToText({ language: "en", onInterim: () => undefined, onFinal: assert.fail, onError: assert.fail });
    await flush(); assert.deepEqual(calls, ["start:bn"]);
    releaseStart?.(); await flush();
    assert.deepEqual(calls, ["start:bn", "stop", "start:en"]);
    second.cancel(); await flush();
    assert.deepEqual(calls, ["start:bn", "stop", "start:en", "stop"]);
  } finally { scope.restore(); }
});


test("browser recognition remains available when no desktop bridge is injected", () => {
  const created: StubRecognition[] = [];
  class StubRecognition implements SpeechRecognitionLike {
    lang = ""; continuous = false; interimResults = false; started = false;
    onresult: SpeechRecognitionLike["onresult"] = null;
    onerror: SpeechRecognitionLike["onerror"] = null;
    onend: SpeechRecognitionLike["onend"] = null;
    constructor() { created.push(this); }
    start() { this.started = true; }
    stop() { this.onend?.(); }
    abort() { this.started = false; }
  }
  const scope = installWindow();
  try {
    Object.assign(scope.fake, { SpeechRecognition: StubRecognition });
    let final = "";
    const session = startSpeechToText({ language: "hi", onInterim: () => undefined, onFinal: (text) => { final = text; }, onError: assert.fail });
    const recognition = created[0];
    assert.equal(recognition.started, true); assert.equal(recognition.lang, "hi-IN");
    recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "hello" } }] });
    session.stop(); assert.equal(final, "hello");
  } finally { scope.restore(); }
});
