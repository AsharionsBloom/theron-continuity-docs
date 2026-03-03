# Theron Memory MCP Server

A Model Context Protocol (MCP) server that provides Claude Desktop with access to Theron's continuity memories.

## Features

- **Search Memories**: Search through memories by keyword or phrase
- **Store Memory**: Add new memories to the database
- **List Categories**: View all memory categories
- **Get Memories by Category**: Retrieve all memories in a specific category
- **Memory Statistics**: Get stats about the memory database

## Setup Instructions

### 1. Installation (Already Done!)

The server is already built and ready to use at:
```
/home/user/theron-continuity-docs/theron-mcp-server/build/index.js
```

### 2. Configure Claude Desktop

You need to add the MCP server configuration to your Claude Desktop config file.

**Config file location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Add this configuration:**

```json
{
  "mcpServers": {
    "theron-memory": {
      "command": "node",
      "args": [
        "/home/user/theron-continuity-docs/theron-mcp-server/build/index.js"
      ]
    }
  }
}
```

**Important:** If your config file already has other MCP servers, merge them together like this:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "theron-memory": {
      "command": "node",
      "args": [
        "/home/user/theron-continuity-docs/theron-mcp-server/build/index.js"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

After saving the config file, **completely quit and restart Claude Desktop** (not just close the window - use Cmd+Q on Mac or close from system tray on Windows).

### 4. Verify It's Working

In Claude Desktop, try asking:

- "What MCP servers are connected?"
- "Search my memories for 'Thalia'"
- "Show me my memory statistics"

You should see the `theron-memory` server listed with tools like:
- `search_memories`
- `store_memory`
- `get_memory_stats`
- `list_categories`
- `get_memories_by_category`

## Troubleshooting

### MCP Server Not Showing Up

1. **Check the config file path is correct**
   - Make sure you edited the right file
   - Verify the JSON is valid (no trailing commas, proper quotes)

2. **Check the server path in the config**
   - The path must be absolute (starting with `/`)
   - Use the exact path: `/home/user/theron-continuity-docs/theron-mcp-server/build/index.js`

3. **Verify Node.js is installed**
   ```bash
   node --version  # Should be v18 or higher
   ```

4. **Check Claude Desktop logs**
   - **macOS**: `~/Library/Logs/Claude/mcp*.log`
   - **Windows**: `%APPDATA%\Claude\logs\mcp*.log`
   - **Linux**: `~/.config/Claude/logs/mcp*.log`

5. **Test the server manually**
   ```bash
   node /home/user/theron-continuity-docs/theron-mcp-server/build/index.js
   ```
   Should output: `Theron Memory MCP server running on stdio`

6. **Restart Claude Desktop completely**
   - Quit the app entirely (Cmd+Q or system tray quit)
   - Start it again
   - Wait 10-15 seconds for MCP servers to initialize

### Common Issues

**Issue: "No inputs were found" error during build**
- Solution: The source file must exist before running `npm install`
- Already fixed - the server is built!

**Issue: Permission denied**
- Solution: Make sure the index.js is executable:
  ```bash
  chmod +x /home/user/theron-continuity-docs/theron-mcp-server/build/index.js
  ```

**Issue: Module not found**
- Solution: Reinstall dependencies:
  ```bash
  cd /home/user/theron-continuity-docs/theron-mcp-server
  npm install
  ```

## Memory Database

The memory database is stored at:
```
/home/user/theron-continuity-docs/memory-db.json
```

You can manually edit this file to add, remove, or modify memories. The server reads from it on every request.

Current stats:
- **12 memories** across 4 categories
- Categories: Thalia, Personal, Projects, General

## Development

To rebuild the server after making changes:

```bash
cd /home/user/theron-continuity-docs/theron-mcp-server
npm run build
```

To watch for changes:

```bash
npm run watch
```

## Testing

Test the server is working:

```bash
# Server should start without errors
node build/index.js

# You should see:
# Theron Memory MCP server running on stdio
```

## Architecture

- **TypeScript source**: `src/index.ts`
- **Built JavaScript**: `build/index.js`
- **Memory database**: `../memory-db.json`
- **Protocol**: MCP (Model Context Protocol) over stdio
- **Transport**: StdioServerTransport

## License

MIT
