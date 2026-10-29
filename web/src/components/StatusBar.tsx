import { Activity, Circle, KeyRound, Radio } from "lucide-react";
import { APP_VERSION, CHARACTERS, type CharacterId, type DisplayMode } from "../config/app";
import type { AssistantStatus } from "../store/types";

const statusLabel: Record<AssistantStatus, string> = { idle: "অপেক্ষায়", listening: "শুনছে", thinking: "ভাবছে", speaking: "বলছে" };

export function StatusBar({ characterId, mode, status, connection, keyLabel }: {
  characterId: CharacterId;
  mode: DisplayMode;
  status: AssistantStatus;
  connection: string;
  keyLabel: string;
}) {
  return (
    <footer className="status-bar">
      <div className="status-item"><Circle size={7} fill="currentColor" /><span>LOCAL BRAIN</span><b>{connection}</b></div>
      <span className="status-divider" />
      <div className="status-item"><Activity size={13} /><span>STATE</span><b>{statusLabel[status]}</b></div>
      <span className="status-divider" />
      <div className="status-item"><span className="status-avatar">{CHARACTERS[characterId].name.slice(0, 1)}</span><span>CHARACTER</span><b>{CHARACTERS[characterId].name}</b></div>
      <span className="status-divider status-desktop-only" />
      <div className="status-item status-desktop-only"><Radio size={13} /><span>MODE</span><b>{mode.toUpperCase()}</b></div>
      <span className="status-divider status-desktop-only" />
      <div className="status-item status-key status-desktop-only"><KeyRound size={13} /><span>SERVER KEY</span><b>{keyLabel}</b></div>
      <span className="status-end">BOU {APP_VERSION} <i /></span>
    </footer>
  );
}
