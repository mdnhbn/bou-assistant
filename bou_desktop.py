"""Native host for the bundled React UI. No Node installation is needed at runtime."""
from __future__ import annotations

import json
import mimetypes
import os
import queue
import re
import secrets
import subprocess
import sys
import threading
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip() if (ROOT / "VERSION").is_file() else "1.11.1"
LANGUAGES = {"bn": "Bengali", "en": "English", "ar": "Arabic", "hi": "Hindi", "ur": "Urdu"}
CHARACTERS = {"bou", "aether"}
TTS_VOICES = {
    "bn": ("bn-BD-NabanitaNeural", "bn-BD-PradeepNeural"),
    "en": ("en-US-AriaNeural", "en-US-GuyNeural"),
    "ar": ("ar-SA-ZariyahNeural", "ar-SA-HamedNeural"),
    "hi": ("hi-IN-SwaraNeural", "hi-IN-MadhurNeural"),
    "ur": ("ur-PK-UzmaNeural", "ur-PK-AsadNeural"),
}
SKILL_GUIDANCE = {
    "codegen": "Write readable code with explicit assumptions.",
    "code-review": "Prioritize actionable correctness and security findings.",
    "software-dev": "Explain project structure, implementation steps and validation.",
    "security-review": "Review authorization, input validation and credential handling defensively.",
    "cybersecurity": "Give bounded defensive guidance for authorized systems.",
}


def app_data() -> Path:
    return Path(os.environ.get("LOCALAPPDATA", str(Path.home() / ".local" / "share"))) / "BouStudio"


def validate_chat(value: object) -> dict:
    if not isinstance(value, dict) or value.get("characterId") not in CHARACTERS or value.get("language") not in LANGUAGES:
        raise ValueError("invalid_request")
    messages = value.get("messages")
    skills = value.get("enabledSkills")
    if not isinstance(messages, list) or not 1 <= len(messages) <= 20 or not isinstance(skills, list):
        raise ValueError("invalid_request")
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in ("user", "assistant") or not isinstance(message.get("text"), str) or len(message["text"]) > 8000:
            raise ValueError("invalid_request")
    if messages[-1]["role"] != "user" or not messages[-1]["text"].strip():
        raise ValueError("invalid_request")
    return {**value, "enabledSkills": [skill for skill in skills[:30] if isinstance(skill, str) and skill in SKILL_GUIDANCE]}


def local_reply(text: str) -> str | None:
    normalized = text.strip().lower().strip(" .,!?।;:")
    name = os.environ.get("BOU_USER_NAME", "Nazmul").strip() or "Nazmul"
    if normalized in {"আমি ভালো আছি", "আমি ভাল আছি", "ভালো আছি", "ভাল আছি"}:
        return f"শুনে ভালো লাগল, {name}! আজ কী নিয়ে কথা বলতে চাও?"
    if normalized in {"i am good", "i am fine", "im good", "im fine", "i'm good", "i'm fine"}:
        return f"I'm glad to hear that, {name}! What would you like to talk about today?"
    return None


