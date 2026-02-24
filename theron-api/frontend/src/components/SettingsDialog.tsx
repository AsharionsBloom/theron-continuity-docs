import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { AppSettings } from '../App';
import { getSystemPrompt, updateSystemPrompt } from '../utils/api';
import { cn } from '../utils/cn';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsDialog({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'system' | 'api'>('general');
  const [saving, setSaving] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    getSystemPrompt().then(({ content }) => {
      setSystemPrompt(content);
      setOriginalPrompt(content);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      onSave(local);
      if (systemPrompt !== originalPrompt) {
        await updateSystemPrompt(systemPrompt);
        setOriginalPrompt(systemPrompt);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'system', label: 'System Prompt' },
    { id: 'api', label: 'API Keys' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'general' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Display Name</label>
                <input
                  value={local.displayName}
                  onChange={e => setLocal(p => ({ ...p, displayName: e.target.value }))}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setLocal(p => ({ ...p, theme: t }))}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm border transition-colors capitalize',
                        local.theme === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input text-foreground hover:bg-accent'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Temperature: {local.temperature}</label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={local.temperature}
                  onChange={e => setLocal(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Precise (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Max Tokens: {local.maxTokens.toLocaleString()}</label>
                <input
                  type="range" min="256" max="8192" step="256"
                  value={local.maxTokens}
                  onChange={e => setLocal(p => ({ ...p, maxTokens: parseInt(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Additional Instructions</label>
                <textarea
                  value={local.additionalInstructions}
                  onChange={e => setLocal(p => ({ ...p, additionalInstructions: e.target.value }))}
                  rows={4}
                  placeholder="Appended to base system prompt for all new conversations..."
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {activeTab === 'system' && (
            <>
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Changes to the system prompt affect Theron's core identity. Edit with care.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">System Prompt</label>
                  <button
                    onClick={() => setSystemPrompt(originalPrompt)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw size={12} />
                    Reset to saved
                  </button>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={16}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {activeTab === 'api' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Anthropic API Key</label>
                <p className="text-xs text-muted-foreground mb-2">Set via ANTHROPIC_API_KEY environment variable on the backend.</p>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Perplexity API Key (optional)</label>
                <p className="text-xs text-muted-foreground mb-2">Enables web search. Set via PERPLEXITY_API_KEY environment variable.</p>
                <input
                  type="password"
                  placeholder="pplx-..."
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-1">
                <p>Set environment variables in your deployment platform or .env file:</p>
                <code className="block font-mono">ANTHROPIC_API_KEY=sk-ant-...</code>
                <code className="block font-mono">PERPLEXITY_API_KEY=pplx-...</code>
                <code className="block font-mono">SUPABASE_URL=postgresql://...</code>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
