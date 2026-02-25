// In dev: VITE_API_URL is unset, so BASE = '/api' and Vite's proxy forwards to localhost:5000
// In production: VITE_API_URL = 'https://your-app.up.railway.app' (set in Vercel env vars)
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  modelUsed: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  id: string;
  conversationId: string | null;
  content: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface MemorySuggestion {
  content: string;
  category: string;
  importance: number;
}

// Conversations
export const getConversations = () => fetch(`${BASE}/conversations`).then(r => r.json()) as Promise<Conversation[]>;
export const createConversation = (data?: Partial<Conversation>) =>
  fetch(`${BASE}/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) }).then(r => r.json()) as Promise<Conversation>;
export const updateConversation = (id: string, data: Partial<Conversation>) =>
  fetch(`${BASE}/conversations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()) as Promise<Conversation>;
export const deleteConversation = (id: string, generateSummary = false) =>
  fetch(`${BASE}/conversations/${id}?generateSummaryFirst=${generateSummary}`, { method: 'DELETE' }).then(r => r.json());
export const getMessages = (conversationId: string) =>
  fetch(`${BASE}/conversations/${conversationId}/messages`).then(r => r.json()) as Promise<Message[]>;
export const summarizeConversation = (id: string) =>
  fetch(`${BASE}/conversations/${id}/summarize`, { method: 'POST' }).then(r => r.json()) as Promise<Summary>;

// Memories
export const getMemories = (params?: { category?: string; search?: string }) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return fetch(`${BASE}/memories${qs ? '?' + qs : ''}`).then(r => r.json()) as Promise<Memory[]>;
};
export const createMemory = (data: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) =>
  fetch(`${BASE}/memories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()) as Promise<Memory>;
export const bulkImportMemories = (items: Array<{ content: string; category: string; importance: number }>) =>
  fetch(`${BASE}/memories/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }).then(r => r.json()) as Promise<Memory[]>;
export const updateMemory = (id: string, data: Partial<Memory>) =>
  fetch(`${BASE}/memories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()) as Promise<Memory>;
export const deleteMemory = (id: string) =>
  fetch(`${BASE}/memories/${id}`, { method: 'DELETE' }).then(r => r.json());

// Summaries
export const getSummaries = () => fetch(`${BASE}/summaries`).then(r => r.json()) as Promise<Summary[]>;
export const updateSummary = (id: string, data: Partial<Summary>) =>
  fetch(`${BASE}/summaries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()) as Promise<Summary>;
export const deleteSummary = (id: string) =>
  fetch(`${BASE}/summaries/${id}`, { method: 'DELETE' }).then(r => r.json());
export const autoArchiveSummaries = () =>
  fetch(`${BASE}/summaries/auto-archive`, { method: 'POST' }).then(r => r.json());

// Settings
export const getSystemPrompt = () => fetch(`${BASE}/settings/system-prompt`).then(r => r.json()) as Promise<{ content: string }>;
export const updateSystemPrompt = (content: string) =>
  fetch(`${BASE}/settings/system-prompt`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }).then(r => r.json());
export const getModels = () => fetch(`${BASE}/settings/models`).then(r => r.json()) as Promise<Array<{ id: string; name: string; description: string }>>;

// Diary
export const getDiary = () => fetch(`${BASE}/diary`).then(r => r.json()) as Promise<{ content: string }>;
export const generateDiaryEntry = (data: { conversationMessages: Array<{ role: string; content: string }>; significance: string }) =>
  fetch(`${BASE}/diary/entry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()) as Promise<{ entry: string; success: boolean }>;

// Stream chat
export interface StreamOptions {
  conversationId: string;
  content: string;
  model: string;
  temperature: number;
  maxTokens: number;
  additionalInstructions: string;
  images?: File[];
  onChunk: (text: string) => void;
  onToolUse?: (tool: string) => void;
  onMemorySuggestions?: (suggestions: MemorySuggestion[]) => void;
  onDone?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export async function streamChat(opts: StreamOptions): Promise<void> {
  const formData = new FormData();
  formData.append('conversationId', opts.conversationId);
  formData.append('content', opts.content);
  formData.append('model', opts.model);
  formData.append('temperature', opts.temperature.toString());
  formData.append('maxTokens', opts.maxTokens.toString());
  formData.append('additionalInstructions', opts.additionalInstructions);

  if (opts.images) {
    for (const img of opts.images) {
      formData.append('images', img);
    }
  }

  const response = await fetch('/api/chat/stream', { method: 'POST', body: formData });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'text') opts.onChunk(data.text);
          else if (data.type === 'tool_use') opts.onToolUse?.(data.tool);
          else if (data.type === 'memory_suggestions') opts.onMemorySuggestions?.(data.suggestions);
          else if (data.type === 'done') opts.onDone?.(data.messageId);
          else if (data.type === 'error') opts.onError?.(data.error);
        } catch { /* skip malformed */ }
      }
    }
  }
}
