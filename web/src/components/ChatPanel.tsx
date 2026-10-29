import { useEffect, useRef } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import type { AssistantStatus, ChatMessage } from "../store/types";

function clockLabel(timestamp: number) {
  return new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

export function ChatPanel({ messages, status, mobileOpen, onClose, characterName, connectionLabel }: {
  messages: ChatMessage[];
  status: AssistantStatus;
  mobileOpen: boolean;
  onClose: () => void;
  characterName: string;
  connectionLabel: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length, messages.at(-1)?.text, status]);

  return (
    <aside className={"chat-panel" + (mobileOpen ? " is-mobile-open" : "")}>
      <div className="panel-heading chat-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><MessageCircle size={16} /></span>
          <div><h2>কথোপকথন</h2><small>শেষ ২০টি বার্তা brain-এ যায়</small></div>
        </div>
        <button className="icon-button mobile-only" onClick={onClose} aria-label="বন্ধ করো"><X size={18} /></button>
        <span className="chat-count">{String(messages.length).padStart(2, "0")}</span>
      </div>

      <div className="chat-date"><span /> {connectionLabel} <span /></div>
      <div className="message-list">
        {messages.map((message) => (
          <article className={"message message-" + message.role} key={message.id}>
            {message.role === "assistant" && <span className="message-avatar"><Bot size={14} /></span>}
            <div className="message-content">
              <div className="message-meta"><span>{message.role === "assistant" ? characterName.toUpperCase() : "তুমি"}</span><time>{clockLabel(message.createdAt)}</time></div>
              <p>{message.text || (status === "thinking" || status === "speaking" ? "…" : "")}</p>
            </div>
          </article>
        ))}
        {status === "thinking" && <div className="thinking-indicator"><span /><span /><span /><small>{characterName} ভাবছে</small></div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-footnote"><span /> LOCAL CHAT · শেষ ২০টি বার্তা request-এ ব্যবহৃত হয়</div>
    </aside>
  );
}
