export type SkillId =
  | "browser" | "codegen" | "code-review" | "software-dev" | "computer-use"
  | "video" | "whatsapp" | "telegram" | "facebook" | "security-review" | "cybersecurity";

export type SkillStage = "prompt-guidance" | "integration-planned";

export interface SkillItem {
  id: SkillId;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  stage: SkillStage;
}

export const SKILL_CATALOG: SkillItem[] = [
  { id: "browser", name: "Browser research", description: "সোর্স খোঁজা ও সারাংশ—browser tool পরে যুক্ত হবে", icon: "◉", enabled: true, stage: "integration-planned" },
  { id: "codegen", name: "Code generation", description: "টাইপড, ব্যাখ্যাসহ কোড ও পরিবর্তনের খসড়া", icon: "</>", enabled: true, stage: "prompt-guidance" },
  { id: "code-review", name: "Code review", description: "সমস্যা, ঝুঁকি ও যাচাইযোগ্য fix খোঁজা", icon: "⌕", enabled: true, stage: "prompt-guidance" },
  { id: "software-dev", name: "Software development", description: "Requirements, architecture, implementation plan", icon: "⌘", enabled: true, stage: "prompt-guidance" },
  { id: "computer-use", name: "Computer control", description: "Native desktop connector এখনো নেই", icon: "▣", enabled: false, stage: "integration-planned" },
  { id: "video", name: "Video", description: "ভিডিও editing connector পরে যুক্ত হবে", icon: "▷", enabled: false, stage: "integration-planned" },
  { id: "whatsapp", name: "WhatsApp", description: "কোনো messaging account সংযুক্ত নয়", icon: "◌", enabled: false, stage: "integration-planned" },
  { id: "telegram", name: "Telegram", description: "কোনো messaging account সংযুক্ত নয়", icon: "➤", enabled: false, stage: "integration-planned" },
  { id: "facebook", name: "Facebook", description: "কোনো social account সংযুক্ত নয়", icon: "f", enabled: false, stage: "integration-planned" },
  { id: "security-review", name: "Security review", description: "Defensive code/config review ও remediation", icon: "⬡", enabled: true, stage: "prompt-guidance" },
  { id: "cybersecurity", name: "Cybersecurity", description: "শুধু অনুমোদিত, defensive security guidance", icon: "⌑", enabled: true, stage: "prompt-guidance" },
];

const GUIDANCE: Partial<Record<SkillId, string>> = {
  codegen: "CODE GENERATION: Ask for missing constraints when needed; write maintainable, typed code, include filenames and short integration notes. Do not claim the code was run.",
  "code-review": "CODE REVIEW: Review the supplied diff or code first. Report only actionable findings, sorted by severity, with exact file/line context where available. Explain impact and a minimal fix. Do not invent tests or claim checks ran.",
  "software-dev": "SOFTWARE DEVELOPMENT: Turn goals into small reviewable milestones, inspect the existing project before editing, preserve its conventions, implement the requested slice, and report changed files plus verification evidence.",
  "security-review": "SECURITY REVIEW: Look for exposed secrets, unsafe input handling, excessive permissions, injection, insecure storage, and missing authorization. Prefer mitigations; never print secrets found in files.",
  cybersecurity: "CYBERSECURITY: Keep guidance defensive and authorized. Focus on threat modeling, hardening, safe validation, incident response, and remediation. Refuse credential theft, malware, stealth, unauthorized access, and exploit instructions.",
  "computer-use": "COMPUTER USE: No native computer-control tool is connected in this build. Do not claim to click, type, browse, or operate the user's computer. Describe a safe plan and request explicit approval when a future connector supports consequential actions.",
  browser: "BROWSER: No live browsing skill is wired to this local app. Clearly distinguish known information from research that would require a connected browser.",
};

export function getSkills(): SkillItem[] {
  return SKILL_CATALOG.map((skill) => ({ ...skill }));
}

export function setSkillEnabled(skills: SkillItem[], id: SkillId, enabled: boolean): SkillItem[] {
  return skills.map((skill) => skill.id === id ? { ...skill, enabled } : skill);
}

export function getEnabledSkillGuidance(ids: SkillId[]): string {
  return [...new Set(ids)].map((id) => GUIDANCE[id]).filter((guide): guide is string => Boolean(guide)).join("\n\n");
}

export interface SkillExecutionRequest {
  skillId: SkillId;
  action: string;
  userApproved: boolean;
}

export interface SkillExecutionResult {
  status: "instruction_only" | "approval_required" | "integration_missing";
  message: string;
}

/** No external side effects are available in this browser build. TODO: add reviewed, permissioned runners one at a time. */
export async function executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResult> {
  if (!request.userApproved) {
    return { status: "approval_required", message: "এই action চালানোর আগে তোমার অনুমতি লাগবে।" };
  }
  return {
    status: "integration_missing",
    message: request.skillId + " skill-এর runner এই build-এ যুক্ত নেই; কোনো action চালানো হয়নি।",
  };
}
