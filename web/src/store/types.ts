import type { CharacterId, DisplayMode } from "../config/app";

export type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export interface AssistantState {
  characterId: CharacterId;
  mode: DisplayMode;
  status: AssistantStatus;
  messages: ChatMessage[];
}

export type AssistantAction =
  | { type: "set-character"; characterId: CharacterId }
  | { type: "set-mode"; mode: DisplayMode }
  | { type: "set-status"; status: AssistantStatus }
  | { type: "add-message"; message: ChatMessage }
  | { type: "update-message"; id: string; text: string }
  | { type: "clear-messages" };
