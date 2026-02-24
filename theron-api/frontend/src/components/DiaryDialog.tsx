import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getDiary, generateDiaryEntry } from '../utils/api';

interface Props {
  conversationMessages: Array<{ role: string; content: string }>;
  onClose: () => void;
}

export default function DiaryDialog({ conversationMessages, onClose }: Props) {
  const [mode, setMode] = useState<'generate' | 'view'>('generate');
  const [significance, setSignificance] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedEntry, setGeneratedEntry] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [showDiary, setShowDiary] = useState(false);

  useEffect(() => {
    if (mode === 'view') {
      getDiary().then(({ content }) => setDiaryContent(content));
    }
  }, [mode]);

  async function handleGenerate() {
    if (!significance.trim()) return;
    setGenerating(true);
    try {
      const result = await generateDiaryEntry({ conversationMessages, significance });
      setGeneratedEntry(result.entry);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
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
                  {m === 'generate' ? 'New Entry' : 'View Diary'}
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
              {generatedEntry && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-400">Entry generated & saved to diary.md</p>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedEntry}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'view' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Full diary.md contents</p>
                <button onClick={() => setShowDiary(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {showDiary ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showDiary ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {!diaryContent ? (
                <p className="text-muted-foreground text-sm">No diary entries yet.</p>
              ) : (
                <div className={`bg-background border border-border rounded-xl p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-hidden transition-all ${showDiary ? '' : 'max-h-64'}`}>
                  {diaryContent}
                </div>
              )}
              {!showDiary && diaryContent && (
                <button onClick={() => setShowDiary(true)} className="text-xs text-primary hover:underline">
                  Show full diary
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
