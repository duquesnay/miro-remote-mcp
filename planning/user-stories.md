# User Stories - Miro MCP

## Critical: Production Safety Nets

### TECH-E2E-PROTOCOL - End-to-End Protocol Validation

**User**: MCP Server Developer deploying to production
**Outcome**: E2E test suite validates complete MCP protocol handshake (0 → 5+ scenarios)
**Context**: Currently 73 unit tests but ZERO protocol-level tests. Cannot verify Claude Desktop integration works. Protocol regressions ship to production undetected.

**Acceptance Criteria**:
- [ ] E2E test: Initialize handshake with server capabilities
- [ ] E2E test: tools/list returns all 20+ MCP tools with correct schemas
- [ ] E2E test: tools/call executes create_sticky_note successfully
- [ ] E2E test: Authentication flow (get_auth_status → authorize → token refresh)
- [ ] E2E test: Error handling (invalid board_id, auth failure, rate limit)
- [ ] All tests run in CI pipeline
- [ ] Tests use actual MCP SDK transport layer (not mocks)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: L

---

### TECH-INTEGRATION-MIRO - Live Miro API Integration Tests

**User**: MCP Server Developer ensuring production API reliability
**Outcome**: Integration test suite validates live Miro API contract (0 → 8+ scenarios)
**Context**: All tests use mocks - real API issues (OAuth race, JSON serialization, async bugs) undetected. Data safety at risk.

**Acceptance Criteria**:
- [ ] Integration test: Full OAuth flow (authorize URL → token exchange → API call)
- [ ] Integration test: Token refresh under concurrent requests (no race)
- [ ] Integration test: Create sticky note on test board (validates serialization)
- [ ] Integration test: Batch operations (validates parallel execution)
- [ ] Integration test: Rate limit handling (validates backoff logic)
- [ ] Integration test: Error scenarios (expired token, invalid board_id)
- [ ] Tests use dedicated test Miro board (auto-cleanup)
- [ ] CI runs integration tests with real credentials (GitHub Secrets)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: L

---

### TECH-OAUTH-RACE - Thread-Safe Token Refresh

**User**: MCP Server handling concurrent requests
**Outcome**: Token refresh protected by mutex - single refresh per expiry (race condition → safe)
**Context**: OAuth2Manager has race condition. Concurrent requests can trigger double-refresh leading to token corruption or refresh loops under load.

**Acceptance Criteria**:
- [ ] Add mutex/lock to OAuth2Manager.ensureValidToken()
- [ ] First concurrent request refreshes token
- [ ] Subsequent requests wait and reuse refreshed token
- [ ] Integration test: 10 concurrent requests trigger only 1 refresh
- [ ] No token corruption under load testing (100+ concurrent calls)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: S

---

### TECH-DEPS-PINNED - Reproducible Dependency Versions

**User**: Development Team deploying to production
**Outcome**: Exact dependency versions pinned - no surprise breakage (ranges → pins)
**Context**: package.json uses ^ and ~ ranges allowing breaking changes from transitive dependencies. Deployments unpredictable.

**Acceptance Criteria**:
- [ ] Remove ^ and ~ from package.json dependencies
- [ ] Run npm install to update package-lock.json
- [ ] Commit package-lock.json to version control
- [ ] Add CI step: npm ci (validates lockfile)
- [ ] Document upgrade process in CLAUDE.md

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: XS

---

## High: Quick Wins & Blocking Workflows

### TECH1 - Parallel Tree Connector Creation

**User**: Agent AI creating large tree diagrams (100+ nodes)
**Outcome**: Tree connectors created in parallel - 92% faster (30s → 2s for 100 nodes)
**Context**: Sequential connector creation blocks on API calls. Large org charts and decision trees unusable at current performance.

**Acceptance Criteria**:
- [ ] Replace sequential for-loop with Promise.all in tree connector creation
- [ ] Apply same pattern to radial layout connectors
- [ ] Performance test: 100-node tree completes in <3 seconds
- [ ] Error handling: Individual connector failures don't block entire batch

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: XS

---

### CAP-BOARD-SYNC - Complete Board Snapshot

**User**: Agent AI working on complex Miro boards
**Outcome**: Agent reduces board discovery from 10-20 paginated API calls to 1 comprehensive snapshot
**Context**: Real-world usage on 115-person organizational board revealed inefficiency. Agent makes 10-20 sequential calls to understand board structure.

