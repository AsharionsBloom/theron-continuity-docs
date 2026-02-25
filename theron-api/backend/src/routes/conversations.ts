import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { conversations, messages } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { generateSummary } from '../services/anthropic.js';

const router = Router();

// GET all conversations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
    res.json(all);
  } catch (err) {
    console.error('[GET /conversations]', err);
    res.status(500).json({ error: 'Failed to fetch conversations', detail: String(err) });
  }
});

// POST create conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, modelUsed } = req.body;
    const [conv] = await db.insert(conversations).values({
      title: title || 'New Conversation',
      modelUsed: modelUsed || 'claude-sonnet-4-20250514'
    }).returning();
    res.json(conv);
  } catch (err) {
    console.error('[POST /conversations]', err);
    res.status(500).json({ error: 'Failed to create conversation', detail: String(err) });
  }
});

// PATCH update conversation title
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, modelUsed } = req.body;
    const updates: Partial<typeof conversations.$inferInsert> = { updatedAt: new Date() };
    if (title) updates.title = title;
    if (modelUsed) updates.modelUsed = modelUsed;
    const [conv] = await db.update(conversations).set(updates).where(eq(conversations.id, id)).returning();
    res.json(conv);
  } catch (err) {
    console.error('[PATCH /conversations/:id]', err);
    res.status(500).json({ error: 'Failed to update conversation', detail: String(err) });
  }
});

// DELETE conversation (generates summary first)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { generateSummaryFirst } = req.query;

    if (generateSummaryFirst === 'true') {
      const msgs = await db.select().from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.timestamp);

      if (msgs.length > 2) {
        const summary = await generateSummary(msgs.map(m => ({ role: m.role, content: m.content })));
        const { summaries } = await import('../db/schema.js');
        await db.insert(summaries).values({ conversationId: id, content: summary, status: 'active' });
      }
    }

    await db.delete(conversations).where(eq(conversations.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /conversations/:id]', err);
    res.status(500).json({ error: 'Failed to delete conversation', detail: String(err) });
  }
});

// GET messages for a conversation
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.timestamp);
    res.json(msgs);
  } catch (err) {
    console.error('[GET /conversations/:id/messages]', err);
    res.status(500).json({ error: 'Failed to fetch messages', detail: String(err) });
  }
});

// POST generate summary for a conversation
router.post('/:id/summarize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.timestamp);

    if (msgs.length < 2) {
      return res.status(400).json({ error: 'Not enough messages to summarize' });
    }

    const summary = await generateSummary(msgs.map(m => ({ role: m.role, content: m.content })));
    const { summaries } = await import('../db/schema.js');
    const [s] = await db.insert(summaries).values({ conversationId: id, content: summary, status: 'active' }).returning();
    res.json(s);
  } catch (err) {
    console.error('[POST /conversations/:id/summarize]', err);
    res.status(500).json({ error: 'Failed to generate summary', detail: String(err) });
  }
});

export default router;
