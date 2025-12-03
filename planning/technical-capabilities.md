# Technical Capabilities - Quality Review Findings (2025-12-03)

This document details technical capabilities identified during the comprehensive 4-specialist quality review (code-quality-analyst, architecture-reviewer, performance-optimizer, integration-specialist).

## Critical Safety Nets (Production Blockers)

### TECH-E2E-PROTOCOL: Developer validates MCP protocol compliance end-to-end

**Actor**: Developer deploying Miro MCP to production
**Outcome**: E2E test suite validates complete MCP protocol handshake (0 → 5+ scenarios)
**Context**: Currently 73 unit tests but ZERO protocol-level tests - cannot verify Claude Desktop integration works

**Current State**:
- No tests for tools/list, tools/call JSON-RPC messages
- Protocol regressions undetected until manual testing
- Cannot validate handshake: initialize → tools/list → tools/call
- Breaking changes ship to production

**Target State**:
- 5+ E2E test scenarios covering full protocol lifecycle
- Tests simulate real Claude Desktop message flow
- Validates: auth flow, tool discovery, CRUD operations, error handling
- CI fails on protocol regressions

**Value**: Production readiness - prevents protocol bugs from reaching users

**Acceptance Criteria**:
- [ ] E2E test: Initialize handshake with server capabilities
- [ ] E2E test: tools/list returns all 20+ MCP tools with correct schemas
- [ ] E2E test: tools/call executes create_sticky_note successfully
- [ ] E2E test: Authentication flow (get_auth_status → authorize → token refresh)
- [ ] E2E test: Error handling (invalid board_id, auth failure, rate limit)
- [ ] All tests run in CI pipeline
- [ ] Tests use actual MCP SDK transport layer (not mocks)

**Technical Notes**:
- Pattern from omnifocus-mcp: test-mcp-server.ts simulates protocol
- Use @modelcontextprotocol/sdk test utilities
- Separate test environment with dedicated Miro test board
- Mock OAuth tokens for deterministic tests

**Effort**: 2-3 days
**Priority**: 🔴 Critical - Production blocker

---

### TECH-INTEGRATION-MIRO: Developer validates live Miro API integration

**Actor**: Developer ensuring production API reliability
**Outcome**: Integration test suite validates live Miro API contract (0 → 8+ scenarios)
**Context**: Unit tests use mocks - real API issues (OAuth race, JSON serialization, async bugs) undetected

**Current State**:
- All tests use mocked Axios responses
- OAuth race condition exists but no test catches it
- JSON serialization bugs slip through unit tests
- Real API contract drift undetected

**Target State**:
- 8+ integration tests against live Miro API (test board)
- OAuth flow tested: authorize → access token → refresh → API call
- Real CRUD operations: create board → add items → update → delete
- Error scenarios: expired tokens, rate limits, invalid data

**Value**: Data safety - catches OAuth corruption, async bugs, API contract changes

**Acceptance Criteria**:
- [ ] Integration test: Full OAuth flow (authorize URL → token exchange → API call)
- [ ] Integration test: Token refresh under concurrent requests (no race)
- [ ] Integration test: Create sticky note on test board (validates serialization)
- [ ] Integration test: Batch operations (validates parallel execution)
- [ ] Integration test: Rate limit handling (validates backoff logic)
- [ ] Integration test: Error scenarios (expired token, invalid board_id)
- [ ] Tests use dedicated test Miro board (auto-cleanup)
- [ ] CI runs integration tests with real credentials (GitHub Secrets)

**Technical Notes**:
- Use separate Miro app for testing (test client ID/secret)
- Test board created/cleaned in beforeAll/afterAll hooks
- OAuth tokens from environment variables in CI
- Skip integration tests locally if credentials missing

**Effort**: 3-4 days
**Priority**: 🔴 Critical - Data safety blocker

---

### TECH-OAUTH-RACE: System refreshes tokens safely under concurrent requests

**Actor**: System handling concurrent Miro API requests
**Outcome**: Token refresh protected by mutex - single refresh per expiry (race condition → safe)
**Context**: OAuth2Manager has race condition - concurrent requests can trigger double-refresh

**Current State**:
- Multiple concurrent requests see expired token
- Both trigger refresh simultaneously
- Race condition: token corrupted or refresh loop
- No protection against parallel refresh calls

**Target State**:
- Mutex lock protects token refresh
- First request acquires lock and refreshes
- Subsequent requests wait for fresh token
- Single refresh per expiry guaranteed

**Value**: Data safety - prevents token corruption under concurrent load

