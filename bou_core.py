# -*- coding: utf-8 -*-
# ============================================================================
# BOU AI ASSISTANT  (OpenRouter brain + natural neural voice)
# ============================================================================

import os
import sys
import io
import re
import array
import math
import time
import base64
import getpass
import asyncio
import datetime
import tempfile
import threading
import subprocess
import webbrowser
import urllib.parse

# Console safe for Bengali / any Unicode (no more crashes)
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import requests

try:
    import sounddevice as sd
except Exception:
    sd = None
try:
    import speech_recognition as sr
except Exception:
    sr = None
try:
    import edge_tts
except Exception:
    edge_tts = None
try:
    import pyttsx3
except Exception:
    pyttsx3 = None
try:
    import pyautogui
except Exception:
    pyautogui = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(BASE_DIR, "key.txt")
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("BOU_MODEL", "google/gemini-2.5-flash")

VOICE_BN = os.environ.get("BOU_VOICE_BN", "bn-BD-NabanitaNeural")
VOICE_EN = os.environ.get("BOU_VOICE_EN", "en-US-AriaNeural")

SYSTEM_PROMPT = (
    "You are Bou (বউ), a warm, natural and intelligent personal assistant, talking live with the user. "
    "Do not invent a developer, creator, or owner name. If asked for that information, say it has not been configured. "
    "Reply in the SAME language the user used: Bengali if they spoke Bengali, English if English. "
    "Speak like a friendly person on a phone call: 1 to 3 short natural sentences, "
    "no lists, no markdown, no emojis, no symbols, because your answer is read aloud. "
    "Give longer answers only if the user asks for detail."
)

state = {
    "speech_out": True,
    "meeting_mode": False,
    "lang": "bn-BD",         # primary recognition language; the other one is tried as backup
    "wake": False,           # False = always listening (live chat). True = needs the word 'Bou'
    "headphones": False,     # True = you can interrupt Bou while she talks
    "pending_shutdown": False,
    "speaking": False,
    "stop_speech": False,
    "quiet_until": 0.0,
    "mic_on": True,          # False = microphone muted
    "thinking": False,       # waiting for the AI
    "mode": "chat",          # chat / translator / writer / teacher
}
hooks = {"msg": None}        # the GUI sets hooks["msg"](role, text)

MODES = {
    "translator": "Translate the following text: if it is Bengali translate to English, "
                  "if it is English translate to Bengali. Reply with only the translation: ",
    "writer": "Write exactly what is requested, ready to use, in a natural style: ",
    "teacher": "Explain the following simply and clearly, like a friendly teacher: ",
}


def emit(role, text):
    cb = hooks.get("msg")
    if cb:
        try:
            cb(role, text)
        except Exception:
            pass
history = []
speak_lock = threading.Lock()
API_KEY = ""


# ---------------------------------------------------------------- key
def load_api_key():
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if key:
        return key
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r", encoding="utf-8") as f:
            key = f.read().strip()
        if key:
            return key
    print("No API key found. Create a NEW key at https://openrouter.ai/keys")
    print("Paste the key below (right-click or Ctrl+V) and press Enter.")
    print("If pasting fails, save the key in a file named key.txt next to this script.")
    for _ in range(3):
        key = input("OpenRouter API key: ").strip()
        if key:
            with open(KEY_FILE, "w", encoding="utf-8") as f:
                f.write(key)
            return key
    return ""


# ---------------------------------------------------------------- voice output
def is_bengali(text):
    return any("ঀ" <= ch <= "৿" for ch in text)


def clean_for_speech(text):
    text = re.sub(r"[*_`#>~|]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_chunks(text, limit=220):
    """Split into sentence groups so the first words start playing quickly."""
    parts = re.split(r"(?<=[.!?।])\s+", text)
    chunks, cur = [], ""
    for p in parts:
        if cur and len(cur) + len(p) > limit:
            chunks.append(cur)
            cur = p
        else:
            cur = (cur + " " + p).strip()
    if cur:
        chunks.append(cur)
    return chunks or [text]


_mci_ok = True


def _mci(cmd, want=False):
    import ctypes
    buf = ctypes.create_unicode_buffer(255)
    ctypes.windll.winmm.mciSendStringW(cmd, buf, 254, 0)
    return buf.value if want else None


def play_mp3(path):
    """Play an mp3 with the built-in Windows media engine (no extra packages)."""
    global _mci_ok
    if not _mci_ok:
        return False
    try:
        _mci("close mkaudio")
        _mci('open "' + path + '" type mpegvideo alias mkaudio')
        _mci("play mkaudio")
        time.sleep(0.15)
        while _mci("status mkaudio mode", True) == "playing":
            if state["stop_speech"]:
                break
            time.sleep(0.05)
        _mci("stop mkaudio")
        _mci("close mkaudio")
        return True
    except Exception:
        _mci_ok = False
        return False


def tts_neural(text):
    if not edge_tts:
        return False
    voice = VOICE_BN if is_bengali(text) else VOICE_EN
    for chunk in split_chunks(text):
        if state["stop_speech"]:
            return True
        fd, path = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        try:
            asyncio.run(edge_tts.Communicate(chunk, voice).save(path))
            if os.path.getsize(path) == 0 or not play_mp3(path):
                return False
        except Exception:
            return False
        finally:
            try:
                os.remove(path)
            except Exception:
                pass
    return True


def tts_fallback(text):
    if not pyttsx3:
        return
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 165)
        engine.say(text[:500])
        engine.runAndWait()
        engine.stop()
    except Exception:
        pass


