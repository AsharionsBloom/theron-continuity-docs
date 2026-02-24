import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { summaries } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

// GET all summaries
router.get('/', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(summaries).orderBy(desc(summaries.createdAt));
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
});

// PATCH update summary (content or status)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;
    const updates: Partial<typeof summaries.$inferInsert> = {};
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    const [s] = await db.update(summaries).set(updates).where(eq(summaries.id, id)).returning();
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update summary' });
  }
});

// DELETE summary
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(summaries).where(eq(summaries.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete summary' });
  }
});

// POST auto-archive old summaries to manage token budget
router.post('/auto-archive', async (_req: Request, res: Response) => {
  try {
    const active = await db.select().from(summaries)
      .where(eq(summaries.status, 'active'))
      .orderBy(summaries.createdAt);

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    let totalChars = active.reduce((sum, s) => sum + s.content.length, 0);
    const maxChars = 60000 * 4;

    const archived: string[] = [];
    // Archive oldest first until under limit
    for (const s of active) {
      if (totalChars <= maxChars) break;
      await db.update(summaries).set({ status: 'archived' }).where(eq(summaries.id, s.id));
      totalChars -= s.content.length;
      archived.push(s.id);
    }

    res.json({ archived });
  } catch (err) {
    res.status(500).json({ error: 'Failed to auto-archive summaries' });
  }
});

export default router;
