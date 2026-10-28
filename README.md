# Bou AI Assistant · 1.5.0

Bou is a Windows desktop assistant with local conversation memory and an optional hosted service. Provider API keys stay on the service server; customers connect with individual access tokens.

বাংলায় ব্যবহারবিধি: [README-BN.md](README-BN.md)

## Components

- `makima_studio.py`: Bou desktop interface.
- `studio_engine.py` and `studio_store.py`: local assistant, worker manager, memory, and hosted-service client.
- `service/`: FastAPI service and owner admin panel.
- `service/static/admin.html`: configure agent roles and key pairs, create or revoke customer accounts.

## Desktop dashboard

The 1.5.0 desktop screen uses a three-column layout inspired by the publicly visible Stonic product: a signal feed, Bou's animated character core and Agent Town, and the chat inspector. The feed reads public BBC World RSS headlines and links each headline to its BBC page. Search opens a browser results page; it does not give the AI an unrestricted web browser. The 2D/3D control changes a local activity illustration, not a live geographic map. Bou does not request GPS or camera access. Gesture toggles the character's idle animation; it is not camera-based gesture recognition.

The layout and original Bou artwork are implemented in this project. Stonic release features not included in Bou 1.5.0 include phone calls, floating characters/live wallpaper, screen awareness, custom character personas, reminders, PDF/document attachments, full-page generated visuals, and web research inside AI answers.

## Hosted service setup

1. Copy `.env.example` to `.env` on the server. Set a long random `BOU_ADMIN_TOKEN` and generate `BOU_MASTER_KEY` with:

   ```powershell
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. Keep `.env` and a backup of `BOU_MASTER_KEY` private. Losing the master key makes stored provider keys unreadable.
3. Start the service with `docker compose up --build`.
4. Open `/admin`, enter the admin token, configure two OpenRouter key slots for the Manager and each worker, then create a customer account.
5. In the customer's Bou app, choose **service** mode and enter the HTTPS service URL and customer access token.

Each agent tries its second key when the first is rejected or reaches an OpenRouter limit (HTTP 401, 402, 403, or 429). Keys are encrypted at rest and never returned by the admin API. Customer tokens are stored as hashes and can be disabled or revoked. The hosted service does not save chat transcripts; the desktop app keeps its archive locally and sends only context enabled by the user.

For internet-facing use, place the service behind HTTPS and use persistent server storage for `service/data`. The included Compose file binds to localhost for a reverse proxy; it does not configure a public domain, TLS, billing, or a production database.

## Local mode

Run `Start-Bou.bat` on Windows. Local mode uses the existing OpenRouter key from the local installation. Worker roles and manager instructions can be edited in Bou. The hosted admin key pool is used only when the app is set to service mode.

## Changelog

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
