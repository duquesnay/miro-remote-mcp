# planning/user-stories.md

### OPS-SCALEWAY: User accesses Miro MCP from any Claude client (not just local Desktop)

**User**: Claude user on web, mobile, or any MCP-compatible client needing Miro integration
**Outcome**: Miro board operations available through HTTP endpoint from any device/platform
**Context**: Currently Miro MCP only works with Claude Desktop via StdIO transport, limiting access to single local machine with proper config

**Acceptance Criteria**:
- Scaleway Functions handler wraps existing Miro tools as HTTP endpoints
- All 14 MCP tools accessible via HTTP (list_boards, create_sticky_note, etc.)
- OAuth credentials passed via environment variables (not local filesystem)
- Private function with X-Auth-Token authentication
- Deployment script automates packaging and upload to Scaleway
- Health endpoint confirms function is operational
- Request/response format compatible with MCP-over-HTTP clients
- Documentation includes deployment guide and client configuration

**Implementation Notes**:
- Pattern based on successful mcp-gdrive Scaleway deployment
- Handler file: src/functions-handler.ts (similar to mcp-gdrive pattern)
- Deployment script: deploy-scaleway-functions.sh
- OAuth tokens from base64-encoded environment variable
- Scale to zero when not used (cost-effective)
- 30s timeout sufficient for Miro API operations

**Source**: USER_REQUEST - enable remote access to Miro MCP

---

### FEAT1: User places items directly in frames (vs manual move after creation)

**User**: Claude Desktop user creating Miro visualizations through MCP tools
**Outcome**: Items (sticky notes, shapes, text) appear in target frame immediately upon creation
**Context**: Currently all items are created at board root, requiring manual repositioning in Miro UI to organize within frames

**Acceptance Criteria**:
- create_sticky_note accepts optional parent_id parameter
- create_shape accepts optional parent_id parameter
- create_text accepts optional parent_id parameter
- Items created with parent_id appear inside specified frame
- Items without parent_id maintain current behavior (board root)
- update_item can move items between frames by changing parent
- Coordinates are relative to frame when parent_id specified

**Implementation Notes**:
- Add optional parent_id to tool schemas
- Include parent: { id: parentId } in API payload when provided
- Document coordinate system change (board center vs frame top-left)
- Test with existing frames to verify containment

**Source**: USER_REQUEST - layer/frame organization discussion

---

### CAP-RICH-DIAGNOSTICS: Developer identifies failure root cause in one glance

**User**: Developer using Miro MCP via Claude Desktop/Code
**Outcome**: Error messages include error type, API status, affected parameter, and suggested resolution
**Context**: Current errors show "what failed" but not "why" or "how to fix" - no visibility into actual cause (API error, auth issue, invalid parameters, rate limit)

**Acceptance Criteria**:
- [ ] Error messages include: error type (API/Auth/Validation), HTTP status code if applicable
- [ ] Miro API errors surface full error message from API response
- [ ] Auth errors indicate token expiry vs permission issues with renewal suggestion
- [ ] Validation errors show which parameter failed and expected format/value
- [ ] Rate limit errors show retry timing suggestion
- [ ] Each error includes suggested resolution action

**Implementation Notes**:
- Enhance error handling in src/miro-client.ts and src/mcp-server.ts
- Create error classification utility (API/Auth/Validation/RateLimit)
- Extract and format API error responses from Miro 4xx/5xx responses
- Add parameter validation with specific error messages before API calls
- Include suggested actions: "Check token in config", "Valid values: ...", "Retry in 60s"

**Source**: BACKLOG - foundation capability

---
