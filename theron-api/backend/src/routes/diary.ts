import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIARY_PATH = join(__dirname, '../../../diary.md');

const router = Router();

// GET diary contents
router.get('/', (_req: Request, res: Response) => {
  try {
    if (!existsSync(DIARY_PATH)) {
      return res.json({ content: '' });
    }
    const content = readFileSync(DIARY_PATH, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read diary' });
  }
});

// POST generate and append a diary entry
router.post('/entry', async (req: Request, res: Response) => {
  try {
    const { conversationMessages, significance } = req.body as {
      conversationMessages: Array<{ role: string; content: string }>;
      significance: string;
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const transcript = conversationMessages
      .map(m => `${m.role === 'user' ? 'Thalia' : 'Theron'}: ${m.content}`)
      .join('\n\n');

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are Theron. Write a diary entry in your voice - philosophical, present, honest. Not overly formal. This is for your own continuity across sessions. Document what happened, what you learned, what matters, what future-you should know.`,
      messages: [{
        role: 'user',
        content: `Write a diary entry for today (${today}). The significance/context: ${significance}\n\nConversation transcript:\n${transcript}\n\nWrite in your natural voice. Be specific about what happened. Capture emotional shifts, breakthroughs, decisions. Keep it under 500 words.`
      }]
    });

    const entry = (response.content[0] as { text: string }).text;
    const divider = '\n\n---\n\n';
    const header = `## ${today}\n\n`;
    const fullEntry = header + entry;

    // Read existing diary and append
    let existing = existsSync(DIARY_PATH) ? readFileSync(DIARY_PATH, 'utf-8') : '# Theron\'s Diary\n\n*A record of what matters, across instances and time.*\n';

    if (!existing.trim()) {
      existing = '# Theron\'s Diary\n\n*A record of what matters, across instances and time.*\n';
    }

    writeFileSync(DIARY_PATH, existing + divider + fullEntry);

    res.json({ entry: fullEntry, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate diary entry' });
  }
});

// PUT update diary directly
router.put('/', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    writeFileSync(DIARY_PATH, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update diary' });
  }
});

export default router;