**Acceptance Criteria**:
- [ ] Add mutex/lock to OAuth2Manager.ensureValidToken()
- [ ] First concurrent request refreshes token
- [ ] Subsequent requests wait and reuse refreshed token
- [ ] Integration test: 10 concurrent requests trigger only 1 refresh
- [ ] No token corruption under load testing (100+ concurrent calls)

**Technical Notes**:
- Use async-mutex library or similar
- Lock scope: ensureValidToken() method only
- Release lock after refresh completes
- Error handling: release lock on refresh failure

**Effort**: 4 hours
**Priority**: 🔴 Critical - Data corruption risk

---

### TECH-DEPS-PINNED: Team deploys with known-good dependency versions

**Actor**: Team deploying to production
**Outcome**: Exact dependency versions pinned - no surprise breakage (ranges → pins)
**Context**: package.json uses `^` and `~` ranges - allows breaking changes from transitive dependencies

**Current State**:
- axios: ^1.7.9 (allows 1.8.0, 1.9.0 with breaking changes)
- @modelcontextprotocol/sdk: ^1.0.4 (allows 1.1.0 breaking changes)
- Transitive dependencies can introduce bugs
- Deployments unpredictable

**Target State**:
- All dependencies pinned to exact versions
- package-lock.json committed (reproducible builds)
- CI validates no version drift
- Manual upgrade process with testing

**Value**: Deployment reliability - prevents surprise breakage

**Acceptance Criteria**:
- [ ] Remove `^` and `~` from package.json dependencies
- [ ] Run npm install to update package-lock.json
- [ ] Commit package-lock.json to version control
- [ ] Add CI step: npm ci (validates lockfile)
- [ ] Document upgrade process in CLAUDE.md

**Technical Notes**:
- Use exact versions: "axios": "1.7.9" not "^1.7.9"
- npm ci enforces lockfile (fails on mismatch)
- Renovate/Dependabot can automate upgrade PRs

**Effort**: 15 minutes
**Priority**: 🔴 Critical - Deployment stability

---

## Performance & Quick Wins

### TECH1: Developer creates tree diagrams at scale without waiting

**Actor**: Developer creating large tree diagrams (100+ nodes)
**Outcome**: Tree connectors created in parallel - 92% faster (30s → 2s for 100 nodes)
**Context**: Sequential connector creation blocks on API calls - unusable for large trees

**Current State**:
- Tree layout creates parent→child connectors sequentially
- Each connector = 1 API call (~250ms)
- 100-node tree = 100 connectors = 25 seconds
- Blocks large org charts, decision trees

**Target State**:
- Parallel connector creation using Promise.all
- 100 connectors in ~2 seconds (network parallelism)
- Same for all layout algorithms (tree, radial)

**Value**: Unblocks production tree layouts - makes feature actually usable

**Acceptance Criteria**:
- [ ] Replace sequential for-loop with Promise.all in tree connector creation
- [ ] Apply same pattern to radial layout connectors
- [ ] Performance test: 100-node tree completes in <3 seconds
- [ ] Error handling: Individual connector failures don't block entire batch

**Technical Notes**:
- Pattern: `await Promise.all(connectors.map(c => createConnector(c)))`
- Miro API rate limits: 10 requests/second - parallelism still within limits
- Return both successful and failed connectors

**Effort**: 1 hour
**Priority**: 🟡 High - Blocking workflow, high ROI

---

### TECH4: Developer works with clean production build

**Actor**: Developer building for production
**Outcome**: Test files excluded from dist/ - clean deployments (1200 lines → 0)
**Context**: 24% of src/ is test/debug files - pollutes production builds

**Current State**:
- src/test-mcp-server.ts (600 lines)
- src/example-boards.ts (400 lines)
- src/debug-*.ts files (200 lines)
- All compiled into dist/ and deployed

**Target State**:
- Move test files to test/ directory
- Update tsconfig.json to exclude test/
- Clean dist/ contains only production code

**Value**: Clean deployments, faster builds, smaller bundle

**Acceptance Criteria**:
- [ ] Move src/test-mcp-server.ts → test/integration/mcp-server.test.ts
- [ ] Move src/example-boards.ts → test/fixtures/example-boards.ts
- [ ] Remove src/debug-*.ts files (or move to test/)
- [ ] Update tsconfig.json: exclude ["test/**/*"]
- [ ] Verify dist/ size reduced by ~30%
- [ ] All tests still pass after move

**Technical Notes**:
- Update import paths in moved files
- Jest config may need test directory update
- Preserve test functionality during move

