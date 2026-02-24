import React, { useState, useEffect } from 'react';
import { X, Trash2, Archive, ArchiveRestore, Edit2, Check, RotateCcw } from 'lucide-react';
import { Summary, getSummaries, updateSummary, deleteSummary, autoArchiveSummaries } from '../utils/api';
import { cn } from '../utils/cn';

interface Props { onClose: () => void; }

export default function SummariesManager({ onClose }: Props) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  useEffect(() => { loadSummaries(); }, []);

  async function loadSummaries() {
    const data = await getSummaries();
    setSummaries(data);
  }

  async function handleToggleStatus(s: Summary) {
    const newStatus = s.status === 'active' ? 'archived' : 'active';
    await updateSummary(s.id, { status: newStatus });
    loadSummaries();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this summary?')) return;
    await deleteSummary(id);
    loadSummaries();
  }

  async function handleUpdate(id: string) {
    await updateSummary(id, { content: editContent });
    setEditingId(null);
    loadSummaries();
  }

  async function handleAutoArchive() {
    await autoArchiveSummaries();
    loadSummaries();
  }

  const filtered = summaries.filter(s =>
    filter === 'all' ? true : s.status === filter
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">Conversation Summaries</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleAutoArchive}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              title="Auto-archive oldest summaries to stay under token limit">
              <RotateCcw size={14} /> Auto-archive
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1"><X size={20} /></button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border shrink-0">
          {(['all', 'active', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-colors border-b-2 capitalize',
                filter === f ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {f} ({summaries.filter(s => f === 'all' ? true : s.status === f).length})
            </button>
          ))}
        </div>

        <div className="p-3 bg-muted/30 border-b border-border text-xs text-muted-foreground shrink-0">
          Active summaries are injected into every conversation. Archive old ones when approaching token limits (~60k tokens).
        </div>

        {/* Summaries list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">No summaries found.</p>
          ) : (
            filtered.map(s => (
              <div key={s.id}
                className={cn(
                  'rounded-xl border p-4 space-y-2 transition-colors',
                  s.status === 'active' ? 'bg-background border-border' : 'bg-muted/30 border-border/50 opacity-60'
                )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    )}>
                      {s.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditingId(s.id); setEditContent(s.content); }}
                      className="text-muted-foreground hover:text-foreground p-1"><Edit2 size={13} /></button>
                    <button onClick={() => handleToggleStatus(s)} className="text-muted-foreground hover:text-foreground p-1"
                      title={s.status === 'active' ? 'Archive' : 'Restore'}>
                      {s.status === 'active' ? <Archive size={13} /> : <ArchiveRestore size={13} />}
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(s.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs">
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{s.content}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