**Acceptance Criteria**:
- [ ] New function sync_board(board_id) returns ALL items on board
- [ ] Includes all types: shapes, sticky_notes, text, frames, connectors
- [ ] Format structured by type for easier processing
- [ ] Handles pagination internally (invisible to caller)
- [ ] Returns board metadata (dimensions, last modified timestamp)

**Source**: USER_REQUEST - 2025-12-03
**Effort**: M

---

### CAP-BATCH-UPDATE - Atomic Multi-Item Updates

**User**: Agent AI positioning multiple dozens of items
**Outcome**: Agent repositions 10 items in 1 request instead of 10 sequential calls
**Context**: Latency and reliability issues when updating many items. Need atomic operations.

**Acceptance Criteria**:
- [ ] Function batch_update_items(board_id, updates) accepts array of updates
- [ ] Format: [{id: "...", position: {...}, style: {...}}, ...]
- [ ] Executes all updates in parallel server-side
- [ ] Returns results with success/error status for each item
- [ ] Reasonable limit (e.g., 50 items per batch)

**Source**: USER_REQUEST - 2025-12-03
**Effort**: M

---

### TECH4 - Clean Production Builds

**User**: MCP Server Developer building for production
**Outcome**: Test files excluded from dist/ - clean deployments (1200 lines → 0)
**Context**: 24% of src/ is test/debug files polluting production builds. Slower builds, larger bundles.

**Acceptance Criteria**:
- [ ] Move src/test-mcp-server.ts → test/integration/mcp-server.test.ts
- [ ] Move src/example-boards.ts → test/fixtures/example-boards.ts
- [ ] Remove src/debug-*.ts files (or move to test/)
- [ ] Update tsconfig.json: exclude ["test/**/*"]
- [ ] Verify dist/ size reduced by ~30%
- [ ] All tests still pass after move

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: S

---

### TECH5 - Remove Dead Layout Code

**User**: MCP Server Developer maintaining layout algorithms
**Outcome**: Dead code removed - clearer intent (custom layout path deleted)
**Context**: Unreachable custom layout code path in batch creation confuses readers and adds cognitive load.

**Acceptance Criteria**:
- [ ] Identify unreachable layout code paths
- [ ] Remove dead code from layout functions
- [ ] Update comments to reflect actual layouts
- [ ] Verify all tests still pass
- [ ] Confirm no MCP tool references removed code

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: XS

---

## Medium: Quality & Performance

### TECH6 - Item List Caching

**User**: Agent AI performing multiple searches on same board
**Outcome**: Item list caching with TTL - eliminates redundant API calls (5000ms → 0ms)
**Context**: No caching - searches refetch 1000+ items every time. 5 seconds per search on large boards.

**Acceptance Criteria**:
- [ ] Implement simple Map-based cache with timestamps
- [ ] Cache list_items results by board_id
- [ ] TTL: 30 seconds (configurable)
- [ ] Cache invalidation on write operations (create/update/delete)
- [ ] Performance test: 10 searches on same board = 1 API call + 9 cache hits
- [ ] Memory monitoring: cache bounded by max size (see TECH7)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: S

---

### TECH7 - Bounded Cache Memory

**User**: DevOps Engineer running long-lived MCP server instance
**Outcome**: Cache with bounded memory - prevents OOM (unbounded → TTL + LRU)
**Context**: TECH6 cache has no eviction. Long sessions can exhaust memory.

**Acceptance Criteria**:
- [ ] Implement LRU eviction policy
- [ ] Max cache entries: 100 boards (configurable)
- [ ] Periodic cleanup timer (every 60s removes expired entries)
- [ ] When cache full: evict least-recently-used entry
- [ ] Memory test: 1000 board accesses doesn't grow beyond max size

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: S

---

### TECH-RATE-LIMITS - Request Queue with Backoff

**User**: MCP Server under high load approaching Miro API rate limits
**Outcome**: Request queue with exponential backoff - graceful degradation (fail → retry)
**Context**: Rate limits tracked but not enforced. Burst traffic causes 429 rate limit errors.

**Acceptance Criteria**:
- [ ] Implement request queue (FIFO)
- [ ] Monitor rate limit headers (X-RateLimit-Remaining)
- [ ] When <20% remaining: queue new requests
- [ ] On 429 error: exponential backoff (1s, 2s, 4s)
- [ ] Max 3 retries before failing
- [ ] Load test: 50 requests/second → all succeed (some queued)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: M

