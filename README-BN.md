# Bou AI Assistant 1.11.1

Bou এখন React character interface-সহ native Windows window-তে খুলবে। Installer-এর মধ্যে built UI, Python, voice package, offline Whisper model এবং Microsoft-এর offline WebView2 installer থাকে; ব্যবহারকারীর আলাদা Node.js/npm/Python লাগবে না। আগের archive, Manager/Worker, camera ও PC-control screen **Classic tools** থেকে খোলা যাবে।

## চালু করা

### লোকাল ডেস্কটপ মোড

[GitHub Releases](https://github.com/mdnhbn/bou-assistant/releases/latest) থেকে `Bou-AI-Assistant-Setup.exe` চালান। Windows 10 1809 বা নতুন / Windows 11 x64 এবং .NET Framework 4.7.2+ লাগবে। Scan report দেখে missing components install করুন। আগে থেকে WebView2 থাকলে reuse হবে; না থাকলে bundled, Microsoft-signed offline package দিয়ে বসবে। WebView2 shared Windows runtime হওয়ায় Bou folder-এর বাইরে থাকবে; Python/voice/UI Bou-র private folder-এ থাকে।

Upgrade-এর সময় changed core app files replace করতে **Yes** দিন। **No** দিলে upgrade cancel হয়ে পুরোনো installation থাকবে; পুরোনো executable/UI-এর সঙ্গে নতুন runtime মেশানো হবে না। Identical dependencies সবসময় skip হবে।

প্রথমবার ৮ ধাপের welcome setup শেষ করুন বা **এখন পরে** চাপুন। Installed voice settings-এ চালু থাকলে (default on) requested Bengali greeting বলার পর local microphone চালু হবে। **Mic** দিয়ে pause/resume এবং **Stop** দিয়ে speech থামান। Windows microphone access ব্যবহারকারীকে allow করতে হবে। Settings-এ নিজের Gemini key save করুন; key Windows Credential Manager-এ থাকবে, browser storage বা installer-এ থাকবে না। “আমি ভালো আছি” key ছাড়াই উত্তর দেয়। Classic tools-এর OpenRouter/service key আলাদা।

Character file রাখুন `%LOCALAPPDATA%\BouStudio\models\characters\`-এ: `bou.vrm`, `aether.vrm`, এবং চাইলে `bou.png`/`aether.png`। ফাইল না থাকলে নির্দেশনা দেখাবে। Whisper microphone audio PC-তেই transcribe করে; সাধারণ AI প্রশ্নের text Gemini-তে যায়। Edge TTS spoken reply text অনলাইনে পাঠায়; Windows speech fallback আছে।

Source থেকে চালাতে Python 3.11+ নিয়ে `Start-Bou.bat` চালান; `web/dist` build না থাকলে launcher-এর Node.js/npm লাগবে। Release installer-এ এই build আগেই থাকে।

### React desktop interface ও browser development

`web/` ফোল্ডারে responsive React + TypeScript UI আছে: Bou/Aether VRM ও 2D portrait mode, loopback-only Node server দিয়ে streamed Gemini chat, browser speech recognition, device text-to-speech, code/review/security guidance skill এবং Stonic-inspired ৮ ধাপের local setup wizard। Wizard-এর নাম, language, voice, character ও display preference browser-এ থাকে; **শুরু** দিয়ে আবার খোলা যায়।

`web/`-এ গিয়ে `npm install` চালান, `.env.example` কপি করে `.env` বানান, তাতে `GEMINI_API_KEY` দিন, তারপর `npm run dev` চালান। আসল key server process-এ থাকে; `VITE_` prefix ব্যবহার বা `.env` commit করবেন না।

Release installer এখন এই built React UI নিয়ে `bou_desktop.py` দিয়ে চলে; local Python host-এ Gemini stream ও native voice যুক্ত। Browser-এর জন্য উপরের npm command-গুলো ব্যবহার করুন। React skill card-গুলো prompt guidance/connector placeholder; archive, workers, camera ও অনুমতিভিত্তিক PC control **Classic tools**-এ আছে। Source-এ `python bou_desktop.py --classic` দিয়েও খোলা যায়। Browser research, social messaging ও arbitrary code execution এখনও TODO।

Web Speech recognition microphone audio browser/platform recognition service-এ পাঠাতে পারে। Setup ও privacy-এর বিস্তারিত `web/README.md`-তে আছে।

## Hosted service মোড

Hosted mode-এ Provider API key ব্যবহারকারীর PC-তে থাকে না; এগুলো server-এ encrypted অবস্থায় থাকে। Server-এ Docker ও Compose দিয়ে service চালান:

1. `.env.example`-এর কপি `.env` নামে তৈরি করুন। `BOU_ADMIN_TOKEN`-এ দীর্ঘ, random admin token দিন।
2. `BOU_MASTER_KEY`-এর জন্য একবার Fernet key তৈরি করুন:

   ```powershell
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

3. `.env` ও master key নিরাপদে ব্যাকআপ করে রাখুন। Master key হারালে সংরক্ষিত Provider key decrypt করা যাবে না।
4. চালান `docker compose up --build`। Compose service-কে localhost-এর `8000` port-এ bind করে। Internet থেকে ব্যবহার করাতে HTTPS reverse proxy ও domain configure করুন।
5. `https://আপনার-ডোমেইন/admin` খুলে admin token দিন। Manager এবং প্রত্যেক Worker-এর জন্য সর্বোচ্চ দশটি OpenRouter key slot, model ও নির্দেশনা সেট করুন।
6. Admin panel থেকে customer তৈরি করে একবার দেখানো access token-টি তাকে দিন। তার Bou app-এ Settings খুলে `service` mode, HTTPS URL ও token বসান।

কোনো key limit-এ পড়লে বা reject হলে Bou ওই agent-এর পরের configured key চেষ্টা করে এবং সফল key-টি মনে রাখে। Manager ও প্রতিটি Worker-এর জন্য আলাদা pool-এ সর্বোচ্চ দশটি key রাখা যায়। সব key unavailable হলে admin panel-এ provider limit বা key status দেখুন। Admin panel কোনো key আবার দেখায় না; বদলাতে নতুন key লিখুন। Key server-এ encrypted থাকে। Customer token revoke/disable করা যায় এবং token database-এ hash হিসেবে থাকে।

`service/data`-কে স্থায়ী server storage-এ রাখতে হবে। বর্তমান package domain/TLS, billing, subscription plans বা production database সেটআপ করে না। এটি service code ও local deployment configuration দেয়; public hosting চালু করতে আপনার server ও domain লাগবে।

## Manager ও Workers

Manager request পড়ে কাজগুলো ভাগ করে এবং enabled Worker-দের আলাদা subtask দেয়। Analyst, Planner ও Reviewer সমান্তরালে কাজ করে; Manager তাদের ফল মিলিয়ে একটি উত্তর তৈরি করে। Manager-এর key slot প্রয়োজন, কারণ সে assignment ও final synthesis দুটোই করে।

`Workers` পেজ থেকে Manager-এর নির্দেশনা, worker-দের নাম ও কাজ এবং mode ঠিক করা যায়:

- `Auto`: বহু ধাপ বা বড় কাজ হলে delegate করে।
- `Always`: সাধারণ chat-ও worker দলকে দেয়।
- `Off`: একক assistant call ব্যবহার করে।

Hosted mode-এ agent, key ও model-এর প্রশাসনিক সেটিংস `/admin` থেকে হয়। Customer-রা কেবল তাদের access token দিয়ে Bou ব্যবহার করে। Delegation-এ একাধিক provider call হওয়ায় token ব্যবহার ও অপেক্ষার সময় বাড়ে। Worker-দের web browsing বা PC control capability নেই।

## Conversation memory ও গোপনীয়তা

সম্পূর্ণ chat archive এই PC-তে `%LOCALAPPDATA%\\BouStudio\\studio.sqlite3`-এ থাকে। AI-কে প্রতিটি request-এ পুরো archive পাঠানো হয় না: `Use conversation memory in AI chats` চালু থাকলে সাম্প্রতিক ও প্রাসঙ্গিক অংশ পাঠানো হয়। Saved notes পাঠাতে আলাদা করে `Use saved notes` চালু করতে হয়। `Memory` পেজ থেকে chat history ও note নিয়ন্ত্রণ করুন।

Hosted service chat transcript নিজে থেকে সংরক্ষণ করে না। তবে যে prompt, নির্বাচিত ছবি এবং settings-এ অনুমোদিত history/notes পাঠানো হয়, তা configured AI provider-এ যায়। Provider-এর নিজস্ব data retention তাদের নীতির ওপর নির্ভর করে। Local mode-এ provider key `key.txt`-এ থাকে; সেটি Git-এ যোগ করা হয় না।

Voice, image analysis, activity log এবং Settings-এর আরও বিবরণ app-এর মধ্যে আছে।

## ক্যামেরা, মাইক্রোফোন ও PC control

`Camera & PC` পেজে **Capture one frame** চাপার পর নিশ্চিত করলেই ক্যামেরা একবার চালু হয়। Bou একটি still frame নিয়ে সঙ্গে সঙ্গে ক্যামেরা বন্ধ করে, ছবিটি local preview-তে দেখায় এবং AI provider-এ পাঠানোর আগে আবার অনুমতি চায়। উত্তরটি দৃশ্যমান, সংবেদনশীল নয় এমন বৈশিষ্ট্য—যেমন পোশাক, চুল, accessories ও ভঙ্গি—নিয়ে হয়; Bou ব্যক্তিকে শনাক্ত করে না। ছবিটি disk-এ লেখা হয় না।

Bou চালু হলে স্বাগত জানায়, তারপর Settings-এ চালু থাকলে live microphone session শুরু করে। GitHub-এর Windows installer-এ multilingual `small` Whisper model আগে থেকেই থাকে; source launcher প্রথমবার model-টি `%LOCALAPPDATA%\BouStudio\models\whisper`-এ download করে। এরপর transcription PC-তেই চলে এবং microphone audio কোনো speech service-এ পাঠায় না। Bou transcript text configured AI provider-এ পাঠিয়ে উত্তর আনে। Settings থেকে Wispr Flow বা Google বেছে নিলে microphone audio ওই service-এ যায়। Header-এর `Mic` বোতামে শোনা থামানো যায়; Bou raw microphone audio save করে না।

Default transcription provider হলো Local Whisper; এর model একবার ডাউনলোডের পর speech recognition offline-এ চলে। Wispr Flow বা Google বেছে নিলে microphone audio সেই cloud service-এ পাঠানো হবে; Wispr-এর জন্য approved API key লাগে। Bou নিজে থেকে cloud transcription-এ fallback করে না।

PC control default-এ বন্ধ এবং শুধু চলতি session-এ চালু হয়। প্রতিটি ধাপের আগে Bou screenshot দেখায়; AI-কে পাঠানোর অনুমতি চাইলে তবেই screenshot পাঠায়। AI একটি click, key, scroll বা text entry প্রস্তাব করে; Bou চালানোর আগে ওই একক action-এর জন্য আলাদা অনুমতি চায়। একটি action চালানোর পর থামে; পরের screenshot আপনি চাইলে তবেই নেয়। Screenshot বা PC task-এর বিবরণ chat archive-এ লেখা হয় না। Password/OTP, payment/কেনাকাটা, message পাঠানো বা প্রকাশ, file deletion, software install, agreement গ্রহণ ও security setting পরিবর্তন Bou block করে—এসব আপনি নিজে করবেন।

## Desktop dashboard

1.5.0-তে public Stonic product-এ দেখা layout থেকে অনুপ্রাণিত হয়ে তিন-কলামের Bou dashboard করা হয়েছে: বামে signal feed, মাঝখানে animated character core ও Agent Town, ডানে Voice/Agent/Notes chat inspector। Today অংশে BBC World-এর public RSS headline দেখায়; শিরোনামে click করলে BBC page খোলে। Search browser-এর result page খোলে—AI নিজে unrestricted web browsing করে না। 2D/3D বোতামটি Bou-র local activity illustration বদলায়, real map নয়; GPS নেওয়া হয় না। Gesture বোতাম character-এর idle animation চালু/বন্ধ করে, camera gesture শনাক্ত করে না। Feed ও chat panel লুকানো/দেখানোর control-ও আছে।

Bou 1.6.0-তে একবারের camera description এবং অনুমোদিত, একবারে এক action-এর PC control যোগ হয়েছে। Bou 1.7.0-তে startup greeting ও configurable live microphone conversation যোগ হয়েছে; camera এখনও একবারের capture, আর continuous screen monitoring নেই। Stonic-এর অন্য যেসব feature এখনও নেই: phone call, ভাসমান character/live wallpaper, নিজস্ব persona, reminder, PDF/document attachment, পুরো visual page তৈরি এবং AI উত্তরের ভেতরে web research। Paid activation-এর ভেতরের Stonic UI পরীক্ষা করা যায়নি; আগের visual comparison public site, changelog, onboarding screen ও Facebook ভিডিওতে দেখা অংশ থেকে নেওয়া।

## Source ও সংস্করণ

মূল desktop assistant, web companion, service, installer ও প্রয়োজনীয় image এই repository-তে আছে। Secret key, `.env`, virtual environment এবং local database Git-এ যোগ হয় না। প্রতিটি GitHub update-এর আগে `VERSION` বাড়ান, installer ও service metadata মিলিয়ে দিন, এবং `CHANGELOG.md` ও এই README-তে serial অনুযায়ী নতুন version-এর feature, ব্যবহারবিধি ও bug-fix লিখুন। Release tag দিলে GitHub Actions নতুন Windows installer বানায়।

## Changelog

### 1.11.1 — Windows model folder path fix

- Windows-এর short folder alias থাকলে valid user portrait 404 দেখাত। Data/model path canonical করে সমস্যাটি ঠিক হয়েছে; regression check যুক্ত হয়েছে।
- 1.11.0-এর installer workflow ওই test-এ থেমেছিল। একই supplied interface ও native feature-এর জন্য 1.11.1 ব্যবহার করুন; চালানোর ধাপ বদলায়নি।

### 1.11.0 — React Windows installer ও native voice

- আপনার দেওয়া `bou-ai-interface.zip`-এর cockpit header, character stage, Agent Town, feed, chat inspector, settings/themes এবং floating demo panel সরাসরি যুক্ত হয়েছে। Bou/Aether portrait bundle হয়েছে; private `.env`, export cache ও reference video বাদ রাখা হয়েছে। এখন imported UI native voice ও secure key adapter দিয়ে চলে।
- React UI Windows executable-এ bundle হয়েছে; installed user-এর আলাদা Node.js লাগবে না। Classic tools button, per-user UI preference এবং native local voice bridge যোগ হয়েছে।
- Offline Whisper-এর বাংলা/English/আরবি/হিন্দি/উর্দু transcription, character/language voice selection, startup greeting ও onboarding-এর পর default microphone auto-start যুক্ত হয়েছে। Mic ও Stop দিয়ে নিয়ন্ত্রণ করুন।
- Settings থেকে Gemini key Windows Credential Manager-এ save/remove করা যায়; installer বা browser storage-এ key থাকে না। Key-free wellbeing reply আছে।
- Signed offline WebView2 package, existing runtime reuse, Windows/.NET preflight এবং React build/test-সহ complete installer workflow যুক্ত হয়েছে।
- **Bug fix:** shortcut তৈরির COM AttributeError, `_internal` folder-এর dependency ভুল classification, disk-space estimate, পুরোনো/নতুন core file মিশে যাওয়া, দ্রুত Mic toggle-এ stale session stop, non-English transcription English হয়ে যাওয়া এবং UI version label ঠিক হয়েছে।
- **ব্যবহার:** setup চালান; upgrade-এ changed core replace করুন; welcome setup finish/skip করুন; Mic ব্যবহার করুন; Settings-এ Gemini key দিন; character files উপরের per-user folder-এ রাখুন।
- **সীমা:** skill connector-গুলো TODO; Classic tools-এর OpenRouter/service setup আলাদা। Model ব্যবহারকারীকে দিতে হবে। এই release শুধু Windows x64 installer দেয়।

### 1.10.2 — Stonic-inspired local setup wizard

- React web companion-এ dark sci-fi theme, ধাপে ধাপে progress, বাম পাশে setup form এবং ডান পাশে Bou/Aether-এর human VRM preview-সহ responsive ৮ ধাপের first-run wizard যোগ হয়েছে।
- নাম, বাংলা/English/আরবি/হিন্দি/উর্দু ভাষা, system voice, character, 2D/3D mode, theme ও accent বেছে নেওয়া যায়। Greeting preview, demo memory এবং optional provider status দেখা যায়।
- পছন্দগুলো শুধু browser-এর local storage-এ থাকে। Header-এর **শুরু** বোতাম দিয়ে wizard আবার খোলা যায়। Login, account activation, payment বা mic prompt নেই; Web companion-এ Mic button চাপলেই microphone permission চাওয়া হয়।
- **Bug fix:** ChatPanel auto-scroll-এর effect return value cleanup হিসেবে ভুল ধরা পড়ত; React development runtime warning বন্ধ করতে effect-টি ঠিক করা হয়েছে।

**ব্যবহার:** `web/`-এ `npm install` ও `npm run dev` চালান। প্রথমবার আটটি ধাপ দেখুন বা **এখন পরে** দিয়ে skip করুন। শেষে **Bou খুলুন** চাপুন। Character file `web/public/models/`-এ রাখুন।

**সীমা:** wizard-এর checklist hardware scan করে না; Windows installer-এর compatibility/dependency scan আগের মতো থাকে। Memory/API slot rotation demo; VRM ও portrait image ব্যবহারকারীকে দিতে হবে।

### 1.10.1 — dependency scan ও নির্বাচিত install

- Setup চালু হলে Windows version ও architecture, CPU, RAM, destination drive-এর free space, microphone input count এবং Bou install folder-এর dependency/model files scan করে। Setup microphone থেকে audio নেয় না; unrelated personal files বা অন্য installed apps-এর তালিকা করে না।
- Python, voice runtime এবং প্রয়োজনীয় app modules private app folder-এ bundle থাকে; system-এর Python/package বদলায় না। Existing folder-এ runtime, voice data, Whisper model ও OpenCV আছে কি না আলাদা করে দেখায়।
- নতুন PC-তে missing Whisper/OpenCV components default-এ selected থাকে; user চাইলে optional Whisper model বা camera support uncheck করতে পারেন। Model বাদ দিলে প্রথম voice use-এ internet থেকে model আনতে হবে; camera support বাদ দিলে camera feature বন্ধ থাকবে।
- Existing files পেলে replacement confirmation আসে। `Yes` changed files update করে; `No` existing files রেখে শুধু missing files যোগ করে। Identical file content সবসময় reuse/skip হয়।
- **Bug fix:** installer আগের version-এ existing Bou folder-এর files সবসময় overwrite করত। এখন system requirements দেখায়, identical dependencies skip করে, এবং update/replace user-এর পছন্দ অনুযায়ী হয়।

**ব্যবহার:** setup-এ destination বাছাই করে `Scan PC` চাপুন, scan report দেখে Whisper/OpenCV checkbox ঠিক করুন, replacement প্রশ্নে update করতে চাইলে `Yes` দিন, তারপর `Install selected` চাপুন।
### 1.10.0 — Windows voice welcome ও key-free প্রথম উত্তর

- App চালু হলে ডিফল্টে শোনা শুরু করার আগে বলে: “হ্যালো, welcome! আমার নাম নাজমুল। নাজমুল, কেমন আছো?”; fresh install-এ spoken greeting ও microphone auto-start দুটোই চালু থাকে। Settings-এর `Mic` button দিয়ে pause/resume করা যায়।
- “আমি ভালো আছি” বা “আমি ভাল আছি” বললে OpenRouter key ছাড়াই Bou বাংলায় মুখে উত্তর দেয়। ইংরেজি “I am good”/“I am fine”-এরও ছোট local reply আছে। AI-র সঙ্গে অন্য কথোপকথনের জন্য নিজের OpenRouter key Settings-এ দিতে হবে।
- `BOU_USER_NAME` environment variable দিয়ে পরের AI কথোপকথনে ব্যবহারকারীর নাম বদলানো যায়; default `Nazmul`। Startup greeting-এ আপাতত নির্দিষ্ট নাজমুল নামটি ব্যবহৃত হয়।
- Installer-এর ভেতরে Python runtime, voice/camera package এবং offline Whisper small model থাকে। Install-এর পরে আলাদা Python বা dependency setup ছাড়াই Windows x64-এ Bou চালু করা যায়। কোনো API key installer-এ থাকে না।
- **Bug fix:** key না থাকলে প্রথম wellbeing response-টি AI provider-এ পাঠিয়ে error দেখাত; এখন এটি local-এ সম্পন্ন হয়। App title, installer ও service version-ও 1.10.0-তে মিলেছে।

**ব্যবহার:** GitHub Releases থেকে `Bou-AI-Assistant-Setup.exe` নামিয়ে চালান, installer-এর `Launch Bou after installation` নির্বাচন রাখুন, Windows-এ microphone access দিন, greeting শুনুন এবং “আমি ভালো আছি” বলুন। পরের সাধারণ AI প্রশ্নের জন্য Settings-এ OpenRouter key যোগ করুন। Local Whisper microphone audio এই PC-তেই transcribe করে; provider-এ transcript text পাঠানো হয়।

**সীমা:** tagged release-এ বর্তমানে Windows x64 installer তৈরি হয়। macOS, Linux বা Android-এর installer এই version-এ নেই। প্রথম অভিবাদন ও wellbeing উত্তর local; অন্য AI উত্তরের জন্য internet connection এবং নিজের OpenRouter key/service access দরকার।

### 1.9.1 — self-contained Windows setup

- আলাদা installer compiler ছাড়াই PyInstaller দিয়ে এক ফাইলের self-extracting Windows setup তৈরি করা যায়।
- User-level install, Start Menu ও desktop shortcut, install-এর পরে চালু করা এবং Windows uninstall entry যোগ হয়েছে।
- Setup `.exe`-র ভেতরে desktop runtime ও offline Whisper model থাকে।

### 1.9.0 — Windows installer, key pool ও assistant preferences

- GitHub Actions দিয়ে Windows x64 setup `.exe` তৈরি ও tagged GitHub Release-এ যুক্ত করার workflow যোগ হয়েছে; Python dependency, OpenCV এবং offline Whisper model installer-এ থাকে।
- Hosted Manager ও প্রত্যেক Worker-এর জন্য encrypted দশটি পর্যন্ত key slot এবং configured key-গুলোর automatic fallback যোগ হয়েছে।
- স্বাভাবিক Bengali-first কথা বলা, এবং Bou-র বাস্তব tool/approval সীমা ঠিকভাবে বোঝানোর persistent assistant instructions যোগ হয়েছে।
- Camera feature-এর dependency OpenCV desktop dependency bundle-এ যোগ হয়েছে।

Windows installer-এর `.exe` [GitHub Releases](https://github.com/mdnhbn/bou-assistant/releases/latest) থেকে নামান। চালু হলে setup Windows version/architecture, CPU, RAM, target disk space, microphone device count এবং Bou install folder scan করে; microphone audio নেয় না এবং unrelated app/personal file inventory করে না। System Python বা global package বদলায় না—runtime Bou-র নিজের install folder-এ থাকে। Existing component দেখায়, identical file skip করে, নতুন file যোগ করে; changed file replace করার আগে জিজ্ঞাসা করে। Whisper/OpenCV checkbox থেকে optional model/camera বাদ দেওয়া যায়। Installer-এ API key, chat archive বা user database থাকে না। Install-এর পর Settings-এ নিজের key দিন; Bou Windows Credential Manager-এ key সংরক্ষণ করে। Installer code-signed নয়।

ChatGPT-এর private model, skills, browser session বা account permission সরাসরি Bou-র memory-তে কপি করা যায় না। Bou-র নিজস্ব live voice, অনুমতি-নেওয়া একবারের camera description এবং এক ধাপ করে PC control আছে; unrestricted browser বা PC access নেই।

### 1.8.1 — Live voice setup ও local transcription

- Saved speech-output preference এখন Bou-র মূল speech engine-এও প্রয়োগ হয়; পুরোনো ও নতুন code path একই preference মানে।
- Edge TTS unavailable হলে startup greeting ও spoken reply-তে আগের Windows speech fallback ফিরে এসেছে।
- Studio launcher এখন প্রথমবার প্রয়োজনীয় microphone ও speech dependencies নিজেই সেটআপ করে।
- Offline Whisper default transcription provider; একবারের model download project-এর বাইরে থাকে এবং microphone audio PC-তেই transcription হয়।
- Wispr Flow ও Google ঐচ্ছিক cloud provider হিসেবে Settings-এ আলাদা করে দেখানো হয়।

### 1.8.0 — Bou নাম ও পরিচ্ছন্ন branding

- Legacy assistant-এর নাম ও source ফাইলের নাম Bou-তে বদলানো হয়েছে; developer attribution সরানো হয়েছে।
- Personal name না থাকলে assistant আর কোনো developer/owner name বানিয়ে বলে না। Meeting mode-এর user name ঐচ্ছিক `BOU_USER_NAME` environment variable দিয়ে সেট করা যায়।
- Local chat database BouStudio folder-এ সরানো হয়েছে; আগের archive রাখা হয়েছে।

### 1.7.0 — Live voice conversation ও Wispr Flow API

- App startup-এ spoken welcome যোগ হয়েছে; `Speak AI replies and startup greeting` থেকে নিয়ন্ত্রণ করা যায়।
- Default-এ app startup-এ live microphone conversation চালু হয়; `Mic` বোতামে যেকোনো সময় pause/resume করা যায়।
- বাক্য শেষ হলে voice activity detection স্বয়ংক্রিয়ভাবে transcription শুরু করে, transcript chat-এ দেখায়, AI-তে পাঠায় এবং উত্তর মুখে বলে। Record/Send চাপা লাগে না।
- Official Wispr Flow Voice Interface API-র REST transcription adapter যোগ হয়েছে; API key Settings থেকে session-এ দেওয়া বা Windows Credential Manager-এ রাখা যায়। API access approval ও usage billing দরকার।
- Google Speech Recognition বিকল্প provider হিসেবে আছে; Wispr key না থাকলে audio কোনো service-এ fallback করে না। Microphone audio Bou-তে save হয় না।

### 1.6.0 — Camera ও confirmed PC control

- একবারের camera still, local preview এবং provider-এ পাঠানোর আগে আলাদা অনুমতি যোগ হয়েছে; পরিচয় বা সংবেদনশীল বৈশিষ্ট্য অনুমান করে না।
- নতুন `Camera & PC` পেজ, session-only PC-control toggle এবং প্রতিটি screenshot share করার আগে approval যোগ হয়েছে।
- AI একবারে একটি click, key, scroll বা text entry প্রস্তাব করে; কাজ করার আগে আলাদা approval নেয় এবং একটি action-এর পর থামে।
- Microphone manual push-to-talk-ই আছে, সর্বোচ্চ ১২ সেকেন্ড এবং transcript review-সহ। Camera frame ও screenshot save হয় না।
- Optional camera package install, hosted service-এ camera/screen-control purpose আলাদা করা এবং README আপডেট হয়েছে।

### 1.5.0 — Stonic-অনুপ্রাণিত desktop dashboard

- Assistant screen-কে signal feed, animated character core, Agent Town এবং Voice/Agent/Notes chat inspector-সহ সাজানো হয়েছে।
- BBC World public RSS headline, browser-এ explicit search, task alert এবং local activity view-এর 2D/3D illustration যোগ হয়েছে।
- Feed/chat panel hide-show control, Agent Town-এ live Manager/worker status, এবং character animation toggle যোগ হয়েছে।
- Bou-র নিজস্ব branding/artwork রাখা হয়েছে। Activity map location নেয় না; Gesture camera ব্যবহার করে না।

### 1.4.0 — Hosted service ও admin panel

- Owner admin panel যোগ হয়েছে: agent role/model/instructions, দুই key slot, customer account তৈরি, disable ও revoke।
- Manager ও প্রতিটি worker-এর encrypted server-side key storage এবং limit হলে fallback key rotation যোগ হয়েছে।
- Hosted API-তে Manager assignment, parallel worker run, final synthesis, customer token authentication যোগ হয়েছে।
- Desktop app-এ service URL/token settings, Docker setup, changelog ու Git secret exclusions যোগ হয়েছে।

### 1.3.0 — Worker manager ও dashboard

- Manager, Analyst, Planner ও Reviewer ভূমিকা এবং Auto/Always/Off routing যোগ হয়েছে।
- Assistant dashboard, animated orb, worker status ও আলাদা studio page যোগ হয়েছে।

### 1.2.0 — Conversation memory

- Chat archive স্থানীয়ভাবে সংরক্ষণ, প্রাসঙ্গিক পুরোনো কথার retrieval এবং saved notes যোগ হয়েছে।

### 1.1.0 — Studio interface

- Assistant, voice, memory, activity ও settings পেজ যোগ হয়েছে। Image analysis-এর আগে preview এবং stop/cancel আচরণ যোগ হয়েছে।
