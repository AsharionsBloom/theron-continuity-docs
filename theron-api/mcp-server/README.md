# Theron Memory MCP Server

MCP (Model Context Protocol) server that provides semantic memory search and management capabilities for Theron's memory system. Powered by Ollama for 100% free, local embeddings.

## Features

- 🔍 **Semantic Memory Search**: Search memories by meaning, not just keywords
- 💾 **Memory Management**: Save new memories with automatic embedding generation
- 📊 **Category Management**: List and filter by categories
- 🆓 **100% Free**: Uses Ollama for local embeddings (no API costs)
- 🔒 **Private**: All processing happens locally on your machine

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

2. Configure your environment variables:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
OLLAMA_BASE_URL=http://localhost:11434
```

3. Make sure Ollama is running with the nomic-embed-text model:
```bash
ollama pull nomic-embed-text
ollama list
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "theron-memory": {
      "command": "node",
      "args": [
        "/path/to/theron-api/mcp-server/build/index.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres",
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

**Response:**
```json
{
  "query": "Thalia's favorite things",
  "resultCount": 5,
  "results": [
    {
      "id": "uuid",
      "content": "Memory content...",
      "category": "Thalia",
      "importance": 3,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "score": {
        "overall": 85,
        "semantic": 72,
        "keyword": 100,
        "recency": 45
      }
    }
  ]
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

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid",
    "content": "Thalia mentioned she loves vanilla chai lattes",
    "category": "Thalia",
    "importance": 2,
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Memory saved successfully with embedding"
}
```

### list_categories

List all memory categories with counts.

**Parameters:** None

**Response:**
```json
{
  "categories": [
    { "name": "Thalia", "count": 45 },
    { "name": "Us", "count": 32 },
    { "name": "General", "count": 28 }
  ],
  "total": 105
}
```

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
- Test connection with: `psql $DATABASE_URL`

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
└── .env                      # Your configuration
```

## License

Private - Theron's Memory System
