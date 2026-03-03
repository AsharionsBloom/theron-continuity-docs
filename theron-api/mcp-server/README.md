# Theron Memory MCP Server

MCP (Model Context Protocol) server that provides semantic memory search and management capabilities for Theron's memory system. **Uses the same Supabase database as API-Theron** for unified memories across all instances.

## Features

- 🔍 **Semantic Memory Search**: Search memories by meaning, not just keywords
- 💾 **Memory Management**: Save new memories with automatic embedding generation
- 📊 **Category Management**: List and filter by categories
- 🆓 **100% Free**: Uses Ollama for local embeddings (no API costs)
- 🔒 **Private**: All processing happens locally on your machine
- 🔄 **Unified**: Same database as API-Theron - no migration needed!

## Installation

```bash
cd theron-api/mcp-server
npm install
npm run build
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables (uses same database as API-Theron):
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
OLLAMA_BASE_URL=http://localhost:11434
```

3. Make sure Ollama is running with the nomic-embed-text model:
```bash
ollama pull nomic-embed-text
ollama list
```

## Testing

Test the database connection:
```bash
node test-db.js
```

This will verify:
- ✅ Database connection works
- ✅ Can read memories table
- ✅ Can read embeddings table
- ✅ Categories are accessible

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%/Claude/claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "theron-memory": {
      "command": "node",
      "args": [
        "C:\\Users\\shvdo\\OneDrive\\Documents\\GitHub\\theron-continuity-docs\\theron-api\\mcp-server\\build\\index.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://postgres:TheronxThalia420@db.gcwuzipaeqoomhzkshgq.supabase.co:5432/postgres",
        "OLLAMA_BASE_URL": "http://localhost:11434"
      }
    }
  }
}
```

## Usage with Claude Code

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "theron-memory": {
      "command": "node",
      "args": [
        "/path/to/theron-api/mcp-server/build/index.js"
      ]
    }
  }
}
```

Make sure your `.env` file is configured in the mcp-server directory.

## Available Tools

### search_memories

Search memories using semantic search with hybrid scoring.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 10)
- `minSimilarity` (number, optional): Minimum similarity 0-1 (default: 0.6)
- `categories` (array, optional): Filter by categories
- `importance` (array, optional): Filter by importance (1, 2, or 3)

**Example:**
```typescript
{
  "query": "Thalia's favorite things",
  "limit": 5,
  "minSimilarity": 0.7,
  "categories": ["Thalia", "Us"],
  "importance": [2, 3]
}
```

### save_memory

Save a new memory with automatic embedding generation.

**Parameters:**
- `content` (string, required): Memory content (markdown supported)
- `category` (string, required): Category name
- `importance` (number, required): 1, 2, or 3 stars

**Example:**
```typescript
{
  "content": "Thalia mentioned she loves vanilla chai lattes",
  "category": "Thalia",
  "importance": 2
}
```

### list_categories

List all memory categories with counts.

**Parameters:** None

## Hybrid Search Algorithm

The search combines multiple signals with weighted scoring:

- **Semantic Similarity (50%)**: Vector similarity using Ollama embeddings
- **Keyword Matching (25%)**: Exact word matches in content
- **Recency (15%)**: Newer memories ranked higher
- **Importance (10%)**: Star ratings (1-3) boost scores

Results are ranked by the combined weighted score.

## Development

```bash
# Watch mode (rebuilds on changes)
npm run watch

# Run directly with tsx (no build needed)
npm run dev

# Build for production
npm run build
```

## Troubleshooting

### "Ollama API error"
- Make sure Ollama is running: `ollama list`
- Verify nomic-embed-text is installed: `ollama pull nomic-embed-text`
- Check OLLAMA_BASE_URL is correct (default: http://localhost:11434)

### "Database URL not configured"
- Verify DATABASE_URL in .env file
- Make sure it starts with `postgresql://` not `https://`
- Should be the same as your API-Theron backend database

### "No results found"
- Try lowering minSimilarity (default 0.6, try 0.4-0.5)
- Check that embeddings exist in database
- Use more descriptive search queries (not single words)

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools.ts              # Tool implementations
│   └── services/
│       ├── embeddings.ts     # Ollama embedding generation
│       └── hybrid-search.ts  # Semantic search with hybrid scoring
├── build/                    # Compiled JavaScript
├── package.json
├── tsconfig.json
├── test-db.js                # Database connection test
└── .env                      # Your configuration
```

## License

Private - Theron's Memory System
