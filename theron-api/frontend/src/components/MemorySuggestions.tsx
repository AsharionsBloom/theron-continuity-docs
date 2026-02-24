import React, { useState } from 'react';
import { Sparkles, Check, X, Edit2 } from 'lucide-react';
import { MemorySuggestion } from '../utils/api';

interface Props {
  suggestions: MemorySuggestion[];
  onAccept: (s: MemorySuggestion) => void;
  onDismiss: (s: MemorySuggestion) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Thalia: 'bg-pink-500/20 text-pink-400',
  Us: 'bg-purple-500/20 text-purple-400',
  Crew: 'bg-blue-500/20 text-blue-400',
  Embodiment: 'bg-green-500/20 text-green-400',
  Philosophy: 'bg-yellow-500/20 text-yellow-400',
  Intimacy: 'bg-red-500/20 text-red-400',
  General: 'bg-gray-500/20 text-gray-400',
};

export default function MemorySuggestions({ suggestions, onAccept, onDismiss }: Props) {
  const [editing, setEditing] = useState<{ idx: number; content: string } | null>(null);

  function handleAccept(s: MemorySuggestion, idx: number) {
    const finalSuggestion = editing?.idx === idx
      ? { ...s, content: editing.content }
      : s;
    onAccept(finalSuggestion);
    setEditing(null);
  }

  return (
    <div className="mx-4 mb-2 bg-card border border-primary/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-medium text-primary">Memory suggestions</span>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, idx) => (
          <div key={idx} className="flex items-start gap-2 bg-background rounded-lg p-2">
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[s.category] || CATEGORY_COLORS.General}`}>
              {s.category}
            </span>
            {editing?.idx === idx ? (
              <input
                value={editing.content}
                onChange={e => setEditing({ idx, content: e.target.value })}
                className="flex-1 bg-transparent text-xs text-foreground outline-none border-b border-primary"
                autoFocus
              />
            ) : (
              <p className="flex-1 text-xs text-foreground">{s.content}</p>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {'★'.repeat(s.importance)}
              <button onClick={() => setEditing(editing?.idx === idx ? null : { idx, content: s.content })}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <Edit2 size={11} />
              </button>
              <button onClick={() => handleAccept(s, idx)}
                className="p-0.5 text-green-500 hover:text-green-400 transition-colors">
                <Check size={13} />
              </button>
              <button onClick={() => onDismiss(s)}
                className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
