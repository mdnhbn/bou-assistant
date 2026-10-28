"""Small self-extracting Windows installer for the bundled Bou desktop app."""
import os
import queue
import shutil
import subprocess
import sys
import threading
import winreg
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

VERSION = "1.9.1"
APP_NAME = "Bou AI Assistant"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\BouAIAssistant"

RUNTIME_ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
PAYLOAD = RUNTIME_ROOT / "payload"
if not PAYLOAD.is_dir():
    PAYLOAD = RUNTIME_ROOT / "dist" / "BouAssistant"

UNINSTALL_SCRIPT = r'''$ErrorActionPreference = 'SilentlyContinue'
$target = $PSScriptRoot
Remove-Item -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\BouAIAssistant' -Recurse -Force
Remove-Item -LiteralPath (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Bou AI Assistant') -Recurse -Force
Remove-Item -LiteralPath (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Bou AI Assistant.lnk') -Force
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($target))
$command = "Start-Sleep -Seconds 2; `$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$encoded')); Remove-Item -LiteralPath `$p -Recurse -Force"
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-WindowStyle','Hidden','-Command',$command)
'''


class Installer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME + " Setup")
        self.geometry("600x270")
        self.resizable(False, False)
        self.configure(bg="#101827")
        self.events = queue.Queue()
        self.installing = False
        self.launch_after_install = True

        tk.Label(self, text=APP_NAME, bg="#101827", fg="#f3f5f8",
                 font=("Segoe UI", 20, "bold")).pack(anchor="w", padx=24, pady=(22, 4))
        tk.Label(self, text="Installs Bou, its voice and camera modules, and the offline Whisper model.",
                 bg="#101827", fg="#c2c9d4", font=("Segoe UI", 10)).pack(anchor="w", padx=24)

        row = tk.Frame(self, bg="#101827")
        row.pack(fill="x", padx=24, pady=(22, 6))
        self.path_var = tk.StringVar(value=str(Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Programs" / APP_NAME))
        self.path_entry = tk.Entry(row, textvariable=self.path_var, font=("Segoe UI", 10))
        self.path_entry.pack(side="left", fill="x", expand=True, ipady=6)
        self.browse_button = tk.Button(row, text="Browse…", command=self.choose_folder)
        self.browse_button.pack(side="left", padx=(8, 0), ipady=3)

        self.status = tk.Label(self, text="Choose where to install Bou.", bg="#101827", fg="#aab5c5",
                               font=("Segoe UI", 9))
        self.status.pack(anchor="w", padx=24, pady=(6, 4))
        self.progress = ttk.Progressbar(self, mode="determinate", maximum=100)
        self.progress.pack(fill="x", padx=24, pady=(2, 14))

        footer = tk.Frame(self, bg="#101827")
        footer.pack(fill="x", padx=24)
        self.launch_var = tk.BooleanVar(value=True)
        tk.Checkbutton(footer, text="Launch Bou after installation", variable=self.launch_var,
                       bg="#101827", fg="#f3f5f8", selectcolor="#253347",
                       activebackground="#101827", activeforeground="#f3f5f8").pack(side="left")
        self.install_button = tk.Button(footer, text="Install", command=self.install, width=14,
                                        bg="#ed6a63", fg="#101827", relief="flat",
                                        font=("Segoe UI", 10, "bold"))
        self.install_button.pack(side="right", ipady=6)
        self.after(100, self.poll_events)

    def choose_folder(self):
        selected = filedialog.askdirectory(title="Choose Bou install folder", initialdir=self.path_var.get())
        if selected:
            self.path_var.set(str(Path(selected) / APP_NAME))

    def install(self):
        if self.installing:
            return
        target = Path(self.path_var.get().strip()).expanduser()
        if not PAYLOAD.is_dir():
            messagebox.showerror("Installer payload missing", "Bou files are missing from this installer.")
            return
        if target.exists() and any(target.iterdir()):
            if not (target / "BouAssistant.exe").exists():
                messagebox.showerror("Folder is not empty", "Choose an empty folder or an existing Bou installation.")
                return
            if not messagebox.askyesno("Update Bou", "Replace the existing Bou application files?"):
                return
        self.installing = True
        self.launch_after_install = self.launch_var.get()
        self.install_button.configure(state="disabled")
        self.browse_button.configure(state="disabled")
        self.path_entry.configure(state="disabled")
        self.status.configure(text="Installing Bou and its bundled offline voice model…")
        threading.Thread(target=self.copy_payload, args=(target,), daemon=True).start()

    def copy_payload(self, target):
        try:
            files = []
            total = 0
            for root, _, names in os.walk(PAYLOAD):
                for name in names:
                    source = Path(root) / name
                    size = source.stat().st_size
                    files.append((source, source.relative_to(PAYLOAD), size))
                    total += size
            target.mkdir(parents=True, exist_ok=True)
            done = 0
            for source, relative, size in files:
                destination = target / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
                done += size
                self.events.put(("progress", int(done * 100 / max(total, 1))))
            self.events.put(("copied", target))
        except Exception as exc:
            self.events.put(("error", type(exc).__name__))

    @staticmethod
    def create_shortcuts(target):
        from comtypes.client import CreateObject
        shell = CreateObject("WScript.Shell")
        start_menu = Path(shell.SpecialFolders("Programs")) / APP_NAME
        desktop_link = Path(shell.SpecialFolders("Desktop")) / (APP_NAME + ".lnk")
        start_menu.mkdir(parents=True, exist_ok=True)
        for link_path in (start_menu / (APP_NAME + ".lnk"), desktop_link):
            shortcut = shell.CreateShortcut(str(link_path))
            shortcut.TargetPath = str(target / "BouAssistant.exe")
            shortcut.WorkingDirectory = str(target)
            shortcut.IconLocation = str(target / "BouAssistant.exe")
            shortcut.Save()

    @staticmethod
    def register_uninstaller(target):
        script = target / "Uninstall-Bou.ps1"
        script.write_text(UNINSTALL_SCRIPT, encoding="utf-8")
        uninstall = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + str(script) + '"'
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY) as key:
            for name, value in {
                "DisplayName": APP_NAME,
                "DisplayVersion": VERSION,
                "Publisher": "Bou",
                "DisplayIcon": str(target / "BouAssistant.exe"),
                "InstallLocation": str(target),
                "UninstallString": uninstall,
                "NoModify": 1,
                "NoRepair": 1,
            }.items():
                winreg.SetValueEx(key, name, 0, winreg.REG_DWORD if isinstance(value, int) else winreg.REG_SZ, value)

    def poll_events(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "progress":
                    self.progress["value"] = value
                    self.status.configure(text="Copying application files… " + str(value) + "%")
                elif kind == "copied":
                    target = value
                    try:
                        self.create_shortcuts(target)
                        self.register_uninstaller(target)
                        self.status.configure(text="Installation complete.")
                        if self.launch_after_install:
                            subprocess.Popen([str(target / "BouAssistant.exe")], cwd=str(target))
                        self.destroy()
                    except Exception as exc:
                        self.installing = False
                        self.install_button.configure(state="normal")
                        self.browse_button.configure(state="normal")
                        self.path_entry.configure(state="normal")
                        messagebox.showerror("Setup shortcut failed", "Bou was copied, but Windows could not create its shortcuts (" + type(exc).__name__ + ").")
                        self.status.configure(text="Bou files are installed. You can run BouAssistant.exe from the selected folder.")
                elif kind == "error":
                    self.installing = False
                    self.install_button.configure(state="normal")
                    self.browse_button.configure(state="normal")
                    self.path_entry.configure(state="normal")
                    messagebox.showerror("Installation failed", "Bou could not be installed (" + value + ").")
                    self.status.configure(text="Choose a different folder or try again.")
        except queue.Empty:
            pass
        if self.winfo_exists():
            self.after(100, self.poll_events)


if __name__ == "__main__":
    if not PAYLOAD.is_dir():
        print("Missing desktop application payload:", PAYLOAD)
        raise SystemExit(1)
    Installer().mainloop()
