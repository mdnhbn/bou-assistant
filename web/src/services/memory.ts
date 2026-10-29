export interface MemoryItem { id: string; text: string; category: string; }

const mockMemories: MemoryItem[] = [
  { id: "m1", text: "তুমি ছোট ও পরিষ্কার উত্তর পছন্দ করো।", category: "পছন্দ" },
  { id: "m2", text: "তুমি বাংলা ও English—দুই ভাষাতেই কথা বলো।", category: "ভাষা" },
  { id: "m3", text: "তুমি নতুন আইডিয়া নিয়ে ভাবতে ভালোবাসো।", category: "আগ্রহ" },
];

/** TODO: Replace in-memory mock data with user-controlled, private persistence. */
export function getMockMemories(): MemoryItem[] { return mockMemories.map((item) => ({ ...item })); }

/** TODO: Add consent and retention controls before persisting memory. */
export function deleteMockMemory(memoryId: string): MemoryItem[] {
  return mockMemories.filter((item) => item.id !== memoryId);
}