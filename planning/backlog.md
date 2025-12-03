# planning/backlog.md

## Completed

### Core Capabilities (2025-11-10 - Initial Implementation)

- [x] CAP-BOARD-OPS: User manages Miro boards through Claude ✅ 2025-11-10
- [x] CAP-ITEM-READ: User discovers board content programmatically ✅ 2025-11-10
- [x] CAP-ITEM-MODIFY: User updates existing board elements ✅ 2025-11-10
- [x] CAP-STICKY-CREATION: User creates sticky notes with full styling control ✅ 2025-11-10
- [x] CAP-SHAPE-CREATION: User creates geometric shapes and flowchart symbols ✅ 2025-11-10
- [x] CAP-TEXT-CREATION: User adds text labels and annotations ✅ 2025-11-10
- [x] CAP-FRAME-CREATION: User creates organizational frames ✅ 2025-11-10
- [x] CAP-CONNECTOR-CREATION: User shows relationships between elements ✅ 2025-11-10
- [x] CAP-CONNECTOR-STYLING: User updates connector appearance ✅ 2025-11-10

### Infrastructure Capabilities

- [x] CAP-OAUTH-FLOW: User authenticates with Miro once ✅ 2025-11-10
- [x] CAP-TOKEN-REFRESH: User's session never expires during work ✅ 2025-11-10
- [x] CAP-ERROR-HANDLING: User gets actionable error messages ✅ 2025-11-10
- [x] CAP-CLAUDE-DESKTOP: User accesses Miro directly from Claude Desktop ✅ 2025-11-10
- [x] CAP-REAUTH-FLOW: User receives reauthentication URL when Miro tokens expire ✅ 2025-11-27
- [x] CAP-AUTH-STATUS: User checks authentication status and gets authorization URL ✅ 2025-11-27

### Configuration & Security

- [x] CAP-CONFIG-MANAGEMENT: User manages credentials centrally ✅ 2025-11-10
- [x] CAP-SECURITY: User's credentials never leak ✅ 2025-11-10

### Testing & Quality

- [x] CAP-API-TESTING: Developer validates Miro integration ✅ 2025-11-10
- [x] CAP-MCP-TESTING: Developer validates MCP protocol compliance ✅ 2025-11-10

### Documentation & Examples

- [x] CAP-DOCUMENTATION: User understands setup and usage ✅ 2025-11-10
- [x] CAP-DEMO-EXAMPLE: User sees real-world usage pattern ✅ 2025-11-10

### In Progress (Completed 2025-11-24)

- [x] CAP-HTTP-HANDLER: Developer creates gateway-compatible HTTP handler ✅ 2025-11-24

### Recently Completed (2025-11-10)

- [x] FEAT1: User places items directly in frames ✅ 2025-11-10

### Performance Optimizations (Quick Wins) - 2025-11-10

- [x] CAP-INSTANT-RESPONSE: User experiences faster board operations ✅ 2025-11-10
- [x] CAP-BURST-PERFORMANCE: User creates multiple items rapidly ✅ 2025-11-10
- [x] TECH-CLARITY: Developer modifies configuration easily ✅ 2025-11-10
- [x] TECH-MAINTAINABILITY: Developer modifies style logic in one place ✅ 2025-11-10

### Technical Capabilities (Developer Experience)

- [x] TECH-TESTABILITY: Developer tests components in isolation ✅ 2025-11-24

## In Progress

(No items currently in progress)

## Recently Completed (2025-12-03)

- [x] OPS-TOKEN-PERSIST: Tokens persist across deployments without re-authentication ✅ 2025-12-03

**Root Cause**: When loading tokens from file, code ignored stored `expires_at` and always set `expiresIn=3600`. This prevented token refresh from triggering even when tokens were actually expired.

**Fix**: Now reads `expires_at` from stored token data. If expired, sets `expiresIn=0` to trigger immediate refresh on first API call.

## Recently Completed (2025-12-02)

- [x] CAP-BATCH-CREATION: User creates multiple similar items efficiently ✅ 2025-12-02
- [x] CAP-LAYOUT-ASSISTANCE: User gets suggested layouts for common patterns ✅ 2025-12-02

## Recently Completed (2025-11-27)

- [x] CAP-AUTH-STATUS: User checks authentication status and gets authorization URL ✅ 2025-11-27

