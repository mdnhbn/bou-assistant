export interface ApiKeySlot { id: string; label: string; maskedKey: string; provider: string; }

const mockKeys: ApiKeySlot[] = [
  { id: "slot-01", label: "Primary demo slot", maskedKey: "•••• •••• •••• 7F2A", provider: "Mock provider" },
  { id: "slot-02", label: "Backup demo slot", maskedKey: "•••• •••• •••• 9C14", provider: "Mock provider" },
];

/** Placeholder keys only; no secret is requested, saved, or used. TODO: Secure user-controlled key storage. */
export function getMockApiKeys(): ApiKeySlot[] { return mockKeys.map((key) => ({ ...key })); }

export function createMockApiKey(label: string): ApiKeySlot {
  return {
    id: "slot-" + Math.random().toString(36).slice(2, 7),
    label: label.trim() || "New demo slot",
    maskedKey: "•••• •••• •••• DEMO",
    provider: "Mock provider",
  };
}

export function deleteMockApiKey(keys: ApiKeySlot[], id: string): ApiKeySlot[] {
  return keys.filter((key) => key.id !== id);
}