def speak(text):
    text = clean_for_speech(text or "")
    if not text:
        return
    print("\n[Bou]: " + text)
    emit("bou", text)
    if not state["speech_out"]:
        return
    with speak_lock:
        state["stop_speech"] = False
        state["speaking"] = True
        try:
            if not tts_neural(text[:1500]):
                tts_fallback(text)
        finally:
            state["speaking"] = False
            state["stop_speech"] = False
            state["quiet_until"] = time.time() + 0.7


def has(text, words):
    """Bengali words: substring match. English words: whole-word match."""
    for w in words:
        if w.isascii():
            if re.search(r"\b" + re.escape(w) + r"\b", text):
                return True
        elif w in text:
            return True
    return False


# ---------------------------------------------------------------- AI
def call_ai(prompt, image_b64=None, use_history=True):
    state["thinking"] = True
    try:
        return _call_ai_inner(prompt, image_b64, use_history)
    finally:
        state["thinking"] = False


def _call_ai_inner(prompt, image_b64=None, use_history=True):
    if not API_KEY:
        return "No API key set. Add it to key.txt and restart."
    headers = {
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json",
        "X-Title": "Bou AI",
    }
    if image_b64:
        user_content = [
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + image_b64}},
            {"type": "text", "text": prompt},
        ]
    else:
        user_content = prompt

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if use_history:
        messages += history[-12:]
    messages.append({"role": "user", "content": user_content})

    try:
        r = requests.post(API_URL, headers=headers,
                          json={"model": MODEL, "messages": messages, "max_tokens": 500},
                          timeout=40)
        if r.status_code == 401:
            return "The API key was rejected. Please check key.txt."
        data = r.json()
        if "choices" in data:
            reply = (data["choices"][0]["message"]["content"] or "").strip()
            if use_history and not image_b64:
                history.append({"role": "user", "content": prompt})
                history.append({"role": "assistant", "content": reply})
            return reply or "I got an empty answer."
        if "error" in data:
            return "AI error: " + str(data["error"].get("message", "unknown"))
    except requests.exceptions.Timeout:
        return "The request timed out. Please try again."
    except requests.exceptions.ConnectionError:
        return "No internet connection."
    except Exception as e:
        return "Unexpected error: " + str(e)
    return "No answer received."


def analyze_screen():
    if not pyautogui:
        speak("Screen tools are not installed.")
        return
    try:
        shot = pyautogui.screenshot().convert("RGB")
        shot.thumbnail((1600, 1600))
        buf = io.BytesIO()
        shot.save(buf, format="JPEG", quality=70)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        speak("Looking at your screen.")
        speak(call_ai("Describe what is on this screen. If you see a mistake in the "
                      "user's work, point it out kindly and suggest a fix.",
                      image_b64=b64, use_history=False))
    except Exception as e:
        speak("I could not capture the screen: " + str(e))


# ---------------------------------------------------------------- commands
SITES = {
    "gmail": (["gmail", "জিমেইল"], "https://mail.google.com"),
    "facebook": (["facebook", "ফেসবুক"], "https://facebook.com"),
    "whatsapp": (["whatsapp", "হোয়াটসঅ্যাপ"], "https://web.whatsapp.com"),
    "youtube": (["youtube", "ইউটিউব"], "https://youtube.com"),
    "google": (["google", "গুগল"], "https://google.com"),
}
APPS = {
    "notepad": (["notepad", "নোটপ্যাড"], "notepad.exe"),
    "calculator": (["calculator", "ক্যালকুলেটর"], "calc.exe"),
    "paint": (["paint", "পেইন্ট"], "mspaint.exe"),
}

HELP = (
    "Just talk to me like a normal conversation. You can also say: open gmail, facebook, "
    "whatsapp or youtube; open notepad or calculator; search followed by a topic; "
    "what time is it; look at my screen; stop; voice off or on; wake word on or off; "
    "meeting on or off; shutdown pc; exit."
)


