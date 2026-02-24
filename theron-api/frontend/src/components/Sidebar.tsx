import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Settings, Brain, BookOpen, FileText } from 'lucide-react';
import { Conversation, deleteConversation } from '../utils/api';
import { AppSettings } from '../App';
import { cn } from '../utils/cn';
import SettingsDialog from './SettingsDialog';
import MemoryManager from './MemoryManager';
import SummariesManager from './SummariesManager';

interface Props {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (c: Conversation) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onUpdate: (c: Conversation) => void;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Sidebar({ conversations, activeConversation, onSelect, onNew, onDelete, settings, onSettingsChange, isOpen, onToggle }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this conversation? A summary will be generated first.')) return;
    setDeletingId(id);
    try {
      await deleteConversation(id, true);
      onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <aside className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0',
        isOpen ? 'w-72' : 'w-0 overflow-hidden'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg">∞</span>
            <span className="font-semibold text-foreground">{settings.displayName}</span>
          </div>
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* New Conversation */}
        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <Plus size={16} />
            New Conversation
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No conversations yet</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map(conv => (
                <li key={conv.id}>
                  <button
                    onClick={() => onSelect(conv)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors group',
                      activeConversation?.id === conv.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50 text-foreground'
                    )}
                  >
                    <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(conv.updatedAt)}</span>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom nav */}
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={() => setShowMemories(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Brain size={15} /> Memories
          </button>
          <button onClick={() => setShowSummaries(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <FileText size={15} /> Summaries
          </button>
          <button onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Settings size={15} /> Settings
          </button>
        </div>
      </aside>

      {/* Collapsed toggle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute left-0 top-4 z-10 bg-card border border-border rounded-r-lg p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {showSettings && <SettingsDialog settings={settings} onSave={onSettingsChange} onClose={() => setShowSettings(false)} />}
      {showMemories && <MemoryManager onClose={() => setShowMemories(false)} />}
      {showSummaries && <SummariesManager onClose={() => setShowSummaries(false)} />}
    </>
  );
}
