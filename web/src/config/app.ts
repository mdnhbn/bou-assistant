export const APP_NAME = "Bou";
export const APP_VERSION = "1.11.1";
export const WEB_VERSION = "0.4.1";

export type CharacterId = "bou" | "aether";
export type DisplayMode = "3d" | "2d";

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  modelPath: string;
  imagePath: string;
  tint: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  bou: {
    id: "bou",
    name: "Bou",
    title: "Your mindful companion",
    description: "Warm, curious, and always here to listen.",
    modelPath: "/models/bou.vrm",
    imagePath: "/models/bou.png",
    tint: "#96f4d7",
  },
  aether: {
    id: "aether",
    name: "Aether",
    title: "Your thoughtful guide",
    description: "Clear-minded, calm, and ready to explore.",
    modelPath: "/models/aether.vrm",
    imagePath: "/models/aether.png",
    tint: "#a9baff",
  },
};

export const CHARACTER_PERSONAS: Record<CharacterId, string> = {
  bou: "Speak with warmth, empathy, intuition, and gentle curiosity. Be conversational and emotionally attentive without pretending to have feelings or personal memories you do not have.",
  aether: "Speak with calm precision, analytical thinking, and concise strategic clarity. Be direct without sounding cold or overconfident.",
};

export const LANGUAGES = [
  { id: "bn", label: "বাংলা", nativeName: "বাংলা", speechCode: "bn-BD" },
  { id: "en", label: "English", nativeName: "English", speechCode: "en-US" },
  { id: "ar", label: "العربية", nativeName: "العربية", speechCode: "ar-SA" },
  { id: "hi", label: "हिन्दी", nativeName: "हिन्दी", speechCode: "hi-IN" },
  { id: "ur", label: "اردو", nativeName: "اردو", speechCode: "ur-PK" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];
export const VOICE_PLACEHOLDERS = ["System voice · automatic"] as const;
