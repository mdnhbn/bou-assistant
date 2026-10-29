# Bou AI Assistant — Changelog

Every GitHub update must increment the serial version in `VERSION`, keep the app/installer/service version metadata aligned, and add a newest-first entry here and in `README-BN.md`. Each entry records features, how to use them, known limits, and bug fixes (or explicitly says when none were reported). Pushing a `vX.Y.Z` tag triggers the Windows installer workflow.

## 1.10.2 — 2026-10-29

### Added
- A responsive eight-step first-run wizard in the React web companion, inspired by the dark, spacious setup flow observed in Stonic Desktop while retaining Bou's human VRM character stage.
- The wizard covers a clearly labeled local setup checklist, preferred name, language/system voice, Bou or Aether, 2D/3D mode, theme/accent, greeting preview, demo memory, and optional provider status.
- UI preferences are stored locally in the current browser. The `শুরু` header button reopens setup at any time.
- Setup has no sign-in, activation, payment, or microphone request. Browser microphone access remains behind the Mic button.

### Bug fixes
- Fixed a ChatPanel auto-scroll effect that returned a non-cleanup value and caused React development runtime warnings.

### How to use
1. Open `web/` and run `npm install`, then `npm run dev`.
2. On first launch, move through the eight setup steps and select **Bou খুলুন**. Use **এখন পরে** to skip.
3. Reopen the wizard with the **শুরু** button. Change active display preferences later in Settings.
4. Add `bou.vrm` / `aether.vrm` and optional portrait PNG files to `web/public/models/` for character assets.

### Limits
- The setup checklist is a UI summary, not a second hardware scan. The Windows installer continues to perform its compatibility and dependency scan.
- Memory cards and API slot rotation remain demo UI. A configured local Gemini service is optional for this wizard.
- This version still needs user-supplied VRM/portrait assets; missing files show their expected paths.

## 1.10.1 — 2026-10-29

### Added
- Pre-install compatibility scan for Windows version/architecture, CPU, RAM, free space at the selected destination, microphone input count, and Bou dependency files in the selected folder.
- Component report for the bundled Python/voice runtime, offline Whisper model, and optional OpenCV camera support.
- Optional install checkboxes for the Whisper model and camera support. The core app/runtime stays required; users can choose to omit the model or camera component.
- Per-file reuse: identical installed files are skipped; missing files are copied; changed existing files prompt for replacement. Saying no keeps changed files and still installs missing files.
- Local-only scan scope; setup does not capture microphone audio or inspect personal files/unrelated applications. Global Python packages are left alone.

### Fixed
- Previous setup copied over every existing file during updates. Existing identical dependencies now stay in place, and changed files are replaced only when confirmed.
- Missing requirements now appear in the scan report and are selected for installation by default.

### How to use
1. Run the Windows x64 setup and review the system/dependency scan.
2. Keep the Whisper model and OpenCV checked for a full install; uncheck either only if you accept losing that optional feature or downloading Whisper later.
3. If existing files are found, choose **Yes** to replace changed files, or **No** to preserve them and install only missing files.
4. Click **Install selected**. Bou and its private Python/voice runtime are installed under the chosen folder; system-wide packages are not modified.

### Limits
- The setup checks only compatibility information and Bou requirements needed by this installer, not every unrelated program on the PC.
- Omitting the Whisper model means first voice use needs an internet download. Omitting OpenCV disables camera features.
- This installer remains Windows x64 only.

## 1.10.0 — 2026-10-29

### Added
- Bengali startup voice greeting: “হ্যালো, welcome! আমার নাম নাজমুল। নাজমুল, কেমন আছো?”
- Fresh-install defaults continue to enable spoken startup greeting and microphone auto-start; users can pause listening with **Mic**.
- Local Bengali and English wellbeing replies (“আমি ভালো আছি”, “I am good”, “I am fine”) that do not require an AI API key.
- Configurable preferred user name for provider prompts through `BOU_USER_NAME` (defaults to `Nazmul`).
- Installer text now describes the included Python runtime, voice/camera dependencies and offline Whisper model.

### Fixed
- The first “I am good” interaction no longer fails just because an OpenRouter key is missing; the reply is local and spoken through the existing speech output path.
- Aligned application title, installer registry version, service metadata and `VERSION` at 1.10.0.

### How to use
1. Download `Bou-AI-Assistant-Setup.exe` from [GitHub Releases](https://github.com/mdnhbn/bou-assistant/releases/latest) and run it on Windows x64.
2. Leave **Launch Bou after installation** selected and grant microphone access in Windows.
3. Hear the greeting and say “আমি ভালো আছি.” Use **Mic** to pause/resume.
4. Add your own OpenRouter key in Settings to use general AI replies. Installer contains no API keys. Local Whisper keeps transcription on the PC, while recognized text is sent to the configured AI provider.

### Limits
- This tagged installer targets Windows x64; macOS, Linux and Android installers are not included.
- The greeting and wellbeing response are local. General AI conversation still needs internet and an OpenRouter key or hosted service account.
- Older release notes remain in the versioned **Changelog** section of `README-BN.md` and `README.md`.
