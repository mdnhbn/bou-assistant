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
import time
import winreg
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

VERSION = "1.11.1"
APP_NAME = "Bou AI Assistant"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\BouAIAssistant"
MODEL_PATH = Path("models") / "whisper-small"
WEBVIEW2_CLIENT = r"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

RUNTIME_ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
PAYLOAD = RUNTIME_ROOT / "payload"
if not PAYLOAD.is_dir():
    PAYLOAD = RUNTIME_ROOT / "dist" / "BouAssistant"
WEBVIEW2_INSTALLER = RUNTIME_ROOT / "prerequisites" / "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"
if not WEBVIEW2_INSTALLER.is_file():
    WEBVIEW2_INSTALLER = RUNTIME_ROOT / "build-assets" / "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"

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
            # PyInstaller onedir data lives under _internal; older bundles used the root.
            if parts[0] == "_internal":
                parts = parts[1:]
            if parts[0] == "models" and len(parts) > 1 and parts[1] == "whisper-small":
                component = "whisper"
            elif parts[0] == "cv2" or parts[0].startswith("opencv_python"):
                component = "camera"
            else:
                component = "core"
            result.append((source, relative, source.stat().st_size, component))
    return result


def installed_path(target, relative):
    """Find a dependency in both current and older onedir layouts."""
    for candidate in (target / "_internal" / relative, target / relative):
        if candidate.exists():
            return candidate
    return target / "_internal" / relative


def files_identical(source, destination):
    try:
        return destination.is_file() and filecmp.cmp(source, destination, shallow=False)
    except OSError:
        return False


def webview2_version():
    """Use Microsoft's documented per-user/per-machine Evergreen runtime registration."""
    for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        for view in (winreg.KEY_WOW64_32KEY, winreg.KEY_WOW64_64KEY):
            try:
                with winreg.OpenKey(hive, WEBVIEW2_CLIENT, 0, winreg.KEY_READ | view) as key:
                    value = str(winreg.QueryValueEx(key, "pv")[0]).strip()
                    if value and value != "0.0.0.0":
                        return value
            except OSError:
                pass
    return None


def dotnet_framework_release():
    """Windows 10 1809+ includes Framework 4.7.2+, used by the bundled Python.NET host."""
    releases = []
    for view in (winreg.KEY_WOW64_32KEY, winreg.KEY_WOW64_64KEY):
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\NET Framework Setup\NDP\v4\Full", 0,
                                winreg.KEY_READ | view) as key:
                releases.append(int(winreg.QueryValueEx(key, "Release")[0]))
        except (OSError, TypeError, ValueError):
            pass
    return max(releases, default=0)


def windows_build():
    try:
        return sys.getwindowsversion().build
    except AttributeError:
        return 0


