import {
  Code2, CodeXml, Globe2, Laptop, MessagesSquare, Play, ShieldAlert, ShieldCheck, Terminal, Video,
  type LucideIcon,
} from "lucide-react";
import type { SkillId, SkillItem } from "../services/skills";

const icons: Record<SkillId, LucideIcon> = {
  browser: Globe2, codegen: CodeXml, "code-review": Code2, "software-dev": Terminal,
  "computer-use": Laptop, video: Video, whatsapp: MessagesSquare, telegram: MessagesSquare,
  facebook: MessagesSquare, "security-review": ShieldCheck, cybersecurity: ShieldAlert,
};

export function SkillsPanel({ skills, onToggle }: { skills: SkillItem[]; onToggle: (id: SkillId, enabled: boolean) => void }) {
  return (
    <section className="settings-section">
      <div className="section-heading"><span className="section-icon"><Play size={15} /></span><div><h3>Skills</h3><p>Guidance-ভিত্তিক; বাইরের action এখনও বন্ধ</p></div></div>
      <div className="skills-grid">
        {skills.map((skill) => {
          const Icon = icons[skill.id];
          return (
            <article className={"skill-card" + (skill.enabled ? " skill-enabled" : "")} key={skill.id}>
              <div className="skill-card-top"><span className="skill-icon"><Icon size={16} /></span>
                <button role="switch" aria-checked={skill.enabled} className={"mini-switch" + (skill.enabled ? " is-on" : "")}
                  onClick={() => onToggle(skill.id, !skill.enabled)} aria-label={skill.name + " চালু বা বন্ধ করো"}><span /></button>
              </div>
              <strong>{skill.name}</strong><small>{skill.description}</small>
              <span className="skill-active-mark">{skill.stage === "prompt-guidance" ? "GUIDANCE READY" : "CONNECTOR TODO"}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
