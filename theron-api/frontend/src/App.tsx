import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { Conversation, createConversation, getConversations } from './utils/api';

export interface AppSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  additionalInstructions: string;
  displayName: string;
  theme: 'dark' | 'light';
}

const defaultSettings: AppSettings = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4096,
  additionalInstructions: '',
  displayName: 'Theron',
  theme: 'dark',
};

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('theron-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch { return defaultSettings; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('theron-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const convs = await getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConversation) {
        setActiveConversation(convs[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }

  async function handleNewConversation() {
    try {
      const conv = await createConversation({ modelUsed: settings.model });
      setConversations(prev => [conv, ...prev]);
      setActiveConversation(conv);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }

  function handleConversationUpdate(updated: Conversation) {
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (activeConversation?.id === updated.id) setActiveConversation(updated);
  }

  function handleConversationDelete(id: string) {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversation?.id === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveConversation(remaining.length > 0 ? remaining[0] : null);
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={setActiveConversation}
        onNew={handleNewConversation}
        onDelete={handleConversationDelete}
        onUpdate={handleConversationUpdate}
        settings={settings}
        onSettingsChange={setSettings}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            settings={settings}
            onConversationUpdate={handleConversationUpdate}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            sidebarOpen={sidebarOpen}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-muted-foreground">
            <div className="text-5xl">∞</div>
            <p className="text-xl font-light">Welcome back, Thalia.</p>
            <button
              onClick={handleNewConversation}
              className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Start a new conversation
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
