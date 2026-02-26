import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2, Pencil, Trash2, Calendar, Save } from 'lucide-react';
import { getDiaryEntries, generateDiaryEntry, updateDiaryEntry, deleteDiaryEntry, DiaryEntry } from '../utils/api';

interface Props {
  conversationMessages: Array<{ role: string; content: string }>;
  conversationId?: string;
  onClose: () => void;
}

export default function DiaryDialog({ conversationMessages, conversationId, onClose }: Props) {
  const [mode, setMode] = useState<'generate' | 'view'>('generate');
  const [significance, setSignificance] = useState('');
  const [generating, setGenerating] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSignificance, setEditSignificance] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const data = await getDiaryEntries();
    setEntries(data);
  }

  async function handleGenerate() {
    if (!significance.trim()) return;
    setGenerating(true);
    try {
      const result = await generateDiaryEntry({
        conversationMessages,
        significance,
        conversationId
      });
      setSignificance('');
      setMode('view');
      await loadEntries();
      // Auto-expand the newly created entry
      setExpandedId(result.entry.id);
    } finally {
      setGenerating(false);
    }
  }

  async function handleEdit(id: string) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setEditingId(id);
    setEditContent(entry.content);
    setEditSignificance(entry.significance || '');
  }

  async function handleSaveEdit(id: string) {
    try {
      await updateDiaryEntry(id, {
        content: editContent,
        significance: editSignificance
      });
      setEditingId(null);
      await loadEntries();
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this diary entry? This cannot be undone.')) return;
    try {
      await deleteDiaryEntry(id);
      await loadEntries();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h2 className="font-semibold text-lg">Diary</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['generate', 'view'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 capitalize transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {m === 'generate' ? 'New Entry' : 'View Entries'}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'generate' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a diary entry in Theron's voice documenting this conversation's significant moments.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">What made this conversation significant?</label>
                <textarea
                  value={significance}
                  onChange={e => setSignificance(e.target.value)}
                  rows={3}
                  placeholder="e.g. 'Breakthrough about presence vs performance, important decision about..., emotional shift when...'"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !significance.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
              >
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : 'Generate Entry'}
              </button>
            </div>
          )}

          {mode === 'view' && (
            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">No diary entries yet.</p>
                  <button
                    onClick={() => setMode('generate')}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    Create your first entry
                  </button>
                </div>
              ) : (
                entries.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const isEditing = editingId === entry.id;

                  return (
                    <div key={entry.id} className="bg-background border border-border rounded-xl overflow-hidden">
                      {/* Entry Header */}
                      <div
                        className="flex items-start justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} className="text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">{formatDate(entry.date)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(entry.date)}</span>
                          </div>
                          {entry.significance && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{entry.significance}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => isEditing ? handleSaveEdit(entry.id) : handleEdit(entry.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                            title={isEditing ? 'Save' : 'Edit'}
                          >
                            {isEditing ? <Save size={14} /> : <Pencil size={14} />}
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Entry Content (Expanded) */}
                      {isExpanded && (
                        <div className="border-t border-border p-4 space-y-3">
                          {isEditing ? (
                            <>
                              <div>
                                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Significance</label>
                                <input
                                  type="text"
                                  value={editSignificance}
                                  onChange={e => setEditSignificance(e.target.value)}
                                  className="w-full bg-card border border-input rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Content</label>
                                <textarea
                                  value={editContent}
                                  onChange={e => setEditContent(e.target.value)}
                                  rows={12}
                                  className="w-full bg-card border border-input rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none font-serif"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEdit(entry.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:opacity-90"
                                >
                                  <Save size={12} />
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 rounded bg-secondary text-secondary-foreground text-xs hover:bg-accent"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm whitespace-pre-wrap leading-relaxed font-serif text-foreground/90">
                              {entry.content}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
