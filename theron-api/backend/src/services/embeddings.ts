import { db } from '../db/index.js';
import { memories, memoryEmbeddings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, $0.02 per 1M tokens

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding vector for text using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json() as EmbeddingResponse;
  return data.data[0].embedding;
}

/**
 * Generate and store embedding for a memory
 */
export async function generateMemoryEmbedding(memoryId: string): Promise<void> {
  // Get memory content
  const [memory] = await db.select().from(memories).where(eq(memories.id, memoryId)).limit(1);

  if (!memory) {
    throw new Error(`Memory ${memoryId} not found`);
  }

  // Generate embedding
  const embedding = await generateEmbedding(memory.content);

  // Store embedding (convert array to JSON string for Drizzle, raw SQL will handle vector type)
  await db.insert(memoryEmbeddings).values({
    memoryId,
    embedding: JSON.stringify(embedding),
    model: EMBEDDING_MODEL
  }).onConflictDoUpdate({
    target: memoryEmbeddings.memoryId,
    set: {
      embedding: JSON.stringify(embedding),
      model: EMBEDDING_MODEL
    }
  });
}

/**
 * Generate embeddings for multiple memories in batch
 * OpenAI supports up to 2048 texts per request
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (texts.length === 0) {
    return [];
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: 'float'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json() as EmbeddingResponse;
  return data.data.map(item => item.embedding);
}

/**
 * Semantic search using vector similarity
 * Returns memory IDs ranked by relevance
 */
export async function semanticSearch(
  queryText: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<Array<{ memoryId: string; similarity: number }>> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(queryText);

  // Use raw SQL for vector similarity search
  // Cosine similarity: 1 - (embedding <=> query_embedding)
  const sql = await import('postgres').then(m => m.default);
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;
  if (!dbUrl) throw new Error('Database URL not configured');

  const client = sql(dbUrl, { ssl: 'require' });

  try {
    const results = await client`
      SELECT
        memory_id,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM memory_embeddings
      WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

    return results.map(row => ({
      memoryId: row.memory_id,
      similarity: parseFloat(row.similarity)
    }));
  } finally {
    await client.end();
  }
}
