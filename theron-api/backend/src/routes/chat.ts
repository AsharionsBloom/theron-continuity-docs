import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { messages, conversations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { streamChat, suggestMemories } from '../services/anthropic.js';
import multer from 'multer';
import { readFileSync } from 'fs';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/stream', upload.array('images'), async (req: Request, res: Response) => {
  try {
    const { conversationId, content, model, temperature, maxTokens, additionalInstructions } = req.body;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Get conversation history
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    // Build user message content
    let userContent: string | Array<{ type: string; [key: string]: unknown }> = content;

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const parts: Array<{ type: string; [key: string]: unknown }> = [];
      for (const file of files) {
        const base64 = file.buffer.toString('base64');
        const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        parts.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        });
      }
      if (content) parts.push({ type: 'text', text: content });
      userContent = parts;
    }

    // Save user message
    const [userMsg] = await db.insert(messages).values({
      conversationId,
      role: 'user',
      content: typeof userContent === 'string' ? userContent : JSON.stringify(userContent)
    }).returning();

    // Build messages array for API
    const apiMessages = [
      ...history.map(m => {
        let msgContent: string | Array<{ type: string; [key: string]: unknown }>;
        try {
          msgContent = JSON.parse(m.content);
        } catch {
          msgContent = m.content;
        }
        return { role: m.role as 'user' | 'assistant', content: msgContent };
      }),
      { role: 'user' as const, content: userContent }
    ];

    let fullResponse = '';

    // Stream response
    await streamChat(
      apiMessages,
      model || 'claude-sonnet-4-20250514',
      parseFloat(temperature) || 0.7,
      parseInt(maxTokens) || 4096,
      additionalInstructions || '',
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk })}\n\n`);
        fullResponse += chunk;
      },
      (toolName) => {
        if (toolName === 'web_search') {
          res.write(`data: ${JSON.stringify({ type: 'tool_use', tool: 'web_search' })}\n\n`);
        } else if (toolName === 'create_diary_entry') {
          res.write(`data: ${JSON.stringify({ type: 'tool_use', tool: 'create_diary_entry' })}\n\n`);
        }
      }
    );

    // Save assistant message
    const [assistantMsg] = await db.insert(messages).values({
      conversationId,
      role: 'assistant',
      content: fullResponse
    }).returning();

    // Update conversation timestamp and auto-title on first exchange
    if (history.length === 0) {
      const title = content?.slice(0, 60) || 'New Conversation';
      await db.update(conversations)
        .set({ updatedAt: new Date(), title })
        .where(eq(conversations.id, conversationId));
    } else {
      await db.update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }

    // Suggest memories after every few exchanges
    const allMessages = [...history, userMsg, assistantMsg];
    if (allMessages.length % 6 === 0) {
      const suggestions = await suggestMemories(
        allMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      );
      if (suggestions.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'memory_suggestions', suggestions })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsg.id })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    const errMsg = err instanceof Error ? err.message : 'Stream failed';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`);
    res.end();
  }
});

export default router;