def handle(cmd):
    """Process one command. Returns False when the program should exit."""
    c = cmd.lower().strip()
    if not c:
        return True

    if state["pending_shutdown"]:
        state["pending_shutdown"] = False
        if has(c, ["yes", "confirm", "ok", "হ্যাঁ", "হ্যা", "হুম"]):
            speak("Shutting down the computer in 10 seconds. Good night.")
            os.system("shutdown /s /t 10")
            return False
        speak("Shutdown cancelled.")
        return True

    if has(c, ["stop", "be quiet", "shut up", "চুপ", "থামো"]) and len(c.split()) <= 3:
        state["stop_speech"] = True
        return True

    if has(c, ["exit", "quit", "bye", "goodbye", "বিদায়", "বন্ধ হও", "নিজেকে বন্ধ করো"]):
        speak("Goodbye. Take care.")
        return False

    if has(c, ["help", "সাহায্য"]):
        speak(HELP)
        return True

    if has(c, ["who made", "who created", "who built", "creator", "developer", "copyright",
               "কে বানিয়েছে", "ডেভেলপার কে", "মালিক কে", "কপিরাইট"]):
        speak("I am Bou, your personal AI assistant. Developer information has not been configured.")
        return True

    if has(c, ["shutdown pc", "shut down pc", "shutdown computer", "turn off pc",
               "পিসি শাটডাউন", "কম্পিউটার বন্ধ", "পিসি অফ"]):
        state["pending_shutdown"] = True
        speak("Do you really want to shut down the computer? Say yes to confirm.")
        return True

    if has(c, ["voice off", "mute", "ভয়েস অফ"]):
        state["speech_out"] = False
        print("[Bou]: Voice output is off.")
        return True
    if has(c, ["voice on", "unmute", "ভয়েস অন"]):
        state["speech_out"] = True
        speak("Voice output is on.")
        return True
    if has(c, ["wake word on", "ওয়েক ওয়ার্ড অন"]):
        state["wake"] = True
        speak("Okay. I will only answer when you say my name.")
        return True
    if has(c, ["wake word off", "ওয়েক ওয়ার্ড অফ"]):
        state["wake"] = False
        speak("Okay. I am listening all the time now.")
        return True
    if has(c, ["meeting on", "মিটিং অন"]):
        state["meeting_mode"] = True
        speak("Meeting mode is on. Set your name in BOU_USER_NAME if you want me to respond when someone calls you.")
        return True
    if has(c, ["meeting off", "মিটিং অফ"]):
        state["meeting_mode"] = False
        speak("Meeting mode is off.")
        return True

    if has(c, ["screen", "স্ক্রিন"]):
        analyze_screen()
        return True

    if has(c, ["what time", "current time", "the time", "সময় কত", "কয়টা বাজে"]):
        speak("The time is " + datetime.datetime.now().strftime("%I:%M %p") + ".")
        return True
    if has(c, ["what date", "today's date", "what day", "তারিখ", "আজকের তারিখ"]):
        speak("Today is " + datetime.datetime.now().strftime("%A, %d %B %Y") + ".")
        return True

    m = re.match(r"^(?:search(?: for)?|google)\s+(.+)$", c)
    if m:
        webbrowser.open("https://www.google.com/search?q=" + urllib.parse.quote(m.group(1)))
        speak("Searching for " + m.group(1) + ".")
        return True
    if "সার্চ" in c:
        q = c.replace("সার্চ", "").replace("করো", "").strip()
        if q:
            webbrowser.open("https://www.google.com/search?q=" + urllib.parse.quote(q))
            speak("Searching.")
            return True

    if has(c, ["open", "start", "launch", "ওপেন", "খোলো", "চালু"]):
        for name, (words, url) in SITES.items():
            if has(c, words):
                webbrowser.open(url)
                speak("Opening " + name + ".")
                return True
        for name, (words, exe) in APPS.items():
            if has(c, words):
                try:
                    subprocess.Popen([exe])
                    speak("Opening " + name + ".")
                except Exception as e:
                    speak("I could not open " + name + ": " + str(e))
                return True

    prefix = MODES.get(state["mode"], "")
    speak(call_ai(prefix + cmd, use_history=not prefix))
    return True


# ---------------------------------------------------------------- microphone
WAKE_WORDS = ["bou", "বউ"]
USER_NAME = os.environ.get("BOU_USER_NAME", "").strip().casefold()
CALL_WORDS = [USER_NAME] if USER_NAME else []