## Recently Completed (2025-11-24)

- [x] OPS1: Operator sees accurate authentication status in health check ✅ 2025-11-24
- [x] TECH4: Gateway client accesses MCP at clean root URL ✅ 2025-11-24

## Planned (Reorganized by Strategic Priority - 2025-12-03)

### Priority Framework (Updated After Quality Review)

**🔴 Critical (Production Blockers)**: Safety nets required before production usage
- Testing pyramid inverted (73 unit, 0 integration, 0 E2E) = cannot validate production readiness
- OAuth race condition = data safety risk under concurrent load
- Dependency version ranges = unpredictable deployment failures

**🟡 High Priority**: Blocking user workflows OR high-leverage quick wins
- TECH1 (tree parallelization): 1 hour work → 92% performance gain for blocking use case
- TECH4-5 (cleanup): 3 hours total → cleaner codebase, faster builds
- Feature capabilities that enable new workflows

**🟢 Medium Priority**: Important quality/performance improvements
- Caching layer (TECH6-7): Eliminates redundant API calls
- Rate limit handling (TECH-RATE-LIMITS): Graceful degradation
- DRY violations (TECH2): Maintenance burden reduction
- Architecture refactoring (TECH3): SOLID compliance

**⚪ Low Priority**: Nice-to-have features with uncertain demand

---

### 🔴 CRITICAL: Production Blockers (Must Complete Before v2.0)

**Total Effort**: 6-8 days | **Items**: 4

1. [ ] **TECH-E2E-PROTOCOL**: Developer validates MCP protocol end-to-end (0 → 5+ scenarios) - **2-3 days**
2. [ ] **TECH-INTEGRATION-MIRO**: Developer validates live Miro API integration (0 → 8+ scenarios) - **3-4 days**
3. [ ] **TECH-OAUTH-RACE**: System refreshes tokens safely under concurrent requests - **4 hours**
4. [ ] **TECH-DEPS-PINNED**: Team deploys with known-good dependency versions - **15 minutes**

**Rationale**: Zero integration/E2E tests = cannot validate production readiness. OAuth race = data corruption risk. These are non-negotiable safety nets.

---

### 🟡 HIGH: Quick Wins + Blocking Workflows

**Total Effort**: 2-3 days | **Items**: 3

5. [ ] **TECH1**: Developer creates tree diagrams at scale (30s → 2s, -92%) - **1 hour**
   - **Blocking**: Large tree layouts unusable at current performance
   - **ROI**: Highest leverage - 1h work for 10x UX improvement

6. [ ] **TECH4**: Developer works with clean production build (1200 lines → 0) - **2 hours**
   - **Quick win**: Move test files out of src/, cleaner deployments

7. [ ] **TECH5**: Developer navigates layout code without dead paths - **1 hour**
   - **Quick win**: Remove unreachable custom layout code

---

### 🟢 MEDIUM: Quality & Performance Improvements

**Total Effort**: 4-5 days | **Items**: 6

8. [ ] **TECH6**: Agent AI responds instantly for repeated searches (5000ms → 0ms) - **4 hours**
9. [ ] **TECH7**: System maintains stable memory under high usage - **2 hours**
10. [ ] **TECH-RATE-LIMITS**: System queues requests under rate limits - **1 day**
11. [ ] **TECH-PAGINATION**: System limits unbounded searches - **2 hours**
12. [ ] **TECH2**: Developer modifies batch creation logic once (3 files → 1) - **1 day**
13. [ ] **TECH3**: Developer extends auth logic with full type safety - **1 day**

---

### 🟢 MEDIUM: Feature Capabilities

**Total Effort**: Variable | **Items**: 5

14. [ ] **CAP-BOARD-TEMPLATES**: User starts from common diagram types
15. [ ] **CAP-ITEM-SEARCH**: User finds elements by content or properties
16. [ ] **CAP-BOARD-EXPORT**: User captures board state
17. [ ] **CAP-CHANGE-DETECTION**: Agent AI detects board changes since last read
18. [ ] **CAP-SPATIAL-SEARCH**: Agent AI finds items in geographic zone
19. [ ] **CAP-STRUCTURED-INVENTORY**: Agent AI understands board hierarchy automatically

---

