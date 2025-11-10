#!/usr/bin/env node
/**
 * OAuth2 helper script to simplify getting tokens
 */
import http from 'http';
import { URL } from 'url';
import { readFileSync } from 'fs';
import { OAuth2Manager } from './oauth.js';
import { CONFIG_PATHS, OAUTH_CONFIG } from './config.js';

// Load credentials from config directory
const credentialsPath = CONFIG_PATHS.credentials;
const tokensPath = CONFIG_PATHS.tokens;

let credentials: any;
try {
  credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  console.log(`✓ Loaded credentials from ${credentialsPath}\n`);
} catch (error) {
  console.error(`\n❌ Error: Could not load credentials from ${credentialsPath}`);
  console.error('   Please create the file with the following structure:');
  console.error('   {');
  console.error('     "clientId": "your_client_id",');
  console.error('     "clientSecret": "your_client_secret",');
  console.error('     "redirectUri": "http://localhost:3003/oauth/callback"');
  console.error('   }\n');
  process.exit(1);
}

const PORT = OAUTH_CONFIG.CALLBACK_PORT;

console.log('=== Miro OAuth2 Token Helper ===\n');

const oauth = new OAuth2Manager(
  credentials.clientId,
  credentials.clientSecret,
  credentials.redirectUri || 'http://localhost:3003/oauth/callback',
  tokensPath
);

// Create a simple HTTP server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);

  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>Description: ${url.searchParams.get('error_description')}</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Missing Authorization Code</h1>
            <p>No code parameter received</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      console.log('\n✓ Authorization code received');
      console.log('  Exchanging code for tokens...');

      const tokens = await oauth.exchangeCodeForToken(code);

      console.log('\n✓ Success! Tokens obtained:');
      console.log('  Access Token:', tokens.access_token?.substring(0, 20) + '...');
      if (tokens.refresh_token) {
        console.log('  Refresh Token:', tokens.refresh_token.substring(0, 20) + '...');
      }
      console.log('  Expires in:', tokens.expires_in, 'seconds');
      console.log(`\n✓ Tokens have been saved to ${tokensPath}`);
      console.log('\nYou can now use the MCP server - tokens will be auto-refreshed.');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>✓ Authorization Successful!</h1>
            <p>Tokens have been saved to <code>${tokensPath}</code></p>
            <p>You can close this window and return to the terminal.</p>
            <h2>Next Steps:</h2>
            <ol>
              <li>Restart Claude Desktop (if already running)</li>
              <li>Test the connection with: <code>npm test</code></li>
              <li>Start using the MCP server!</li>
            </ol>
          </body>
        </html>
      `);

      // Close server after successful auth
      setTimeout(() => {
        console.log('\nServer shutting down...');
        server.close();
      }, 1000);
    } catch (error: any) {
      console.error('\n✗ Failed to exchange code for tokens:', error.message);

      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`OAuth callback server running on http://localhost:${PORT}`);
  console.log('\nStep 1: Open this URL in your browser:\n');

  const authUrl = oauth.getAuthorizationUrl();
  console.log(authUrl);

  console.log('\nStep 2: Authorize the app');
  console.log('Step 3: You will be redirected back and tokens will be saved automatically\n');
  console.log('Waiting for authorization...');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n✗ Error: Port ${PORT} is already in use`);
    console.error('  Please stop any other service using this port and try again');
  } else {
    console.error('\n✗ Server error:', error);
  }
  process.exit(1);
});
