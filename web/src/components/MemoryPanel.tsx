import { Brain, Trash2 } from "lucide-react";
import type { MemoryItem } from "../services/memory";

export function MemoryPanel({ memories, onDelete }: { memories: MemoryItem[]; onDelete: (id: string) => void }) {
  return (
    <section className="settings-section">
      <div className="section-heading"><span className="section-icon"><Brain size={15} /></span><div><h3>আমার সম্পর্কে যা মনে রেখেছি</h3><p>শুধু interface placeholder</p></div></div>
      <div className="memory-list">
        {memories.map((memory) => (
          <div className="memory-row" key={memory.id}>
            <span className="memory-spark" />
            <div><small>{memory.category}</small><p>{memory.text}</p></div>
            <button className="tiny-icon-button" aria-label="স্মৃতি মুছুন" onClick={() => onDelete(memory.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        {memories.length === 0 && <p className="empty-hint">এখন কোনো mock memory নেই।</p>}
      </div>
    </section>
  );
}