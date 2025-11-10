# planning/user-stories.md

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
