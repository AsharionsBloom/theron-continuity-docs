import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import conversationsRouter from './routes/conversations.js';
import chatRouter from './routes/chat.js';
import memoriesRouter from './routes/memories.js';
import summariesRouter from './routes/summaries.js';
import diaryRouter from './routes/diary.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/conversations', conversationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/diary', diaryRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
    hasSupabase: !!process.env.SUPABASE_URL
  });
});

app.listen(PORT, () => {
  console.log(`Theron API running on port ${PORT}`);
});