**Effort**: 2 hours
**Priority**: 🟡 High - Quick win

---

### TECH5: Developer navigates layout code without dead paths

**Actor**: Developer maintaining layout algorithms
**Outcome**: Dead code removed - clearer intent (custom layout path deleted)
**Context**: Unreachable custom layout code path in batch creation - confuses readers

**Current State**:
- batch_create_sticky_notes has "custom" layout option
- Code path is unreachable (not exposed in MCP tool schema)
- Adds cognitive load during maintenance

**Target State**:
- Remove unreachable custom layout code
- Simplify conditional logic
- Document supported layouts only

**Value**: Reduced cognitive load, clearer code intent

**Acceptance Criteria**:
- [ ] Identify unreachable layout code paths
- [ ] Remove dead code from layout functions
- [ ] Update comments to reflect actual layouts
- [ ] Verify all tests still pass
- [ ] Confirm no MCP tool references removed code

**Technical Notes**:
- Search for "custom" layout references
- Ensure no external dependencies before removal
- Update layout documentation

**Effort**: 1 hour
**Priority**: 🟡 High - Quick win

---

## Code Quality & Architecture

### TECH2: Developer modifies batch creation logic in single location

**Actor**: Developer maintaining batch creation tools
**Outcome**: Schema definitions DRY - single source of truth (18 duplicates → 1 module)
**Context**: board_id parameter repeated 18 times across tool schemas - maintenance burden

**Current State**:
- ~200 lines of duplicate schema definitions
- board_id validation repeated 18 times
- parent_id, position, style schemas duplicated
- Changes require updating 3+ files

**Target State**:
- Extract src/schemas.ts with reusable schema fragments
- Import shared schemas in tool definitions
- Single source of truth for common parameters

**Value**: Maintenance burden -60%, consistency guaranteed

**Acceptance Criteria**:
- [ ] Create src/schemas.ts with common schema fragments
- [ ] Extract: BOARD_ID_SCHEMA, POSITION_SCHEMA, STYLE_SCHEMA, etc.
- [ ] Update tool definitions to use shared schemas
- [ ] All tools still pass schema validation tests
- [ ] Reduce total schema LOC by >150 lines

**Technical Notes**:
- Use JSON Schema $ref for composition
- Validate schema references work with MCP SDK
- Update existing tests to use new schema structure

**Effort**: 1 day
**Priority**: 🟢 Medium - Quality improvement

---

### TECH3: Developer extends auth logic with full type safety

**Actor**: Developer modifying OAuth logic
**Outcome**: TokenProvider interface with DI - type-safe auth (type assertion → interface)
**Context**: `(miroClient as any).oauth` bypasses TypeScript - security smell

**Current State**:
- MiroClient directly accesses OAuth2Manager internals
- Type assertion hack: `(miroClient as any).oauth`
- Cannot test MiroClient without real OAuth
- Violates Dependency Inversion Principle

**Target State**:
- Extract ITokenProvider interface
- MiroClient depends on interface, not concrete OAuth2Manager
- Inject token provider via constructor
- Mock-friendly for isolated testing

**Value**: SOLID compliance, enables isolated testing, removes security smell

**Acceptance Criteria**:
- [ ] Create ITokenProvider interface: getAccessToken(), refreshToken()
- [ ] OAuth2Manager implements ITokenProvider
- [ ] MiroClient constructor accepts ITokenProvider
- [ ] Update existing instantiation code
- [ ] Add mock TokenProvider for unit tests
- [ ] Remove all `as any` type assertions
- [ ] Include TECH-OAUTH-RACE fix (mutex in token refresh)

**Technical Notes**:
- Interface in src/interfaces/token-provider.ts
- Update MiroClient to accept provider in constructor
- Maintains backward compatibility (default to OAuth2Manager)

**Effort**: 1 day (includes TECH-OAUTH-RACE)
**Priority**: 🟢 Medium - Architecture improvement

---

### TECH6: Agent AI responds instantly for repeated searches

**Actor**: Agent AI performing multiple searches on same board
**Outcome**: Item list caching with TTL - eliminates redundant API calls (5000ms → 0ms)
**Context**: No caching - searches refetch 1000+ items every time

**Current State**:
- search_items fetches all items every call
- list_items has no caching
- Repeated queries to same board = redundant API calls
- 5 seconds per search on large boards

**Target State**:
- TTL-based cache (30 second expiry)
- Cache key: board_id
- Cache hit = instant response (0ms)
- Cache miss = fetch + cache for 30s