def install_webview2():
    """Install the bundled Microsoft runtime only when it is missing; never force a reboot."""
    if webview2_version():
        return
    if not WEBVIEW2_INSTALLER.is_file():
        raise RuntimeError("The offline Microsoft WebView2 installer is missing from this setup.")
    result = subprocess.run([str(WEBVIEW2_INSTALLER), "/silent", "/install"],
                            timeout=900, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    for _ in range(20):
        if webview2_version():
            return
        time.sleep(0.5)
    if result.returncode == 3010:
        raise RuntimeError("WebView2 requested a Windows restart. Restart this PC, then run setup again.")
    raise RuntimeError(f"Microsoft WebView2 installation did not finish successfully (code {result.returncode}).")


def known_folder(csidl, fallback):
    """Resolve redirected Start Menu/Desktop paths without WScript.SpecialFolders dispatch."""
    path = ctypes.create_unicode_buffer(32768)
    if ctypes.windll.shell32.SHGetFolderPathW(None, csidl, None, 0, path) == 0 and path.value:
        return Path(path.value)
    return Path(fallback)


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
        self.geometry("820x760")
        self.minsize(790, 730)
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
        tk.Label(self, text=f"Version {VERSION} · Reuses matching dependencies and updates changed app files.",
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
        self.webview_var = tk.BooleanVar(value=True)
        self.webview_checkbox = tk.Checkbutton(
            components, text="Microsoft WebView2 Runtime (required for the React desktop UI, offline installer included)",
            variable=self.webview_var, bg="#101827", fg="#f3f5f8", selectcolor="#253347", activebackground="#101827")
        self.webview_checkbox.pack(anchor="w")
        tk.Label(components, text="An installed WebView2 is reused. Microsoft installs this shared runtime outside the Bou folder.",
                 bg="#101827", fg="#8f9bad", font=("Segoe UI", 9)).pack(anchor="w", padx=(24, 0))
        self.replace_var = tk.BooleanVar(value=False)
        tk.Checkbutton(components, text="Allow changed program files to be replaced for this update",
                       variable=self.replace_var, bg="#101827", fg="#f3f5f8",
                       selectcolor="#253347", activebackground="#101827").pack(anchor="w", pady=(3, 0))
        tk.Label(components, text="Identical files are always reused. An app update asks before replacing changed program files.",
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
        previous = (self.model_var.get(), self.camera_var.get(), self.webview_var.get()) if preserve_choices else None
        target = Path(self.path_var.get().strip()).expanduser()
        machine = platform.machine() or "unknown"
        os_name = platform.system()
        build_number = windows_build()
        framework_release = dotnet_framework_release()
        os_compatible = os_name == "Windows" and machine.lower() in ("amd64", "x86_64") and build_number >= 17763
        framework_compatible = framework_release >= 461808
        compatible = os_compatible and framework_compatible
        cpu_count = os.cpu_count() or 0
        ram_gb = total_memory_gb()
        free_bytes = disk_free_for(target)
        temp_free = disk_free_for(tempfile.gettempdir())
        bundle = payload_files()
        bundle_size = sum(item[2] for item in bundle)
        mic_count = microphone_count()
        webview_version = webview2_version()
        flags = {
            "runtime": (target / "BouAssistant.exe").is_file() and (target / "_internal").is_dir(),
            "voice": (target / "BouAssistant.exe").is_file() and installed_path(target, Path("_sounddevice_data")).exists(),
            "whisper": installed_path(target, MODEL_PATH / "model.bin").is_file(),
            "camera": installed_path(target, Path("cv2")).is_dir(),
            "web": installed_path(target, Path("web/dist/index.html")).is_file(),
            "webview": bool(webview_version),
        }
        self.scan_flags = flags
        self.scanned_target = str(target)
        self.scan_ready = True
        if previous is None:
            self.model_var.set(not flags["whisper"])
            self.camera_var.set(not flags["camera"])
            self.webview_var.set(not flags["webview"])
        else:
            self.model_var.set(previous[0])
            self.camera_var.set(previous[1])
            self.webview_var.set(previous[2] and not flags["webview"])
        self.webview_checkbox.configure(state="disabled" if flags["webview"] else "normal")

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
            f"OS / architecture: {platform.system()} {platform.release()} build {build_number} · {machine} · {'SUPPORTED' if os_compatible else 'UNSUPPORTED (Windows 10 1809+ x64 required)'}",
            f"Microsoft .NET Framework: {'4.7.2 or newer found' if framework_compatible else '4.7.2+ required; update Windows before installing'} (registry release {framework_release or 'not found'})",
            f"CPU / memory: {cpu_count} logical core(s) · {ram_text} (4 GB recommended)",
            f"Target storage: {free_text} · full setup {bundle_size / (1024 ** 3):.2f} GB",
            f"Temporary storage: {temp_text}",
            f"Microphone: {mic_text} (setup only detects devices; it does not record audio)",
            f"System Python: {python_text}; Bou uses its own bundled runtime and leaves global packages untouched.",
            f"Bou app + voice runtime: {present(flags['runtime'] and flags['voice'])}",
            f"Offline Whisper model: {present(flags['whisper'])} · {'selected' if self.model_var.get() else 'not selected'}",
            f"Camera / OpenCV: {present(flags['camera'])} · {'selected' if self.camera_var.get() else 'not selected'}",
            f"React interface: {present(flags['web'])} · included in this setup; Node/npm not needed to run Bou.",
            f"Microsoft WebView2: {webview_version or 'missing; offline x64 installer is selected by default'} · {'reuse existing runtime' if flags['webview'] else 'shared Microsoft runtime outside the Bou folder'}",
            f"Detected components: {detected_text}",
            "Scan scope: required compatibility details and Bou's selected install folder only; no personal files or unrelated app inventory.",
        ]
        self.write_scan_report(lines)
        self.status.configure(text="Scan complete. Choose which missing optional components to install." if compatible else "This PC does not meet the displayed Windows/.NET requirements.")
        if not compatible:
            self.install_button.configure(state="disabled")
        else:
            self.install_button.configure(state="normal")
        return {"compatible": compatible, "os_compatible": os_compatible, "framework_compatible": framework_compatible,
                "bundle_size": bundle_size, "free_bytes": free_bytes}

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
        if not installed_path(PAYLOAD, Path("web/dist/index.html")).is_file():
            messagebox.showerror("Installer payload incomplete", "The built React interface is missing from this installer. Download the complete release setup.")
            return
        target = Path(self.path_var.get().strip()).expanduser()
        scan = self.scan_system(preserve_choices=True)
        if not scan["compatible"]:
            reason = ("This setup requires Windows 10 version 1809 or newer (including Windows 11), x64."
                      if not scan["os_compatible"] else
                      "The desktop interface requires Microsoft .NET Framework 4.7.2 or newer. Update Windows or install the Microsoft Framework runtime, then scan again.")
            messagebox.showerror("Unsupported PC", reason)
            return
        needs_webview = not bool(webview2_version())
        if needs_webview and not self.webview_var.get():
            messagebox.showerror("WebView2 is required", "Keep Microsoft WebView2 selected, or install it yourself and click Scan PC again. The React desktop interface needs this runtime.")
            return
        if needs_webview and not WEBVIEW2_INSTALLER.is_file():
            messagebox.showerror("Runtime installer missing", "This setup is missing the offline Microsoft WebView2 installer. Download the complete release setup.")
            return
        if target.exists() and any(target.iterdir()) and not (target / "BouAssistant.exe").exists():
            messagebox.showerror("Folder is not empty", "Choose an empty folder or an existing Bou installation.")
            return
        files = self.selected_files()
        changed = []
        for source, relative, _, component in files:
            destination = target / relative
            if destination.is_file() and not files_identical(source, destination):
                changed.append((relative, component))
        changed_core = sum(1 for _, component in changed if component == "core")
        replace = self.replace_var.get()
        if changed_core and not replace:
            replace = messagebox.askyesno(
                "Update changed program files?",
                f"{changed_core} program/runtime file(s) differ from version {VERSION}.\n\n"
                "Choose Yes to update them and reuse all identical dependencies. Choose No to cancel this app update and keep your existing installation. Updating only part of the program can leave an older or incompatible app.",
            )
            if not replace:
                self.status.configure(text="Update cancelled. Existing Bou files were kept.")
                return
        elif changed and not replace:
            replace = messagebox.askyesno(
                "Existing optional files differ",
                "Replace changed optional dependency files? Choose No to keep them and add only missing files.",
            )
        self.replace_var.set(replace)
        needed = sum(size for source, relative, size, _ in files
                     if not (target / relative).is_file() or (replace and not files_identical(source, target / relative)))
        free = disk_free_for(target)
        if free is not None and free < needed + (256 * 1024 * 1024):
            if not messagebox.askyesno("Low disk space", "The missing/changed files need up to " +
                                       f"{needed / (1024 ** 3):.2f} GB. There is less than 256 MB extra free. Continue?"):
                return
        self.replace_existing = replace
        self.installing = True
        self.launch_after_install = self.launch_var.get()
        self.install_button.configure(state="disabled")
        self.scan_button.configure(state="disabled")
        self.browse_button.configure(state="disabled")
        self.path_entry.configure(state="disabled")
        self.status.configure(text="Installing missing Bou files and selected components…")
        threading.Thread(target=self.copy_payload, args=(target, files, replace, needs_webview), daemon=True).start()

    def copy_payload(self, target, files, replace_existing, needs_webview=False):
        try:
            if needs_webview:
                self.events.put(("status", "Installing the bundled Microsoft WebView2 runtime… This may take a few minutes."))
                install_webview2()
            total = sum(size for _, _, size, _ in files)
            done = copied = identical = preserved = 0
            target.mkdir(parents=True, exist_ok=True)
            for source, relative, size, _ in files:
                destination = target / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                should_copy = True
                if destination.is_file():
                    same = files_identical(source, destination)
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
            self.events.put(("error", str(exc) or type(exc).__name__))

    @staticmethod
    def create_shortcuts(target):
        from comtypes.client import CreateObject
        # Dynamic dispatch avoids generated WScript type-library AttributeErrors.
        shell = CreateObject("WScript.Shell", dynamic=True)
        appdata = Path(os.environ.get("APPDATA", str(Path.home() / "AppData/Roaming")))
        start_menu = known_folder(0x02, appdata / "Microsoft/Windows/Start Menu/Programs") / APP_NAME
        desktop_link = known_folder(0x10, Path.home() / "Desktop") / (APP_NAME + ".lnk")
        start_menu.mkdir(parents=True, exist_ok=True)
        for link_path, arguments in ((start_menu / (APP_NAME + ".lnk"), ""),
                                     (desktop_link, ""),
                                     (start_menu / "Bou Classic.lnk", "--classic")):
            shortcut = shell.CreateShortcut(str(link_path))
            shortcut.TargetPath = str(target / "BouAssistant.exe")
            shortcut.Arguments = arguments
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
                if kind == "status":
                    self.status.configure(text=value)
                elif kind == "progress":
                    percent, copied, identical, preserved = value
                    self.progress["value"] = percent
                    self.status.configure(text=f"Copying selected files… {percent}% · {copied} added · {identical} reused · {preserved} kept")
                elif kind == "copied":
                    target, copied, identical, preserved = value
                    warnings = []
                    try:
                        self.create_shortcuts(target)
                    except Exception as exc:
                        warnings.append("Shortcuts: " + (str(exc) or type(exc).__name__))
                    try:
                        self.register_uninstaller(target)
                    except Exception as exc:
                        warnings.append("Windows uninstall entry: " + (str(exc) or type(exc).__name__))
                    if self.launch_after_install:
                        try:
                            subprocess.Popen([str(target / "BouAssistant.exe")], cwd=str(target))
                        except Exception as exc:
                            warnings.append("App launch: " + (str(exc) or type(exc).__name__))
                    self.installing = False
                    self.status.configure(text=f"Installed: {copied} added/updated, {identical} identical reused, {preserved} optional files kept.")
                    if warnings:
                        self.install_button.configure(text="Close", command=self.destroy, state="normal")
                        messagebox.showwarning("Installed with a follow-up needed",
                                               "Bou files were installed.\n\n" + "\n".join(warnings) +
                                               "\n\nYou can run BouAssistant.exe from:\n" + str(target))
                    else:
                        self.destroy()
                        return
                elif kind == "error":
                    self.installing = False
                    self.install_button.configure(state="normal")
                    self.scan_button.configure(state="normal")
                    self.browse_button.configure(state="normal")
                    self.path_entry.configure(state="normal")
                    messagebox.showerror("Installation did not complete", value + "\n\nRerun this setup after resolving the error; app files may be partially copied. User conversations and credentials are outside the install folder.")
                    self.status.configure(text="Setup incomplete. Resolve the reported issue, then retry.")
        except queue.Empty:
            pass
        if self.winfo_exists():
            self.after(100, self.poll_events)


if __name__ == "__main__":
    if not PAYLOAD.is_dir():
        print("Missing desktop application payload:", PAYLOAD)
        raise SystemExit(1)
    Installer().mainloop()