---

### TECH-PAGINATION - Configurable Search Limits

**User**: Agent AI searching huge boards (1000+ items)
**Outcome**: Configurable pagination limits - prevents memory/latency issues (unbounded → max items)
**Context**: Searches fetch ALL items without limit. 5000-item board = 5MB response causing memory spikes.

**Acceptance Criteria**:
- [ ] Add max_items parameter to search_items (default: 100)
- [ ] Add max_items to list_items (default: 500)
- [ ] Return truncation indicator in response
- [ ] Update MCP tool schemas with max_items parameter
- [ ] Performance test: 5000-item board search returns in <1s

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: S

---

### TECH2 - DRY Schema Definitions

**User**: MCP Server Developer maintaining batch creation tools
**Outcome**: Schema definitions DRY - single source of truth (18 duplicates → 1 module)
**Context**: board_id parameter repeated 18 times across tool schemas. Changes require updating 3+ files.

**Acceptance Criteria**:
- [ ] Create src/schemas.ts with common schema fragments
- [ ] Extract: BOARD_ID_SCHEMA, POSITION_SCHEMA, STYLE_SCHEMA, etc.
- [ ] Update tool definitions to use shared schemas
- [ ] All tools still pass schema validation tests
- [ ] Reduce total schema LOC by >150 lines

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: M

---

### TECH3 - Type-Safe Token Provider Interface

**User**: MCP Server Developer modifying OAuth logic
**Outcome**: TokenProvider interface with DI - type-safe auth (type assertion → interface)
**Context**: (miroClient as any).oauth bypasses TypeScript - security smell. Cannot test MiroClient without real OAuth.

**Acceptance Criteria**:
- [ ] Create ITokenProvider interface: getAccessToken(), refreshToken()
- [ ] OAuth2Manager implements ITokenProvider
- [ ] MiroClient constructor accepts ITokenProvider
- [ ] Update existing instantiation code
- [ ] Add mock TokenProvider for unit tests
- [ ] Remove all "as any" type assertions
- [ ] Include TECH-OAUTH-RACE fix (mutex in token refresh)

**Source**: CODE_QUALITY_REVIEW_2025-12-02
**Effort**: M

---

## Medium: Feature Capabilities

### CAP-CHANGE-DETECTION - Board Delta Detection

**User**: Agent AI working in parallel with human user
**Outcome**: Agent identifies human edits instantly without re-reading entire board
**Context**: Enable "human structures, AI fills" workflow. Prevent conflicts between human and AI actions.

**Acceptance Criteria**:
- [ ] Function get_board_changes(board_id, since_timestamp) returns deltas
- [ ] Identifies items created, modified, deleted
- [ ] For modifications, indicates which fields changed (position, content, style)
- [ ] Uses Miro native timestamps (modifiedAt)
- [ ] Clear diff format: {created: [...], updated: [...], deleted: [...]}

**Source**: ARCHITECTURAL_ANALYSIS - 2025-12-03
**Effort**: L

---

### CAP-SPATIAL-SEARCH - Geographic Zone Search

**User**: Agent AI searching for containing rectangles or specific zones
**Outcome**: Agent finds "the rectangle at x=1500, y=200" without parsing all items
**Context**: Instant location-based searches. Identify already-positioned items for post-modification verification.

**Acceptance Criteria**:
- [ ] Function find_items_in_area(board_id, x, y, width, height, type?)
- [ ] Returns items whose center is in specified zone
- [ ] Optional filter by item type
- [ ] Results sorted by z-index (visual layer) or creation timestamp
- [ ] Handles Miro center coordinate system correctly

**Source**: ARCHITECTURAL_ANALYSIS - 2025-12-03
**Effort**: M

---

### CAP-STRUCTURED-INVENTORY - Hierarchical Board Analysis

**User**: Agent AI analyzing organizational boards
**Outcome**: Agent comprehends "5 domains, 16 teams, 115 people" structure immediately
**Context**: Complex boards require pre-structured inventory. Reduces cognitive analysis load for AI.

**Acceptance Criteria**:
- [ ] Function get_structured_inventory(board_id) analyzes board
- [ ] Automatically detects parent frames
- [ ] Groups items by parent frame
- [ ] Identifies containing rectangles (thick border, transparent fill)
- [ ] Separates "structure" items vs "content" items
- [ ] Hierarchical format: {frames: {frame_id: {metadata: {...}, children: [...]}}}

