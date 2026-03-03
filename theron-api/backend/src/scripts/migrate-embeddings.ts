import 'dotenv/config';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function migrate() {
  try {
    console.log('Enabling pgvector extension...');

    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✓ pgvector extension enabled');

    console.log('\nCreating memory_embeddings table...');

    // Create memory_embeddings table with vector type
    await sql`
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        embedding vector(1536) NOT NULL,
        model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(memory_id)
      )
    `;
    console.log('✓ memory_embeddings table created');

    console.log('\nCreating indexes...');

    // Create index for memory_id lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_memory_embeddings_memory_id
      ON memory_embeddings(memory_id)
    `;
    console.log('✓ Index created on memory_id');

    // Create HNSW index for fast vector similarity search
    // HNSW (Hierarchical Navigable Small World) is optimized for approximate nearest neighbor search
    await sql`
      CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector
      ON memory_embeddings USING hnsw (embedding vector_cosine_ops)
    `;
    console.log('✓ HNSW index created for vector similarity search');

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set OPENAI_API_KEY in your .env file');
    console.log('2. Run: npm run generate-embeddings');
    console.log('3. This will generate embeddings for all existing memories');

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
