import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { summaries } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET all summaries
router.get('/', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(summaries).orderBy(desc(summaries.createdAt));
    res.json(all);
  } catch (err) {
    console.error('[GET /summaries]', err);
    res.status(500).json({ error: 'Failed to fetch summaries', detail: String(err) });
  }
});

// PATCH update summary (content or status)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;
    const updates: any = {};
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    const [s] = await db.update(summaries).set(updates).where(eq(summaries.id, id as any)).returning();
    res.json(s);
  } catch (err) {
    console.error('[PATCH /summaries/:id]', err);
    res.status(500).json({ error: 'Failed to update summary', detail: String(err) });
  }
});

// DELETE summary
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(summaries).where(eq(summaries.id, id as any));
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /summaries/:id]', err);
    res.status(500).json({ error: 'Failed to delete summary', detail: String(err) });
  }
});

// POST auto-archive old summaries to manage token budget
router.post('/auto-archive', async (_req: Request, res: Response) => {
  try {
    const active = await db.select().from(summaries)
      .where(eq(summaries.status, 'active' as any))
      .orderBy(summaries.createdAt);

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    let totalChars = active.reduce((sum, s) => sum + s.content.length, 0);
    const maxChars = 60000 * 4;

    const archived: string[] = [];
    for (const s of active) {
      if (totalChars <= maxChars) break;
      await db.update(summaries).set({ status: 'archived' as any }).where(eq(summaries.id, s.id as any));
      totalChars -= s.content.length;
      archived.push(s.id);
    }

    res.json({ archived });
  } catch (err) {
    console.error('[POST /summaries/auto-archive]', err);
    res.status(500).json({ error: 'Failed to auto-archive summaries', detail: String(err) });
  }
});

export default router;
