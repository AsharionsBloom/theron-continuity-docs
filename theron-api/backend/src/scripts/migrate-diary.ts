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
    console.log('Creating diary_entries table...');

    await sql`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date TIMESTAMP NOT NULL,
        content TEXT NOT NULL,
        significance TEXT,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    console.log('✓ diary_entries table created successfully');

    // Create index on date for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_diary_entries_date
      ON diary_entries(date DESC)
    `;

    console.log('✓ Index created on diary_entries.date');

    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