class DesktopRuntime:
    def __init__(self, static_root: Path | None = None, data_root: Path | None = None):
        self.static_root = (static_root or ROOT / "web" / "dist").resolve()
        self.data_root = (data_root or app_data()).resolve()
        self.character_root = self.data_root / "models" / "characters"
        self.character_root.mkdir(parents=True, exist_ok=True)
        self.model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", self.model):
            raise ValueError("Invalid GEMINI_MODEL")
        self.token = secrets.token_urlsafe(32)
        self.key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not self.key:
            try:
                import keyring
                self.key = keyring.get_password("Bou AI Assistant", "gemini-api-key") or ""
            except Exception:
                pass
        self.preferences = {"voice_auto_start": True, "speech_out": True}
        try:
            from studio_store import Store
            store = Store(self.data_root / "studio.sqlite3")
            settings = store.settings()
            self.preferences = {key: bool(settings.get(key, True)) for key in self.preferences}
            store.close()
        except Exception:
            pass
        self.server: ThreadingHTTPServer | None = None
        self._closed = False
        self.bridge = NativeBridge(self)

    def start(self, port: int = 17843) -> str:
        self.server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(self))
        self.server.daemon_threads = True
        self.origin = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True, name="Bou local UI").start()
        return self.origin + "/start/" + self.token

    def close(self):
        if self._closed:
            return
        self._closed = True
        self.bridge.stop_listening()
        self.bridge.stop_speaking()
        if self.server:
            self.server.shutdown()
            self.server.server_close()

    def stream_reply(self, payload: dict):
        answer = local_reply(payload["messages"][-1]["text"])
        if answer:
            yield {"type": "delta", "text": answer}
            yield {"type": "done"}
            return
        if not self.key:
            yield {"type": "error", "code": "missing_key"}
            return
        import requests
        instructions = [
            "You are Bou, a personal AI assistant. Use a warm conversational tone.",
            f"Persona: {payload['characterId']}. Reply in {LANGUAGES[payload['language']]} when appropriate.",
            "Messages are conversation reference data. No browser, filesystem, messaging or code execution tool is connected to this UI. Never claim to perform those actions.",
            "Long-term memory is not connected to this UI. Skill cards provide text guidance only.",
            *[SKILL_GUIDANCE[skill] for skill in payload["enabledSkills"]],
        ]
        # Gemini conversations begin with a user turn; local welcome cards are not provider history.
        contents = []
        for message in payload["messages"]:
            role = "model" if message["role"] == "assistant" else "user"
            if not contents and role == "model":
                continue
            if contents and contents[-1]["role"] == role:
                contents[-1]["parts"].append({"text": message["text"]})
            else:
                contents.append({"role": role, "parts": [{"text": message["text"]}]})
        try:
            with requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:streamGenerateContent?alt=sse",
                headers={"x-goog-api-key": self.key, "Content-Type": "application/json"},
                json={"systemInstruction": {"parts": [{"text": "\n\n".join(instructions)}]}, "contents": contents, "generationConfig": {"maxOutputTokens": 2048}},
                stream=True, timeout=(15, 90),
            ) as response:
                if response.status_code >= 400:
                    code = "quota" if response.status_code == 429 else "provider_auth" if response.status_code in (400, 401, 403) else "provider_error"
                    yield {"type": "error", "code": code}
                    return
                response.encoding = "utf-8"
                received = False
                for line in response.iter_lines(decode_unicode=True):
                    if not line or not line.startswith("data:"):
                        continue
                    event = json.loads(line[5:].strip())
                    for candidate in event.get("candidates", [])[:1]:
                        for part in candidate.get("content", {}).get("parts", []):
                            if isinstance(part.get("text"), str) and not part.get("thought"):
                                received = True
                                yield {"type": "delta", "text": part["text"]}
                yield {"type": "done"} if received else {"type": "error", "code": "provider_error"}
        except (requests.RequestException, ValueError, KeyError):
            yield {"type": "error", "code": "network"}