### ⚪ LOW: Future Enhancements

**Items**: 4

20. [ ] **EPIC-SDK-BRIDGE**: Agent AI accesses Web SDK features (z-index, selection, grouping) - **5-8 days**
21. [ ] **CAP-IMAGE-UPLOAD**: User adds images to boards
22. [ ] **CAP-BOARD-PERMISSIONS**: User controls board access
23. [ ] **CAP-COMMENTS**: User adds contextual notes

---

## Collaborative Workflow Capabilities (Added 2025-12-03)

These capabilities emerged from real-world usage of the MCP server on a complex organizational board (115 people, 5 domains, 16 teams). They address human-AI collaboration patterns and reduce API call overhead for complex boards.

### CAP-BOARD-SYNC: Agent AI retrieves complete board snapshot in single request

**Outcome**: Agent reduces board discovery from 10-20 paginated API calls to 1 comprehensive snapshot

**User Story**:
> As an agent AI working on a Miro board,
> I want to retrieve a complete snapshot of the board in a single request,
> So that I have a full view without making 10+ paginated calls.

**Acceptance Criteria**:
- New function `sync_board(board_id)` returns ALL items on board
- Includes all types: shapes, sticky_notes, text, frames, connectors
- Format structured by type for easier processing
- Handles pagination internally (invisible to caller)
- Returns board metadata (dimensions, last modified timestamp)

**Value**: Foundation for collaborative workflow - enables quick detection of human changes, reduces latency 10-20x

**Complexity**: M (Medium)

**Technical Notes**:
- Uses existing Miro REST API pagination
- Orchestrates multiple `list_items` calls internally
- Returns structured format: `{metadata: {...}, items: {shapes: [...], sticky_notes: [...], ...}}`

---

### CAP-BATCH-UPDATE: Agent AI updates multiple items atomically

**Outcome**: Agent repositions 10 items in 1 request instead of 10 sequential calls

**User Story**:
> As an agent AI positioning multiple dozens of items,
> I want to update multiple items in a single request,
> So that I reduce latency and have atomic operations.

**Acceptance Criteria**:
- Function `batch_update_items(board_id, updates)` accepts array of updates
- Format: `[{id: "...", position: {...}, style: {...}}, ...]`
- Executes all updates in parallel server-side
- Returns results with success/error status for each item
- Reasonable limit (e.g., 50 items per batch)

**Value**: Reduces latency dramatically for repositioning tasks, enables "all or nothing" reliability

**Complexity**: M (Medium)

**Technical Notes**:
- Parallel execution using Rust async/await
- Individual item failures don't block entire batch
- Returns detailed status per item for error handling

---

### CAP-CHANGE-DETECTION: Agent AI detects board changes since last read

**Outcome**: Agent identifies human edits instantly without re-reading entire board

**User Story**:
> As an agent AI working in parallel with a human,
> I want to detect quickly what changed on the board since my last read,
> So that I adapt my plan without overwriting human modifications.

**Acceptance Criteria**:
- Function `get_board_changes(board_id, since_timestamp)` returns deltas
- Identifies items created, modified, deleted
- For modifications, indicates which fields changed (position, content, style)
- Uses Miro native timestamps (`modifiedAt`)
- Clear diff format: `{created: [...], updated: [...], deleted: [...]}`

**Value**: Prevents conflicts between human and AI actions, enables "human structures, AI fills" workflow

**Complexity**: L (Large)

**Technical Notes**:
- Requires caching previous board state or leveraging Miro modification timestamps
- May need local state management (cache last sync timestamp)
- Consider WebSocket integration for real-time change notifications (future enhancement)

---

### CAP-SPATIAL-SEARCH: Agent AI finds items in geographic zone

**Outcome**: Agent finds "the rectangle at x=1500, y=200" without parsing all items

**User Story**:
> As an agent AI searching for a containing rectangle,
> I want to find all items in a geographic area,
> So that I quickly identify structures without parsing all items.

**Acceptance Criteria**:
- Function `find_items_in_area(board_id, x, y, width, height, type?)`
- Returns items whose center is in specified zone
- Optional filter by item type
- Results sorted by z-index (visual layer) or creation timestamp
- Handles Miro "center" coordinate system correctly

**Value**: Instant location-based searches, identifies already-positioned items, useful for post-modification verification

