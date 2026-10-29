"""Dependency-aware, self-extracting Windows installer for Bou."""
import ctypes
import filecmp
import os
import platform
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import winreg
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

VERSION = "1.10.2"
APP_NAME = "Bou AI Assistant"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\BouAIAssistant"
MODEL_PATH = Path("models") / "whisper-small"

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


def payload_files():
    """Return the shipped files, grouped for optional offline-model/camera selection."""
    result = []
    if not PAYLOAD.is_dir():
        return result
    for root, _, names in os.walk(PAYLOAD):
        for name in names:
            source = Path(root) / name
            relative = source.relative_to(PAYLOAD)
            parts = tuple(part.lower() for part in relative.parts)
            if parts[0] == "models" and len(parts) > 1 and parts[1] == "whisper-small":
                component = "whisper"
            elif parts[0] == "cv2" or parts[0].startswith("opencv_python"):
                component = "camera"
            else:
                component = "core"
            result.append((source, relative, source.stat().st_size, component))
    return result


def total_memory_gb():
    """Read total physical memory without enumerating unrelated installed software."""
    class MemoryStatus(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]
    try:
        status = MemoryStatus()
        status.dwLength = ctypes.sizeof(status)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
            return status.ullTotalPhys / (1024 ** 3)
    except (AttributeError, OSError):
        pass
    return None


def microphone_count():
    """Count Windows audio input endpoints; this does not open or record from a mic."""
    try:
        return int(ctypes.windll.winmm.waveInGetNumDevs())
    except (AttributeError, OSError):
        return None


def disk_free_for(path):
    probe = Path(path)
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    try:
        return shutil.disk_usage(probe).free
    except OSError:
        return None


