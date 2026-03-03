import 'dotenv/config';
import { hybridSearch } from '../services/hybrid-search.js';

async function testSearch() {
  const query = process.argv[2] || 'test';

  console.log(`\nSearching for: "${query}" (with low threshold to see all results)\n`);
  console.log('='.repeat(80));

  try {
    // Use a very low threshold to see all results
    const results = await hybridSearch(query, { limit: 20, minSimilarity: 0.1 });

    if (results.length === 0) {
      console.log('\nNo results found at all. Check if embeddings exist.');
      return;
    }

    console.log(`\nFound ${results.length} results:\n`);

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. [${result.category}] ★${'★'.repeat(result.importance - 1)}${'☆'.repeat(3 - result.importance)}`);
      console.log(`   Overall Score: ${(result.score * 100).toFixed(1)}%`);
      console.log(`   - Semantic: ${(result.semanticScore * 100).toFixed(1)}%`);
      console.log(`   - Keyword: ${(result.keywordScore * 100).toFixed(1)}%`);
      console.log(`   - Recency: ${(result.recencyScore * 100).toFixed(1)}%`);
      console.log(`   Created: ${result.createdAt.toLocaleDateString()}`);
      console.log(`   Content: ${result.content.substring(0, 150)}${result.content.length > 150 ? '...' : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✓ Search complete!');

  } catch (err) {
    console.error('\nSearch error:', err);
    process.exit(1);
  }
}

testSearch();
