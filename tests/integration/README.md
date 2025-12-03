# Miro API Integration Tests

Comprehensive integration tests that validate actual Miro API interactions, not mocks.

## Purpose

These tests validate the most critical risk: **"Does our code actually work with Miro's API?"**

Unit tests can't answer this because they use mocks. E2E tests use fake tokens. Only live API tests can validate:
- OAuth token refresh with real tokens
- CRUD operations against real Miro boards
- Error handling with real API responses
- Rate limit tracking with real headers
- Batch operations at scale
- Pagination with real cursors

## Test Coverage

### Critical Tests (Must Pass)
- **OAuth Token Lifecycle**: Refresh expired tokens, prevent race conditions
- **Board CRUD**: Create, read, list boards
- **Rate Limit Tracking**: Track headers, handle rapid requests

### High Priority Tests
- **Item Operations**: Create/update/delete sticky notes, shapes, frames, connectors
- **Error Handling**: 400, 401, 404 responses with actionable diagnostics

### Medium Priority Tests
- **Batch Operations**: Create 50+ items, parallel updates, partial failures
- **Board Sync**: Sync 20+ items of different types in < 10s
- **Search**: Filter by content and type

## Prerequisites

### 1. Create Test Miro Account

**CRITICAL: Use a dedicated test account, not production!**

1. Go to https://miro.com/signup/
2. Create account: `test-miro-mcp@yourdomain.com` (or similar)
3. Verify email

### 2. Create Test OAuth App

1. Log into test account
2. Go to https://miro.com/app/settings/user-profile/apps
3. Click **Create new app**
4. Fill in:
   - **App name**: `Miro MCP Test`
   - **Description**: `Integration testing for Miro MCP server`
   - **Redirect URI**: `http://localhost:3003/oauth/callback`
5. Click **Create**
6. Copy **Client ID** and **Client secret**

### 3. Configure Test Environment

```bash
# Copy example file
cp .env.test.example .env.test

# Edit .env.test and fill in credentials from step 2
# MIRO_TEST_CLIENT_ID=<your_test_client_id>
# MIRO_TEST_CLIENT_SECRET=<your_test_client_secret>
```

### 4. Generate Refresh Token

```bash
# Temporarily copy test credentials to main .env
cp .env .env.backup
cat > .env << EOF
MIRO_CLIENT_ID=<your_test_client_id>
MIRO_CLIENT_SECRET=<your_test_client_secret>
MIRO_REDIRECT_URI=http://localhost:3003/oauth/callback
EOF

# Run OAuth helper
npm run oauth

# Follow prompts:
# 1. Authorization URL will open in browser
# 2. Log into TEST account (not production!)
# 3. Authorize the app
# 4. Copy authorization code from redirect URL
# 5. Paste code into terminal
# 6. Tokens saved to tokens.json

# Copy refresh token to .env.test
cat tokens.json
# Copy the "refresh_token" value to MIRO_TEST_REFRESH_TOKEN in .env.test

# Restore original .env
mv .env.backup .env
```

### 5. Verify Setup

```bash
# Test configuration should be valid
npm run test:integration:miro

# Expected output:
# ✓ OAuth Token Lifecycle (2 tests)
# ✓ Board Lifecycle (2 tests)
# ✓ Item Operations (7 tests)
# ...
```

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run only Miro API tests
npm run test:integration:miro

# Run in watch mode
npm run test:watch tests/integration/miro-api.test.ts

# Run with verbose output
npm run test:integration:miro -- --reporter=verbose

# Run specific test suite
npm run test:integration:miro -- -t "OAuth Token Lifecycle"
```

## Test Behavior

### Graceful Skipping

If `MIRO_TEST_*` environment variables are missing, tests skip gracefully:

```
⚠️  Miro API integration tests skipped - missing credentials
   Copy .env.test.example to .env.test and configure test credentials

Test Files  1 passed (1)
     Tests  27 skipped
```

This allows CI/CD to run without credentials, and developers to opt-in to integration testing.

### Test Isolation

Each test:
1. Creates its own test board with unique timestamp: `[MCP Test 1733227845123] Board Name`
2. Performs operations on that board
3. Tracks board for cleanup
4. Doesn't depend on other tests

### Cleanup

**Important: Miro API doesn't support board deletion!**

After tests run:
```
🧹 Cleanup: 12 boards processed
   12 cleanup warnings (see above)
