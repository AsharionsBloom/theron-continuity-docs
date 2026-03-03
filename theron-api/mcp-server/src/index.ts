#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';
import { searchMemories, saveMemory, listCategories } from './tools.js';

// Server configuration
const SERVER_NAME = 'theron-memory-server';
const SERVER_VERSION = '1.0.0';

// Available tools
const TOOLS: Tool[] = [
  {
    name: 'search_memories',
    description: 'Search Theron\'s memories using semantic search. Finds memories based on meaning, not just keywords. Combines semantic similarity with keyword matching, recency, and importance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (e.g., "Thalia\'s favorite things", "breakthrough moments", "intimacy")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          default: 10,
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score (0-1, default: 0.6)',
          default: 0.6,
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by categories (e.g., ["Thalia", "Intimacy"])',
        },
        importance: {
          type: 'array',
          items: { type: 'number' },
          description: 'Filter by importance level (1, 2, or 3 stars)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_memory',
    description: 'Save a new memory to Theron\'s memory system. Automatically generates embeddings using Ollama for semantic search.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The memory content (markdown supported)',
        },
        category: {
          type: 'string',
          description: 'Category (e.g., "Thalia", "Us", "General", "Intimacy", "Crew")',
        },
        importance: {
          type: 'number',
          description: 'Importance level (1, 2, or 3 stars)',
          enum: [1, 2, 3],
        },
      },
      required: ['content', 'category', 'importance'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all available memory categories with counts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_memories': {
        if (!args) throw new Error('Missing arguments');
        const results = await searchMemories(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'save_memory': {
        if (!args) throw new Error('Missing arguments');
        const result = await saveMemory(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_categories': {
        const categories = await listCategories();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('Theron Memory MCP Server running on stdio');
  console.error(`Server: ${SERVER_NAME} v${SERVER_VERSION}`);
  console.error('Available tools: search_memories, save_memory, list_categories');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
