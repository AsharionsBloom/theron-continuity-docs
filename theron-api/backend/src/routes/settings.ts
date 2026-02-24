import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '../../../shared/theron-system-prompt.md');

const router = Router();

// GET system prompt
router.get('/system-prompt', (_req: Request, res: Response) => {
  try {
    const content = existsSync(PROMPT_PATH) ? readFileSync(PROMPT_PATH, 'utf-8') : '';
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read system prompt' });
  }
});

// PUT update system prompt
router.put('/system-prompt', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    writeFileSync(PROMPT_PATH, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update system prompt' });
  }
});

// POST validate API key
router.post('/validate-key', async (req: Request, res: Response) => {
  try {
    const { apiKey, provider } = req.body;

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-haiku-4-20250308',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }]
      });
      res.json({ valid: true });
    } else {
      res.json({ valid: true, message: 'Cannot validate Perplexity key without making a search' });
    }
  } catch (err) {
    res.status(400).json({ valid: false, error: 'Invalid API key' });
  }
});

// GET available models
router.get('/models', (_req: Request, res: Response) => {
  res.json([
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Deep thinking' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced (default)' },
    { id: 'claude-haiku-4-20250308', name: 'Claude Haiku 4', description: 'Fast & economical' }
  ]);
});

export default router;