**Complexity**: M (Medium)

**Technical Notes**:
- Requires full board sync first (builds on CAP-BOARD-SYNC)
- Spatial indexing on server-side for performance
- Coordinate system: center-based (Miro native)
- Bounding box calculation: `top = y - height/2`, `bottom = y + height/2`, etc.

---

### CAP-STRUCTURED-INVENTORY: Agent AI understands board hierarchy automatically

**Outcome**: Agent comprehends "5 domains, 16 teams, 115 people" structure immediately

**User Story**:
> As an agent AI analyzing an organizational board,
> I want a pre-structured inventory by zones/semantic types,
> So that I understand the structure without manual parsing.

**Acceptance Criteria**:
- Function `get_structured_inventory(board_id)` analyzes board
- Automatically detects parent frames
- Groups items by parent frame
- Identifies containing rectangles (thick border, transparent fill)
- Separates "structure" items vs "content" items
- Hierarchical format: `{frames: {frame_id: {metadata: {...}, children: [...]}}}`

**Value**: Instant comprehension of complex boards, reduces cognitive analysis load, foundation for intelligent positioning calculations

**Complexity**: L (Large)

**Technical Notes**:
- Heuristics for detecting "structure" elements (frames, thick-bordered rectangles)
- Builds parent-child relationships from `parent_id` and spatial containment
- Returns semantic categorization (domains, teams, people for org charts)
- Extensible pattern matching for different board types

---

---

## EPIC-SDK-BRIDGE: Web SDK Bridge App (Added 2025-12-03)

**Outcome**: Agent AI controls z-index, selection, and grouping via Miro Web SDK bridge

### Overview

REST API cannot control z-index, selection, or grouping. These features require the Web SDK which only runs in-browser. This epic creates a Miro App that bridges our MCP server to Web SDK capabilities via WebSocket.

**Architecture**: MCP Server ↔ WebSocket ↔ Miro App (iframe) ↔ Web SDK

**Constraint**: Board must be open in browser with app active (mitigated by Playwright/Chromium MCP automation)

### Capabilities

| ID | Capability | Tool |
|----|------------|------|
| CAP-ZINDEX-FRONT | Agent brings item to front | `sdk_bring_to_front(board_id, item_id)` |
| CAP-ZINDEX-BACK | Agent sends item to back | `sdk_send_to_back(board_id, item_id)` |
| CAP-SELECTION-READ | Agent sees user's selection | `sdk_get_selection(board_id)` |
| CAP-SELECTION-WRITE | Agent selects items | `sdk_select(board_id, item_ids[])` |
| CAP-GROUPING | Agent groups items | `sdk_group(board_id, item_ids[])` |
| CAP-UNGROUPING | Agent ungroups items | `sdk_ungroup(board_id, group_id)` |

**Value**: Bidirectional interaction - Claude sees what user selected and can manipulate layer order

### Components

| Component | Effort | Files |
|-----------|--------|-------|
| Miro App (Web SDK) | 2-3 days | `miro-bridge-app/` (new project) |
| WebSocket Hub | 1-2 days | `src/websocket-hub.ts` (new) |
| MCP Tools | 1 day | `src/tools.ts` (extend) |
| Infrastructure | 0.5 day | Docker, Miro Developer Portal |
| Tests & Debug | 1-2 days | Integration tests |
| **TOTAL** | **5-8 days** | |

### References

