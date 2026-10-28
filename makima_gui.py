# -*- coding: utf-8 -*-
# ============================================================================
# MAKIMA AI ASSISTANT - Desktop app (GUI)
# Creator & Lead Developer : Md Mehrab Hasan
# Copyright (C) All rights reserved - Md Mehrab Hasan
# Needs makima.py in the same folder (it is the engine). Uses your OpenRouter key.
# ============================================================================

import os
import sys
import io
import math
import time
import base64
import queue
import threading
import datetime
import tkinter as tk
from tkinter import ttk, simpledialog, messagebox

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import makima as mk

try:
    import psutil
except Exception:
    psutil = None
try:
    from PIL import ImageTk
except Exception:
    ImageTk = None

# ---- colours
BG = "#0b0710"
PANEL = "#150d1c"
PANEL2 = "#1d1226"
LINE = "#2d1a3a"
RED = "#e11d48"
RED_D = "#9f1239"
GOLD = "#f5c26b"
TXT = "#f3e8ff"
DIM = "#9a8aa8"
GREEN = "#34d399"
BLUE = "#60a5fa"

FONT = "Segoe UI"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Makima AI Assistant - Md Mehrab Hasan")
        self.geometry("1220x740")
        self.minsize(1000, 620)
        self.configure(bg=BG)

        self.q = queue.Queue()
        self.phase = 0.0
        self.level = 0.0
        self.mode_btns = {}
        self.vision_img = None

        self.build_left()
        self.build_center()
        self.build_right()

        mk.hooks["msg"] = lambda role, text: self.q.put((role, text))

        self.after(100, self.poll)
        self.after(33, self.animate)
        self.after(1500, self.update_stats)
        self.after(300, self.startup)
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    # ------------------------------------------------------------ layout
    def build_left(self):
        f = tk.Frame(self, bg=PANEL, width=220)
        f.pack(side="left", fill="y")
        f.pack_propagate(False)

        tk.Label(f, text="MAKIMA", bg=PANEL, fg=RED, font=(FONT, 20, "bold")).pack(pady=(18, 0))
        tk.Label(f, text="by Md Mehrab Hasan", bg=PANEL, fg=DIM, font=(FONT, 9)).pack(pady=(0, 14))

        tk.Label(f, text="MODE", bg=PANEL, fg=GOLD, font=(FONT, 9, "bold")).pack(anchor="w", padx=16)
        for key, label in [("chat", "Chat"), ("translator", "Translator"),
                           ("writer", "Writer"), ("teacher", "Explain simply")]:
            b = tk.Button(f, text=label, anchor="w", relief="flat", bd=0, padx=14, pady=8,
                          bg=PANEL, fg=TXT, activebackground=PANEL2, activeforeground=TXT,
                          font=(FONT, 11), cursor="hand2",
                          command=lambda k=key: self.set_mode(k))
            b.pack(fill="x", padx=8, pady=1)
            self.mode_btns[key] = b
        self.set_mode("chat")

        tk.Label(f, text="SETTINGS", bg=PANEL, fg=GOLD, font=(FONT, 9, "bold")).pack(
            anchor="w", padx=16, pady=(18, 4))
        self.vars = {}
        for key, label, init in [
            ("speech_out", "Voice replies", mk.state["speech_out"]),
            ("headphones", "Headphones (interrupt me)", mk.state["headphones"]),
            ("wake", "Need wake word 'Makima'", mk.state["wake"]),
            ("meeting_mode", "Meeting mode", mk.state["meeting_mode"]),
        ]:
            v = tk.BooleanVar(value=init)
            self.vars[key] = v
            tk.Checkbutton(f, text=label, variable=v, anchor="w", bg=PANEL, fg=TXT,
                           selectcolor=PANEL2, activebackground=PANEL, activeforeground=TXT,
                           font=(FONT, 10), command=lambda k=key: self.toggle(k)
                           ).pack(fill="x", padx=12, pady=2)

        tk.Label(f, text="Recognition language", bg=PANEL, fg=DIM, font=(FONT, 9)).pack(
            anchor="w", padx=16, pady=(12, 2))
        self.lang = tk.StringVar(value="Bengali first" if mk.state["lang"] == "bn-BD" else "English first")
        cb = ttk.Combobox(f, textvariable=self.lang, state="readonly",
                          values=["Bengali first", "English first"])
        cb.pack(fill="x", padx=16)
        cb.bind("<<ComboboxSelected>>", lambda e: mk.state.__setitem__(
            "lang", "bn-BD" if self.lang.get().startswith("Bengali") else "en-US"))

        tk.Label(f, text="Copyright (C) Md Mehrab Hasan\nAll rights reserved", bg=PANEL, fg=DIM,
                 font=(FONT, 8), justify="left").pack(side="bottom", anchor="w", padx=16, pady=12)

    def build_center(self):
        f = tk.Frame(self, bg=BG)
        f.pack(side="left", fill="both", expand=True)

        self.status = tk.Label(f, text="STARTING", bg=BG, fg=DIM, font=("Consolas", 10, "bold"))
        self.status.pack(anchor="w", padx=18, pady=(14, 0))

        self.canvas = tk.Canvas(f, bg=BG, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        row = tk.Frame(f, bg=BG)
        row.pack(pady=(0, 6))
        self.mic_btn = self.pill(row, "Mic: ON", RED, self.toggle_mic)
        self.pill(row, "Stop talking", PANEL2, self.stop_talking)
        self.pill(row, "Look at screen", RED_D, self.look_screen)

        row2 = tk.Frame(f, bg=BG)
        row2.pack(pady=(0, 16))
        self.pill(row2, "Clear chat", PANEL2, self.clear_chat, small=True)
        self.pill(row2, "Help", PANEL2, lambda: mk.threading.Thread(
            target=mk.speak, args=(mk.HELP,), daemon=True).start(), small=True)

    def pill(self, parent, text, color, cmd, small=False):
        b = tk.Button(parent, text=text, command=cmd, bg=color, fg=TXT, relief="flat", bd=0,
                      activebackground=RED, activeforeground=TXT, cursor="hand2",
                      font=(FONT, 10 if small else 11, "bold"),
                      padx=16 if small else 22, pady=7 if small else 10)
        b.pack(side="left", padx=6)
        return b

    def build_right(self):
        f = tk.Frame(self, bg=PANEL, width=380)
        f.pack(side="right", fill="y")
        f.pack_propagate(False)

        stats = tk.Frame(f, bg=PANEL2)
        stats.pack(fill="x", padx=10, pady=10)
        self.stat = {}
        for key, label in [("battery", "Battery"), ("cpu", "CPU"), ("ram", "RAM"), ("time", "Time")]:
            r = tk.Frame(stats, bg=PANEL2)
            r.pack(fill="x", padx=12, pady=3)
            tk.Label(r, text=label, bg=PANEL2, fg=DIM, font=(FONT, 10)).pack(side="left")
            l = tk.Label(r, text="--", bg=PANEL2, fg=TXT, font=(FONT, 11, "bold"))
            l.pack(side="right")
            self.stat[key] = l

        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass
        style.configure("TNotebook", background=PANEL, borderwidth=0)
        style.configure("TNotebook.Tab", background=PANEL2, foreground=TXT, padding=(18, 8))
        style.map("TNotebook.Tab", background=[("selected", RED_D)])

        nb = ttk.Notebook(f)
        nb.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        chat = tk.Frame(nb, bg=PANEL2)
        nb.add(chat, text="Chat")
        self.chat = tk.Text(chat, bg=PANEL2, fg=TXT, relief="flat", wrap="word", state="disabled",
                            font=(FONT, 10), padx=10, pady=8, spacing3=6)
        self.chat.pack(fill="both", expand=True)
        self.chat.tag_config("user", foreground=BLUE)
        self.chat.tag_config("makima", foreground=GOLD)
        self.chat.tag_config("who", foreground=DIM, font=(FONT, 8, "bold"))
        self.entry = tk.Entry(chat, bg=PANEL, fg=TXT, insertbackground=TXT, relief="flat",
                              font=(FONT, 11))
        self.entry.pack(fill="x", padx=8, pady=8, ipady=7)
        self.entry.bind("<Return>", self.send_text)
        self.entry.focus_set()

        vis = tk.Frame(nb, bg=PANEL2)
        nb.add(vis, text="Vision")
        tk.Button(vis, text="Analyze my screen", command=self.look_screen, bg=RED_D, fg=TXT,
                  relief="flat", font=(FONT, 10, "bold"), pady=8, cursor="hand2"
                  ).pack(fill="x", padx=10, pady=10)
        self.vis_img = tk.Label(vis, bg=PANEL2)
        self.vis_img.pack(padx=10)
        self.vis_txt = tk.Text(vis, bg=PANEL2, fg=TXT, relief="flat", wrap="word", height=10,
                               font=(FONT, 10), state="disabled", padx=8, pady=8)
        self.vis_txt.pack(fill="both", expand=True, padx=6, pady=6)

    # ------------------------------------------------------------ startup
    def startup(self):
        key = self.get_key()
        if not key:
            messagebox.showerror("Makima", "No API key. Closing.")
            self.destroy()
            return
        mk.API_KEY = key
        mk.state["headphones"] = self.vars["headphones"].get()
        threading.Thread(target=mk.voice_loop, daemon=True).start()
        threading.Thread(target=mk.speak, args=(
            "Hello, I am Makima, developed by Md Mehrab Hasan. Just talk to me.",), daemon=True).start()

    def get_key(self):
        key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if key:
            return key
        if os.path.exists(mk.KEY_FILE):
            with open(mk.KEY_FILE, "r", encoding="utf-8") as f:
                key = f.read().strip()
            if key:
                return key
        key = simpledialog.askstring(
            "Makima - OpenRouter API key",
            "Paste your OpenRouter API key (Ctrl+V works here).\n"
            "Create one at https://openrouter.ai/keys", parent=self)
        key = (key or "").strip()
        if key:
            with open(mk.KEY_FILE, "w", encoding="utf-8") as f:
                f.write(key)
        return key

    # ------------------------------------------------------------ actions
    def set_mode(self, key):
        mk.state["mode"] = key
        for k, b in self.mode_btns.items():
            b.config(bg=RED_D if k == key else PANEL)

    def toggle(self, key):
        mk.state[key] = bool(self.vars[key].get())

    def toggle_mic(self):
        mk.state["mic_on"] = not mk.state["mic_on"]
        self.mic_btn.config(text="Mic: ON" if mk.state["mic_on"] else "Mic: MUTED",
                            bg=RED if mk.state["mic_on"] else PANEL2)

    def stop_talking(self):
        mk.state["stop_speech"] = True

    def clear_chat(self):
        self.chat.config(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.config(state="disabled")
        del mk.history[:]

    def send_text(self, event=None):
        text = self.entry.get().strip()
        if not text:
            return
        self.entry.delete(0, "end")
        self.add_msg("user", text)

        def work():
            try:
                if not mk.handle(text):
                    self.after(0, self.on_close)
            except Exception as e:
                self.q.put(("makima", "Something went wrong: " + str(e)))
        threading.Thread(target=work, daemon=True).start()

    def look_screen(self):
        if not mk.pyautogui:
            self.q.put(("makima", "Screen tools are not installed."))
            return
        threading.Thread(target=self._look_screen, daemon=True).start()

    def _look_screen(self):
        try:
            shot = mk.pyautogui.screenshot().convert("RGB")
            shot.thumbnail((1600, 1600))
            buf = io.BytesIO()
            shot.save(buf, format="JPEG", quality=70)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            thumb = shot.copy()
            thumb.thumbnail((340, 200))
            self.q.put(("vision_img", thumb))
            self.q.put(("vision_txt", "Looking at your screen..."))
            ans = mk.call_ai("Describe what is on this screen. If you see a mistake in the "
                             "user's work, point it out kindly and suggest a fix.",
                             image_b64=b64, use_history=False)
            self.q.put(("vision_txt", ans))
            mk.speak(ans)
        except Exception as e:
            self.q.put(("vision_txt", "Could not capture the screen: " + str(e)))

    def on_close(self):
        mk.state["stop_speech"] = True
        self.destroy()
        os._exit(0)

    # ------------------------------------------------------------ updates
    def add_msg(self, role, text):
        self.chat.config(state="normal")
        self.chat.insert("end", ("YOU\n" if role == "user" else "MAKIMA\n"), "who")
        self.chat.insert("end", text + "\n", role)
        self.chat.see("end")
        self.chat.config(state="disabled")

    def set_vision_text(self, text):
        self.vis_txt.config(state="normal")
        self.vis_txt.delete("1.0", "end")
        self.vis_txt.insert("end", text)
        self.vis_txt.config(state="disabled")

    def poll(self):
        try:
            while True:
                role, payload = self.q.get_nowait()
                if role in ("user", "makima"):
                    self.add_msg(role, payload)
                elif role == "vision_txt":
                    self.set_vision_text(payload)
                elif role == "vision_img" and ImageTk:
                    self.vision_img = ImageTk.PhotoImage(payload)
                    self.vis_img.config(image=self.vision_img)
        except queue.Empty:
            pass
        self.after(100, self.poll)

    def update_stats(self):
        try:
            self.stat["time"].config(text=datetime.datetime.now().strftime("%I:%M %p"))
            if psutil:
                self.stat["cpu"].config(text="%d%%" % psutil.cpu_percent())
                self.stat["ram"].config(text="%d%%" % psutil.virtual_memory().percent)
                b = psutil.sensors_battery()
                self.stat["battery"].config(text=("%d%%" % b.percent) if b else "AC")
        except Exception:
            pass
        self.after(2000, self.update_stats)

    def animate(self):
        s = mk.state
        if not s["mic_on"]:
            label, col, target = "MIC MUTED", DIM, 0.05
        elif s["speaking"]:
            label, col, target = "SPEAKING", GOLD, 1.0
        elif s["thinking"]:
            label, col, target = "THINKING", BLUE, 0.6
        else:
            label, col, target = "LISTENING", GREEN, 0.25
        self.status.config(text="●  " + label, fg=col)
        self.level += (target - self.level) * 0.12
        self.phase += 0.08 + self.level * 0.12

        c = self.canvas
        c.delete("all")
        w, h = c.winfo_width(), c.winfo_height()
        cx, cy = w / 2, h / 2
        base = min(w, h) * 0.20
        for i in range(4, 0, -1):
            r = base + i * 22 + math.sin(self.phase + i) * (6 + 16 * self.level)
            c.create_oval(cx - r, cy - r, cx + r, cy + r, outline=col if i == 1 else LINE,
                          width=2 if i == 1 else 1)
        r = base + math.sin(self.phase * 1.3) * (3 + 8 * self.level)
        c.create_oval(cx - r, cy - r, cx + r, cy + r, fill=RED_D, outline=RED, width=3)
        c.create_text(cx, cy, text="MAKIMA", fill=TXT, font=(FONT, max(14, int(base * 0.28)), "bold"))
        self.after(33, self.animate)


if __name__ == "__main__":
    try:
        App().mainloop()
    except Exception as e:
        print("FATAL ERROR: " + str(e))
        input("Press Enter to close...")
