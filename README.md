# Bou AI Assistant · 1.10.2

Bou is a Windows desktop assistant with local conversation memory and an optional hosted service. Provider API keys stay on the service server; customers connect with individual access tokens.

বাংলায় ব্যবহারবিধি: [README-BN.md](README-BN.md) · Version history: [CHANGELOG.md](CHANGELOG.md)

## Components

- `bou_studio.py`: Bou desktop interface.
- `bou_core.py` and `bou_gui.py`: Bou voice engine and the simpler standalone interface.
- `studio_engine.py` and `studio_store.py`: local assistant, worker manager, memory, and hosted-service client.
- `service/`: FastAPI service and owner admin panel.
- `service/static/admin.html`: configure agent roles and up to ten encrypted key slots per agent, create or revoke customer accounts.

## Desktop dashboard

The 1.5.0 desktop screen uses a three-column layout inspired by the publicly visible Stonic product: a signal feed, Bou's animated character core and Agent Town, and the chat inspector. The feed reads public BBC World RSS headlines and links each headline to its BBC page. Search opens a browser results page; it does not give the AI an unrestricted web browser. The 2D/3D control changes a local activity illustration, not a live geographic map. Bou does not request GPS. Gesture toggles the character's idle animation; it is not camera-based gesture recognition.

The layout and original Bou artwork are implemented in this project. Bou 1.6.0 added one-frame camera description and user-approved, one-action-at-a-time PC control. Bou 1.7.0 adds a spoken startup greeting and a configurable live microphone conversation; camera capture is still one-shot, and screen monitoring is not continuous. Other Stonic release features not included in Bou include phone calls, floating characters/live wallpaper, custom character personas, reminders, PDF/document attachments, full-page generated visuals, and web research inside AI answers.

## React web companion (experimental)

The `web/` companion contains a responsive React + TypeScript UI with Bou/Aether VRM and 2D portrait modes, streamed Gemini chat through a loopback-only Node service, browser speech recognition, device text-to-speech, guided code/review/security skills, and a Stonic-inspired eight-step local setup wizard. Its UI preferences stay in this browser; use the **শুরু** button to reopen setup.

Run it from `web/`: install with `npm install`, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and run `npm run dev`. The real key stays in the server process; do not use a `VITE_` key or commit `.env`.

This is a separate web companion, not a replacement for the Windows desktop app. It does not connect to the native desktop-control flow, local archive, worker team, hosted service key pools, or messaging integrations. Its skill cards provide text guidance only; browser, computer, file, messaging, and code-execution runners are not connected. The Windows app's existing approved, one-action-at-a-time PC control remains in `skills/desktop-control` and `bou_studio.py`.

Web Speech recognition can send microphone audio to the browser/platform recognition service. See `web/README.md` for the full privacy and setup details.

## Hosted service setup

