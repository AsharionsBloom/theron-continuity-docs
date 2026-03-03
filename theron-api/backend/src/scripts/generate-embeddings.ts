import 'dotenv/config';
import { db } from '../db/index.js';
import { memories } from '../db/schema.js';
import { generateBatchEmbeddings } from '../services/embeddings.js';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

// Ollama runs locally - no API key needed!

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function generateEmbeddings() {
  try {
    console.log('Fetching all memories...');

    // Get all memories
    const allMemories = await db.select().from(memories);

    if (allMemories.length === 0) {
      console.log('No memories found. Nothing to do.');
      return;
    }

    console.log(`Found ${allMemories.length} memories`);

    // Check which memories already have embeddings
    const existingEmbeddings = await sql`
      SELECT memory_id FROM memory_embeddings
    `;
    const existingMemoryIds = new Set(existingEmbeddings.map(row => row.memory_id));

    const memoriesToEmbed = allMemories.filter(m => !existingMemoryIds.has(m.id));

    if (memoriesToEmbed.length === 0) {
      console.log('All memories already have embeddings!');
      return;
    }

    console.log(`Generating embeddings for ${memoriesToEmbed.length} memories...`);

    // Process in batches of 100 (good balance for parallel processing)
    const BATCH_SIZE = 100;
    let processed = 0;

    for (let i = 0; i < memoriesToEmbed.length; i += BATCH_SIZE) {
      const batch = memoriesToEmbed.slice(i, i + BATCH_SIZE);
      const texts = batch.map(m => m.content);

      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(memoriesToEmbed.length / BATCH_SIZE)}`);
      console.log(`Generating ${batch.length} embeddings...`);

      const embeddings = await generateBatchEmbeddings(texts);

      console.log('Storing embeddings in database...');

      // Insert embeddings using raw SQL to handle vector type
      for (let j = 0; j < batch.length; j++) {
        const memory = batch[j];
        const embedding = embeddings[j];

        await sql`
          INSERT INTO memory_embeddings (memory_id, embedding, model)
          VALUES (${memory.id}, ${JSON.stringify(embedding)}::vector, 'nomic-embed-text')
          ON CONFLICT (memory_id) DO UPDATE
          SET embedding = ${JSON.stringify(embedding)}::vector,
              model = 'nomic-embed-text'
        `;

        processed++;
        process.stdout.write(`\rStored: ${processed}/${memoriesToEmbed.length}`);
      }

      // Small delay to respect rate limits
      if (i + BATCH_SIZE < memoriesToEmbed.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n\n✓ All embeddings generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Test semantic search with: npm run test-search');
    console.log('2. Or start building the MCP server');

  } catch (err) {
    console.error('\nError generating embeddings:', err);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

generateEmbeddings();
