import postgres from 'postgres';
import { generateEmbedding } from './services/embeddings.js';
import { hybridSearch, SearchOptions } from './services/hybrid-search.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

interface SearchMemoriesArgs {
  query: string;
  limit?: number;
  minSimilarity?: number;
  categories?: string[];
  importance?: number[];
}

interface SaveMemoryArgs {
  content: string;
  category: string;
  importance: number;
}

/**
 * Search memories using hybrid semantic search
 */
export async function searchMemories(args: SearchMemoriesArgs) {
  const options: SearchOptions = {
    limit: args.limit || 10,
    minSimilarity: args.minSimilarity || 0.6,
    categoryFilter: args.categories,
    importanceFilter: args.importance,
  };

  const results = await hybridSearch(args.query, options);

  return {
    query: args.query,
    resultCount: results.length,
    results: results.map(r => ({
      id: r.id,
      content: r.content,
      category: r.category,
      importance: r.importance,
      createdAt: r.createdAt.toISOString(),
      score: {
        overall: Math.round(r.score * 100),
        semantic: Math.round(r.semanticScore * 100),
        keyword: Math.round(r.keywordScore * 100),
        recency: Math.round(r.recencyScore * 100),
      },
    })),
  };
}

/**
 * Save a new memory with automatic embedding generation
 */
export async function saveMemory(args: SaveMemoryArgs) {
  const { content, category, importance } = args;

  // Validate importance
  if (![1, 2, 3].includes(importance)) {
    throw new Error('Importance must be 1, 2, or 3');
  }

  // Insert memory
  const [memory] = await sql<Array<{ id: string; created_at: string }>>`
    INSERT INTO memories (content, category, importance)
    VALUES (${content}, ${category}, ${importance})
    RETURNING id, created_at
  `;

  // Generate and store embedding
  const embedding = await generateEmbedding(content);

  await sql`
    INSERT INTO memory_embeddings (memory_id, embedding, model)
    VALUES (${memory.id}, ${JSON.stringify(embedding)}::vector, 'nomic-embed-text')
  `;

  return {
    success: true,
    memory: {
      id: memory.id,
      content,
      category,
      importance,
      createdAt: memory.created_at,
    },
    message: 'Memory saved successfully with embedding',
  };
}

/**
 * List all categories with memory counts
 */
export async function listCategories() {
  const results = await sql<Array<{ category: string; count: number }>>`
    SELECT category, COUNT(*)::int as count
    FROM memories
    GROUP BY category
    ORDER BY count DESC
  `;

  return {
    categories: results.map(r => ({
      name: r.category,
      count: r.count,
    })),
    total: results.reduce((sum, r) => sum + r.count, 0),
  };
}
