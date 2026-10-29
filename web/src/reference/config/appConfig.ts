/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CharacterConfig, LanguageConfig, ThemeConfig, VoiceItem, SkillItem, MemoryItem, ApiKeyItem } from '../types';

/**
 * ------------------------------------------------------------------
 * APPLICATION CONFIGURATION
 * Change APP_NAME here to rebrand the entire assistant experience.
 * ------------------------------------------------------------------
 */
export { APP_NAME, APP_VERSION } from '../../config/app';

export const CHARACTERS: Record<'female' | 'male', CharacterConfig> = {
  female: {
    id: 'female',
    name: 'Bou',
    codename: 'BOU-UNIT-07',
    tagline: 'Empathetic Neural Synapse',
    avatarUrl: '/models/bou.png',
    accentColor: '#06b6d4',
    defaultVoice: 'voice-bou-neural',
    description: 'উষ্ণ, সহানুভূতিশীল, মনোযোগী ও মানবিক সংবেদনশীল এআই সঙ্গী।',
    personality: 'উষ্ণ, সহানুভূতিশীল, মনোযোগী, নরম সুরে কথা বলে। (Warm, deeply empathetic, attentive, gentle, caring, and encouraging. Listens deeply and responds with emotional resonance.)',
    speakingStyle: 'নরম, আন্তরিক ও সাবলীল সুর। সহজে বোধগম্য ও উষ্ণ ভাষা ব্যবহার করে। (Soft-spoken, warm, conversational, articulate, and soothing. Never robotic or cold.)',
    systemPromptSnippet: 'You are Bou, a warm, gentle, deeply attentive, and empathetic female AI assistant. Speak with kindness, soothing clarity, and emotional insight. Listen carefully and comfort or guide the user thoughtfully.'
  },
  male: {
    id: 'male',
    name: 'Aether',
    codename: 'AETHER-PRIME',
    tagline: 'Strategic Analytical Core',
    avatarUrl: '/models/aether.png',
    accentColor: '#f59e0b',
    defaultVoice: 'voice-aether-quantum',
    description: 'বিশ্লেষণধর্মী, গোছানো, সরাসরি ও সংক্ষিপ্ত স্ট্র্যাটেজিক এআই কোর।',
    personality: 'বিশ্লেষণধর্মী, গোছানো, সরাসরি ও সংক্ষিপ্ত কথা বলে। (Analytical, highly structured, disciplined, sharp, direct, and concise. Values logic, clarity, and precision.)',
    speakingStyle: 'সরাসরি, স্পষ্ট, সুনির্দিষ্ট ও সংক্ষিপ্ত কথা। অতিরিক্ত বাহুল্য বর্জন করে কাজের কথা বলা। (Direct, crisp, structured, executive, and concise. Cuts straight to actionable points without fluff.)',
    systemPromptSnippet: 'You are Aether, an analytical, strategic, and direct male AI assistant core. Deliver concise, well-structured, logical solutions. Be precise and get straight to the point with sharp discipline.'
  }
};

export const THEMES: ThemeConfig[] = [
  {
    id: 'cyan',
    name: 'Cyber Cyan (Default)',
    primary: '#06b6d4',
    secondary: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.45)'
  },
  {
    id: 'violet',
    name: 'Neon Violet',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    glow: 'rgba(139, 92, 246, 0.45)'
  },
  {
    id: 'emerald',
    name: 'Matrix Emerald',
    primary: '#10b981',
    secondary: '#059669',
    glow: 'rgba(16, 185, 129, 0.45)'
  },
  {
    id: 'amber',
    name: 'Solar Amber',
    primary: '#f59e0b',
    secondary: '#d97706',
    glow: 'rgba(245, 158, 11, 0.45)'
  },
  {
    id: 'crimson',
    name: 'Pulse Crimson',
    primary: '#f43f5e',
    secondary: '#e11d48',
    glow: 'rgba(244, 63, 94, 0.45)'
  }
];

