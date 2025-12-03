/**
 * MCP Test Client - Helper for E2E protocol testing
 *
 * Spawns a real MCP server process and communicates via stdio transport.
 * Handles JSON-RPC request/response correlation and message buffering.
 */
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

/**
 * Test client for MCP protocol E2E testing
 * Spawns real server process and communicates via stdio
 */
export class MCPTestClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';
  private serverReady = false;

  /**
   * Start the MCP server process
   */
  async start(serverPath: string = 'dist/index.js', env?: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn the server process
      this.process = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...env,
        },
      });

      if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
        reject(new Error('Failed to create stdio streams'));
        return;
      }

      // Set up stdout handler for JSON-RPC responses
      this.process.stdout.on('data', (data: Buffer) => {
        this.handleServerOutput(data.toString());
      });

      // Capture stderr for logging (server uses stderr for logs)
      this.process.stderr.on('data', (data: Buffer) => {
        const logs = data.toString();
        this.emit('stderr', logs);

        // Server signals readiness via stderr
        if (logs.includes('Server started successfully')) {
          this.serverReady = true;
          resolve();
        }
      });

      // Handle process errors
      this.process.on('error', (error) => {
        reject(new Error(`Server process error: ${error.message}`));
      });

      // Handle unexpected exit
      this.process.on('exit', (code, signal) => {
        if (!this.serverReady) {
          reject(new Error(`Server exited prematurely: code=${code}, signal=${signal}`));
        }
        this.emit('exit', code, signal);
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        if (!this.serverReady) {
          this.shutdown();
          reject(new Error('Server startup timeout (10s)'));
        }
      }, 10000);
    });
  }

  /**
   * Handle stdout data from server
   * Buffers data and processes complete JSON-RPC messages
   */
  private handleServerOutput(data: string): void {
    this.buffer += data;

    // Process all complete messages in buffer (newline-delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as JSONRPCResponse;
        this.handleResponse(message);
      } catch (error) {
        this.emit('parse-error', line, error);
      }
    }
  }

  /**
   * Handle parsed JSON-RPC response
   */
  private handleResponse(response: JSONRPCResponse): void {
    if (response.id === null || response.id === undefined) {
      // Notification (no response expected)
      this.emit('notification', response);
      return;
    }

    // Match response to pending request
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
    } else {
      this.emit('unexpected-response', response);
    }
  }

  /**
   * Send JSON-RPC request and wait for response
   */
  async sendRequest(
    method: string,
    params?: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server not started');
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Register pending request
      this.pendingRequests.set(id, { resolve, reject });

      // Send request (newline-delimited JSON)
      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(new Error(`Failed to send request: ${error.message}`));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 5000);
    });
  }

  /**
   * Send JSON-RPC notification (no response expected)
   */
  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Server not started');
    }

    const notification: JSONRPCNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const message = JSON.stringify(notification) + '\n';
    return new Promise((resolve, reject) => {
      this.process!.stdin!.write(message, (error) => {
        if (error) {
          reject(new Error(`Failed to send notification: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get stderr logs captured so far
   */
  getStderrLogs(): string[] {
    const logs: string[] = [];
    this.on('stderr', (log) => logs.push(log));
    return logs;
  }

  /**
   * Shutdown the server process
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.once('exit', () => {
        this.process = null;
        this.pendingRequests.clear();
        this.buffer = '';
        resolve();
      });

      // Graceful shutdown
      this.process.stdin?.end();
      this.process.kill('SIGTERM');

      // Force kill after 2 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 2000);
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