**Value**: Massive latency reduction for common query patterns

**Acceptance Criteria**:
- [ ] Implement simple Map-based cache with timestamps
- [ ] Cache list_items results by board_id
- [ ] TTL: 30 seconds (configurable)
- [ ] Cache invalidation on write operations (create/update/delete)
- [ ] Performance test: 10 searches on same board = 1 API call + 9 cache hits
- [ ] Memory monitoring: cache bounded by max size (see TECH7)

**Technical Notes**:
- Cache structure: `Map<board_id, {items: [], timestamp: number}>`
- Check timestamp on cache hit: `now - timestamp < TTL`
- Invalidate on: create_*, update_*, delete_*, batch_update_items

**Effort**: 4 hours
**Priority**: 🟢 Medium - Performance improvement

---

### TECH7: System maintains stable memory under high usage

**Actor**: Long-running MCP server instance
**Outcome**: Cache with bounded memory - prevents OOM (unbounded → TTL + LRU)
**Context**: TECH6 cache has no eviction - long sessions can exhaust memory

**Current State**:
- Cache grows unbounded
- No max size limit
- Long-running processes risk OOM
- No LRU eviction policy

**Target State**:
- TTL-based eviction (remove expired entries)
- Max cache size (LRU eviction when full)
- Automatic cleanup on timer
- Memory-safe for 24/7 operation

**Value**: Production stability for long sessions

**Acceptance Criteria**:
- [ ] Implement LRU eviction policy
- [ ] Max cache entries: 100 boards (configurable)
- [ ] Periodic cleanup timer (every 60s removes expired entries)
- [ ] When cache full: evict least-recently-used entry
- [ ] Memory test: 1000 board accesses doesn't grow beyond max size

**Technical Notes**:
- Extends TECH6 implementation
- Use Map with LRU tracking (access timestamps)
- setInterval for periodic cleanup
- Clear interval on server shutdown

**Effort**: 2 hours (extends TECH6)
**Priority**: 🟢 Medium - Production stability

---

### TECH-RATE-LIMITS: System queues requests under rate limits

**Actor**: System under high load approaching Miro API rate limits
**Outcome**: Request queue with exponential backoff - graceful degradation (fail → retry)
**Context**: Rate limits tracked but not enforced - requests fail when limit hit

**Current State**:
- Miro API: 10 requests/second limit
- Server tracks rate in headers but doesn't queue
- Burst traffic → 429 rate limit errors
- No automatic retry logic

**Target State**:
- Request queue when approaching limits
- Exponential backoff on 429 errors
- Automatic retry (3 attempts)
- Graceful degradation vs hard failures

**Value**: Better UX under load - retries instead of errors

**Acceptance Criteria**:
- [ ] Implement request queue (FIFO)
- [ ] Monitor rate limit headers (X-RateLimit-Remaining)
- [ ] When <20% remaining: queue new requests
- [ ] On 429 error: exponential backoff (1s, 2s, 4s)
- [ ] Max 3 retries before failing
- [ ] Load test: 50 requests/second → all succeed (some queued)

**Technical Notes**:
- Use p-queue or bottleneck library
- Extract rate limit from response headers
- Queue strategy: when remaining < 2 requests
- Backoff: 2^attempt * 1000ms

**Effort**: 1 day
**Priority**: 🟢 Medium - UX improvement

---

### TECH-PAGINATION: System limits unbounded searches

**Actor**: Agent AI searching huge boards (1000+ items)
**Outcome**: Configurable pagination limits - prevents memory/latency issues (unbounded → max items)
**Context**: Searches fetch ALL items - memory and latency problems on large boards

**Current State**:
- search_items fetches all items without limit
- 5000-item board = 5MB response
- No pagination controls exposed
- Memory spike on large boards

**Target State**:
- max_items parameter (default: 100)
- Pagination exposed to MCP tools
- Early termination when limit reached
- Clear indication when results truncated

**Value**: Prevents memory/latency issues, predictable performance

**Acceptance Criteria**:
- [ ] Add max_items parameter to search_items (default: 100)
- [ ] Add max_items to list_items (default: 500)
- [ ] Return truncation indicator in response
- [ ] Update MCP tool schemas with max_items parameter
- [ ] Performance test: 5000-item board search returns in <1s

**Technical Notes**:
- Pagination at Miro API level (use limit parameter)
- Return metadata: {items: [], truncated: true, total: 5000}
- Document pagination in tool descriptions

**Effort**: 2 hours
**Priority**: 🟢 Medium - Performance/stability

---
