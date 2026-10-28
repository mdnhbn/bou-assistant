# Bou (বউ) 1.1 — validation and scope

Date: 2026-10-28
Target: existing Windows Makima Python 3.11 environment.

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