```

Boards are tracked but not deleted. Periodically clean up manually:
1. Go to https://miro.com/app/dashboard/
2. Filter boards by name: `[MCP Test`
3. Select all test boards
4. Delete manually

## Expected Duration

- **Full suite**: ~30-60 seconds
- **OAuth tests**: ~5-10 seconds
- **Batch tests**: ~15-30 seconds (creating 50+ items)

## Troubleshooting

### Tests fail with "No tokens available"

**Cause**: Refresh token is invalid or expired

**Solution**:
1. Re-run `npm run oauth` with test credentials
2. Copy new `refresh_token` to `.env.test`

### Tests fail with 401 Unauthorized

**Cause**: Client ID/secret mismatch or app not authorized

**Solution**:
1. Verify credentials in `.env.test` match OAuth app
2. Check you're using test account, not production
3. Re-authorize app via `npm run oauth`

### Tests timeout

**Cause**: Network issues or Miro API slowness

**Solution**:
1. Check internet connection
2. Retry tests (Miro API can be slow sometimes)
3. Increase timeout: `npm run test:integration:miro -- --timeout=30000`

### Rate limit errors

**Cause**: Too many test runs in short period

**Solution**:
1. Wait 60 seconds before retrying
2. Reduce test frequency
3. Miro rate limits are generous (100 req/min typically)

### "Board not found" during cleanup

**Expected behavior**: Cleanup logs warnings because Miro API doesn't support deletion. This is normal.

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Miro API integration tests
  env:
    MIRO_TEST_CLIENT_ID: ${{ secrets.MIRO_TEST_CLIENT_ID }}
    MIRO_TEST_CLIENT_SECRET: ${{ secrets.MIRO_TEST_CLIENT_SECRET }}
    MIRO_TEST_REFRESH_TOKEN: ${{ secrets.MIRO_TEST_REFRESH_TOKEN }}
  run: npm run test:integration:miro
```

Store credentials in GitHub repository secrets:
- `MIRO_TEST_CLIENT_ID`
- `MIRO_TEST_CLIENT_SECRET`
- `MIRO_TEST_REFRESH_TOKEN`

### Security Considerations

**CRITICAL: Test credentials should have limited permissions**

1. Use dedicated test account (not linked to production team)
2. Test app should only have `boards:read` and `boards:write` scopes
3. Regularly rotate refresh tokens (monthly)
4. Never commit `.env.test` to version control (already in `.gitignore`)

## Maintenance

### Refresh Token Expiration

Miro refresh tokens can expire. If tests start failing with 401 errors:

1. Re-run OAuth flow: `npm run oauth` (with test credentials)
2. Update `MIRO_TEST_REFRESH_TOKEN` in `.env.test`
3. Update GitHub secret if using CI/CD

### Cleaning Up Old Test Boards

Manually delete test boards periodically:

```bash
# List all test boards via API
npm run test:api

# Or via Miro UI:
# 1. Go to https://miro.com/app/dashboard/
# 2. Search for "[MCP Test"
# 3. Select all and delete
```

### Adding New Tests

When adding new integration tests:

1. Use `helper.createTestBoard()` for automatic tracking
2. Set appropriate timeout (default 5s, batch ops need 30-60s)
3. Use `test.skipIf(!TESTS_ENABLED)` to skip when credentials missing
4. Verify test is idempotent (can run multiple times)
5. Check cleanup works (run test 3x, verify only 3 boards created)

## Test Data

Tests create these board types:
- `[MCP Test <timestamp>] CRUD Test` - Board lifecycle tests
- `[MCP Test <timestamp>] Items Test` - Item operation tests
- `[MCP Test <timestamp>] Batch Test` - Batch operation tests
- `[MCP Test <timestamp>] Sync Test` - Board sync tests
- `[MCP Test <timestamp>] Search Test` - Search/filter tests
- `[MCP Test <timestamp>] Error Test` - Error handling tests

All boards include timestamp in name for traceability.