1. Copy `.env.example` to `.env` on the server. Set a long random `BOU_ADMIN_TOKEN` and generate `BOU_MASTER_KEY` with:

   ```powershell
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. Keep `.env` and a backup of `BOU_MASTER_KEY` private. Losing the master key makes stored provider keys unreadable.
3. Start the service with `docker compose up --build`.
4. Open `/admin`, enter the admin token, configure up to ten OpenRouter key slots for the Manager and each worker, then create a customer account.
5. In the customer's Bou app, choose **service** mode and enter the HTTPS service URL and customer access token.

Each agent rotates through its configured keys when a key is rejected or reaches an OpenRouter limit (HTTP 401, 402, 403, or 429). Keys are encrypted at rest and never returned by the admin API. Customer tokens are stored as hashes and can be disabled or revoked. The hosted service does not save chat transcripts; the desktop app keeps its archive locally and sends only context enabled by the user.

For internet-facing use, place the service behind HTTPS and use persistent server storage for `service/data`. The included Compose file binds to localhost for a reverse proxy; it does not configure a public domain, TLS, billing, or a production database.

## Local mode

Run `Start-Bou.bat` on Windows. Local mode uses the existing OpenRouter key from the local installation. The launcher installs the optional OpenCV camera package if it is missing. Worker roles and manager instructions can be edited in Bou. The hosted admin key pool is used only when the app is set to service mode.

On first run, `Start-Bou.bat` creates `.venv` when needed and installs the assistant's voice and desktop dependencies from `requirements.txt`.

## Windows installer

The Windows x64 setup `.exe` bundles Python and application dependencies, OpenCV, and the offline Whisper model. Before installation it checks Windows/architecture, CPU, RAM, target disk space, microphone presence, and Bou files in the selected folder. It then shows which components are present; identical files are reused, missing files are installed, and changed files are replaced only after confirmation. The runtime stays private to Bou and does not overwrite global Python packages. Download the latest installer from [GitHub Releases](https://github.com/mdnhbn/bou-assistant/releases/latest). The installer does not contain an OpenRouter key, user data, or chat database. Enter your own API key in Settings after installation; Bou stores it in Windows Credential Manager. The source launcher downloads the Whisper model on first use, while the installer includes it for offline speech recognition. The installer is not code-signed.

Bou's memory includes conversational preferences and user-approved local notes. ChatGPT's private model, skills, browser session, and account permissions cannot be copied into Bou. Bou only uses its own connected features: live voice, one-shot approved camera descriptions, and one-step-at-a-time PC control. It does not have unrestricted browser or PC access.

## Camera, microphone, and PC control

The Camera & PC page keeps camera access off until the user clicks **Capture one frame** and confirms. Bou captures one still, turns the camera off, previews the image, and sends it to the configured provider only after a second approval. The camera prompt asks for visible, non-sensitive details and does not identify the person. The image stays in memory and is not written to disk.

On fresh installs, Bou speaks “হ্যালো, welcome! আমার নাম নাজমুল। নাজমুল, কেমন আছো?” and then starts the live microphone session by default if enabled in Settings. Speak naturally; when a phrase ends, Bou transcribes it, displays the words in chat, sends the text to the configured AI provider, and speaks the answer. The **Mic** button pauses or resumes listening. Raw microphone audio is not saved by Bou.

Local Whisper is the default transcription provider. The first live-listening startup downloads the multilingual `small` model (about 500 MB) into `%LOCALAPPDATA%\BouStudio\models\whisper`; later transcription runs on the PC without sending microphone audio to a speech service. Bou sends the recognized text to the configured AI provider to generate a reply. Wispr Flow and Google Speech Recognition remain optional cloud transcription providers and are clearly labeled in Settings.

PC control is off by default and enabled only for the current session. Before every AI planning call, Bou shows the screenshot and asks before sharing it with the configured provider. It then displays one proposed click, key, scroll, or text entry and waits for approval. After executing at most that one action, it stops until the user requests another screenshot. Screenshots and PC-task details are not added to the conversation archive. Passwords, one-time codes, payments, purchases, sending/publishing, deletions, installs, agreements, and security-setting changes are blocked for the user to handle directly.

## Changelog

### 1.10.2 — Stonic-inspired local setup wizard

- Added a responsive eight-step first-run wizard to the React companion, with a dark two-column setup flow and the existing human VRM character preview.
- Users can choose a preferred name, language/system voice, Bou/Aether, 2D/3D, theme and accent; preview the welcome line; review demo memory and see whether an optional local provider is available.
- Display preferences are stored only in browser local storage. Reopen setup from **শুরু**. No sign-in, activation, payment or microphone request is part of this wizard.
- **Bug fix:** corrected the ChatPanel auto-scroll effect so it no longer returns a non-cleanup value to React.

**Use:** In `web/`, run `npm install` and `npm run dev`; complete the steps and choose **Bou খুলুন**, or skip with **এখন পরে**. Place VRM and portrait assets in `web/public/models/`.

**Limits:** The checklist is informational and does not scan hardware; the Windows installer remains responsible for dependency checks. Memory and key-slot rotation stay demo UI, and character assets are user supplied.

### 1.10.1 — dependency scan and selective install

- Setup scans Windows version/architecture, CPU, RAM, destination disk space, microphone device count, and Bou dependency/model files in the chosen install folder. It does not capture microphone audio, inspect personal files, or inventory unrelated applications.
- Python, voice runtime and required modules remain bundled in Bou private install folder; global Python packages are not changed. Existing runtime, voice data, Whisper model and OpenCV are reported separately.
- Missing Whisper and OpenCV components are selected by default on a new PC. You may uncheck the optional Whisper model (first voice use then downloads it) or camera support (camera features stay unavailable).
- If existing files are found, the installer asks whether to replace changed files. `Yes` updates them; `No` preserves them and installs only missing files. Byte-identical files are always reused.
- **Bug fix:** updates previously overwrote all existing Bou files. The installer now reports requirements, skips identical files, and follows the user replace choice.

**How to use:** choose the destination, click `Scan PC`, review the report and component checkboxes, choose whether to replace existing files, then click `Install selected`.
### 1.10.0 — Windows voice welcome and key-free first reply

- Bou now opens with the requested spoken Bengali greeting: “হ্যালো, welcome! আমার নাম নাজমুল। নাজমুল, কেমন আছো?” Fresh installs have spoken greeting and microphone auto-start enabled by default; use **Mic** to pause or resume.
- “আমি ভালো আছি” / “আমি ভাল আছি” gets an immediate spoken local reply without an OpenRouter key. “I am good” and “I am fine” have a short local reply too. Add your own OpenRouter key in Settings for general AI conversations.
- Set `BOU_USER_NAME` to change the name used in subsequent AI conversation prompts (default `Nazmul`). The startup greeting currently uses the requested fixed name.
- The self-contained installer includes the Python runtime, voice/camera dependencies, and offline Whisper small model. No separate Python or dependency installation is needed on Windows x64. API keys are never bundled.
- **Bug fix:** the first wellbeing reply used to fail when no provider key was configured; it now completes locally. App title, installer and service metadata now agree on version 1.10.0.

**How to use:** Download and run `Bou-AI-Assistant-Setup.exe` from GitHub Releases, keep **Launch Bou after installation** selected, allow microphone access in Windows, hear the greeting, then say “আমি ভালো আছি.” Add an OpenRouter key in Settings for other AI requests. Local Whisper transcribes microphone audio on this PC; recognized transcript text is sent to the configured AI provider.

**Limits:** Tagged releases currently produce a Windows x64 installer only. This version does not provide macOS, Linux or Android installers. The greeting and wellbeing reply work locally; other AI replies require an internet connection and your OpenRouter key or hosted service access.

### 1.9.1 — Self-contained Windows setup

- Replaced the external setup compiler with a self-extracting PyInstaller setup executable, avoiding a separate installer-tool license dependency.
- Added per-user installation, Start Menu and desktop shortcuts, launch-after-install, and a Windows uninstall entry.
- Included the full desktop runtime and offline Whisper model inside the one-file setup executable.

### 1.9.0 — Windows installer, key pool, and assistant preferences

- Added a GitHub Actions workflow that packages a Windows x64 setup executable with application dependencies and the offline Whisper model, then attaches it to tagged GitHub releases.
- Expanded each hosted Manager/worker key pool to ten encrypted slots with automatic rotation across configured keys.
- Added persistent assistant instructions for conversational Bengali-first replies and accurate descriptions of Bou's available tools and approval limits.
- Added OpenCV to the desktop dependency bundle for the optional camera feature.

### 1.8.1 — Live voice setup and local transcription

- Applied the saved speech-output preference to Bou's original speech engine, so enabling voice replies is honored by both old and new code paths.
- Restored the original Windows speech fallback when Edge TTS is unavailable or cannot play audio, for the startup greeting and spoken replies.
- Updated the Studio launcher to create its virtual environment and install the microphone and speech dependencies on first run.
- Added local Whisper transcription as the default live voice provider; the one-time model download is stored outside the project and microphone audio stays on the PC.
- Kept Wispr Flow and Google as optional cloud providers with distinct setup and data-transfer notices.

### 1.8.0 — Bou identity cleanup

- Renamed the legacy assistant's source files and branding to Bou and removed developer attribution.
- Bou no longer invents a developer or owner name when asked; an optional user name can be configured with `BOU_USER_NAME` for meeting mode.
- Moved the local chat archive to the BouStudio data folder without discarding the existing archive.

### 1.7.0 — Live voice conversation and Wispr Flow API

- Added a spoken startup greeting, controlled by the **Speak AI replies and startup greeting** setting.
- Added automatic live microphone startup by default, with a global **Mic** button to pause and resume.
- Added phrase-end voice detection, transcription, automatic chat submission, and spoken AI replies; no Record or Send click is required.
- Added the official Wispr Flow Voice Interface API transcription adapter and secure API key storage through Windows Credential Manager.
- Kept Google Speech Recognition as an explicit alternative; without a Wispr key, audio is not silently sent to another transcription service.

### 1.6.0 — Camera and confirmed PC control

- Added a one-shot camera capture with a local preview and separate approval before sending the frame for a non-sensitive visual description.
- Added a Camera & PC page, session-only PC-control toggle, screenshot-sharing approval, and one proposed action per review/approval cycle.
- Added bounded click, typing, key, and scroll actions; Bou stops after one action and waits for the user before capturing another screen.
- Kept microphone use manual, limited to 12 seconds, with transcript review; camera frames and desktop screenshots are not saved.
- Added OpenCV bootstrap for the optional camera feature and updated the hosted image endpoint to distinguish camera, desktop-control, and ordinary image requests.

### 1.5.0 — Stonic-inspired desktop dashboard

- Reworked the Assistant screen into a signal feed, animated character core, Agent Town, and Voice/Agent/Notes chat inspector.
- Added public BBC World RSS headlines, explicit browser search, task alerts, and local activity-map views with a 2D/3D illustration toggle.
- Added hide/show controls for the feed and chat panels, live Manager/worker status in Agent Town, and a character-animation toggle.
- Kept Bou's own branding and artwork. The activity map uses no location data; gesture control does not access a camera.

### 1.4.0 — Hosted service and administration

- Added the hosted Bou API and owner admin panel.
- Added encrypted server-side key storage with two fallback keys for the Manager and every worker.
- Added manager-led task assignment, parallel worker calls, and final synthesis on the hosted path.
- Added customer token creation, disable, and revoke controls; added service connection settings to the desktop app.
- Added Docker setup and deployment configuration examples. Secrets and local databases are excluded from Git.

### 1.3.0 — Worker manager and dashboard

- Added Manager, Analyst, Planner, and Reviewer roles. The Manager assigns separate subtasks, workers run in parallel, and Bou combines their reports.
- Added Auto, Always, and Off worker modes, editable local worker instructions, and progress indicators.
- Redesigned the assistant view with a session globe, particle character, module controls, Visual Hub, and chat panel.

### 1.2.0 — Conversation memory

- Kept the complete chat archive on the user's PC and added relevant-history retrieval for chat requests.
- Added memory controls, saved notes, and clearer activity reporting.

### 1.1.0 — Studio interface

- Added the desktop studio pages for chat, voice, memory, activity, and settings.
- Added image review before analysis and explicit stop/cancel behavior.
