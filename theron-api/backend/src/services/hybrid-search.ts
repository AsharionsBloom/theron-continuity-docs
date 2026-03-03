import postgres from 'postgres';
import { db } from '../db/index.js';
import { memories } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import { generateEmbedding } from './embeddings.js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;

export interface SearchResult {
  id: string;
  content: string;
  category: string;
  importance: number;
  createdAt: Date;
  score: number;
  semanticScore: number;
  keywordScore: number;
  recencyScore: number;
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  categoryFilter?: string[];
  importanceFilter?: number[]; // Filter by importance (1, 2, or 3)
}

/**
 * Hybrid search combining semantic similarity, keyword matching, and recency/importance boosting
 *
 * Algorithm:
 * 1. Semantic search: Find memories semantically similar using vector embeddings
 * 2. Keyword boost: If query contains exact words from memory, boost score
 * 3. Recency boost: Newer memories get higher scores
 * 4. Importance boost: Higher importance (1-3 star rating) gets higher scores
 * 5. Combine scores with weights and rank
 */
export async function hybridSearch(
  queryText: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 10,
    minSimilarity = 0.6,
    categoryFilter,
    importanceFilter
  } = options;

  if (!DATABASE_URL) {
    throw new Error('Database URL not configured');
  }

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // Step 2: Semantic search with filters
    let semanticQuery = sql`
      SELECT
        me.memory_id,
        1 - (me.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_similarity
      FROM memory_embeddings me
      WHERE 1 - (me.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${minSimilarity}
    `;

    const semanticResults = await semanticQuery;

    if (semanticResults.length === 0) {
      await sql.end();
      return [];
    }

    // Step 3: Get full memory details
    const memoryIds = semanticResults.map(r => r.memory_id);
    let memoryRecords = await db.select().from(memories).where(inArray(memories.id, memoryIds));

    // Apply category filter
    if (categoryFilter && categoryFilter.length > 0) {
      memoryRecords = memoryRecords.filter(m => categoryFilter.includes(m.category));
    }

    // Apply importance filter
    if (importanceFilter && importanceFilter.length > 0) {
      memoryRecords = memoryRecords.filter(m => importanceFilter.includes(m.importance));
    }

    if (memoryRecords.length === 0) {
      await sql.end();
      return [];
    }

    // Step 4: Calculate hybrid scores
    const queryWords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const now = new Date();
    const oldestDate = new Date(Math.min(...memoryRecords.map(m => new Date(m.createdAt).getTime())));
    const dateRange = now.getTime() - oldestDate.getTime();

    const results: SearchResult[] = memoryRecords.map(memory => {
      const semanticResult = semanticResults.find(r => r.memory_id === memory.id);
      const semanticScore = semanticResult ? parseFloat(semanticResult.semantic_similarity) : 0;

      // Keyword matching score (0-1)
      const contentLower = memory.content.toLowerCase();
      const matchingWords = queryWords.filter(word => contentLower.includes(word)).length;
      const keywordScore = queryWords.length > 0 ? matchingWords / queryWords.length : 0;

      // Recency score (0-1, newer = higher)
      const memoryAge = now.getTime() - new Date(memory.createdAt).getTime();
      const recencyScore = dateRange > 0 ? 1 - (memoryAge / dateRange) : 0.5;

      // Importance score (normalized 0-1)
      const importanceScore = memory.importance / 3;

      // Combined score with weights
      // Weights: semantic=0.5, keyword=0.25, recency=0.15, importance=0.10
      const score =
        semanticScore * 0.50 +
        keywordScore * 0.25 +
        recencyScore * 0.15 +
        importanceScore * 0.10;

      return {
        id: memory.id,
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        createdAt: new Date(memory.createdAt),
        score,
        semanticScore,
        keywordScore,
        recencyScore
      };
    });

    // Sort by combined score and return top results
    results.sort((a, b) => b.score - a.score);

    await sql.end();
    return results.slice(0, limit);

  } catch (err) {
    await sql.end();
    throw err;
  }
}

/**
 * Search memories by category
 */
export async function searchByCategory(
  category: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const memoryRecords = await db
    .select()
    .from(memories)
    .where(eq(memories.category, category))
    .orderBy(desc(memories.importance), desc(memories.createdAt))
    .limit(limit);

  return memoryRecords.map(m => ({
    id: m.id,
    content: m.content,
    category: m.category,
    importance: m.importance,
    createdAt: new Date(m.createdAt),
    score: m.importance / 3, // Normalized importance as score
    semanticScore: 0,
    keywordScore: 0,
    recencyScore: 0
  }));
}

// Import eq and desc
import { eq, desc } from 'drizzle-orm';
