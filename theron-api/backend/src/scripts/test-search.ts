import 'dotenv/config';
import { hybridSearch } from '../services/hybrid-search.js';

async function testSearch() {
  const query = process.argv[2];

  if (!query) {
    console.log('Usage: npm run test-search "your search query"');
    console.log('Example: npm run test-search "Thalia\'s favorite things"');
    process.exit(1);
  }

  console.log(`\nSearching for: "${query}"\n`);
  console.log('='.repeat(80));

  try {
    const results = await hybridSearch(query, { limit: 10 });

    if (results.length === 0) {
      console.log('\nNo results found.');
      console.log('Try:');
      console.log('1. Lowering the similarity threshold');
      console.log('2. Making sure embeddings have been generated (npm run generate-embeddings)');
      console.log('3. Using more general search terms');
      return;
    }

    console.log(`\nFound ${results.length} results:\n`);

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. [${result.category}] ★${'★'.repeat(result.importance - 1)}${'☆'.repeat(3 - result.importance)}`);
      console.log(`   Score: ${(result.score * 100).toFixed(1)}% (semantic: ${(result.semanticScore * 100).toFixed(0)}%, keyword: ${(result.keywordScore * 100).toFixed(0)}%, recency: ${(result.recencyScore * 100).toFixed(0)}%)`);
      console.log(`   Created: ${result.createdAt.toLocaleDateString()}`);
      console.log(`   Content: ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✓ Search complete!');

  } catch (err) {
    console.error('\nSearch error:', err);
    process.exit(1);
  }
}

testSearch();