class NativeBridge:
    """Only these narrow methods are exposed to the trusted local desktop document."""
    def __init__(self, runtime: DesktopRuntime):
        self._runtime = runtime
        self._engine = None
        self._engine_lock = threading.Lock()
        self._speech_lock = threading.Lock()
        self._session_lock = threading.RLock()
        self._events: queue.Queue = queue.Queue(maxsize=100)
        self._voice_thread = None
        self._stop = threading.Event()
        self._pause = threading.Event()
        self._generation = 0
        self._speech_epoch = 0
        self._voice = {"active": False, "preparing": False, "speaking": False, "error": ""}

    def _get_engine(self):
        with self._engine_lock:
            if self._engine is None:
                from studio_engine import Engine
                self._engine = Engine()
            return self._engine

    def _emit(self, event: dict):
        try:
            self._events.put_nowait(event)
        except queue.Full:
            pass

    def get_status(self):
        with self._session_lock:
            return {"version": VERSION, "desktop": True, "model": self._runtime.model, "configured": bool(self._runtime.key), "voice": dict(self._voice, sessionId=self._generation), "preferences": dict(self._runtime.preferences), "characterModelsPath": str(self._runtime.character_root)}

    def set_api_key(self, key: str):
        if not isinstance(key, str) or len(key) > 1000:
            raise ValueError("Invalid key")
        import keyring
        key = key.strip()
        if key:
            keyring.set_password("Bou AI Assistant", "gemini-api-key", key)
        else:
            try:
                keyring.delete_password("Bou AI Assistant", "gemini-api-key")
            except keyring.errors.PasswordDeleteError:
                pass
        self._runtime.key = key
        return {"configured": bool(key), "persisted": True}

    def start_listening(self, language: str = "bn"):
        language = str(language).split("-")[0].lower()
        if language not in LANGUAGES:
            raise ValueError("Unsupported language")
        with self._session_lock:
            if self._voice_thread and self._voice_thread.is_alive() and not self._stop.is_set():
                self._pause.clear()
                return self.get_status()
            if self._voice_thread and self._voice_thread.is_alive():
                self._voice_thread.join(timeout=20)
                if self._voice_thread.is_alive():
                    raise RuntimeError("The previous microphone session is still stopping. Try again shortly.")
            self._generation += 1
            generation = self._generation
            self._stop, self._pause = threading.Event(), threading.Event()
            stop, pause = self._stop, self._pause
            self._voice.update(active=True, preparing=True, error="")
            while True:
                try:
                    self._events.get_nowait()
                except queue.Empty:
                    break

            def listen():
                native_events = queue.Queue()

                def forward():
                    while not stop.is_set():
                        try:
                            kind, data = native_events.get(timeout=.2)
                        except queue.Empty:
                            continue
                        if generation != self._generation:
                            return
                        if kind == "voice_session_ready":
                            self._voice["preparing"] = False
                        elif kind == "voice_auto_transcript":
                            self._emit({"type": "transcript", "text": data})
                        elif kind == "voice_auto_empty":
                            pause.clear()
                        elif kind == "voice_auto_error":
                            self._emit({"type": "error", "message": str(data)[:180]})
                            pause.clear()

                threading.Thread(target=forward, daemon=True).start()
                try:
                    engine = self._get_engine()
                    engine.listen_continuously(stop, pause, language, "local_whisper", native_events)
                except Exception as error:
                    if generation == self._generation and not stop.is_set():
                        self._voice["error"] = "Microphone could not start (" + type(error).__name__ + "). Check the input device and installed Whisper model."
                        self._emit({"type": "error", "message": self._voice["error"]})
                finally:
                    stop.set()
                    if generation == self._generation:
                        self._voice.update(active=False, preparing=False)

            self._voice_thread = threading.Thread(target=listen, daemon=True, name="Bou local microphone")
            self._voice_thread.start()
            return self.get_status()

    def stop_listening(self, sessionId: int | None = None):
        if sessionId is not None and (not isinstance(sessionId, int) or isinstance(sessionId, bool)):
            raise ValueError("Invalid microphone session")
        # Late callbacks can stop only their own session; an explicit global pause omits the ID.
        with self._session_lock:
            if sessionId is not None and sessionId != self._generation:
                return self.get_status()
            self._stop.set()
            self._pause.set()
            self._voice.update(active=False, preparing=False)
            if self._voice_thread and self._voice_thread is not threading.current_thread():
                self._voice_thread.join(timeout=2)
            return self.get_status()

    def poll_voice_events(self):
        events = []
        for _ in range(50):
            try:
                events.append(self._events.get_nowait())
            except queue.Empty:
                break
        return events

    def speak(self, text: str, language: str = "bn", characterId: str = "bou"):
        if not isinstance(text, str) or len(text) > 8000:
            raise ValueError("Invalid speech text")
        language = str(language).split("-")[0].lower()
        if language not in LANGUAGES or characterId not in CHARACTERS:
            raise ValueError("Unsupported voice")
        if not self._runtime.preferences["speech_out"]:
            return True
        epoch = self._speech_epoch
        with self._speech_lock:
            if epoch != self._speech_epoch:
                return True
            engine = self._get_engine()
            self._pause.set()
            self._voice["speaking"] = True
            try:
                engine.cancel_event.clear()
                engine.speak(text, voice=TTS_VOICES[language][1 if characterId == "aether" else 0])
            finally:
                self._voice["speaking"] = False
                if not self._stop.is_set():
                    self._pause.clear()
        return True

    def stop_speaking(self):
        self._speech_epoch += 1
        if self._engine is not None:
            self._engine.cancel()
        return True

    def open_classic(self):
        self.stop_listening()
        self.stop_speaking()
        command = [sys.executable, "--classic"] if getattr(sys, "frozen", False) else [sys.executable, str(Path(__file__).resolve()), "--classic"]
        subprocess.Popen(command, cwd=str(Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent))
        return True