**Source**: ARCHITECTURAL_ANALYSIS - 2025-12-03
**Effort**: L

---

### CAP-BOARD-TEMPLATES - Common Diagram Templates

**User**: End User creating new boards
**Outcome**: User starts from common diagram types (org chart, kanban, flowchart)
**Context**: Reduces time-to-first-board for common patterns.

**Acceptance Criteria**:
- [ ] Template: Organizational chart layout
- [ ] Template: Kanban board (columns, swim lanes)
- [ ] Template: Flowchart structure
- [ ] Template: Mind map radial layout
- [ ] Function create_from_template(template_name, board_id)
- [ ] Templates include frames, zones, and starter items

**Source**: USER_REQUEST
**Effort**: M

---

### CAP-ITEM-SEARCH - Content and Property Search

**User**: End User navigating boards with 50+ items
**Outcome**: User finds elements by content text or properties without visual scanning
**Context**: Enables navigation in complex boards.

**Acceptance Criteria**:
- [ ] Search by item content (text contains)
- [ ] Search by item type (shape, sticky, connector)
- [ ] Search by item properties (color, size, position)
- [ ] Fuzzy text matching support
- [ ] Returns ranked results by relevance
- [ ] Supports combining filters (AND/OR logic)

**Source**: USER_REQUEST
**Effort**: M

---

### CAP-BOARD-EXPORT - Complete Board State Capture

**User**: End User archiving board states
**Outcome**: User captures complete board state for backup/versioning/documentation
**Context**: Enables backup workflows and documentation generation.

**Acceptance Criteria**:
- [ ] Export all items with full properties
- [ ] Include board metadata (name, owner, permissions)
- [ ] Export format: JSON with schema version
- [ ] Include relationships (parent-child, connectors)
- [ ] Option to export as markdown documentation
- [ ] Timestamp and version information

**Source**: USER_REQUEST
**Effort**: M

---

## Low: Future Enhancements

### EPIC-SDK-BRIDGE - Web SDK Bridge Layer

**User**: Agent AI requiring z-index, selection, and grouping controls
**Outcome**: Agent accesses Web SDK features via WebSocket bridge
**Context**: REST API cannot control z-index, selection, or grouping. Requires Web SDK which only runs in-browser.

**Acceptance Criteria**:
- [ ] Miro App (iframe) with Web SDK integration
- [ ] WebSocket hub for MCP server ↔ Miro App communication
- [ ] MCP tools: sdk_bring_to_front, sdk_send_to_back
- [ ] MCP tools: sdk_get_selection, sdk_select
- [ ] MCP tools: sdk_group, sdk_ungroup
- [ ] Integration with Playwright/Chromium MCP for automation
- [ ] Documentation and deployment guide

**Source**: ARCHITECTURAL_ANALYSIS - 2025-12-03
**Effort**: XL

---

### CAP-IMAGE-UPLOAD - Programmatic Image Upload

**User**: End User adding media-rich content to boards
**Outcome**: User adds images programmatically from URLs or file paths
**Context**: Media-rich boards (use case unvalidated - defer until requested).

**Acceptance Criteria**:
- [ ] Upload image from URL
- [ ] Upload image from local file path
- [ ] Resize and position image
- [ ] Support common formats (PNG, JPG, GIF, SVG)
- [ ] Return image item ID for further manipulation

**Source**: USER_REQUEST
**Effort**: M

---

### CAP-BOARD-PERMISSIONS - Granular Access Control

**User**: End User managing team collaboration
**Outcome**: User controls granular board access rights programmatically
**Context**: Collaboration features (solo usage primary - defer until multi-user need validated).

**Acceptance Criteria**:
- [ ] Grant viewer access to specific users/emails
- [ ] Grant editor access to specific users/emails
- [ ] Revoke access from users
- [ ] List current board permissions
- [ ] Set board visibility (private, team, organization)

**Source**: USER_REQUEST
**Effort**: M

---

### CAP-COMMENTS - Contextual Item Comments

**User**: End User adding annotations to boards
**Outcome**: User adds contextual comments to board items
**Context**: Annotation features (low demand signal - defer until requested).

**Acceptance Criteria**:
- [ ] Add comment to specific board item
- [ ] List comments on item
- [ ] Update/delete comments
- [ ] Comment metadata (author, timestamp)
- [ ] Thread replies to comments

**Source**: USER_REQUEST
**Effort**: M

---
