import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, ChevronDown, BookOpen } from 'lucide-react';
import { Conversation, Message, getMessages, streamChat as apiStreamChat, MemorySuggestion, createMemory, updateConversation, getModels } from '../utils/api';
import { AppSettings } from '../App';
import { cn } from '../utils/cn';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import DiaryDialog from './DiaryDialog';
import MemorySuggestions from './MemorySuggestions';

interface Props {
  conversation: Conversation;
  settings: AppSettings;
  onConversationUpdate: (c: Conversation) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function ChatWindow({ conversation, settings, onConversationUpdate, onToggleSidebar, sidebarOpen }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([]);
  const [showDiary, setShowDiary] = useState(false);
  const [selectedModel, setSelectedModel] = useState(conversation.modelUsed);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvId = useRef<string | null>(null);

  useEffect(() => {
    if (conversation.id !== prevConvId.current) {
      prevConvId.current = conversation.id;
      setMessages([]);
      setStreamingText('');
      setMemorySuggestions([]);
      loadMessages();
      setSelectedModel(conversation.modelUsed);
    }
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    getModels().then(setModels).catch(err => {
      console.error('Failed to load models:', err);
      // Fallback to basic models if fetch fails
      setModels([
        { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Deep thinking' },
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced (default)' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast & economical' }
      ]);
    });
  }, []);

  async function loadMessages() {
    try {
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  async function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    setShowModelSelect(false);
    const updated = await updateConversation(conversation.id, { modelUsed: modelId });
    onConversationUpdate(updated);
  }

  async function handleSend(content: string, images?: File[]) {
    if (!content.trim() && (!images || images.length === 0)) return;
    if (isStreaming) return;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      role: 'user',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreamingText('');
    setIsStreaming(true);
    setIsSearching(false);

    let fullResponse = '';

    try {
      await apiStreamChat({
        conversationId: conversation.id,
        content,
        model: selectedModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        additionalInstructions: settings.additionalInstructions,
        images,
        onChunk: (chunk) => {
          fullResponse += chunk;
          setStreamingText(fullResponse);
        },
        onToolUse: (tool) => {
          if (tool === 'web_search') setIsSearching(true);
        },
        onMemorySuggestions: (suggestions) => {
          if (suggestions.length > 0) setMemorySuggestions(suggestions);
        },
        onDone: (_messageId) => {
          setIsSearching(false);
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            conversationId: conversation.id,
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), userMsg, assistantMsg]);
          setStreamingText('');
          // Prompt diary after 10+ exchanges
          if (messages.length >= 10 && messages.length % 10 === 0) {
            setShowDiary(true);
          }
        },
        onError: (error) => {
          console.error('Stream error:', error);
          setStreamingText('');
        }
      });
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsStreaming(false);
      setIsSearching(false);
    }
  }

  async function handleAcceptMemory(suggestion: MemorySuggestion) {
    await createMemory({
      content: suggestion.content,
      category: suggestion.category as Memory['category'],
      importance: suggestion.importance
    });
    setMemorySuggestions(prev => prev.filter(s => s.content !== suggestion.content));
  }

  function handleDismissMemory(suggestion: MemorySuggestion) {
    setMemorySuggestions(prev => prev.filter(s => s.content !== suggestion.content));
  }

  const currentModel = models.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        {!sidebarOpen && (
          <button onClick={onToggleSidebar} className="text-muted-foreground hover:text-foreground transition-colors">
            <Menu size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-medium truncate text-sm">{conversation.title}</h1>
        </div>
        {isSearching && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
            <Search size={12} />
            <span>Searching the web...</span>
          </div>
        )}
        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelSelect(v => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            {currentModel?.name || 'Model'}
            <ChevronDown size={12} />
          </button>
          {showModelSelect && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleModelChange(m.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors',
                    selectedModel === m.id && 'bg-accent'
                  )}
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowDiary(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Update diary"
        >
          <BookOpen size={16} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Send a message to begin.</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streamingText && (
          <MessageBubble
            message={{ id: 'streaming', conversationId: conversation.id, role: 'assistant', content: streamingText, timestamp: new Date().toISOString() }}
            isStreaming
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Memory suggestions */}
      {memorySuggestions.length > 0 && (
        <MemorySuggestions
          suggestions={memorySuggestions}
          onAccept={handleAcceptMemory}
          onDismiss={handleDismissMemory}
        />
      )}

      {/* Input */}
      <MessageInput onSend={handleSend} isStreaming={isStreaming} />

      {/* Diary dialog */}
      {showDiary && (
        <DiaryDialog
          conversationMessages={messages.map(m => ({ role: m.role, content: m.content }))}
          onClose={() => setShowDiary(false)}
        />
      )}
    </div>
  );
}

// Fix missing import
interface Memory { category: string; }
