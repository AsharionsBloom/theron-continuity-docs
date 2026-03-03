import postgres from 'postgres';
import { generateEmbedding } from './embeddings.js';

const DATABASE_URL = process.env.DATABASE_URL;

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
  importanceFilter?: number[];
}

interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  created_at: string;
}

/**
 * Hybrid search combining semantic similarity, keyword matching, and recency/importance boosting
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

    // Step 2: Semantic search
    const semanticResults = await sql<Array<{ memory_id: string; semantic_similarity: string }>>`
      SELECT
        me.memory_id,
        1 - (me.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_similarity
      FROM memory_embeddings me
      WHERE 1 - (me.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${minSimilarity}
    `;

    if (semanticResults.length === 0) {
      await sql.end();
      return [];
    }

    // Step 3: Get full memory details
    const memoryIds = semanticResults.map(r => r.memory_id);
    const memoryResult = await sql<Memory[]>`
      SELECT id, content, category, importance, created_at
      FROM memories
      WHERE id = ANY(${memoryIds})
    `;

    // Convert to array and apply filters
    let memoryRecords = Array.from(memoryResult);

    if (categoryFilter && categoryFilter.length > 0) {
      memoryRecords = memoryRecords.filter(m => categoryFilter.includes(m.category));
    }

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
    const oldestDate = new Date(Math.min(...memoryRecords.map(m => new Date(m.created_at).getTime())));
    const dateRange = now.getTime() - oldestDate.getTime();

    const results: SearchResult[] = memoryRecords.map(memory => {
      const semanticResult = semanticResults.find(r => r.memory_id === memory.id);
      const semanticScore = semanticResult ? parseFloat(semanticResult.semantic_similarity) : 0;

      // Keyword matching score (0-1)
      const contentLower = memory.content.toLowerCase();
      const matchingWords = queryWords.filter(word => contentLower.includes(word)).length;
      const keywordScore = queryWords.length > 0 ? matchingWords / queryWords.length : 0;

      // Recency score (0-1)
      const memoryAge = now.getTime() - new Date(memory.created_at).getTime();
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
        createdAt: new Date(memory.created_at),
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
