/**
 * Local HTTP server for testing the MCP handler before deployment.
 * Wraps the Scaleway Functions handler in an Express server.
 *
 * Usage:
 *   npm run dev:http
 *   curl http://localhost:3000/health
 *   curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" \
 *     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
 */
import express from 'express';
import { handler } from './functions-handler.js';

const app = express();
app.use(express.json());

// Adapt Express requests to Scaleway Functions event format
app.all('*', async (req, res) => {
  const event = {
    httpMethod: req.method,
    path: req.path,
    body: req.body ? JSON.stringify(req.body) : undefined,
    queryStringParameters: req.query as Record<string, string>,
    headers: req.headers as Record<string, string>,
  };

  const context = {
    requestId: crypto.randomUUID(),
    functionName: 'miro-mcp-local',
    functionVersion: 'dev',
  };

  const response = await handler(event, context);

  res.status(response.statusCode);
  Object.entries(response.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.send(response.body);
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Miro MCP server running on http://localhost:${PORT}`);
  console.log(`   Health: GET /health`);
  console.log(`   MCP:    POST /mcp`);
});

// Graceful shutdown for container orchestration
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force exit after 10s if connections don't close
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
