import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';
import { handleToolCall, TOOL_DEFINITIONS } from './tools.js';
import { OAUTH_CONFIG } from './config.js';

// JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

// Scaleway Functions event structure
interface ScalewayEvent {
  httpMethod: string;
  path: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ScalewayContext {
  requestId: string;
  functionName: string;
  functionVersion: string;
}

interface ApiResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

// JSON-RPC helpers
function jsonRpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', result, id };
}

function jsonRpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', error: { code, message }, id };
}

function apiResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Initialize OAuth with tokens from base64-encoded environment variables
 */
async function initializeServerlessOAuth(
  clientId: string,
  clientSecret: string
): Promise<OAuth2Manager> {
  const accessTokenB64 = process.env.MIRO_ACCESS_TOKEN_B64;
  const refreshTokenB64 = process.env.MIRO_REFRESH_TOKEN_B64;

  if (!accessTokenB64) {
    throw new Error('MIRO_ACCESS_TOKEN_B64 environment variable not set');
  }

  const accessToken = Buffer.from(accessTokenB64, 'base64').toString('utf-8');
  const refreshToken = refreshTokenB64
    ? Buffer.from(refreshTokenB64, 'base64').toString('utf-8')
    : '';

  const oauth = new OAuth2Manager(
    clientId,
    clientSecret,
    OAUTH_CONFIG.DEFAULT_REDIRECT_URI,
    '/tmp/tokens.json'
  );

  await oauth.setTokens(accessToken, refreshToken, 3600);
  return oauth;
}

class MiroFunctionHandler {
  private miroClient: MiroClient | null = null;
  private initialized = false;

  async initializeMiroClient(): Promise<boolean> {
    if (this.initialized && this.miroClient) return true;

    try {
      const clientIdB64 = process.env.MIRO_CLIENT_ID_B64;
      const clientSecretB64 = process.env.MIRO_CLIENT_SECRET_B64;

      if (!clientIdB64 || !clientSecretB64) {
        throw new Error('MIRO_CLIENT_ID_B64 or MIRO_CLIENT_SECRET_B64 not set');
      }

      const clientId = Buffer.from(clientIdB64, 'base64').toString('utf-8');
      const clientSecret = Buffer.from(clientSecretB64, 'base64').toString('utf-8');

      const oauth = await initializeServerlessOAuth(clientId, clientSecret);

      if (!oauth.hasTokens()) {
        throw new Error('No Miro tokens available');
      }

      this.miroClient = new MiroClient(oauth);

      if (!await this.miroClient.verifyAuth()) {
        throw new Error('Miro authentication failed');
      }

      this.initialized = true;
      console.log('✅ Miro API initialized');
      return true;
    } catch (error) {
      console.error('❌ Miro init failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  async handleRequest(event: ScalewayEvent): Promise<ApiResponse> {
    const { httpMethod, path, body } = event;

    // Health check
    if (path === '/health' && httpMethod === 'GET') {
      const isAuth = this.miroClient ? await this.miroClient.verifyAuth() : false;
      return apiResponse(200, {
        status: 'ok',
        service: 'miro-mcp',
        authenticated: isAuth,
        tools: TOOL_DEFINITIONS.length,
      });
    }

    // MCP JSON-RPC endpoint
    if (path === '/mcp' && httpMethod === 'POST') {
      if (!body) {
        return apiResponse(400, jsonRpcError(null, -32600, 'Empty request body'));
      }

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(body);
      } catch {
        return apiResponse(400, jsonRpcError(null, -32700, 'Parse error'));
      }

      const { method, params, id } = request;

      // Handle MCP methods
      if (method === 'initialize') {
        return apiResponse(200, jsonRpcSuccess(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'miro-mcp', version: '0.1.0' },
          capabilities: { tools: {} },
        }));
      }

      if (method === 'notifications/initialized') {
        return apiResponse(200, jsonRpcSuccess(id, {}));
      }

      if (method === 'tools/list') {
        return apiResponse(200, jsonRpcSuccess(id, { tools: TOOL_DEFINITIONS }));
      }

      if (method === 'tools/call') {
        // Initialize Miro client if needed
        if (!this.initialized) {
          const success = await this.initializeMiroClient();
          if (!success) {
            return apiResponse(200, jsonRpcError(id, -32603, 'Failed to initialize Miro API'));
          }
        }

        const toolName = (params as { name?: string })?.name;
        const toolArgs = (params as { arguments?: Record<string, unknown> })?.arguments || {};

        if (!toolName) {
          return apiResponse(200, jsonRpcError(id, -32602, 'Missing tool name'));
        }

        const toolExists = TOOL_DEFINITIONS.some(t => t.name === toolName);
        if (!toolExists) {
          return apiResponse(200, jsonRpcError(id, -32601, `Unknown tool: ${toolName}`));
        }

        try {
          const result = await handleToolCall(toolName, toolArgs, this.miroClient!);
          return apiResponse(200, jsonRpcSuccess(id, result));
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Tool execution failed';
          return apiResponse(200, jsonRpcError(id, -32603, msg));
        }
      }

      return apiResponse(200, jsonRpcError(id, -32601, `Method not found: ${method}`));
    }

    return apiResponse(404, { error: 'Not found' });
  }
}

const miroHandler = new MiroFunctionHandler();

export const handler = async (event: ScalewayEvent, context: ScalewayContext): Promise<ApiResponse> => {
  console.log(`🚀 MCP Miro [${context.requestId}] ${event.httpMethod} ${event.path}`);
  return await miroHandler.handleRequest(event);
};