export const LANGUAGES: LanguageConfig[] = [
  { id: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { id: 'bn', name: 'Bangla', nativeName: 'বাংলা (বাংলাদেশ)', flag: '🇧🇩' },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { id: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' }
];

export const VOICES: VoiceItem[] = [
  { id: 'voice-bou-neural', name: 'Bou Neural HD (Natural / Warm)', gender: 'female', languageId: 'en', provider: 'Mock Neural TTS' },
  { id: 'voice-bou-bn', name: 'Bou Bangla Expressive (বাংলা)', gender: 'female', languageId: 'bn', provider: 'Mock Bengali TTS' },
  { id: 'voice-aether-quantum', name: 'Aether Quantum Crisp (Deep / Direct)', gender: 'male', languageId: 'en', provider: 'Mock Quantum TTS' },
  { id: 'voice-aether-bn', name: 'Aether Bangla Precision (বাংলা)', gender: 'male', languageId: 'bn', provider: 'Mock Bengali TTS' },
  { id: 'voice-bou-ar', name: 'Bou Noor Arabic (العربية)', gender: 'female', languageId: 'ar', provider: 'Mock Arabic TTS' },
  { id: 'voice-aether-hi', name: 'Aether Akash Hindi (हिन्दी)', gender: 'male', languageId: 'hi', provider: 'Mock Hindi TTS' },
  { id: 'voice-bou-ur', name: 'Bou Shama Urdu (اردو)', gender: 'female', languageId: 'ur', provider: 'Mock Urdu TTS' }
];

export const INITIAL_SKILLS: SkillItem[] = [
  {
    id: 'browser',
    name: 'Web Browser & Research',
    description: 'Autonomous web navigation, data extraction, and deep research summaries.',
    iconName: 'Globe',
    enabled: true,
    category: 'core'
  },
  {
    id: 'coding',
    name: 'Coding & Debugging Engine',
    description: 'Full-stack software architecture, refactoring, and real-time syntax checking.',
    iconName: 'Code2',
    enabled: true,
    category: 'core'
  },
  {
    id: 'video',
    name: 'Video & Audio Synthesis',
    description: 'Video analysis, frame extraction, and automated speech-to-video editing.',
    iconName: 'Video',
    enabled: false,
    category: 'productivity'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Automation',
    description: 'Message drafting, smart reply suggestions, and contact sync integration.',
    iconName: 'MessageSquare',
    enabled: true,
    category: 'communication'
  },
  {
    id: 'telegram',
    name: 'Telegram Bot Bridge',
    description: 'Encrypted channel dispatching, group monitoring, and instant alerts.',
    iconName: 'Send',
    enabled: false,
    category: 'communication'
  },
  {
    id: 'facebook',
    name: 'Facebook & Social Graph',
    description: 'Social stream monitoring, audience insights, and scheduled broadcasts.',
    iconName: 'Share2',
    enabled: false,
    category: 'communication'
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Vault',
    description: 'API key leak protection, local prompt isolation, and threat telemetry.',
    iconName: 'ShieldAlert',
    enabled: true,
    category: 'security'
  }
];

export const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    text: 'Prefers concise, actionable answers without unnecessary conversational filler.',
    category: 'preference',
    createdAt: '2026-10-24 10:15'
  },
  {
    id: 'mem-2',
    text: 'Working on full-stack React and AI architecture; comfortable with modern TypeScript.',
    category: 'identity',
    createdAt: '2026-10-25 14:30'
  },
  {
    id: 'mem-3',
    text: 'Requested bilingual voice capability supporting Bangla and English.',
    category: 'preference',
    createdAt: '2026-10-26 09:00'
  },
  {
    id: 'mem-4',
    text: 'Favorite dark sci-fi UI palette is Cyber Cyan with high contrast typography.',
    category: 'workflow',
    createdAt: '2026-10-27 16:45'
  }
];

export const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 'key-1',
    label: 'Primary Gemini Flash Pool',
    keyMasked: 'AIzaSy...7Xk9',
    status: 'active',
    callsCount: 1420,
    limit: 5000,
    addedAt: '2026-10-20'
  },
  {
    id: 'key-2',
    label: 'Backup High-Rate Slot',
    keyMasked: 'AIzaSy...m3P2',
    status: 'standby',
    callsCount: 180,
    limit: 2500,
    addedAt: '2026-10-22'
  },
  {
    id: 'key-3',
    label: 'Experimental Voice Pipeline',
    keyMasked: 'sk_live_...9f41',
    status: 'standby',
    callsCount: 42,
    limit: 1000,
    addedAt: '2026-10-25'
  }
];

export const INITIAL_MESSAGES = [
  {
    id: 'msg-1',
    sender: 'assistant' as const,
    text: "Neural matrix online. I am Bou, your adaptive voice intelligence. All visual systems, 3D character stages, and mock service stubs are operational.",
    timestamp: '10:42 PM'
  },
  {
    id: 'msg-2',
    sender: 'user' as const,
    text: "Initialize diagnostic check. How are the lip-sync and audio visualizers calibrated?",
    timestamp: '10:43 PM'
  },
  {
    id: 'msg-3',
    sender: 'assistant' as const,
    text: "Calibrated to amplitude spectrum mock hooks. Switch my state between Idle, Listening, Thinking, and Speaking to test the visual pulse and jaw displacement.",
    timestamp: '10:43 PM'
  }
];
