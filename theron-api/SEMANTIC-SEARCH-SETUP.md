# Phase 1: Semantic Search Setup

This phase adds vector embeddings and hybrid search to your existing memory system, preparing it for the MCP server in Phase 2.

## What Was Added

### 1. Database Schema
- **`memory_embeddings` table**: Stores 1536-dimension vector embeddings for each memory
- **pgvector extension**: PostgreSQL extension for efficient vector similarity search
- **HNSW index**: High-performance approximate nearest neighbor search

### 2. Services
- **`embeddings.ts`**: OpenAI API integration for generating embeddings
  - Single embedding generation
  - Batch embedding generation (up to 2048 texts)
  - Semantic search with cosine similarity

- **`hybrid-search.ts`**: Advanced search combining:
  - **Semantic similarity** (50% weight): Finds meanings, not just keywords
  - **Keyword matching** (25% weight): Boosts exact word matches
  - **Recency** (15% weight): Newer memories ranked higher
  - **Importance** (10% weight): Your star ratings matter

### 3. Scripts
- **`migrate-embeddings.ts`**: Sets up pgvector and creates tables
- **`generate-embeddings.ts`**: Generates embeddings for all existing memories
- **`test-search.ts`**: Test your semantic search

## Setup Instructions

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-proj-...
```

**Cost**: `text-embedding-3-small` costs $0.02 per 1M tokens
- ~3,100 memories (like Jasper) ≈ $0.01-0.02 total
- Very affordable!

### Step 2: Run the Migration

```bash
cd theron-api/backend
npm run migrate-embeddings
```

This will:
- Enable the pgvector extension in Supabase
- Create the `memory_embeddings` table
- Create performance indexes

### Step 3: Generate Embeddings

```bash
npm run generate-embeddings
```

This will:
- Fetch all your memories
- Generate embeddings in batches of 100
- Store them in the database
- Take ~1-2 minutes for 3,000 memories

### Step 4: Test Semantic Search

```bash
npm run test-search "Thalia's favorite things"
```

You should see results ranked by relevance with scores broken down by:
- Semantic similarity (how similar the meaning is)
- Keyword matching (exact words found)
- Recency (how recent the memory is)

## How It Works

### Semantic Search Example

**Query**: "sad about family politics"

**Traditional keyword search**: Only finds memories containing "sad", "family", or "politics"

**Semantic search**: Also finds memories like:
- "Feeling disappointed about my brother's political views"
- "Upset after Thanksgiving dinner argument"
- "Grieving the relationship with my dad over Trump"

It understands **meaning**, not just words!

### Hybrid Search Algorithm

For each memory, the system calculates:

1. **Semantic Score** (0-1): Cosine similarity between query and memory embeddings
2. **Keyword Score** (0-1): Percentage of query words found in memory
3. **Recency Score** (0-1): How new the memory is (normalized across all memories)
4. **Importance Score** (0-1): Your star rating (1★=0.33, 2★=0.67, 3★=1.0)

**Final Score** = (0.5 × semantic) + (0.25 × keyword) + (0.15 × recency) + (0.1 × importance)

Results are ranked by this combined score.

## Database Schema

```sql
CREATE TABLE memory_embeddings (
  id UUID PRIMARY KEY,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(memory_id)
);

-- Indexes
CREATE INDEX idx_memory_embeddings_memory_id ON memory_embeddings(memory_id);
CREATE INDEX idx_memory_embeddings_vector ON memory_embeddings USING hnsw (embedding vector_cosine_ops);
```

## API Usage

### Generate Embedding for New Memory

```typescript
import { generateMemoryEmbedding } from './services/embeddings.js';

// After creating a memory
await generateMemoryEmbedding(memoryId);
```

### Search Memories

```typescript
import { hybridSearch } from './services/hybrid-search.js';

const results = await hybridSearch('Thalia loves coffee', {
  limit: 10,
  minSimilarity: 0.6,
  categoryFilter: ['Thalia', 'Us'],
  importanceFilter: [2, 3] // Only 2★ and 3★ memories
});

results.forEach(result => {
  console.log(`${result.content} (score: ${result.score})`);
});
```

## Next Steps

Once semantic search is working, you're ready for **Phase 2: MCP Server** which will:
- Expose these capabilities via MCP protocol
- Add tools for Claude to search and save memories
- Enable access from claude.ai on all devices
- Add diary search tools

## Troubleshooting

### "OPENAI_API_KEY not found"
Make sure you've added it to `.env` file in the backend directory.

### "pgvector extension not found"
Supabase should support pgvector by default. If not, contact Supabase support.

### "No results found"
1. Make sure embeddings were generated: check `memory_embeddings` table
2. Try lowering `minSimilarity` (default is 0.6, try 0.5 or 0.4)
3. Make sure your query is descriptive (not just one word)

### Embeddings generation is slow
This is normal! Generating 3,000 embeddings takes 1-2 minutes due to:
- API rate limits
- Network latency
- Processing time

Batching (100 at a time) makes it much faster than one-by-one.

## Cost Estimate

Based on Jasper's system (~3,100 memories):

**One-time setup**:
- Initial embeddings: ~$0.01-0.02

**Ongoing**:
- New memory (1 embedding): ~$0.000002
- Search query (1 embedding): ~$0.000002
- 1,000 searches/day: ~$0.06/month

Semantic search is incredibly cheap!

## Performance

With the HNSW index:
- 3,000 memories searched in ~10-50ms
- 10,000+ memories searched in ~20-100ms
- Scales to 100,000+ memories

The HNSW (Hierarchical Navigable Small World) index provides:
- Approximate nearest neighbor search
- Sub-linear time complexity
- Trade-off: 95-99% accuracy vs 100% brute force
- In practice: virtually no difference in quality
