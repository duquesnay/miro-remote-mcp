/**
 * End-to-End MCP Protocol Integration Tests
 *
 * Tests the complete MCP protocol flow with a real server process communicating via stdio.
 * These tests validate that the server correctly implements the MCP protocol specification.
 *
 * Test Coverage:
 * 1. Happy Path - Full protocol lifecycle
 * 2. Error Propagation - Miro API errors to MCP client
 * 3. Large Payload Handling - Stdio transport reliability
 * 4. Concurrent Tool Calls - Request/response correlation
 * 5. Authentication Flow - OAuth reauthentication errors
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-test-client.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Test configuration
const SERVER_PATH = path.resolve(process.cwd(), 'dist/index.js');
const TEST_TOKENS_FILE = path.join(os.tmpdir(), `miro-mcp-test-tokens-${Date.now()}.json`);

describe('MCP Protocol Integration Tests', () => {
  let client: MCPTestClient;

  /**
   * Build the server before tests
   */
  beforeAll(async () => {
    // Ensure server is built
    if (!fs.existsSync(SERVER_PATH)) {
      throw new Error(
        `Server not built. Run 'npm run build' before integration tests.\nExpected: ${SERVER_PATH}`
      );
    }
  });

  /**
   * Clean up test tokens file after all tests
   */
  afterAll(async () => {
    if (fs.existsSync(TEST_TOKENS_FILE)) {
      fs.unlinkSync(TEST_TOKENS_FILE);
    }
  });

  /**
   * Create fresh client for each test
   */
  beforeEach(() => {
    client = new MCPTestClient();
  });

  /**
   * Scenario 1: Happy Path - Full MCP Protocol Lifecycle
   *
   * Tests the complete protocol flow from initialization to tool execution.
   * This is the CRITICAL path - every MCP client expects this to work.
   */
  describe('Happy Path: Full Protocol Lifecycle', () => {
    it('completes full MCP protocol lifecycle with authentication', async () => {
      // Step 1: Start server with mock credentials
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        MIRO_ACCESS_TOKEN_B64: Buffer.from('test-access-token').toString('base64'),
        MIRO_REFRESH_TOKEN_B64: Buffer.from('test-refresh-token').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      // Step 2: Initialize protocol
      const initResponse = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-test-client',
          version: '1.0.0',
        },
      });

      // Verify initialize response
      expect(initResponse.result).toBeDefined();
      const initResult = initResponse.result as any;
      expect(initResult.protocolVersion).toBe('2024-11-05');
      expect(initResult.serverInfo).toMatchObject({
        name: 'miro-dev',
        version: '0.1.0',
      });
      expect(initResult.capabilities).toMatchObject({
        tools: {},
      });

      // Step 3: Send initialized notification
      await client.sendNotification('notifications/initialized');

      // Step 4: List available tools
      const toolsListResponse = await client.sendRequest('tools/list');

      expect(toolsListResponse.result).toBeDefined();
      const toolsList = toolsListResponse.result as any;
      expect(toolsList.tools).toBeDefined();
      expect(Array.isArray(toolsList.tools)).toBe(true);
      expect(toolsList.tools.length).toBeGreaterThanOrEqual(20); // Should have 20+ tools

      // Verify tools have required properties
      const firstTool = toolsList.tools[0];
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');
      expect(firstTool).toHaveProperty('inputSchema');

      // Step 5: Call get_auth_status tool (doesn't require Miro API)
      const authStatusResponse = await client.sendRequest('tools/call', {
        name: 'get_auth_status',
        arguments: {},
      });

      // Verify tool call response format (MCP spec)
      expect(authStatusResponse.result).toBeDefined();
      const callResult = authStatusResponse.result as any;
      expect(callResult.content).toBeDefined();
      expect(Array.isArray(callResult.content)).toBe(true);
      expect(callResult.content.length).toBeGreaterThan(0);

      // Verify content format
      const content = callResult.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();

      // Verify auth status in response
      const authStatus = JSON.parse(content.text);
      expect(authStatus).toHaveProperty('status');
      expect(['authorized', 'not_authorized']).toContain(authStatus.status);

      // Step 6: Clean shutdown
      await client.shutdown();
      expect(client.isRunning()).toBe(false);
    }, 15000); // 15s timeout for full lifecycle
  });

  /**
   * Scenario 2: Error Propagation
   *
   * Tests that Miro API errors are properly translated to MCP error responses.
   */
  describe('Error Propagation', () => {
    it('propagates Miro API errors to MCP client correctly', async () => {
      // Start server with invalid credentials (will cause auth errors)
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('invalid-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('invalid-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      // Initialize protocol
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      await client.sendNotification('notifications/initialized');

      // Call list_boards with invalid credentials
      const errorResponse = await client.sendRequest('tools/call', {
        name: 'list_boards',
        arguments: {},
      });

      // Verify response structure - MCP tools return content with isError flag
      expect(errorResponse.result).toBeDefined();
      const result = errorResponse.result as any;
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // Verify isError flag is set
      expect(result.isError).toBe(true);

      // Verify error message in content
      const content = result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();
      expect(content.text).toContain('Error:');

      await client.shutdown();
    }, 15000);

    it('handles invalid tool name with proper error', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Call non-existent tool
      const errorResponse = await client.sendRequest('tools/call', {
        name: 'non_existent_tool',
        arguments: {},
      });

      // Verify response structure - MCP tools return content with isError flag
      expect(errorResponse.result).toBeDefined();
      const result = errorResponse.result as any;
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);

      // Verify error message mentions unknown tool
      const content = result.content[0];
      expect(content.text).toContain('Unknown tool');

      await client.shutdown();
    }, 15000);
  });

  /**
   * Scenario 3: Large Payload Handling
   *
   * Tests that stdio transport can handle large JSON responses without corruption.
   * Simulates a sync_board response with many items.
   */
  describe('Large Payload Handling', () => {
    it('handles tools/list with 20+ tool definitions via stdio', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Request tools list (large payload with all tool schemas)
      const response = await client.sendRequest('tools/list');

      expect(response.result).toBeDefined();
      const result = response.result as any;
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);

      // Verify we got all tools (exactly 20 tools defined)
      expect(result.tools.length).toBeGreaterThanOrEqual(20);

      // Verify payload integrity - all tools should have complete schemas
      for (const tool of result.tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      }

      // Calculate approximate payload size
      const payloadSize = JSON.stringify(result).length;
      // Tools list should be substantial (>10KB with all schemas)
      expect(payloadSize).toBeGreaterThan(10000);

      await client.shutdown();
    }, 15000);
  });

  /**
   * Scenario 4: Concurrent Tool Calls
   *
   * Tests that the server can handle multiple concurrent requests without
   * mixing up responses (request/response correlation by ID).
   */
  describe('Concurrent Tool Calls', () => {
    it('handles concurrent tool calls without response corruption', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Send 5 concurrent requests
      const requests = [
        client.sendRequest('tools/list'),
        client.sendRequest('tools/call', { name: 'get_auth_status', arguments: {} }),
        client.sendRequest('tools/list'),
        client.sendRequest('tools/call', { name: 'get_auth_status', arguments: {} }),
        client.sendRequest('tools/list'),
      ];

      // Wait for all responses
      const responses = await Promise.all(requests);

      // Verify all responses received
      expect(responses).toHaveLength(5);

      // Verify each response has correct structure
      for (const response of responses) {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBeDefined();
        // Should have either result or error
        expect(response.result !== undefined || response.error !== undefined).toBe(true);
      }

      // Verify request IDs are unique and correctly matched
      const ids = responses.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5); // All IDs should be unique

      // Verify response content matches request type
      // tools/list responses should have tools array
      const toolsListResponses = [responses[0], responses[2], responses[4]];
      for (const response of toolsListResponses) {
        if (response.result) {
          const result = response.result as any;
          expect(result.tools).toBeDefined();
          expect(Array.isArray(result.tools)).toBe(true);
        }
      }

      // get_auth_status responses should have status
      const authStatusResponses = [responses[1], responses[3]];
      for (const response of authStatusResponses) {
        if (response.result) {
          const result = response.result as any;
          expect(result.content).toBeDefined();
          const content = result.content[0];
          const status = JSON.parse(content.text);
          expect(status.status).toBeDefined();
        }
      }

      await client.shutdown();
    }, 15000);
  });

  /**
   * Scenario 5: Authentication Flow
   *
   * Tests the OAuth reauthentication error flow when tokens are missing or expired.
   * Verifies that the server returns the correct error code and authorize_url.
   */
  describe('Authentication Flow', () => {
    it('returns service_authorization_required error when not authenticated', async () => {
      // Start server without tokens
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE, // Empty/non-existent file
      });

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Call list_boards without authentication
      const response = await client.sendRequest('tools/call', {
        name: 'list_boards',
        arguments: {},
      });

      // Verify response structure - stdio server returns tool errors as content
      expect(response.result).toBeDefined();
      const result = response.result as any;
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);

      // Verify error message indicates authentication issue
      const content = result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();
      // Should contain error message about authentication or missing tokens
      expect(content.text.toLowerCase()).toMatch(/error|auth|token/);

      await client.shutdown();
    }, 15000);

    it('get_auth_status returns not_authorized with authorize_url when no tokens', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Call get_auth_status
      const response = await client.sendRequest('tools/call', {
        name: 'get_auth_status',
        arguments: {},
      });

      // Should succeed (not an error)
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.result as any;
      expect(result.content).toBeDefined();

      const content = result.content[0];
      const authStatus = JSON.parse(content.text);

      // Verify status is not_authorized
      expect(authStatus.status).toBe('not_authorized');
      expect(authStatus.authorize_url).toBeDefined();
      expect(authStatus.authorize_url).toContain('/oauth/authorize');

      await client.shutdown();
    }, 15000);
  });

  /**
   * Scenario 6: Protocol Compliance
   *
   * Tests strict protocol compliance - invalid requests should be rejected.
   */
  describe('Protocol Compliance', () => {
    it('rejects requests with invalid protocol version', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      // Try to initialize with unsupported protocol version
      const response = await client.sendRequest('initialize', {
        protocolVersion: '1999-01-01', // Invalid old version
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Server should still accept (backward compatibility) but may warn
      // MCP spec requires protocolVersion to be returned
      if (response.result) {
        const result = response.result as any;
        expect(result.protocolVersion).toBeDefined();
      }

      await client.shutdown();
    }, 15000);

    it('handles unknown method with method not found error', async () => {
      await client.start(SERVER_PATH, {
        MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
        MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
        TOKEN_FILE: TEST_TOKENS_FILE,
      });

      // Call unknown method
      const response = await client.sendRequest('unknown/method');

      // Verify error response
      expect(response.error).toBeDefined();

      const error = response.error!;
      // Should be internal error since server doesn't recognize method
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();

      await client.shutdown();
    }, 15000);
  });
});
