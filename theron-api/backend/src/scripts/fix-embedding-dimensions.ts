import 'dotenv/config';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function fixDimensions() {
  try {
    console.log('Dropping existing memory_embeddings table...');

    // Drop the existing table
    await sql`DROP TABLE IF EXISTS memory_embeddings CASCADE`;
    console.log('✓ Table dropped');

    console.log('\nRecreating memory_embeddings table with 768 dimensions...');

    // Recreate with correct dimensions for Ollama nomic-embed-text
    await sql`
      CREATE TABLE memory_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        embedding vector(768) NOT NULL,
        model TEXT NOT NULL DEFAULT 'nomic-embed-text',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(memory_id)
      )
    `;
    console.log('✓ Table recreated with 768 dimensions');

    console.log('\nRecreating indexes...');

    // Create index for memory_id lookups
    await sql`
      CREATE INDEX idx_memory_embeddings_memory_id
      ON memory_embeddings(memory_id)
    `;
    console.log('✓ Index created on memory_id');

    // Create HNSW index for fast vector similarity search
    await sql`
      CREATE INDEX idx_memory_embeddings_vector
      ON memory_embeddings USING hnsw (embedding vector_cosine_ops)
    `;
    console.log('✓ HNSW index created for vector similarity search');

    console.log('\n✓ Fix completed successfully!');
    console.log('\nNext steps:');
    console.log('Run: npm run generate-embeddings');
    console.log('This will generate embeddings for all your memories using Ollama');

  } catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixDimensions();
