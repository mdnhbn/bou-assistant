"""Native host integration checks with loopback HTTP and fake voice dependencies only."""
import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import types
import unittest
from unittest.mock import patch

from bou_desktop import DesktopRuntime


class FakeStore:
    def __init__(self, *_args, **_kwargs): pass
    def settings(self): return {"voice_auto_start": True, "speech_out": True}
    def close(self): pass


class FakeVoiceEngine:
    def __init__(self):
        self.cancel_event = threading.Event()
        self.condition = threading.Condition()
        self.sessions = []
        self.speeches = []
        self.voices = []
        self.concurrent_sessions = 0
        self.max_sessions = 0
        self.speech_started = threading.Event()
        self.release_speech = threading.Event()

    def listen_continuously(self, stop, pause, language, provider, events):
        with self.condition:
            self.sessions.append((stop, pause, language, provider))
            self.concurrent_sessions += 1
            self.max_sessions = max(self.max_sessions, self.concurrent_sessions)
            self.condition.notify_all()
        events.put(("voice_session_ready", None))
        stop.wait(2)
        with self.condition:
            self.concurrent_sessions -= 1
            self.condition.notify_all()

    def wait_for_sessions(self, count):
        with self.condition:
            return self.condition.wait_for(lambda: len(self.sessions) >= count, timeout=2)

    def speak(self, text, voice=None):
        self.speeches.append(text)
        self.voices.append(voice)
        self.speech_started.set()
        self.release_speech.wait(2)

    def cancel(self):
        self.cancel_event.set()
        self.release_speech.set()


class DesktopHostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="bou-host-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        static = self.root / "dist"
        static.mkdir()
        (static / "index.html").write_text("<!doctype html><title>Bou test</title>", encoding="utf-8")
        (static / "app.js").write_text("console.log('local');", encoding="utf-8")
        (self.root / "secret.txt").write_text("outside-root", encoding="utf-8")
        keyring = types.SimpleNamespace(get_password=lambda *_args: "")
        store = types.SimpleNamespace(Store=FakeStore)
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}), patch.dict("sys.modules", {"keyring": keyring, "studio_store": store}):
            self.runtime = DesktopRuntime(static_root=static, data_root=self.root / "data")
        self.addCleanup(self.runtime.close)
        self.runtime.start(port=0)
        self.port = self.runtime.server.server_port
        self.cookie = ""
        self.status, self.headers, _body = self.request("GET", "/start/" + self.runtime.token)
        self.assertEqual(self.status, 302)
        self.cookie = self.headers["Set-Cookie"].split(";", 1)[0]

    def request(self, method, path, payload=None, headers=None, authenticated=False):
        request_headers = dict(headers or {})
        if authenticated:
            request_headers["Cookie"] = self.cookie
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        if body is not None:
            request_headers.setdefault("Content-Type", "application/json")
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        try:
            connection.request(method, path, body=body, headers=request_headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def payload(self, text):
        return {"characterId": "bou", "language": "bn", "enabledSkills": [], "messages": [{"role": "user", "text": text}]}

    def test_bootstrap_and_static_assets_require_private_session(self):
        self.assertIn("HttpOnly", self.headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", self.headers["Set-Cookie"])
        self.assertEqual(self.request("GET", "/")[0], 403)
        status, headers, body = self.request("GET", "/", authenticated=True)
        self.assertEqual(status, 200)
        self.assertIn(b"Bou test", body)
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.request("GET", "/app.js", authenticated=True)[1]["Content-Type"], "text/javascript")

    def test_cross_origin_and_forged_host_are_rejected(self):
        self.assertEqual(self.request("GET", "/api/health", authenticated=True, headers={"Origin": "https://untrusted.example"})[0], 403)
        self.assertEqual(self.request("GET", "/api/health", authenticated=True, headers={"Host": "untrusted.example"})[0], 403)
        self.assertEqual(self.request("POST", "/api/chat", self.payload("hello"), authenticated=True, headers={"Origin": "https://untrusted.example"})[0], 403)
        self.assertEqual(self.request("POST", "/api/chat", self.payload("hello"))[0], 403)

    def test_static_traversal_is_rejected_and_model_override_is_bounded(self):
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/%2e%2e%2fsecret.txt"):
            with self.subTest(path=path):
                self.assertEqual(self.request("GET", path, authenticated=True)[0], 404)
        (self.runtime.character_root / "bou.png").write_bytes(b"local-portrait")
        self.assertEqual(self.request("GET", "/models/bou.png", authenticated=True)[2], b"local-portrait")
        (self.runtime.character_root / "secret.txt").write_text("not-an-avatar", encoding="utf-8")
        self.assertEqual(self.request("GET", "/models/secret.txt", authenticated=True)[0], 404)

    def test_keyless_wellbeing_reply_streams_delta_then_done(self):
        status, headers, body = self.request("POST", "/api/chat", self.payload("আমি ভালো আছি"), authenticated=True)
        self.assertEqual(status, 200)
        self.assertTrue(headers["Content-Type"].startswith("text/event-stream"))
        events = [json.loads(line[6:]) for line in body.decode("utf-8").splitlines() if line.startswith("data: ")]
        self.assertEqual([event["type"] for event in events], ["delta", "done"])
        self.assertIn("শুনে ভালো লাগল", events[0]["text"])

    def test_missing_key_and_invalid_chat_do_not_call_provider(self):
        status, _headers, body = self.request("POST", "/api/chat", self.payload("hello there"), authenticated=True)
        self.assertEqual(status, 200)
        self.assertIn(b'"code": "missing_key"', body)
        invalid = self.payload("hello")
        invalid["messages"][-1]["role"] = "assistant"
        self.assertEqual(self.request("POST", "/api/chat", invalid, authenticated=True)[0], 400)

    def test_provider_stream_normalizes_conversation_without_exposing_key(self):
        calls = []
        key = "unit-test-provider-secret"
        self.runtime.key = key

        class ProviderResponse:
            status_code = 200
            encoding = "utf-8"
            def __enter__(self): return self
            def __exit__(self, *_args): return False
            def iter_lines(self, **_kwargs):
                yield 'data: {"candidates":[{"content":{"parts":[{"text":"internal","thought":true},{"text":"Hello "}]}}]}'
                yield 'data: {"candidates":[{"content":{"parts":[{"text":"there"}]}}]}'

        def post(url, **kwargs):
            calls.append((url, kwargs))
            return ProviderResponse()

        requests = types.SimpleNamespace(post=post, RequestException=RuntimeError)
        payload = self.payload("Follow up")
        payload["messages"] = [
            {"role": "assistant", "text": "Initial welcome"},
            {"role": "assistant", "text": "Initial setup hint"},
            {"role": "user", "text": "First question"},
            {"role": "user", "text": "More context"},
            {"role": "assistant", "text": "Prior answer"},
            {"role": "assistant", "text": "Prior continuation"},
            {"role": "user", "text": "Follow up"},
        ]
        with patch.dict("sys.modules", {"requests": requests}):
            status, _headers, body = self.request("POST", "/api/chat", payload, authenticated=True)
        self.assertEqual(status, 200)
        events = [json.loads(line[6:]) for line in body.decode("utf-8").splitlines() if line.startswith("data: ")]
        self.assertEqual(events, [{"type": "delta", "text": "Hello "}, {"type": "delta", "text": "there"}, {"type": "done"}])
        self.assertEqual(len(calls), 1)
        url, request = calls[0]
        self.assertNotIn(key, url)
        self.assertEqual(request["headers"]["x-goog-api-key"], key)
        contents = request["json"]["contents"]
        self.assertEqual([turn["role"] for turn in contents], ["user", "model", "user"])
        text = " ".join(part["text"] for turn in contents for part in turn["parts"])
        self.assertNotIn("Initial welcome", text)
        self.assertNotIn("Initial setup hint", text)
        self.assertIn("First question", contents[0]["parts"][0]["text"])
        self.assertIn("More context", "\n".join(part["text"] for part in contents[0]["parts"]))
        self.assertIn("Prior answer", contents[1]["parts"][0]["text"])
        self.assertIn("Prior continuation", "\n".join(part["text"] for part in contents[1]["parts"]))
        self.assertEqual(contents[-1]["parts"][0]["text"], "Follow up")
        health = self.request("GET", "/api/health", authenticated=True)[2]
        self.assertTrue(json.loads(health)["configured"])
        self.assertNotIn(key.encode(), health + body)
    def test_fake_microphone_restart_allocates_fresh_stop_event(self):
        engine = FakeVoiceEngine()
        bridge = self.runtime.bridge
        bridge._engine = engine
        bridge.start_listening("ar")
        self.assertTrue(engine.wait_for_sessions(1))
        first_stop = engine.sessions[0][0]
        bridge.stop_listening()
        bridge.start_listening("hi")
        self.assertTrue(engine.wait_for_sessions(2))
        self.assertTrue(first_stop.is_set())
        self.assertIsNot(first_stop, engine.sessions[1][0])
        self.assertFalse(engine.sessions[1][0].is_set())
        self.assertEqual(engine.sessions[1][2:], ("hi", "local_whisper"))
        self.assertEqual(engine.max_sessions, 1)
        bridge.stop_listening()

    def test_stale_microphone_stop_does_not_cancel_new_session(self):
        engine = FakeVoiceEngine()
        bridge = self.runtime.bridge
        bridge._engine = engine
        first = bridge.start_listening("bn")["voice"]["sessionId"]
        self.assertTrue(engine.wait_for_sessions(1))
        bridge.stop_listening(first)
        second = bridge.start_listening("ur")["voice"]["sessionId"]
        self.assertTrue(engine.wait_for_sessions(2))
        self.assertGreater(second, first)
        status = bridge.stop_listening(first)
        self.assertEqual(status["voice"]["sessionId"], second)
        self.assertTrue(status["voice"]["active"])
        self.assertFalse(engine.sessions[-1][0].is_set())
        self.assertFalse(bridge.stop_listening(second)["voice"]["active"])
        self.assertTrue(engine.sessions[-1][0].is_set())
    def test_stop_speech_discards_already_queued_utterance(self):
        engine = FakeVoiceEngine()
        bridge = self.runtime.bridge
        bridge._engine = engine
        queued_waiting = threading.Event()
        original_lock = bridge._speech_lock

        class ObservedSpeechLock:
            def __enter__(self):
                if threading.current_thread().name == "queued-voice":
                    queued_waiting.set()
                return original_lock.__enter__()
            def __exit__(self, *args):
                return original_lock.__exit__(*args)

        bridge._speech_lock = ObservedSpeechLock()
        first = threading.Thread(target=lambda: bridge.speak("first"))
        second = threading.Thread(target=lambda: bridge.speak("queued"), name="queued-voice")
        first.start()
        self.assertTrue(engine.speech_started.wait(2))
        second.start()
        self.assertTrue(queued_waiting.wait(2))
        bridge.stop_speaking()
        first.join(2)
        second.join(2)
        self.assertFalse(first.is_alive())
        self.assertFalse(second.is_alive())
        self.assertEqual(engine.speeches, ["first"])
        self.assertFalse(bridge.get_status()["voice"]["speaking"])
        bridge.speak("fresh")
        self.assertEqual(engine.speeches, ["first", "fresh"])

    def test_native_speech_selects_language_and_character_voice(self):
        engine = FakeVoiceEngine()
        engine.release_speech.set()
        bridge = self.runtime.bridge
        bridge._engine = engine
        for language, character, expected in [
            ("bn", "bou", "bn-BD-NabanitaNeural"),
            ("en", "aether", "en-US-GuyNeural"),
            ("ar-SA", "aether", "ar-SA-HamedNeural"),
            ("hi", "bou", "hi-IN-SwaraNeural"),
            ("ur", "aether", "ur-PK-AsadNeural"),
        ]:
            with self.subTest(language=language, character=character):
                bridge.speak("sample", language, character)
                self.assertEqual(engine.voices[-1], expected)
        with self.assertRaises(ValueError):
            bridge.speak("sample", "fr", "bou")

if __name__ == "__main__":
    unittest.main()
