# Project Framing: Miro MCP Server

## Vision

Enable Claude AI to programmatically create and manipulate Miro boards through a Model Context Protocol (MCP) server, allowing users to generate complex visualizations through natural language conversations.

## Context

**Problem**: Creating structured visualizations (org charts, team models, architecture diagrams) in Miro requires significant manual effort - clicking, dragging, connecting, styling elements one by one.

**Opportunity**: Claude Desktop supports MCP servers that extend Claude's capabilities with external integrations. By implementing a Miro MCP server, users can describe visualizations in natural language and have Claude generate complete Miro boards programmatically.

**User**: Agile coaches, consultants, architects, and knowledge workers who frequently create diagrams and visual models.

## Strategic Goals

1. **Rapid board creation**: From idea to visual in minutes (vs hours of manual work)
2. **Natural language interface**: Describe what you want, Claude creates it
3. **Complex visualizations**: Support team structures, dependencies, relationships
4. **Professional quality**: Proper styling, layouts, and visual hierarchy

## Constraints & Decisions

### Technical Constraints
- **OAuth2 authentication required**: Miro API requires OAuth2 flow
- **MCP protocol compliance**: Must implement standard MCP tool interface
- **Rate limits**: 100 requests/minute per user (Miro API limit)
- **TypeScript implementation**: For Node.js runtime compatibility with Claude Desktop

### Architectural Decisions
- **Stateless server**: No session management, authentication via environment tokens
- **Configuration directory**: `~/.config/mcps/miro-dev/` for credentials and tokens
- **Token refresh**: Automatic refresh for short-lived tokens (1 hour), manual for long-lived
- **Error handling**: Comprehensive error reporting with MCP error codes
- **Testing strategy**: Protocol-level integration tests + API tests

### Security Decisions
- **No credentials in code**: All sensitive data in config files (git-ignored)
- **Environment-based config**: Claude Desktop passes credentials via environment
- **Token storage**: Local file system only (`~/.config/mcps/miro-dev/tokens.json`)

## Scope

### In Scope (MVP)
- ✅ Board operations (list, get, create)
- ✅ Item operations (list, get, update, delete)
- ✅ Item creation (sticky notes, shapes, text, frames)
- ✅ Connectors with styling
- ✅ OAuth2 flow with token refresh
- ✅ Integration with Claude Desktop
- 🚧 Frame-based organization (in progress - FEAT1)

### Out of Scope (Deferred)
- Real-time collaboration features
- Image/file uploads
- Advanced layout algorithms
- Template library
- Multi-user management
- Board export/import
- Undo/redo operations
- Comments and annotations
- Board permissions management

## Success Metrics

**MVP Success Criteria (Achieved)**:
- ✅ 13+ MCP tools covering essential Miro operations
- ✅ Complete OAuth2 implementation with automatic refresh
- ✅ Integration with Claude Desktop functional
- ✅ Comprehensive test suite (API + MCP protocol tests)
- ✅ Example: Spotify team-of-teams visualization (384 lines demo)
- ✅ Security: No credentials exposed in code/git

**Usage Metrics (Post-MVP)**:
- Time to create 10-element diagram (target: <2 minutes via Claude conversation)
- User satisfaction: Reduction in manual Miro editing after Claude generation
- Complexity handling: Ability to generate 50+ element boards in single session

## Architecture Overview

### Components
1. **MCP Server** (`src/index.ts`): StdIO transport, tool registration, request routing
2. **OAuth Manager** (`src/oauth.ts`): Token management, automatic refresh
3. **Miro Client** (`src/miro-client.ts`): API wrapper with error handling and rate limiting
4. **Tool Handlers** (`src/tools.ts`): 13 MCP tools with JSON schemas
5. **OAuth Helper** (`src/oauth-helper.ts`): Interactive token acquisition flow

### Data Flow
```
Claude Desktop → MCP Protocol → Tool Handler → Miro Client → Miro API
                                      ↓
                                OAuth Manager (token refresh)
```

### Configuration
```
~/.config/mcps/miro-dev/
├── credentials.json  (OAuth client ID/secret)
└── tokens.json       (access/refresh tokens)
```

## Development History

### Phase 1: Initial Implementation (2025-11-10 01:00)
**Commit**: `30b523f` - feat: Initial implementation of Miro MCP server

Complete MVP implementation including:
- 13 MCP tools for comprehensive Miro operations
- OAuth2 authentication with automatic token refresh
- Security hardening (no credentials in git)
- Comprehensive testing suite
- Complete documentation suite

**Files**: 23 new files, 5999 lines

### Phase 2: Productionization (2025-11-10 01:26-10:39)
**Commits**:
- `6233582` - refactor: rename MCP server to miro-dev
- `221cae1` - refactor: move config to ~/.config/mcps/miro-dev/
- `672bec0` - fix: handle long-lived tokens without refresh_token

Improvements:
- Configuration management aligned with MCP conventions
- Support for both short-lived (1h) and long-lived (1y) tokens
- Removed credentials from Claude Desktop config

### Phase 3: Feature Enhancement (In Progress)
**Current**: FEAT1 - Frame-based item placement
- Enable hierarchical board organization
- Items created directly inside frames (vs manual repositioning)

## Team & Collaboration

**Developer**: Guillaume Duquesnay (solo project)
**Context**: Part of broader MCP server development toolkit

## Risk Management

### Technical Risks
- **Token expiration**: Mitigated by automatic refresh + long-lived token support
- **Rate limiting**: Built-in rate limit tracking in Miro client
- **API changes**: Miro API versioned (v2), changes are breaking but announced

### Operational Risks
- **OAuth complexity**: Mitigated by interactive OAuth helper tool
- **Configuration errors**: Clear error messages with actionable fixes

## Next Steps

See [backlog.md](./backlog.md) for prioritized feature roadmap.

**Current focus**: Complete FEAT1 (frame-based organization) to enable complex hierarchical visualizations in single operation.
