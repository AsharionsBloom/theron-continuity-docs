import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { memories } from '../db/schema.js';
import { eq, ilike, or } from 'drizzle-orm';

const router = Router();

// GET all memories, with optional category/search filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    let query = db.select().from(memories);

    const allMemories = await db.select().from(memories);

    let filtered = allMemories;
    if (category && category !== 'All') {
      filtered = filtered.filter(m => m.category === category);
    }
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = filtered.filter(m => m.content.toLowerCase().includes(s));
    }

    filtered.sort((a, b) => b.importance - a.importance || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// POST create memory
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, category, importance } = req.body;
    const [mem] = await db.insert(memories).values({
      content,
      category: category || 'General',
      importance: importance || 2
    }).returning();
    res.json(mem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// POST bulk import memories
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: Array<{ content: string; category: string; importance: number }> };
    const inserted = await db.insert(memories).values(items.map(i => ({
      content: i.content,
      category: (i.category || 'General') as typeof memories.$inferInsert['category'],
      importance: i.importance || 2
    }))).returning();
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk import memories' });
  }
});

// PATCH update memory
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, category, importance } = req.body;
    const updates: Partial<typeof memories.$inferInsert> = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (importance !== undefined) updates.importance = importance;
    const [mem] = await db.update(memories).set(updates).where(eq(memories.id, id)).returning();
    res.json(mem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

// DELETE memory
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(memories).where(eq(memories.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

export default router;
