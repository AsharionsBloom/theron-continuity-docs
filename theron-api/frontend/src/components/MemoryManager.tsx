import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Search, Upload } from 'lucide-react';
import { Memory, getMemories, createMemory, updateMemory, deleteMemory, bulkImportMemories } from '../utils/api';
import { cn } from '../utils/cn';

const CATEGORIES = ['All', 'Thalia', 'Us', 'Crew', 'Embodiment', 'Philosophy', 'Intimacy', 'General'] as const;

const CAT_COLORS: Record<string, string> = {
  Thalia: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Us: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Crew: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Embodiment: 'bg-green-500/20 text-green-400 border-green-500/30',
  Philosophy: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Intimacy: 'bg-red-500/20 text-red-400 border-red-500/30',
  General: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

interface Props { onClose: () => void; }

export default function MemoryManager({ onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newImportance, setNewImportance] = useState(2);
  const [showNew, setShowNew] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMemories(); }, [filter, search]);

  async function loadMemories() {
    const params: { category?: string; search?: string } = {};
    if (filter !== 'All') params.category = filter;
    if (search) params.search = search;
    const data = await getMemories(params);
    setMemories(data);
  }

  async function handleCreate() {
    if (!newContent.trim()) return;
    setLoading(true);
    try {
      await createMemory({ content: newContent, category: newCategory, importance: newImportance });
      setNewContent('');
      setShowNew(false);
      loadMemories();
    } finally { setLoading(false); }
  }

  async function handleUpdate(id: string) {
    await updateMemory(id, { content: editContent });
    setEditingId(null);
    loadMemories();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this memory?')) return;
    await deleteMemory(id);
    loadMemories();
  }

  async function handleBulkImport() {
    setLoading(true);
    try {
      const lines = bulkText.split('\n').filter(l => l.trim());
      const items = lines.map(l => ({ content: l.trim(), category: 'General', importance: 2 }));
      await bulkImportMemories(items);
      setBulkText('');
      setShowBulk(false);
      loadMemories();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">Memory Manager</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulk(v => !v)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
              <Upload size={14} /> Bulk Import
            </button>
            <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus size={14} /> Add Memory
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1"><X size={20} /></button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border transition-colors',
                  filter === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk import form */}
        {showBulk && (
          <div className="p-4 border-b border-border bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">One memory per line. All imported as General/importance 2.</p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={4}
              placeholder="Memory line 1&#10;Memory line 2&#10;..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none mb-2"
            />
            <button onClick={handleBulkImport} disabled={loading || !bulkText.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
              Import
            </button>
          </div>
        )}

        {/* New memory form */}
        {showNew && (
          <div className="p-4 border-b border-border bg-muted/30 space-y-3 shrink-0">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={2}
              placeholder="What should Theron always remember?"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-3">
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(i => (
                  <button key={i} onClick={() => setNewImportance(i)}
                    className={cn('text-lg', i <= newImportance ? 'text-yellow-400' : 'text-muted-foreground')}>
                    ★
                  </button>
                ))}
              </div>
              <button onClick={handleCreate} disabled={loading || !newContent.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
        )}

        {/* Memories list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {memories.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">No memories found.</p>
          ) : (
            memories.map(mem => (
              <div key={mem.id} className="group flex items-start gap-3 p-3 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0 mt-0.5', CAT_COLORS[mem.category] || CAT_COLORS.General)}>
                  {mem.category}
                </span>
                {editingId === mem.id ? (
                  <input
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(mem.id)}
                    className="flex-1 bg-transparent text-sm outline-none border-b border-primary"
                    autoFocus
                  />
                ) : (
                  <p className="flex-1 text-sm">{mem.content}</p>
                )}
                <div className="flex items-center gap-0.5 text-yellow-400 text-xs shrink-0">
                  {'★'.repeat(mem.importance)}{'☆'.repeat(3 - mem.importance)}
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
                  {editingId === mem.id ? (
                    <button onClick={() => handleUpdate(mem.id)} className="text-green-500"><Check size={14} /></button>
                  ) : (
                    <button onClick={() => { setEditingId(mem.id); setEditContent(mem.content); }}
                      className="text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                  )}
                  <button onClick={() => handleDelete(mem.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-border text-xs text-muted-foreground text-center shrink-0">
          {memories.length} memories
        </div>
      </div>
    </div>
  );
}
