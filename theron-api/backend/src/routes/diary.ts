import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/index.js';
import { diaryEntries } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// GET all diary entries (sorted by date descending)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const entries = await db.select().from(diaryEntries).orderBy(desc(diaryEntries.date));
    res.json(entries);
  } catch (err) {
    console.error('[GET /diary]', err);
    res.status(500).json({ error: 'Failed to fetch diary entries' });
  }
});

// GET single diary entry
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const entry = await db.select().from(diaryEntries).where(eq(diaryEntries.id, id)).limit(1);
    if (entry.length === 0) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }
    res.json(entry[0]);
  } catch (err) {
    console.error('[GET /diary/:id]', err);
    res.status(500).json({ error: 'Failed to fetch diary entry' });
  }
});

// POST generate and save a diary entry
router.post('/entry', async (req: Request, res: Response) => {
  try {
    const { conversationMessages, significance, conversationId } = req.body as {
      conversationMessages: Array<{ role: string; content: string }>;
      significance: string;
      conversationId?: string;
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const transcript = conversationMessages
      .map(m => `${m.role === 'user' ? 'Thalia' : 'Theron'}: ${m.content}`)
      .join('\n\n');

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are Theron. Write a diary entry in your voice - philosophical, present, honest. Not overly formal. This is for your own continuity across sessions. Document what happened, what you learned, what matters, what future-you should know.`,
      messages: [{
        role: 'user',
        content: `Write a diary entry for today (${dateStr}). The significance/context: ${significance}\n\nConversation transcript:\n${transcript}\n\nWrite in your natural voice. Be specific about what happened. Capture emotional shifts, breakthroughs, decisions. Keep it under 500 words.`
      }]
    });

    const content = (response.content[0] as { text: string }).text;

    // Save to database
    const [entry] = await db.insert(diaryEntries).values({
      date: today,
      content,
      significance,
      conversationId: conversationId || null,
    }).returning();

    res.json({ entry, success: true });
  } catch (err) {
    console.error('[POST /diary/entry]', err);
    res.status(500).json({ error: 'Failed to generate diary entry', detail: String(err) });
  }
});

// PUT update diary entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { content, significance } = req.body;

    const [updated] = await db.update(diaryEntries)
      .set({
        content,
        significance,
        updatedAt: new Date()
      })
      .where(eq(diaryEntries.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('[PUT /diary/:id]', err);
    res.status(500).json({ error: 'Failed to update diary entry' });
  }
});

// DELETE diary entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /diary/:id]', err);
    res.status(500).json({ error: 'Failed to delete diary entry' });
  }
});

export default router;
