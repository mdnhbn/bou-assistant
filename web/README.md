# Bou — local AI voice assistant

Bou is a responsive React + TypeScript interface for a personal assistant. It now has a loopback-only Node brain service, streamed Gemini chat, browser speech recognition, system text-to-speech, VRM/2D character rendering, and prompt-guided specialist skills.

External computer actions are not connected. The assistant cannot browse, click desktop apps, read/write project files, send messages, or execute generated code in this build. Skill cards for those integrations are explicit placeholders.

## Run locally

1. Install Node.js 20.19+ and npm.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Gemini key to the local `.env` file:

   ```dotenv
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.8-flash
   ```

5. Start the Vite UI and local brain together: `npm run dev`.
6. Open the local URL shown in the terminal.

The local brain binds to `127.0.0.1:8787`; Vite proxies `/api` requests to it. The key is read only by Node and is never placed in the browser bundle. `.env` is git-ignored. Do not put a real key in a `VITE_*` variable or commit it.

For a static UI build, run `npm run build`. The local Node service still needs a separate production packaging/deployment plan before the built UI can call it.

## First-run setup

The first visit opens an eight-step local wizard for the welcome checklist, preferred name, language and device voice, character and display mode, theme/accent, greeting preview, demo memory and optional provider status. It does not create an account, activate a subscription, request the microphone, or submit anything. Preferences stay in this browser's local storage. Use **শুরু** in the header to reopen the wizard; use **এখন পরে** to skip. The initial checklist is informational, not a PC scan; the Windows installer handles compatibility and dependency checks.

## Voice and privacy

- Speech recognition uses the browser's Web Speech API, when available, and asks for microphone access after you press the mic button.
- Browser speech recognition may send audio to the browser/platform recognition service. Its network and retention behavior depends on the browser and operating system. Do not use it for sensitive speech until you have reviewed that provider's privacy settings.
- Text-to-speech uses voices installed on the current device. Bou/Aether voice gender matching is best-effort from system voice names; manual selection is available. Voice availability and pronunciation vary by OS, browser, and language. The current waveform/lip-sync amplitude is synthetic (utterance timing), not microphone or speaker audio analysis.
- Assistant replies are sent to Gemini from the local server. Up to the last 20 chat messages are included with each request. The chat itself is currently held in memory and is not stored in a database.

## Characters

Put your VRM models in `public/models`:

- Bou: `public/models/bou.vrm`
- Aether: `public/models/aether.vrm`

Optional 2D portraits:

- `public/models/bou.png`
- `public/models/aether.png`

Missing assets show their expected paths and do not crash the app. In 2D mode, a missing portrait falls back to a captured frame of the matching VRM when available.

## Skills and safety

The enabled Code generation, Code review, Software development, Security review, and Cybersecurity cards currently add focused instruction to Gemini. Cybersecurity guidance is defensive and authorized. They do not run tests, scan a machine, edit files, or execute code.

Browser research, Computer control, Video, WhatsApp, Telegram, and Facebook are connector placeholders. UI toggles do not grant access or run actions. Any future runner should use typed schemas, least privilege, clear previews, user approval for side effects, and an isolated sandbox for generated code. Do not expose unrestricted shell, filesystem, or desktop control directly to the model.

The API key-slot list and automatic-rotation toggle in Settings are demo UI only. The actual Gemini key is the single server-side `GEMINI_API_KEY`; rotation has not been implemented.

## Suggested next steps

1. Add server-side key rotation with a secure local secret store; keep credentials out of React and source control.
2. Add consent-based memory with view, edit, export, and delete controls.
3. Implement code generation and code review workflows against an explicitly selected project, with diff preview and human approval before writes.
4. Add a sandboxed code runner with resource limits and no ambient credentials or network by default.
5. Package a native desktop host (for example, Tauri) for computer-use, with per-action permissions, visible previews, and a stop control.
6. Add browser research using a dedicated connector and cited sources.
7. Add messaging integrations only after explicit account linking and per-message approval.
8. Add adversarial security review and safe evaluation coverage before enabling any tool execution.
9. Package and verify Windows, macOS, Linux, and Android targets separately.

## Project map

- `src/components`: CharacterStage, Character3D, Character2D, OnboardingWizard, ChatPanel, MicButton, StatusBar, SettingsPanel, SkillsPanel, MemoryPanel
- `src/services`: streaming brain client, speech services, memory/API-key placeholders, typed skill catalog and non-executing runner stub
- `src/store`: character, display mode, assistant state, and conversation reducer
- `src/config`: app name, characters, personas, language/speech lists, and browser-local UI preferences
- `server/index.ts`: local-only Gemini streaming endpoint
- `public/models`: user-supplied VRM models and portrait images
