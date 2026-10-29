/** The imported interface talks only to the existing loopback provider service. */
import type { ChatMessage, CharacterGender, LanguageId } from '../types';
import { streamBrainReply } from '../../services/brain';
import type { SkillId } from '../../services/skills';

export interface BrainPromptPayload {
  prompt: string;
  characterId: CharacterGender;
  languageId: string;
  conversationHistory?: ChatMessage[];
  enabledSkills?: string[];
  activeMemories?: string[];
  onChunk?: (chunkText: string, fullAccumulatedText: string) => void;
  signal?: AbortSignal;
}
export interface BrainResponse { replyText: string; modelUsed: string; error?: boolean; }
const skillIds: Record<string, SkillId> = { coding: 'codegen', browser: 'browser', cybersecurity: 'cybersecurity', 'code-review': 'code-review', 'software-dev': 'software-dev', 'security-review': 'security-review' };

export async function sendPromptToBrain(payload: BrainPromptPayload): Promise<BrainResponse> {
  const history = [...(payload.conversationHistory ?? [])];
  if (history.at(-1)?.sender !== 'user' || history.at(-1)?.text !== payload.prompt) {
    history.push({ id: 'current-request', sender: 'user', text: payload.prompt, timestamp: '' });
  }
  let text = '';
  try {
    await streamBrainReply({
      messages: history.slice(-20).map((message) => ({ role: message.sender, text: message.text })),
      characterId: payload.characterId === 'male' ? 'aether' : 'bou',
      language: (['bn','en','ar','hi','ur'].includes(payload.languageId) ? payload.languageId : 'bn') as LanguageId,
      enabledSkills: [...new Set((payload.enabledSkills ?? []).map((id) => skillIds[id]).filter((id): id is SkillId => Boolean(id)))],
      signal: payload.signal,
      onToken: (chunk) => { text += chunk; payload.onChunk?.(chunk, text); },
    });
    return { replyText: text, modelUsed: 'server-configured' };
  } catch (error) {
    if (payload.signal?.aborted) throw error;
    return { replyText: error instanceof Error ? error.message : 'AI connection unavailable. Check Settings and the local service.', modelUsed: 'server-configured', error: true };
  }
  // TODO: Connect consented memory retrieval separately; UI memory cards are not prompt instructions.
}
