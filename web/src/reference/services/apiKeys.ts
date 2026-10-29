/** Real desktop credentials stay in Windows Credential Manager; browser slots are UI demos. */
import type { ApiKeyItem } from '../types';
import { getDesktopApi } from '../../services/desktop';

const AUTO_SWITCH_KEY = 'bou.reference.auto-rotation-ui.v1';
let demoKeys: ApiKeyItem[] = [{ id: 'demo-primary', label: 'DEMO Primary slot', keyMasked: '••••••••', status: 'standby', callsCount: 0, limit: 0, addedAt: 'Demo' }];
const nativeSlot = (): ApiKeyItem => ({ id: 'native-gemini', label: 'Gemini Windows vault', keyMasked: '•••••••• · securely stored', status: 'active', callsCount: 0, limit: 0, addedAt: 'Windows Credential Manager' });

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  const api = getDesktopApi();
  if (api) return (await api.get_status()).configured ? [nativeSlot()] : [];
  return demoKeys.map((key) => ({ ...key }));
}
export async function getActiveApiKey(): Promise<ApiKeyItem | null> { return (await getApiKeys()).find((key) => key.status === 'active') ?? null; }
export async function addApiKey(label: string, rawKey: string): Promise<ApiKeyItem[]> {
  const api = getDesktopApi();
  if (api) {
    const result = await api.set_api_key(rawKey.trim());
    if (!result.configured || !result.persisted) throw new Error('The key could not be saved to Windows Credential Manager.');
    return [nativeSlot()];
  }
  // TODO: Browser key configuration stays server-side. Keep only a label for this demo control.
  demoKeys = [...demoKeys, { id: `demo-${Date.now()}`, label: `DEMO ${label.trim() || 'slot'}`, keyMasked: '•••••••• · UI placeholder', status: 'standby', callsCount: 0, limit: 0, addedAt: 'Demo' }];
  return getApiKeys();
}
export async function removeApiKey(id: string): Promise<ApiKeyItem[]> {
  const api = getDesktopApi();
  if (api) {
    if (id === 'native-gemini') await api.set_api_key('');
    return getApiKeys();
  }
  demoKeys = demoKeys.filter((key) => key.id !== id);
  return getApiKeys();
}
export async function setActiveApiKey(id: string): Promise<ApiKeyItem[]> {
  if (getDesktopApi()) return getApiKeys();
  demoKeys = demoKeys.map((key) => ({ ...key, status: key.id === id ? 'active' : 'standby' }));
  return getApiKeys();
}
export function getAutoSwitchPreference(): boolean {
  try { return localStorage.getItem(AUTO_SWITCH_KEY) === 'true'; } catch { return false; }
}
export function setAutoSwitchPreference(enabled: boolean): void {
  // TODO: Add server-side key pools; this preference currently changes only the UI toggle.
  try { localStorage.setItem(AUTO_SWITCH_KEY, String(enabled)); } catch { /* Session preference remains usable. */ }
}
