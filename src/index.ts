#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';

// Load environment variables (fallback)
dotenv.config();

// Load configuration from ~/.config/mcps/miro-dev/
const configDir = join(homedir(), '.config', 'mcps', 'miro-dev');
const credentialsPath = join(configDir, 'credentials.json');
const tokensPath = join(configDir, 'tokens.json');

let credentials: any;
try {
  credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  console.error(`[MCP] Loaded credentials from ${credentialsPath}`);
} catch (error) {
  console.error(`[MCP] Error: Could not load credentials from ${credentialsPath}`);
  console.error(`[MCP] Please create the file with clientId, clientSecret, and redirectUri`);
  process.exit(1);
}

// Initialize OAuth2 manager with config file paths
const oauth = new OAuth2Manager(
  credentials.clientId,
  credentials.clientSecret,
  credentials.redirectUri || 'http://localhost:3003/oauth/callback',
  tokensPath
);

// Initialize Miro client
const miroClient = new MiroClient(oauth);

// Create MCP server
const server = new Server(
  {
    name: 'miro-dev',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP] Tool called: ${name}`);
  console.error(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

  try {
    const result = await handleToolCall(name, args || {}, miroClient);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    console.error(`[MCP] Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  console.error('[MCP] Starting Miro MCP Server...');

  // Verify authentication
  try {
    const isValid = await miroClient.verifyAuth();
    if (isValid) {
      console.error('[MCP] Authentication verified successfully');
    } else {
      console.error('[MCP] Warning: Authentication failed. OAuth flow may be needed.');
    }
  } catch (error) {
    console.error('[MCP] Warning: Failed to verify authentication. OAuth flow may be needed.');
    console.error('[MCP] Error:', error);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Server started successfully');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
