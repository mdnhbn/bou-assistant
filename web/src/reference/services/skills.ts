import type { SkillItem } from '../types';
const STORAGE = 'bou.reference.skills-ui.v1';
const catalog: SkillItem[] = [
  { id: 'browser', name: 'Web Browser & Research', description: 'TODO connector · browser/research preview only.', iconName: 'Globe', enabled: false, category: 'core' },
  { id: 'coding', name: 'Coding & Debugging Guidance', description: 'Code generation guidance; no file writes or execution.', iconName: 'Code2', enabled: true, category: 'core' },
  { id: 'code-review', name: 'Code Review', description: 'Review supplied code with actionable text findings.', iconName: 'Code2', enabled: true, category: 'core' },
  { id: 'software-dev', name: 'Software Development', description: 'Architecture and implementation guidance.', iconName: 'Code2', enabled: true, category: 'core' },
  { id: 'video', name: 'Video & Audio', description: 'TODO connector · media actions are a UI preview.', iconName: 'Video', enabled: false, category: 'productivity' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'TODO connector · no account or messages connected.', iconName: 'MessageSquare', enabled: false, category: 'communication' },
  { id: 'telegram', name: 'Telegram', description: 'TODO connector · no bot or messages connected.', iconName: 'Send', enabled: false, category: 'communication' },
  { id: 'facebook', name: 'Facebook', description: 'TODO connector · no social account connected.', iconName: 'Share2', enabled: false, category: 'communication' },
  { id: 'cybersecurity', name: 'Cybersecurity Guidance', description: 'Defensive, authorized security guidance; no active scan.', iconName: 'ShieldAlert', enabled: true, category: 'security' },
];
export async function getSkills(): Promise<SkillItem[]> {
  let enabled: Record<string, boolean> = {};
  try { const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) enabled = parsed as Record<string, boolean>; } catch { /* Use catalog defaults. */ }
  return catalog.map((item) => ({ ...item, enabled: typeof enabled[item.id] === 'boolean' ? enabled[item.id] : item.enabled }));
}
export async function toggleSkillState(id: string, enabled: boolean): Promise<SkillItem[]> {
  const next = (await getSkills()).map((skill) => skill.id === id ? { ...skill, enabled } : skill);
  try { localStorage.setItem(STORAGE, JSON.stringify(Object.fromEntries(next.map((skill) => [skill.id, skill.enabled])))); } catch { /* This control remains session-local. */ }
  return next;
}
export async function executeSkill(_id: string, _action: string, _parameters: Record<string, unknown>): Promise<{ success: boolean; result: unknown }> {
  // TODO: Add reviewed, bounded integrations one by one; toggles never execute external actions.
  return { success: false, result: { message: 'Integration is not connected. No external action was performed.' } };
}
