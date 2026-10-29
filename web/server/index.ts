import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { GoogleGenAI } from "@google/genai";
import { APP_NAME, CHARACTER_PERSONAS, LANGUAGES, type CharacterId, type LanguageId } from "../src/config/app";
import { getEnabledSkillGuidance, type SkillId } from "../src/services/skills";

const host = "127.0.0.1";
const port = Number(process.env.BRAIN_PORT || 8787);
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const allowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

interface ChatTurn { role: "user" | "assistant"; text: string; }
interface ChatPayload {
  messages: ChatTurn[];
  characterId: CharacterId;
  language: LanguageId;
  enabledSkills: SkillId[];
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    let oversized = false;
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 1_000_000) oversized = true;
    });
    request.on("end", () => {
      if (oversized) { reject(new Error("payload_too_large")); return; }
      try { resolve(JSON.parse(body)); } catch { reject(new Error("invalid_json")); }
    });
    request.on("error", reject);
  });
}

function isLanguage(value: unknown): value is LanguageId {
  return LANGUAGES.some((language) => language.id === value);
}

function validatePayload(value: unknown): ChatPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<ChatPayload>;
  if (payload.characterId !== "bou" && payload.characterId !== "aether") return null;
  if (!isLanguage(payload.language) || !Array.isArray(payload.messages)) return null;
  if (!Array.isArray(payload.enabledSkills)) return null;
  const messages = payload.messages.slice(-20);
  if (messages.length === 0 || messages.some((message) =>
    !message || (message.role !== "user" && message.role !== "assistant")
    || typeof message.text !== "string" || message.text.length > 8_000)) return null;
  return {
    characterId: payload.characterId,
    language: payload.language,
    messages,
    enabledSkills: payload.enabledSkills.filter((id): id is SkillId => typeof id === "string"),
  };
}

function systemInstruction(payload: ChatPayload): string {
  const languageName = LANGUAGES.find((item) => item.id === payload.language)?.nativeName ?? "the user's language";
  const enabledSkillGuidance = getEnabledSkillGuidance(payload.enabledSkills);
  return [
    "You are " + APP_NAME + ", a local personal AI assistant.",
    "Character persona: " + CHARACTER_PERSONAS[payload.characterId],
    "Reply in " + languageName + " when the user writes in that language. If the user naturally code-switches, follow their mix.",
    "Use the last messages as this conversation's context. Do not claim long-term memory; memory storage is not connected yet.",
    "Available skills currently provide instruction only. No browser, computer, filesystem, messaging, or code-execution tool is connected.",
    "For code requests, produce readable code and explain assumptions. For code reviews, prioritize correctness, security, and actionable findings.",
    "For cybersecurity, provide defensive, authorized, bounded guidance. Do not provide malware, credential theft, unauthorized access, evasion, or exploitation instructions.",
    "Do not claim to have performed external or computer actions. Ask for explicit approval before a future integration performs any side effect.",
    "Future memory context placeholder: [No saved memories are connected.]",
    "Future tool/function calling placeholder: [No external skills are executable in this version.]",
    enabledSkillGuidance,
  ].filter(Boolean).join("\n\n");
}

function errorCode(error: unknown): string {
  const item = error as { status?: number; code?: number | string; message?: string };
  const status = Number(item?.status ?? item?.code);
  if (status === 429 || /resource_exhausted|quota/i.test(item?.message ?? "")) return "quota";
  if (status === 401 || status === 403) return "provider_auth";
  return "provider_error";
}

function sendEvent(response: ServerResponse, value: unknown) {
  if (!response.destroyed && !response.writableEnded) response.write("data: " + JSON.stringify(value) + "\n\n");
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    json(response, 403, { error: "origin_not_allowed" });
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    json(response, 200, { provider: "gemini", configured: Boolean(process.env.GEMINI_API_KEY), model });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/chat") {
    json(response, 404, { error: "not_found" });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    json(response, 503, { error: "missing_key" });
    return;
  }

  try {
    const payload = validatePayload(await readBody(request));
    if (!payload) {
      json(response, 400, { error: "invalid_request" });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const contents = payload.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    }));
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction: systemInstruction(payload), maxOutputTokens: 2_048 },
    });

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    for await (const chunk of stream) {
      if (chunk.text) sendEvent(response, { type: "delta", text: chunk.text });
    }
    sendEvent(response, { type: "done" });
    response.end();
  } catch (error) {
    const code = errorCode(error);
    if (response.headersSent) {
      sendEvent(response, { type: "error", code });
      response.end();
    } else {
      json(response, code === "quota" ? 429 : code === "provider_auth" ? 401 : 502, { error: code });
    }
  }
});

server.listen(port, host, () => {
  process.stdout.write("Bou local brain listening at http://" + host + ":" + port + "\n");
});