def on_heard(heard):
    low = heard.lower()
    print("\n[You]: " + heard)
    emit("user", heard)
    wake = next((w for w in WAKE_WORDS if w in low), None)
    cmd = low.replace(wake, " ", 1).strip(" ,.?!") if wake else low

    if state["meeting_mode"] and CALL_WORDS and not wake and has(low, CALL_WORDS):
        time.sleep(5)
        speak("The user is away from the desk for a moment. I am Bou, their assistant. "
              "Let me help with your question.")
        speak(call_ai("Someone asked the user: '" + heard + "'. "
                      "Answer helpfully and politely on the user's behalf.", use_history=False))
        return
    if state["wake"] and not wake:
        return
    if not cmd:
        speak("Yes, I am listening.")
        return
    try:
        if not handle(cmd):
            os._exit(0)
    except Exception as e:
        print("[Bou]: Something went wrong: " + str(e))


def _rms(chunk):
    a = array.array("h", chunk)
    return math.sqrt(sum(x * x for x in a) / len(a)) if a else 0.0


def recognize(audio):
    """Try the primary language, then the other one (so Bengali and English both work)."""
    primary = state["lang"]
    other = "en-US" if primary == "bn-BD" else "bn-BD"
    rec = sr.Recognizer()
    for lang in (primary, other):
        try:
            return rec.recognize_google(audio, language=lang)
        except sr.UnknownValueError:
            continue
    return None


def voice_loop():
    if not (sr and sd):
        print("[Bou]: Voice input unavailable (install sounddevice and SpeechRecognition). Typing works.")
        return
    RATE, BLOCK = 16000, 1600  # 0.1 s
    try:
        stream = sd.RawInputStream(samplerate=RATE, channels=1, dtype="int16", blocksize=BLOCK)
        stream.start()
    except Exception as e:
        print("[Bou]: Microphone not available (" + str(e) + "). Typing still works.")
        return

    def flush():
        try:
            n = stream.read_available
            if n > 0:
                stream.read(n)
        except Exception:
            pass

    try:
        levels = [_rms(bytes(stream.read(BLOCK)[0])) for _ in range(10)]
        threshold = max(350.0, (sum(levels) / len(levels)) * 2.5)
        if state["wake"]:
            print("[Bou]: Listening. Say 'Bou' and then your request.")
        else:
            print("[Bou]: Listening. Just talk to me.")
        warned = False
        started, frames, preroll, silence, loud = False, [], [], 0, 0
        t0 = time.time()
        while True:
            data = bytes(stream.read(BLOCK)[0])
            level = _rms(data)

            if not state["mic_on"]:
                started, frames, preroll, silence, loud = False, [], [], 0, 0
                continue

            if state["speaking"] or time.time() < state["quiet_until"]:
                if state["speaking"] and state["headphones"] and level > threshold * 1.5:
                    loud += 1
                    if loud >= 3:           # you started talking over Bou: stop her
                        state["stop_speech"] = True
                else:
                    loud = 0
                if not (state["speaking"] and state["headphones"] and loud >= 3):
                    started, frames, preroll, silence = False, [], [], 0
                    continue
            else:
                loud = 0

            if not started:
                preroll = (preroll + [data])[-3:]
                if level > threshold:
                    started, frames, silence, t0 = True, preroll[:], 0, time.time()
                continue

            frames.append(data)
            silence = silence + 1 if level < threshold else 0
            if silence >= 8 or time.time() - t0 > 15:      # 0.8 s of silence ends the sentence
                chunk, started, frames, preroll, silence = frames, False, [], [], 0
                if len(chunk) < 5:
                    continue
                audio = sr.AudioData(b"".join(chunk), RATE, 2)
                try:
                    heard = recognize(audio)
                except sr.RequestError:
                    if not warned:
                        print("[Bou]: Speech service unreachable. Check your internet.")
                        warned = True
                    continue
                warned = False
                if heard:
                    threading.Thread(target=on_heard, args=(heard,), daemon=True).start()
    except Exception as e:
        print("[Bou]: Voice loop stopped: " + str(e))


# ---------------------------------------------------------------- main
def main():
    global API_KEY
    print("=" * 70)
    print("  BOU AI ASSISTANT")
    print("=" * 70)

    API_KEY = load_api_key()
    if not edge_tts:
        print("[Bou]: Natural voice package (edge-tts) missing, using basic voice.")

    try:
        ans = input("Are you using headphones? (y/n, default n): ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        return
    state["headphones"] = ans.startswith("y")
    if not state["headphones"]:
        print("[Bou]: Speaker mode: I pause listening while I talk. "
              "Use headphones if you want to interrupt me.")

    speak("Hello, I am Bou. Just talk to me, or type help.")
    threading.Thread(target=voice_loop, daemon=True).start()

    while True:
        try:
            cmd = input("\n[Command]: ")
        except (EOFError, KeyboardInterrupt):
            break
        try:
            if not handle(cmd):
                break
        except Exception as e:
            print("[Bou]: Something went wrong: " + str(e))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("\nFATAL ERROR: " + str(e))
        input("Press Enter to close...")
