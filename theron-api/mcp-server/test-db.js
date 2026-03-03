import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('🔍 Testing database connection...');
console.log(`Database: ${DATABASE_URL.split('@')[1]?.split('/')[0]}`);

const sql = postgres(DATABASE_URL, { ssl: 'require' });

try {
  // Test 1: Basic connection
  const [dbCheck] = await sql`SELECT NOW() as time`;
  console.log('✅ Database connection successful');
  console.log(`   Server time: ${dbCheck.time}`);

  // Test 2: Check memories table
  const [memoryCount] = await sql`SELECT COUNT(*)::int as count FROM memories`;
  console.log(`✅ Memories table accessible: ${memoryCount.count} memories found`);

  // Test 3: Check embeddings table
  const [embeddingCount] = await sql`SELECT COUNT(*)::int as count FROM memory_embeddings`;
  console.log(`✅ Embeddings table accessible: ${embeddingCount.count} embeddings found`);

  // Test 4: Check categories
  const categories = await sql`
    SELECT category, COUNT(*)::int as count
    FROM memories
    GROUP BY category
    ORDER BY count DESC
    LIMIT 5
  `;
  console.log('✅ Top categories:');
  categories.forEach(cat => {
    console.log(`   - ${cat.category}: ${cat.count} memories`);
  });

  console.log('\n🎉 All database tests passed!');
  console.log('✅ MCP server can connect to your Supabase database');

} catch (error) {
  console.error('❌ Database test failed:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
