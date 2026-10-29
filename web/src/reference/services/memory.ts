import type { MemoryItem } from '../types';
const STORAGE = 'bou.reference.memory-cards.v1';
const examples: MemoryItem[] = [
  { id: 'sample-language', text: 'DEMO: বাংলা ও English conversation preference.', category: 'preference', createdAt: 'Sample' },
  { id: 'sample-theme', text: 'DEMO: Dark sci-fi interface with a cyan accent.', category: 'workflow', createdAt: 'Sample' },
];

/** Local notes are editable UI data; TODO: connect consented memory retrieval to the brain. */
export async function getMemories(): Promise<MemoryItem[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
    if (Array.isArray(parsed)) return parsed.filter((item): item is MemoryItem => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.text === 'string'));
  } catch { /* Missing or unavailable storage uses sample cards. */ }
  return examples.map((item) => ({ ...item }));
}
export async function saveMemory(text: string, category: MemoryItem['category'] = 'fact'): Promise<MemoryItem> {
  const item: MemoryItem = { id: `memory-${Date.now()}`, text: text.trim().slice(0, 4000), category, createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  const current = await getMemories();
  localStorage.setItem(STORAGE, JSON.stringify([item, ...current]));
  return item;
}
export async function deleteMemory(id: string): Promise<boolean> {
  const current = await getMemories();
  localStorage.setItem(STORAGE, JSON.stringify(current.filter((item) => item.id !== id)));
  return true;
}