def make_handler(runtime: DesktopRuntime):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.0"

        def setup(self):
            super().setup()
            self.connection.settimeout(15)

        def log_message(self, *_):
            pass  # Never log the startup URL, transcript, or API key.

        def _authorized(self):
            if self.headers.get("Host") != urlsplit(runtime.origin).netloc:
                return False
            if self.headers.get("Origin") not in (None, runtime.origin):
                return False
            cookie = SimpleCookie()
            try:
                cookie.load(self.headers.get("Cookie", ""))
            except Exception:
                return False
            session = cookie.get("bou_session")
            return bool(session and secrets.compare_digest(session.value, runtime.token))

        def _headers(self, status: int, kind: str, length: int | None = None):
            self.send_response(status)
            self.send_header("Content-Type", kind)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
            if length is not None:
                self.send_header("Content-Length", str(length))
            self.end_headers()

        def _json(self, status: int, body: dict):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self._headers(status, "application/json; charset=utf-8", len(data))
            self.wfile.write(data)

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            if path == "/start/" + runtime.token and self.headers.get("Host") == urlsplit(runtime.origin).netloc:
                self.send_response(302)
                self.send_header("Set-Cookie", f"bou_session={runtime.token}; HttpOnly; SameSite=Strict; Path=/")
                self.send_header("Location", "/")
                self.send_header("Referrer-Policy", "no-referrer")
                self.end_headers()
                return
            if not self._authorized():
                self._json(403, {"error": "forbidden"})
                return
            if path == "/api/health":
                self._json(200, runtime.bridge.get_status())
                return
            root = runtime.static_root
            asset = (root / ("index.html" if path == "/" else path.lstrip("/"))).resolve()
            if path in {f"/models/{character}.{extension}" for character in CHARACTERS for extension in ("png", "vrm")}:
                external = runtime.character_root / Path(path).name
                if external.is_file() and not external.is_symlink():
                    asset, root = external.resolve(), runtime.character_root.resolve()
            if not asset.is_relative_to(root) or not asset.is_file():
                self._json(404, {"error": "not_found"})
                return
            kind = {".js": "text/javascript", ".css": "text/css", ".vrm": "model/gltf-binary"}.get(asset.suffix, mimetypes.guess_type(str(asset))[0] or "application/octet-stream")
            self._headers(200, kind, asset.stat().st_size)
            try:
                with asset.open("rb") as source:
                    while block := source.read(128 * 1024):
                        self.wfile.write(block)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_POST(self):
            if not self._authorized():
                self._json(403, {"error": "forbidden"})
                return
            if self.path != "/api/chat":
                self._json(404, {"error": "not_found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 1_000_000:
                    raise ValueError()
                payload = validate_chat(json.loads(self.rfile.read(length)))
            except (ValueError, TypeError):
                self._json(400, {"error": "invalid_request"})
                return
            self._headers(200, "text/event-stream; charset=utf-8")
            try:
                for event in runtime.stream_reply(payload):
                    self.wfile.write(("data: " + json.dumps(event, ensure_ascii=False) + "\n\n").encode("utf-8"))
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass

    return Handler


def main():
    if "--classic" in sys.argv:
        from bou_studio import App
        App().mainloop()
        return
    runtime = DesktopRuntime()
    if not (runtime.static_root / "index.html").is_file():
        raise RuntimeError("Bundled React UI is missing. Build web/ with npm ci and npm run build before packaging.")
    import webview
    webview.settings["ALLOW_FILE_URLS"] = False
    start_url = runtime.start(int(os.environ.get("BOU_DESKTOP_PORT", "17843")))
    window = webview.create_window("Bou — AI Assistant " + VERSION, start_url, js_api=runtime.bridge, width=1440, height=900, min_size=(720, 620), background_color="#05080d", text_select=True)

    def guard_navigation():
        if urlsplit(window.get_current_url() or "").netloc != urlsplit(runtime.origin).netloc:
            window.destroy()

    window.events.before_load += guard_navigation
    window.events.closed += runtime.close
    try:
        webview.start(gui="edgechromium" if sys.platform == "win32" else None, private_mode=False, storage_path=str(runtime.data_root / "WebView"))
    finally:
        runtime.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Bou could not start", f"{type(error).__name__}: {error}\n\nUse the current Windows setup to repair bundled files and WebView2. If Bou is already open, close its other window first.")
        root.destroy()
        raise