class Installer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} Setup — {VERSION}")
        self.geometry("790x690")
        self.minsize(750, 650)
        self.configure(bg="#101827")
        self.events = queue.Queue()
        self.installing = False
        self.launch_after_install = True
        self.scan_ready = False
        self.scanned_target = None
        self.replace_existing = False
        self.scan_flags = {}

        tk.Label(self, text=APP_NAME, bg="#101827", fg="#f3f5f8",
                 font=("Segoe UI", 20, "bold")).pack(anchor="w", padx=24, pady=(18, 2))
        tk.Label(self, text=f"Version {VERSION} · Checks this PC, then installs only missing files.",
                 bg="#101827", fg="#c2c9d4", font=("Segoe UI", 10)).pack(anchor="w", padx=24)

        tk.Label(self, text="Install folder", bg="#101827", fg="#f3f5f8",
                 font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=24, pady=(14, 4))
        row = tk.Frame(self, bg="#101827")
        row.pack(fill="x", padx=24)
        default_root = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Programs"
        self.path_var = tk.StringVar(value=str(default_root / APP_NAME))
        self.path_entry = tk.Entry(row, textvariable=self.path_var, font=("Segoe UI", 10))
        self.path_entry.pack(side="left", fill="x", expand=True, ipady=6)
        self.browse_button = tk.Button(row, text="Browse…", command=self.choose_folder)
        self.browse_button.pack(side="left", padx=(8, 0), ipady=3)
        self.scan_button = tk.Button(row, text="Scan PC", command=self.scan_system)
        self.scan_button.pack(side="left", padx=(8, 0), ipady=3)

        tk.Label(self, text="System and dependency scan", bg="#101827", fg="#f3f5f8",
                 font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=24, pady=(12, 4))
        self.scan_report = tk.Text(self, height=10, wrap="word", state="disabled",
                                   bg="#0b1220", fg="#cbd5e1", insertbackground="#f3f5f8",
                                   relief="flat", font=("Consolas", 9), padx=10, pady=8)
        self.scan_report.pack(fill="x", padx=24)

        components = tk.Frame(self, bg="#101827")
        components.pack(fill="x", padx=24, pady=(10, 2))
        tk.Label(components, text="Components (all missing items are selected by default)",
                 bg="#101827", fg="#f3f5f8", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.core_var = tk.BooleanVar(value=True)
        tk.Checkbutton(components, text="Bou app, bundled Python, voice runtime and required modules (required)",
                       variable=self.core_var, state="disabled", bg="#101827", fg="#c2c9d4",
                       selectcolor="#253347", activebackground="#101827").pack(anchor="w")
        self.model_var = tk.BooleanVar(value=True)
        tk.Checkbutton(components, text="Offline Whisper speech model (included, about 484 MB)",
                       variable=self.model_var, bg="#101827", fg="#f3f5f8",
                       selectcolor="#253347", activebackground="#101827").pack(anchor="w")
        self.camera_var = tk.BooleanVar(value=True)
        tk.Checkbutton(components, text="Camera support (OpenCV, optional)",
                       variable=self.camera_var, bg="#101827", fg="#f3f5f8",
                       selectcolor="#253347", activebackground="#101827").pack(anchor="w")
        self.replace_var = tk.BooleanVar(value=False)
        tk.Checkbutton(components, text="Replace existing files that differ from this version",
                       variable=self.replace_var, bg="#101827", fg="#f3f5f8",
                       selectcolor="#253347", activebackground="#101827").pack(anchor="w", pady=(3, 0))
        tk.Label(components, text="When replacement is off, matching files are reused, changed files are kept, and missing files are added.",
                 bg="#101827", fg="#8f9bad", font=("Segoe UI", 9)).pack(anchor="w", padx=(24, 0))

        self.status = tk.Label(self, text="Scanning this PC…", bg="#101827", fg="#aab5c5",
                               font=("Segoe UI", 9))
        self.status.pack(anchor="w", padx=24, pady=(8, 3))
        self.progress = ttk.Progressbar(self, mode="determinate", maximum=100)
        self.progress.pack(fill="x", padx=24, pady=(1, 10))

        footer = tk.Frame(self, bg="#101827")
        footer.pack(fill="x", padx=24)
        self.launch_var = tk.BooleanVar(value=True)
        tk.Checkbutton(footer, text="Launch Bou after installation", variable=self.launch_var,
                       bg="#101827", fg="#f3f5f8", selectcolor="#253347",
                       activebackground="#101827", activeforeground="#f3f5f8").pack(side="left")
        self.install_button = tk.Button(footer, text="Install selected", command=self.install, width=16,
                                        bg="#ed6a63", fg="#101827", relief="flat",
                                        font=("Segoe UI", 10, "bold"))
        self.install_button.pack(side="right", ipady=6)
        self.after(120, self.scan_system)
        self.after(100, self.poll_events)

    def choose_folder(self):
        selected = filedialog.askdirectory(title="Choose Bou install folder", initialdir=self.path_var.get())
        if selected:
            self.path_var.set(str(Path(selected) / APP_NAME))
            self.scan_system()

    def write_scan_report(self, lines):
        self.scan_report.configure(state="normal")
        self.scan_report.delete("1.0", "end")
        self.scan_report.insert("1.0", "\n".join(lines))
        self.scan_report.configure(state="disabled")

    def scan_system(self, preserve_choices=False):
        previous = (self.model_var.get(), self.camera_var.get()) if preserve_choices else None
        target = Path(self.path_var.get().strip()).expanduser()
        machine = platform.machine() or "unknown"
        os_name = platform.system()
        compatible = os_name == "Windows" and machine.lower() in ("amd64", "x86_64")
        cpu_count = os.cpu_count() or 0
        ram_gb = total_memory_gb()
        free_bytes = disk_free_for(target)
        temp_free = disk_free_for(tempfile.gettempdir())
        bundle = payload_files()
        bundle_size = sum(item[2] for item in bundle)
        mic_count = microphone_count()
        flags = {
            "runtime": (target / "BouAssistant.exe").is_file() and (target / "_internal").is_dir(),
            "voice": (target / "BouAssistant.exe").is_file() and (target / "_sounddevice_data").exists(),
            "whisper": (target / MODEL_PATH / "model.bin").is_file(),
            "camera": (target / "cv2").is_dir(),
        }
        self.scan_flags = flags
        self.scanned_target = str(target)
        self.scan_ready = True
        if previous is None:
            self.model_var.set(not flags["whisper"])
            self.camera_var.set(not flags["camera"])
        else:
            self.model_var.set(previous[0])
            self.camera_var.set(previous[1])

        def present(value):
            return "Already installed in this folder" if value else "Not installed in this folder"
        ram_text = f"{ram_gb:.1f} GB" if ram_gb is not None else "not detected"
        free_text = f"{free_bytes / (1024 ** 3):.1f} GB free" if free_bytes is not None else "not detected"
        temp_text = f"{temp_free / (1024 ** 3):.1f} GB free" if temp_free is not None else "not detected"
        mic_text = f"{mic_count} input device(s)" if mic_count is not None else "not detected"
        python_text = "Found; not changed" if shutil.which("python") else "Not found; not needed (bundled)"
        detected = [name for name, key in (("Bou runtime", "runtime"), ("voice runtime", "voice"), ("Whisper model", "whisper"), ("OpenCV camera", "camera")) if flags[key]]
        detected_text = ", ".join(detected) if detected else "No Bou dependencies found in the selected folder; bundled requirements are ready to install."
        lines = [
            f"OS / architecture: {platform.system()} {platform.release()} · {machine} · {'SUPPORTED' if compatible else 'UNSUPPORTED (Windows x64 required)'}",
            f"CPU / memory: {cpu_count} logical core(s) · {ram_text} (4 GB recommended)",
            f"Target storage: {free_text} · full setup {bundle_size / (1024 ** 3):.2f} GB",
            f"Temporary storage: {temp_text}",
            f"Microphone: {mic_text} (setup only detects devices; it does not record audio)",
            f"System Python: {python_text}; Bou uses its own bundled runtime and leaves global packages untouched.",
            f"Bou app + voice runtime: {present(flags['runtime'] and flags['voice'])}",
            f"Offline Whisper model: {present(flags['whisper'])} · {'selected' if self.model_var.get() else 'not selected'}",
            f"Camera / OpenCV: {present(flags['camera'])} · {'selected' if self.camera_var.get() else 'not selected'}",
            f"Detected components: {detected_text}",
            "Scan scope: required compatibility details and Bou's selected install folder only; no personal files or unrelated app inventory.",
        ]
        self.write_scan_report(lines)
        self.status.configure(text="Scan complete. Choose which missing optional components to install.")
        if not compatible:
            self.install_button.configure(state="disabled")
        else:
            self.install_button.configure(state="normal")
        return {"compatible": compatible, "bundle_size": bundle_size, "free_bytes": free_bytes}

    def selected_files(self):
        files = payload_files()
        chosen = []
        for source, relative, size, component in files:
            if component == "whisper" and not self.model_var.get():
                continue
            if component == "camera" and not self.camera_var.get():
                continue
            chosen.append((source, relative, size, component))
        return chosen

    def install(self):
        if self.installing:
            return
        if not PAYLOAD.is_dir():
            messagebox.showerror("Installer payload missing", "Bou files are missing from this installer.")
            return
        target = Path(self.path_var.get().strip()).expanduser()
        scan = self.scan_system(preserve_choices=True)
        if not scan["compatible"]:
            messagebox.showerror("Unsupported PC", "This setup requires a Windows x64 PC.")
            return
        if target.exists() and any(target.iterdir()) and not (target / "BouAssistant.exe").exists():
            messagebox.showerror("Folder is not empty", "Choose an empty folder or an existing Bou installation.")
            return
        files = self.selected_files()
        needed = sum(size for _, _, size, _ in files)
        free = disk_free_for(target)
        if free is not None and free < needed + (256 * 1024 * 1024):
            if not messagebox.askyesno("Low disk space", "The selected files need about " +
                                       f"{needed / (1024 ** 3):.2f} GB. There is less than 256 MB extra free. Continue?"):
                return
        existing_count = sum(1 for _, relative, _, _ in files if (target / relative).is_file())
        replace = False
        if existing_count:
            replace = messagebox.askyesno(
                "Existing dependencies found",
                f"The scan found {existing_count} existing file(s) in the Bou install folder.\n\n"
                "Replace files that differ from this version? Choose No to keep existing files and install only missing ones.",
            )
            self.replace_var.set(replace)
        else:
            self.replace_var.set(False)
        self.replace_existing = replace
        self.installing = True
        self.launch_after_install = self.launch_var.get()
        self.install_button.configure(state="disabled")
        self.scan_button.configure(state="disabled")
        self.browse_button.configure(state="disabled")
        self.path_entry.configure(state="disabled")
        self.status.configure(text="Installing missing Bou files and selected components…")
        threading.Thread(target=self.copy_payload, args=(target, files, replace), daemon=True).start()

    def copy_payload(self, target, files, replace_existing):
        try:
            total = sum(size for _, _, size, _ in files)
            done = copied = identical = preserved = 0
            target.mkdir(parents=True, exist_ok=True)
            for source, relative, size, _ in files:
                destination = target / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                should_copy = True
                if destination.is_file():
                    try:
                        same = filecmp.cmp(source, destination, shallow=False)
                    except OSError:
                        same = False
                    if same:
                        identical += 1
                        should_copy = False
                    elif not replace_existing:
                        preserved += 1
                        should_copy = False
                if should_copy:
                    shutil.copy2(source, destination)
                    copied += 1
                done += size
                self.events.put(("progress", (int(done * 100 / max(total, 1)), copied, identical, preserved)))
            self.events.put(("copied", (target, copied, identical, preserved)))
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
                    percent, copied, identical, preserved = value
                    self.progress["value"] = percent
                    self.status.configure(text=f"Copying selected files… {percent}% · {copied} added · {identical} reused · {preserved} kept")
                elif kind == "copied":
                    target, copied, identical, preserved = value
                    try:
                        self.create_shortcuts(target)
                        self.register_uninstaller(target)
                        self.status.configure(text=f"Done: {copied} installed, {identical} identical reused, {preserved} existing files kept.")
                        if self.launch_after_install:
                            subprocess.Popen([str(target / "BouAssistant.exe")], cwd=str(target))
                        self.destroy()
                    except Exception as exc:
                        self.installing = False
                        self.install_button.configure(state="normal")
                        self.scan_button.configure(state="normal")
                        self.browse_button.configure(state="normal")
                        self.path_entry.configure(state="normal")
                        messagebox.showerror("Setup shortcut failed", "Bou was copied, but Windows could not create its shortcuts (" + type(exc).__name__ + ").")
                        self.status.configure(text="Bou files are installed. You can run BouAssistant.exe from the selected folder.")
                elif kind == "error":
                    self.installing = False
                    self.install_button.configure(state="normal")
                    self.scan_button.configure(state="normal")
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
