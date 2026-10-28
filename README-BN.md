# Bou AI Assistant 1.8.1

Bou হলো Windows desktop AI assistant, সঙ্গে conversation memory, Manager ও Worker দল, এবং বিক্রির জন্য ব্যবহারকারীভিত্তিক hosted service। Assistant-এর source, service, admin panel ও changelog এই repository-তে রাখা হয়।

## চালু করা

### লোকাল ডেস্কটপ মোড

Windows-এ `Start-Bou.bat` চালান। প্রথমবার এটি প্রয়োজন হলে `.venv` বানিয়ে `requirements.txt` থেকে microphone, speech ও desktop package ইনস্টল করবে। Camera feature-এর OpenCV package না থাকলে launcher সেটি ইনস্টল করবে। Settings-এ `Assistant connection` হিসেবে `local` রাখুন। লোকাল মোডে সব AI call আপনার বিদ্যমান একক OpenRouter key দিয়ে হয়।

### Hosted service মোড

Hosted mode-এ Provider API key ব্যবহারকারীর PC-তে থাকে না; এগুলো server-এ encrypted অবস্থায় থাকে। Server-এ Docker ও Compose দিয়ে service চালান:

1. `.env.example`-এর কপি `.env` নামে তৈরি করুন। `BOU_ADMIN_TOKEN`-এ দীর্ঘ, random admin token দিন।
2. `BOU_MASTER_KEY`-এর জন্য একবার Fernet key তৈরি করুন:

   ```powershell
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

3. `.env` ও master key নিরাপদে ব্যাকআপ করে রাখুন। Master key হারালে সংরক্ষিত Provider key decrypt করা যাবে না।
4. চালান `docker compose up --build`। Compose service-কে localhost-এর `8000` port-এ bind করে। Internet থেকে ব্যবহার করাতে HTTPS reverse proxy ও domain configure করুন।
5. `https://আপনার-ডোমেইন/admin` খুলে admin token দিন। Manager এবং প্রত্যেক Worker-এর জন্য আলাদা করে দুইটি OpenRouter key slot, model ও নির্দেশনা সেট করুন।
6. Admin panel থেকে customer তৈরি করে একবার দেখানো access token-টি তাকে দিন। তার Bou app-এ Settings খুলে `service` mode, HTTPS URL ও token বসান।

Key slot 1 limit বা rejection পেলে সংশ্লিষ্ট agent slot 2 চেষ্টা করে; পরের সফল request-এর জন্য সক্রিয় slot মনে রাখে। এটি Manager ও প্রতিটি Worker-এর জন্য আলাদা। দুটো key-ই unavailable হলে admin panel-এ key বা provider limit দেখুন। Admin panel কোনো key আবার দেখায় না; বদলাতে নতুন key লিখুন। Customer token revoke/disable করা যায় এবং token database-এ hash হিসেবে থাকে।

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

Bou চালু হলে স্বাগত জানায়, তারপর Settings-এ চালু থাকলে live microphone session শুরু করে। Default Local Whisper প্রথমবার চালু হলে multilingual `small` model (প্রায় 500 MB) `%LOCALAPPDATA%\BouStudio\models\whisper`-এ download করে; এরপর transcription PC-তেই চলে এবং microphone audio কোনো speech service-এ পাঠায় না। Bou transcript text configured AI provider-এ পাঠিয়ে উত্তর আনে। Settings থেকে Wispr Flow বা Google বেছে নিলে microphone audio ওই service-এ যায়। Header-এর `Mic` বোতামে শোনা থামানো যায়; Bou raw microphone audio save করে না।

Default transcription provider হলো Local Whisper; এর model একবার ডাউনলোডের পর speech recognition offline-এ চলে। Wispr Flow বা Google বেছে নিলে microphone audio সেই cloud service-এ পাঠানো হবে; Wispr-এর জন্য approved API key লাগে। Bou নিজে থেকে cloud transcription-এ fallback করে না।

PC control default-এ বন্ধ এবং শুধু চলতি session-এ চালু হয়। প্রতিটি ধাপের আগে Bou screenshot দেখায়; AI-কে পাঠানোর অনুমতি চাইলে তবেই screenshot পাঠায়। AI একটি click, key, scroll বা text entry প্রস্তাব করে; Bou চালানোর আগে ওই একক action-এর জন্য আলাদা অনুমতি চায়। একটি action চালানোর পর থামে; পরের screenshot আপনি চাইলে তবেই নেয়। Screenshot বা PC task-এর বিবরণ chat archive-এ লেখা হয় না। Password/OTP, payment/কেনাকাটা, message পাঠানো বা প্রকাশ, file deletion, software install, agreement গ্রহণ ও security setting পরিবর্তন Bou block করে—এসব আপনি নিজে করবেন।

## Desktop dashboard

1.5.0-তে public Stonic product-এ দেখা layout থেকে অনুপ্রাণিত হয়ে তিন-কলামের Bou dashboard করা হয়েছে: বামে signal feed, মাঝখানে animated character core ও Agent Town, ডানে Voice/Agent/Notes chat inspector। Today অংশে BBC World-এর public RSS headline দেখায়; শিরোনামে click করলে BBC page খোলে। Search browser-এর result page খোলে—AI নিজে unrestricted web browsing করে না। 2D/3D বোতামটি Bou-র local activity illustration বদলায়, real map নয়; GPS নেওয়া হয় না। Gesture বোতাম character-এর idle animation চালু/বন্ধ করে, camera gesture শনাক্ত করে না। Feed ও chat panel লুকানো/দেখানোর control-ও আছে।

Bou 1.6.0-তে একবারের camera description এবং অনুমোদিত, একবারে এক action-এর PC control যোগ হয়েছে। Bou 1.7.0-তে startup greeting ও configurable live microphone conversation যোগ হয়েছে; camera এখনও একবারের capture, আর continuous screen monitoring নেই। Stonic-এর অন্য যেসব feature এখনও নেই: phone call, ভাসমান character/live wallpaper, নিজস্ব persona, reminder, PDF/document attachment, পুরো visual page তৈরি এবং AI উত্তরের ভেতরে web research। Paid activation-এর ভেতরের Stonic UI পরীক্ষা করা যায়নি; আগের visual comparison public site, changelog, onboarding screen ও Facebook ভিডিওতে দেখা অংশ থেকে নেওয়া।

## Source ও সংস্করণ

মূল desktop assistant এবং নতুন Bou interface-এর source, service code, Docker configuration, admin UI ও প্রয়োজনীয় image এই repository-তে রাখা হয়। Secret key, `.env`, Python virtual environment, local database ও generated install flags `.gitignore` দিয়ে বাদ দেওয়া হয়। প্রতিটি release-এ সংস্করণ বাড়িয়ে এই README-এর Changelog-এ কী বদলেছে তা লিখুন।

## Changelog

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
