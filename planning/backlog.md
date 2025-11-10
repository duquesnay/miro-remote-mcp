# planning/backlog.md

## Completed

### Core Capabilities (2025-11-10 - Initial Implementation)

- [✅] **CAP-BOARD-OPS**: User manages Miro boards through Claude
  - List all accessible boards
  - Get board details
  - Create new boards with name and description
  - **Outcome**: Board management without leaving Claude conversation

- [✅] **CAP-ITEM-READ**: User discovers board content programmatically
  - List all items on a board
  - Filter items by type (frame, sticky_note, shape, text, connector)
  - Get detailed item properties
  - **Outcome**: Board content queryable through natural language

- [✅] **CAP-ITEM-MODIFY**: User updates existing board elements
  - Update item position, content, style
  - Delete items
  - **Outcome**: Board refinement through conversation (vs manual clicks)

- [✅] **CAP-STICKY-CREATION**: User creates sticky notes with full styling control
  - Custom content (HTML)
  - Positioning (x, y coordinates)
  - Sizing (width, height)
  - 15 color options (light_yellow, yellow, orange, green, blue, pink, etc.)
  - Shape variants (square, rectangle)
  - **Outcome**: Sticky notes placed and styled in single Claude request

- [✅] **CAP-SHAPE-CREATION**: User creates geometric shapes and flowchart symbols
  - 20+ shape types (rectangle, circle, triangle, arrows, flowchart symbols)
  - Custom fill and border colors
  - Border width control
  - **Outcome**: Diagrams created through natural language descriptions

- [✅] **CAP-TEXT-CREATION**: User adds text labels and annotations
  - HTML content support
  - Positioning and width control
  - **Outcome**: Text elements placed programmatically

- [✅] **CAP-FRAME-CREATION**: User creates organizational frames
  - Custom titles
  - Sizing and positioning
  - Fill color options
  - **Outcome**: Board structure defined through conversation

- [✅] **CAP-CONNECTOR-CREATION**: User shows relationships between elements
  - Connect any two items with lines/arrows
  - Styling (color, width)
  - 13 end cap styles (arrows, diamonds, ERD symbols)
  - Optional caption text
  - **Outcome**: Dependencies and relationships visualized programmatically

- [✅] **CAP-CONNECTOR-STYLING**: User updates connector appearance
  - Change color, width, end caps
  - **Outcome**: Connector refinement without manual editing

### Infrastructure Capabilities

- [✅] **CAP-OAUTH-FLOW**: User authenticates with Miro once
  - OAuth2 authorization code flow
  - Interactive helper tool (`npm run oauth`)
  - **Outcome**: Secure authentication without manual API configuration

- [✅] **CAP-TOKEN-REFRESH**: User's session never expires during work
  - Automatic access token refresh (1-hour tokens)
  - Support for long-lived tokens (1-year tokens)
  - Transparent token management
  - **Outcome**: Uninterrupted Claude/Miro integration

- [✅] **CAP-ERROR-HANDLING**: User gets actionable error messages
  - MCP-compliant error codes
  - Miro API error pass-through
  - Rate limit tracking
  - **Outcome**: Clear feedback when operations fail

- [✅] **CAP-CLAUDE-DESKTOP**: User accesses Miro directly from Claude Desktop
  - MCP protocol implementation
  - StdIO transport
  - Environment-based configuration
  - **Outcome**: Miro tools available in Claude Desktop conversation

### Configuration & Security

- [✅] **CAP-CONFIG-MANAGEMENT**: User manages credentials centrally
  - Config directory: `~/.config/mcps/miro-dev/`
  - Separate credentials and tokens files
  - **Outcome**: Clean separation of credentials from Claude Desktop config

- [✅] **CAP-SECURITY**: User's credentials never leak
  - No credentials in git
  - No hardcoded secrets
  - Environment-based configuration
  - **Outcome**: Production-ready security posture

### Testing & Quality

- [✅] **CAP-API-TESTING**: Developer validates Miro integration
  - Comprehensive API test suite
  - Board and item operations coverage
  - **Outcome**: Confidence in Miro API integration

- [✅] **CAP-MCP-TESTING**: Developer validates MCP protocol compliance
  - Protocol-level integration tests
  - Request/response validation
  - **Outcome**: MCP specification compliance verified

### Documentation & Examples

- [✅] **CAP-DOCUMENTATION**: User understands setup and usage
  - Complete README with examples
  - OAuth setup guide
  - Claude Desktop configuration guide
  - Troubleshooting documentation
  - **Outcome**: Self-service onboarding

- [✅] **CAP-DEMO-EXAMPLE**: User sees real-world usage pattern
  - Spotify team-of-teams visualization (384 lines)
  - Complex board generation example
  - **Outcome**: Reference implementation for complex visualizations

## In Progress

- [⏳] **FEAT1**: User places items directly in frames (vs manual move after creation)
  - See [user-stories.md](./user-stories.md) for details
  - **Target outcome**: Hierarchical boards created in single Claude conversation

## Planned

### High Priority

- [📋] **CAP-BATCH-CREATION**: User creates multiple similar items efficiently
  - Bulk sticky note creation
  - Template-based item generation
  - **Outcome**: Large boards (50+ items) created faster

- [📋] **CAP-LAYOUT-ASSISTANCE**: User gets suggested layouts for common patterns
  - Grid layout for sticky notes
  - Radial layout for hub-and-spoke
  - Hierarchical tree layout
  - **Outcome**: Professional-looking boards without manual positioning

### Medium Priority

- [📋] **CAP-BOARD-TEMPLATES**: User starts from common diagram types
  - Team topology templates
  - Kanban board template
  - Retrospective template
  - **Outcome**: Faster board creation for common use cases

- [📋] **CAP-ITEM-SEARCH**: User finds elements by content or properties
  - Search by text content
  - Filter by color, type, position
  - **Outcome**: Large boards become navigable through Claude

- [📋] **CAP-BOARD-EXPORT**: User captures board state
  - JSON export of board structure
  - Ability to recreate boards from JSON
  - **Outcome**: Board versioning and backup

### Low Priority

- [📋] **CAP-IMAGE-UPLOAD**: User adds images to boards
  - Upload local images
  - Position and size images
  - **Outcome**: Richer visualizations with logos and photos

- [📋] **CAP-BOARD-PERMISSIONS**: User controls board access
  - Share boards with specific users
  - Set view/edit permissions
  - **Outcome**: Collaboration control through Claude

- [📋] **CAP-COMMENTS**: User adds contextual notes
  - Create comments on items
  - Reply to comments
  - **Outcome**: Asynchronous collaboration via Claude

## Backlog Health

**Total Capabilities Delivered**: 16 capabilities
**Current Focus**: Frame-based organization (FEAT1)
**Technical Investment Ratio**: ~80% features / ~20% infrastructure (healthy balance)

**Note**: All completed capabilities are production-ready and tested. The initial implementation (commit `30b523f`) delivered a complete MVP in a single development session.

## Version History

- **v0.1.0** (2025-11-10): Initial MVP with 14 MCP tools, OAuth2, and Claude Desktop integration
- **Current** (HEAD): Configuration improvements + long-lived token support
