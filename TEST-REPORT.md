# Bou 1.11.0 — validation and scope

Date: 2026-10-29. Windows x64 build, Python 3.11, React interface imported from the user's `bou-ai-interface.zip`.

Verified in this update:
- Strict TypeScript and Vite production build passes with the supplied cockpit UI and bundled Bou/Aether PNG portraits.
- Six native/browser bridge tests pass, including microphone ordering, rapid cancel/restart, injection readiness, speech cancellation and browser fallback.
- Twelve Python host/language tests pass: session authentication, Host/Origin checks, traversal bounds, key-free wellbeing SSE, provider-history normalization with a fake provider, voice stop/restart/session IDs, speech language selection and Whisper/Wispr locale mapping.
- Eleven existing Classic engine/store tests pass.
- Real WebView2 smoke check with a temporary profile passes: eight-step setup renders, skip opens the supplied cockpit, Bou portrait loads, native bridge and local health endpoint return desktop version1.11.0, and no horizontal page overflow occurs at 1280x800. Microphone and speech were disabled in this test profile.
- PyInstaller desktop payload builds successfully with the React UI, Python runtime, pywebview/Python.NET and offline Whisper model. The packaged native app opens a window titled `Bou — AI Assistant 1.11.0`.
- Installer compatibility/component/copy checks pass, including `_internal` layout detection, Yes/No core-upgrade behavior, and temporary dynamic COM shortcut target/argument checks.
- Microsoft's full offline WebView2 installer was downloaded from the official Microsoft endpoint and its Microsoft Authenticode signature validated before bundling.

Limits:
- General Gemini responses are verified with a fake provider, not a live paid API request; no user API credential is included.
- No live microphone capture or speaker-listening verification was performed. Real device permissions, background noise and fallback voice availability vary.
- A clean PC without WebView2 has not been used for this verification; the bundled runtime install path still needs a separate clean-machine acceptance run.
- Browser research, agent execution, camera/browser floating cards, social messaging, market data and satellite panels in the imported cockpit remain clearly marked demo/TODO. Classic tools retains its separate existing capabilities.
- The lazy 3D loader still produces a large-chunk build warning. Two-dimensional portraits are bundled; VRM model files remain user supplied.

## Earlier 1.1 validation record

Date: 2026-10-28
Target: existing Windows Bou Python 3.11 environment.

Implemented:
- Original dark/cyan Tk desktop UI, sidebar, animated orb and 5 functional pages.
- Existing OpenRouter engine integration; per-session credential form.
- Persistent SQLite preferences, saved notes, bounded chat and activity history.
- Explicit local commands and requested browser/app launches.
- Serialized requests, cancel flag, late-response suppression and interrupted-task recovery.
- Voice record / transcript review flow; image selection / preview / AI submission.

Verified:
- 11 automated tests passed.
- All five GUI pages mapped successfully.
- Real local time command produced a rendered response.
- A real, synthetic Bengali prompt received an OpenRouter/Gemini response in the GUI.
- GUI note save and preference save operations succeeded.
- Conversation composer remained visible at 1280x820 and 1100x740.
- Settings scrolls to its lower controls at 1100x740.
- Screenshot review caught and fixed the initial clipped composer.
- No real credential or user database is included in this package.

Test boundaries:
- App launch tests mock process creation; window identity is not verified.
- Cancellation tests mock a late network response. Cancelling cannot undo a launch already sent to Windows, nor guarantee provider billing is cancelled.
- No live microphone recording, speaker playback or model image-analysis test was performed.
- No standalone EXE installer or clean-machine deployment has been verified.
- Existing key.txt remains unchanged; it is not encrypted by this update.
- Original shutdown, always-listening and meeting features are not exposed in Studio.
- The original engine and its existing launcher remain the user's separate files.


Name update: window title, sidebar brand, assistant chat label, launcher, documentation and runtime system prompt now use Bou (বউ). Original engine attribution and stored data locations are retained.
Rename verification: the running window displayed the Bengali name, and a live AI request asking its name returned the Bengali name Bou successfully.
