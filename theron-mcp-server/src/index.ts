#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

// Memory storage interface
interface Memory {
  id: string;
  content: string;
  category: string;
  tags: string[];
  timestamp: string;
  metadata?: Record<string, any>;
}

interface MemoryDatabase {
  memories: Memory[];
  categories: string[];
  lastUpdated: string;
}

// Path to the memory database
const MEMORY_DB_PATH = path.join(
  process.env.HOME || "/home/user",
  "theron-continuity-docs",
  "memory-db.json"
);

// Helper function to read the memory database
async function readMemoryDb(): Promise<MemoryDatabase> {
  try {
    const data = await fs.readFile(MEMORY_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty database
    return {
      memories: [],
      categories: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Helper function to write the memory database
async function writeMemoryDb(db: MemoryDatabase): Promise<void> {
  db.lastUpdated = new Date().toISOString();
  await fs.writeFile(MEMORY_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Helper function to search memories
function searchMemories(
  memories: Memory[],
  query: string,
  category?: string
): Memory[] {
  const lowerQuery = query.toLowerCase();
  return memories.filter((memory) => {
    const matchesQuery =
      memory.content.toLowerCase().includes(lowerQuery) ||
      memory.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

    const matchesCategory = category
      ? memory.category.toLowerCase() === category.toLowerCase()
      : true;

    return matchesQuery && matchesCategory;
  });
}

// Create server instance
const server = new Server(
  {
    name: "theron-memory",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_memories",
        description:
          "Search through Theron's continuity memories by keyword or phrase. Returns matching memories with their content, category, and tags.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search term or phrase to look for in memories",
            },
            category: {
              type: "string",
              description: "Optional: Filter by category (e.g., 'Thalia', 'Personal', 'General')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "store_memory",
        description:
          "Store a new memory in the continuity database. Memories help maintain context across conversations.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The memory content to store",
            },
            category: {
              type: "string",
              description: "Category for this memory (e.g., 'Thalia', 'Personal', 'General')",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional tags for easier searching",
            },
          },
          required: ["content", "category"],
        },
      },
      {
        name: "list_categories",
        description: "List all available memory categories",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_memories_by_category",
        description: "Get all memories in a specific category",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "The category to retrieve memories from",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "get_memory_stats",
        description: "Get statistics about the memory database (total memories, categories, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const db = await readMemoryDb();

    switch (name) {
      case "search_memories": {
        const { query, category } = args as { query: string; category?: string };
        const results = searchMemories(db.memories, query, category);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  category: category || "all",
                  count: results.length,
                  results: results.map((m) => ({
                    id: m.id,
                    content: m.content,
                    category: m.category,
                    tags: m.tags,
                    timestamp: m.timestamp,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "store_memory": {
        const { content, category, tags } = args as {
          content: string;
          category: string;
          tags?: string[];
        };

        const newMemory: Memory = {
          id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          category,
          tags: tags || [],
          timestamp: new Date().toISOString(),
        };

        db.memories.push(newMemory);

        // Add category if it doesn't exist
        if (!db.categories.includes(category)) {
          db.categories.push(category);
        }

        await writeMemoryDb(db);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  memory: newMemory,
                  message: "Memory stored successfully",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_categories": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  categories: db.categories,
                  count: db.categories.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_memories_by_category": {
        const { category } = args as { category: string };
        const memories = db.memories.filter(
          (m) => m.category.toLowerCase() === category.toLowerCase()
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  category,
                  count: memories.length,
                  memories: memories.map((m) => ({
                    id: m.id,
                    content: m.content,
                    tags: m.tags,
                    timestamp: m.timestamp,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_memory_stats": {
        const stats = {
          totalMemories: db.memories.length,
          categories: db.categories.length,
          categoriesBreakdown: db.categories.map((cat) => ({
            category: cat,
            count: db.memories.filter((m) => m.category === cat).length,
          })),
          lastUpdated: db.lastUpdated,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
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
          type: "text",
          text: JSON.stringify(
            {
              error: errorMessage,
              tool: name,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Theron Memory MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