- [Feasibility Study](/Users/guillaume/.claude/plans/cached-painting-codd.md)
- [miro-breakout-chat-app](https://github.com/miroapp/miro-breakout-chat-app) - Socket.IO pattern
- [Miro Web SDK Reference](https://developers.miro.com/docs/web-sdk-reference-guide)

---

### Critical Safety Nets (Production Blockers - Added 2025-12-03)

**🔴 Red Zone Alert**: Testing pyramid inverted - 73 unit tests but ZERO integration/E2E tests

- [ ] **TECH-E2E-PROTOCOL**: Developer validates MCP protocol compliance end-to-end (0 → 5+ scenarios)
  - **Current**: No protocol-level tests - cannot verify tools/list, tools/call handshake
  - **Target**: 5+ E2E scenarios (auth flow, tool discovery, create/read/update operations)
  - **Value**: Prevents protocol regressions that break Claude Desktop integration
  - **Blocking**: Production readiness - cannot ship without protocol validation
  - **Effort**: 2-3 days

- [ ] **TECH-INTEGRATION-MIRO**: Developer validates live Miro API integration (0 → 8+ scenarios)
  - **Current**: No live API tests - OAuth race condition, serialization bugs undetected
  - **Target**: 8+ integration tests (OAuth flow, token refresh, CRUD operations, error handling)
  - **Value**: Catches JSON serialization, async handling, real API contract issues
  - **Blocking**: Data safety - OAuth race can corrupt tokens under load
  - **Effort**: 3-4 days

- [ ] **TECH-OAUTH-RACE**: System refreshes tokens safely under concurrent requests (race condition → mutex)
  - **Current**: OAuth2Manager has race condition - concurrent calls can double-refresh
  - **Target**: Token refresh with mutex lock, single refresh per expiry
  - **Value**: Prevents token corruption under load, data safety invariant
  - **Blocking**: Production stability under concurrent usage
  - **Effort**: 4 hours

- [ ] **TECH-DEPS-PINNED**: Team deploys with known-good dependency versions (ranges → exact pins)
  - **Current**: `^` and `~` ranges allow breaking changes (axios ^1.7.9, @modelcontextprotocol/sdk ^1.0.4)
  - **Target**: Exact pins in package.json, CI validates no drift
  - **Value**: Prevents surprise breakage from transitive dependency updates
  - **Blocking**: Deployment reliability
  - **Effort**: 15 minutes

### Code Quality & Architecture (Yellow Zone - From Review 2025-12-02)

- [ ] **TECH1**: Developer creates tree diagrams at scale without waiting (30s → 2s for 100 nodes, -92%)
  - **Current**: Sequential connector creation - 25s for 100-node tree
  - **Target**: Parallel connector creation using Promise.all - 2s
  - **Value**: Makes large tree layouts actually usable
  - **Impact**: High ROI - 1 hour implementation, massive UX improvement
  - **Effort**: 1 hour

- [ ] **TECH2**: Developer modifies batch creation logic once (3 files → 1 module)
  - **Current**: ~200 lines duplicate schema definitions (board_id repeated 18x)
  - **Target**: Extract schema constants module, DRY violations eliminated
  - **Value**: Maintenance burden -60%, consistency guaranteed
  - **Effort**: 1 day

- [ ] **TECH3**: Developer extends auth logic with full type safety (type assertion → interface)
  - **Current**: `(miroClient as any).oauth` security smell - bypasses TypeScript
  - **Target**: Extract TokenProvider interface, inject dependency
  - **Value**: Enables isolated testing, SOLID DIP compliance
  - **Effort**: 1 day (includes TECH-OAUTH-RACE fix)

- [ ] **TECH4**: Developer works with clean production build (1200 lines debug code → 0)
  - **Current**: 24% of src/ is test/debug files (test-mcp-server.ts, example-boards.ts)
  - **Target**: Move to test/ directory, exclude from dist/
  - **Value**: Clean deployments, faster builds
  - **Effort**: 2 hours

- [ ] **TECH5**: Developer navigates layout code without dead paths (unused custom layout removed)
  - **Current**: Unreachable custom layout code path in batch creation
  - **Target**: Remove dead code, simplify conditional logic
  - **Value**: Reduced cognitive load, clearer intent
  - **Effort**: 1 hour

### Performance Optimizations (Quick Wins - From Review 2025-12-02)

- [ ] **TECH6**: Agent AI responds instantly for repeated searches (5000ms → 0ms, -100%)
  - **Current**: No item list caching - searches refetch 1000+ items every time
  - **Target**: TTL-based cache (30s) for list_items results
  - **Value**: Eliminates redundant API calls for common query patterns
  - **Effort**: 4 hours

- [ ] **TECH7**: System maintains stable memory under high usage (unbounded cache → TTL + LRU)
  - **Current**: No cache eviction - long-running processes can OOM
  - **Target**: TTL-based eviction + max size limit (LRU)
  - **Value**: Production stability for long sessions
  - **Effort**: 2 hours (extends TECH6)

- [ ] **TECH-RATE-LIMITS**: System queues requests under rate limits (fail → retry queue)
  - **Current**: Rate limits tracked but not enforced - requests fail
  - **Target**: Request queue with exponential backoff when approaching limits
  - **Value**: Graceful degradation instead of errors
  - **Effort**: 1 day

- [ ] **TECH-PAGINATION**: System limits unbounded searches (1000+ items → configurable max)
  - **Current**: Pagination fetches ALL items for searches (memory/latency issue)
  - **Target**: Configurable max_items parameter with sensible defaults
  - **Value**: Prevents memory/latency issues on huge boards
  - **Effort**: 2 hours

### API Limitations (Not Fixable)

**Fonts**:
- ✅ Shapes/Text: Font family and size controllable via API
- ❌ Sticky notes: No font control - size auto-scales with sticky dimensions
- ❌ Sticky notes: Text color not modifiable
- ✅ HTML formatting: `<strong>`, `<em>`, `<p>` work in content

**Z-Index / Layers**:
- ❌ REST API has NO z-index control
- ❌ Only Web SDK has `bringToFront()`, `sendToBack()`, `bringInFrontOf()`
- ⚠️ Creation order = stacking order by default
- ⚠️ Frames always at bottom (parent container behavior)
- ⚠️ Items added to frame inherit frame's layer index

**Workarounds**:
- For z-order: Create items in desired back-to-front order
- For fonts: Use sticky size to control text size
- For emphasis: Use HTML tags in content

### Deprecated (Removed from Scope)

- [x] ~~OPS-SCALEWAY: Deploy to Scaleway Functions~~ → Deprecated: HTTP gateway approach preferred
- [x] ~~CAP-STDIO-TRANSPORT: Local stdio transport~~ → Deprecated: HTTP-only deployment

## Backlog Health (Updated 2025-12-03)

### Delivery Summary

**Total Capabilities Delivered**: 32 capabilities
  - 16 MVP capabilities (Initial implementation - 2025-11-10)
  - 1 Feature (FEAT1 - parent_id)
  - 2 Performance (CAP-INSTANT-RESPONSE, CAP-BURST-PERFORMANCE)
  - 2 Technical (TECH-CLARITY, TECH-MAINTAINABILITY)
  - 1 Infrastructure (CAP-HTTP-HANDLER - gateway-ready)
  - 1 Technical (TECH-TESTABILITY - unit test suite)
  - 1 Developer Experience (CAP-RICH-DIAGNOSTICS - error classification)
  - 2 Infrastructure Capabilities (CAP-REAUTH-FLOW, CAP-AUTH-STATUS - 2025-11-27)
  - 2 Batch/Layout Capabilities (CAP-BATCH-CREATION, CAP-LAYOUT-ASSISTANCE - 2025-12-02)
  - 2 Collaborative Workflow (CAP-BOARD-SYNC, CAP-BATCH-UPDATE - 2025-12-03)

**Recently Completed** (2025-12-03):
  - CAP-BOARD-SYNC: Complete board snapshot in single request (10-20 calls → 1)
  - CAP-BATCH-UPDATE: Atomic multi-item updates with parallel execution
  - OPS-TOKEN-PERSIST: Tokens persist across deployments without re-auth
  - **Quality Review**: 4-specialist comprehensive analysis (code-quality, architecture, performance, integration)

### Quality Review Findings (2025-12-03)

**Critical Issues Identified**:
- 🔴 **Testing Pyramid Inverted**: 73 unit tests, 0 integration tests, 0 E2E tests
- 🔴 **OAuth Race Condition**: Token refresh unsafe under concurrent load
- 🔴 **Dependency Ranges**: Version ranges allow breaking changes
- 🟡 **Performance Bottlenecks**: Sequential tree creation (25s → 2s possible), no caching
- 🟡 **DRY Violations**: ~200 lines duplicate schemas (board_id repeated 18x)
- 🟡 **Architecture Gaps**: Type assertions bypass safety, missing DIP compliance

**Cross-Cutting Themes**:
- All 4 specialists flagged testing gaps as **critical blocker**
- Performance optimizations = quick wins (1-4 hours each for major improvements)
- Code quality issues are moderate (7.5/10) but fixable

### Technical Investment Ratio Analysis

**Current Backlog Composition** (23 items total):
- **Technical capabilities**: 13 items (TECH-E2E-PROTOCOL, TECH-INTEGRATION-MIRO, TECH-OAUTH-RACE, TECH-DEPS-PINNED, TECH1-7, TECH-RATE-LIMITS, TECH-PAGINATION)
- **Feature capabilities**: 9 items (CAP-BOARD-TEMPLATES through CAP-STRUCTURED-INVENTORY)
- **Epics**: 1 item (EPIC-SDK-BRIDGE)

**Technical Investment Ratio**: **57% (13 of 23 items)**

**Zone Classification**: 🔴 **RED ZONE (>40% technical effort)**

**Health Assessment**:
- **Root Cause**: Quality review revealed critical testing gaps - not routine debt
- **Severity**: Production blockers (E2E/integration tests) + data safety (OAuth race)
- **Duration**: Temporary spike - after safety nets, ratio drops to ~35% (Yellow)
- **Action Required**: PAUSE new features until safety nets complete

### Recommended Strategy

**Phase 1: Safety Nets (MANDATORY - 6-8 days)**
1. TECH-E2E-PROTOCOL (2-3 days) - Cannot ship without protocol validation
2. TECH-INTEGRATION-MIRO (3-4 days) - Cannot validate API integration
3. TECH-OAUTH-RACE (4 hours) - Data corruption risk
4. TECH-DEPS-PINNED (15 minutes) - Deployment stability

**Phase 2: Quick Wins (2-3 days)**
5. TECH1 (1 hour) - Unblocks tree layouts, 92% performance gain
6. TECH4 (2 hours) - Clean builds
7. TECH5 (1 hour) - Code clarity

**Phase 3: Return to Feature Velocity**
- After Phase 1+2: Technical ratio drops to 6/23 = **26% (Yellow Zone)**
- Resume feature development with confidence
- Alternate quality improvements (TECH6-7, TECH2-3) with features

**Investment Justification**:
- Current RED zone is **quality debt**, not routine maintenance
- Testing pyramid inversion = existential risk to production
- 6-8 day investment prevents future 10x debugging/rework costs
- Post-safety-nets: Return to healthy 25-30% technical investment

### Velocity Metrics

**Delivery Rate**: 32 capabilities across 6 development sessions (Nov 10 - Dec 3)
  - Average: ~5 capabilities per session
  - Quality review identified gaps despite high velocity = need for safety gates

**Effort Remaining** (excluding low priority):
  - Critical: 6-8 days (safety nets)
  - High: 2-3 days (quick wins)
  - Medium: 8-10 days (quality + features)
  - **Total to Yellow Zone**: 16-21 days

**Architecture Decisions** (2025-12-02):
  - ~~Scaleway Functions~~ → HTTP gateway deployment only
  - ~~stdio transport~~ → HTTP-only (gateway pattern)
  - Single-account per MCP instance (multi-tenant via gateway)

**API Limitations Documented**:
  - Fonts: Controllable for shapes/text, NOT for sticky notes
  - Z-Index: No control via REST API (Web SDK only)
  - Workarounds documented in backlog

**Font Support** (added 2025-12-03):
  - ✅ `create_text` now supports: fontSize, fontFamily, textColor, textAlign
  - ✅ `create_shape` now supports: fontSize, fontFamily, textColor
  - ❌ Sticky notes: No font control (API limitation)

**Velocity**: 30 capabilities delivered across 4 development sessions (2025-11-10, 2025-11-24, 2025-11-27, 2025-12-02)

## Version History

- **v0.1.0** (2025-11-10 AM): Initial MVP with 14 MCP tools, OAuth2, and Claude Desktop integration
- **v0.1.1** (2025-11-10 PM): Frame-based organization (FEAT1) + Performance optimizations (Quick Wins)
- **v0.1.2** (2025-11-24): HTTP handler + Unit test suite (Gateway-ready + TECH-TESTABILITY)
- **v0.1.3** (2025-11-25): Rich error diagnostics (CAP-RICH-DIAGNOSTICS)
- **v0.1.4** (2025-11-27): Reauthentication flow (CAP-REAUTH-FLOW + CAP-AUTH-STATUS)
- **v1.3.0** (2025-12-02): Batch creation + Layout assistance (3 batch tools, 5 layout algorithms)
- **Current** (HEAD): 30 capabilities, deployed to production, tech debt identified
