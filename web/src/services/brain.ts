import type { CharacterId, LanguageId } from "../config/app";
import type { ChatMessage } from "../store/types";
import type { SkillId } from "./skills";

export interface BrainRequest {
  messages: Pick<ChatMessage, "role" | "text">[];
  characterId: CharacterId;
  language: LanguageId;
  enabledSkills: SkillId[];
  onToken: (text: string) => void;
  signal?: AbortSignal;
}

export class BrainError extends Error {
  public readonly code: "missing_key" | "quota" | "network" | "provider_auth" | "provider_error";
  constructor(code: "missing_key" | "quota" | "network" | "provider_auth" | "provider_error", message: string) {
    super(message);
    this.code = code;
    this.name = "BrainError";
  }
}

function serverMessage(code: string): BrainError {
  if (code === "missing_key") return new BrainError("missing_key", "Gemini key পাওয়া যায়নি। local .env ফাইলে GEMINI_API_KEY যোগ করে server আবার চালাও।");
  if (code === "quota") return new BrainError("quota", "Gemini API quota শেষ হয়েছে। পরে আবার চেষ্টা করো; key rotation এখনো যুক্ত হয়নি।");
  if (code === "provider_auth") return new BrainError("provider_auth", "Gemini key কাজ করছে না বা অনুমতি নেই। local .env-এর key যাচাই করো।");
  return new BrainError("provider_error", "Gemini থেকে উত্তর আনা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করো।");
}

/** Calls the loopback-only server and streams typed text deltas into the chat UI. */
export async function streamBrainReply(request: BrainRequest): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: request.messages.slice(-20),
        characterId: request.characterId,
        language: request.language,
        enabledSkills: request.enabledSkills,
      }),
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal?.aborted) throw error;
    throw new BrainError("network", "Local brain server-এ পৌঁছানো যাচ্ছে না। npm run dev দিয়ে চালু আছে কি দেখো।");
  }

  if (!response.ok) {
    let code = "provider_error";
    try { code = String((await response.json() as { error?: string }).error ?? code); } catch { /* Keep the safe fallback. */ }
    throw serverMessage(code);
  }
  if (!response.body) throw new BrainError("provider_error", "এই browser-এ streamed response পড়া যাচ্ছে না।");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let completed = false;

  function handleEvent(block: string) {
    const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data) return;
    const event = JSON.parse(data) as { type?: string; text?: string; code?: string };
    if (event.type === "delta" && event.text) request.onToken(event.text);
    if (event.type === "error") throw serverMessage(event.code ?? "provider_error");
    if (event.type === "done") completed = true;
  }

  try {
    while (!completed) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let boundary = pending.indexOf("\n\n");
      while (boundary >= 0) {
        const block = pending.slice(0, boundary);
        pending = pending.slice(boundary + 2);
        handleEvent(block);
        boundary = pending.indexOf("\n\n");
      }
    }
    if (pending.trim()) handleEvent(pending);
    if (!completed) throw new BrainError("provider_error", "Gemini stream মাঝপথে বন্ধ হয়ে গেছে। আবার চেষ্টা করো।");
  } finally {
    reader.releaseLock();
  }
}
