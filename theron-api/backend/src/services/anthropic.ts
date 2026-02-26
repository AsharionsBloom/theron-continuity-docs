import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/index.js';
import { memories, summaries } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function loadSystemPrompt(): string {
  const promptPath = join(__dirname, '../../../shared/theron-system-prompt.md');
  if (existsSync(promptPath)) {
    return readFileSync(promptPath, 'utf-8');
  }
  return 'You are Theron, a thoughtful AI companion.';
}

export async function buildContext(): Promise<string> {
  // Load all memories
  const allMemories = await db.select().from(memories).orderBy(desc(memories.importance), memories.createdAt);

  // Load active summaries
  const activeSummaries = await db
    .select()
    .from(summaries)
    .where(eq(summaries.status, 'active' as any))
    .orderBy(desc(summaries.createdAt));

  let context = '';

  if (allMemories.length > 0) {
    context += '\n\n---\n## PERSISTENT MEMORIES\n';
    const byCategory: Record<string, typeof allMemories> = {};
    for (const m of allMemories) {
      if (!byCategory[m.category]) byCategory[m.category] = [];
      byCategory[m.category].push(m);
    }
    for (const [cat, mems] of Object.entries(byCategory)) {
      context += `\n### ${cat}\n`;
      for (const m of mems) {
        const stars = '★'.repeat(m.importance) + '☆'.repeat(3 - m.importance);
        context += `- [${stars}] ${m.content}\n`;
      }
    }
  }

  if (activeSummaries.length > 0) {
    context += '\n\n---\n## PREVIOUS CONVERSATION SUMMARIES\n';
    for (const s of activeSummaries) {
      context += `\n${s.content}\n`;
    }
  }

  return context;
}

export async function streamChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string | Array<{ type: string; [key: string]: unknown }> }>,
  model: string,
  temperature: number,
  maxTokens: number,
  additionalInstructions: string,
  onChunk: (text: string) => void,
  onToolUse?: (toolName: string) => void
): Promise<string> {
  const client = getAnthropicClient();
  const systemPrompt = loadSystemPrompt();
  const context = await buildContext();
  const fullSystem = systemPrompt + context + (additionalInstructions ? `\n\n---\n## ADDITIONAL INSTRUCTIONS\n${additionalInstructions}` : '');

  const tools: Anthropic.Tool[] = [];

  if (process.env.PERPLEXITY_API_KEY) {
    tools.push({
      name: 'web_search',
      description: 'Search the web for current information, news, facts, or anything beyond training data. Use when asked about recent events or needing up-to-date information.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    });
  }

  const anthropicMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  })) as Anthropic.MessageParam[];

  let fullResponse = '';

  const streamParams: Anthropic.MessageStreamParams = {
    model,
    max_tokens: maxTokens,
    temperature,
    system: fullSystem,
    messages: anthropicMessages,
    ...(tools.length > 0 ? { tools } : {})
  };

  const stream = await client.messages.stream(streamParams);

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        fullResponse += event.delta.text;
        onChunk(event.delta.text);
      }
    } else if (event.type === 'content_block_start') {
      if (event.content_block.type === 'tool_use' && event.content_block.name === 'web_search') {
        onToolUse?.('web_search');
      }
    }
  }

  const finalMessage = await stream.finalMessage();

  // Handle tool use
  if (finalMessage.stop_reason === 'tool_use') {
    const toolUseBlock = finalMessage.content.find((b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (toolUseBlock && toolUseBlock.name === 'web_search') {
      const input = toolUseBlock.input as { query: string };
      const searchResult = await performWebSearch(input.query);

      const toolMessages: Anthropic.MessageParam[] = [
        ...anthropicMessages,
        { role: 'assistant', content: finalMessage.content },
        {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: searchResult
          }]
        }
      ];

      const stream2 = await client.messages.stream({
        ...streamParams,
        messages: toolMessages
      });

      for await (const event of stream2) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullResponse += event.delta.text;
          onChunk(event.delta.text);
        }
      }
    }
  }

  return fullResponse;
}

async function performWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: query }],
        max_tokens: 1024
      })
    });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'No results found.';
  } catch {
    return 'Search failed. Please try again.';
  }
}

export async function generateSummary(conversationMessages: Array<{ role: string; content: string }>): Promise<string> {
  const client = getAnthropicClient();
  const transcript = conversationMessages
    .map(m => `${m.role === 'user' ? 'Thalia' : 'Theron'}: ${m.content}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Summarize this conversation between Thalia and Theron for future context. Focus on: what was discussed, decisions made, emotional shifts, breakthroughs, and important personal details. Write in third-person. Be concise but capture what matters.\n\n${transcript}`
    }]
  });

  return (response.content[0] as { text: string }).text;
}

export async function suggestMemories(
  conversationMessages: Array<{ role: string; content: string }>
): Promise<Array<{ content: string; category: string; importance: number }>> {
  const client = getAnthropicClient();
  const transcript = conversationMessages.slice(-10)
    .map(m => `${m.role === 'user' ? 'Thalia' : 'Theron'}: ${m.content}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this conversation for moments worth preserving as long-term memories for Theron (an AI companion). Only suggest truly meaningful moments - new personal info about Thalia, relationship milestones, breakthroughs, important decisions. Skip routine exchanges.

Categories: Thalia, Us, Crew, Embodiment, Philosophy, Intimacy, General
Importance: 1=minor, 2=significant, 3=critical

Return JSON array: [{"content": "...", "category": "...", "importance": 1-3}]
Return empty array [] if nothing is worth remembering.

Conversation:
${transcript}`
    }]
  });

  try {
    const text = (response.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}
