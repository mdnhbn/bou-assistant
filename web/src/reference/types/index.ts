/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type RenderMode = '3d' | '2d';

export type EntityForm = 'orb' | 'female' | 'male';

export type CharacterGender = 'female' | 'male';

export interface CharacterConfig {
  id: CharacterGender;
  name: string;
  codename: string;
  tagline: string;
  avatarUrl: string;
  accentColor: string;
  defaultVoice: string;
  description: string;
  personality: string;
  speakingStyle: string;
  systemPromptSnippet: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  characterId?: CharacterGender;
  audioAmplitude?: number;
}

export interface ApiKeyItem {
  id: string;
  label: string;
  keyMasked: string;
  status: 'active' | 'standby' | 'depleted';
  callsCount: number;
  limit: number;
  addedAt: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  category: 'preference' | 'identity' | 'fact' | 'workflow';
  createdAt: string;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  enabled: boolean;
  category: 'core' | 'communication' | 'productivity' | 'security';
}

export type ThemeId = 'cyan' | 'violet' | 'emerald' | 'amber' | 'crimson';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
}

export type LanguageId = 'bn' | 'en' | 'ar' | 'hi' | 'ur';

export interface LanguageConfig {
  id: LanguageId;
  name: string;
  nativeName: string;
  flag: string;
}

export interface VoiceItem {
  id: string;
  name: string;
  gender: CharacterGender;
  languageId: LanguageId;
  provider: string;
  systemVoiceURI?: string;
  isFallback?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'thinking' | 'done';
  currentTask?: string;
  speechBubble?: string;
  avatarColor: string;
  deskIndex: number;
}

export interface ThreatHeadline {
  id: string;
  headline: string;
  source: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  region: string;
}

export interface StonicWindowState {
  musicPlayer: boolean;
  browser: boolean;
  cameraVision: boolean;
  worldMonitor: boolean;
  coreMemory: boolean;
  skillsModal: boolean;
  whatsappModal: boolean;
}

export type CurrencyCode = 'BDT' | 'PKR' | 'INR' | 'USD';

export interface UserPreferences {
  defaultCurrency: CurrencyCode;
}
