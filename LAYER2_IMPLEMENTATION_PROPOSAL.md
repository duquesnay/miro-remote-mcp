# LAYER2 Implementation Proposal

**User Story**: User understands item stacking order when reading/creating items

**Status**: Ready for implementation (within REST API constraints)

---

## TL;DR

**What REST API Provides**:
✅ `createdAt` timestamps (creation order)
✅ `position.relativeTo` (coordinate context)
✅ `parent.id` (hierarchy information)

**What REST API Does NOT Provide**:
❌ Z-index or layer fields
❌ Visual stacking order
❌ Layer control methods (bringToFront/sendToBack)

**Proposed Solution**: Implement read-only layer understanding based on creation timestamps.

---

## Implementation Plan

### 1. Enhance `list_items` Tool

**Add sorting parameter**:
```typescript
{
  name: 'list_items',
  parameters: {
    board_id: string;
    type?: string;
    sort_by?: 'creation' | 'modification' | 'none'; // NEW
  }
}
```

**Response enhancement**:
- Include `createdAt` and `modifiedAt` in response
- When `sort_by: 'creation'`, return items oldest-to-newest
- Add note: "Items sorted by creation time (oldest first = likely bottom layer)"

**Outcome**: User sees items in probable visual stacking order.

---

### 2. Add `describe_position` Helper Tool (Optional)

**New tool**:
```typescript
{
  name: 'describe_item_position',
  description: 'Explain item position and coordinate context',
  parameters: {
    board_id: string;
    item_id: string;
  },
  returns: {
    coordinates: { x: number; y: number };
    relativeTo: string; // 'canvas_center' or 'parent_top_left'
    explanation: string; // Human-readable description
  }
}
```

**Example output**:
```json
{
  "coordinates": { "x": 100, "y": 200 },
  "relativeTo": "canvas_center",
  "explanation": "Item is positioned 100 pixels right and 200 pixels down from the board center"
}
```

**Outcome**: User understands coordinate systems.

---

### 3. Document Limitations in Tool Descriptions

**Current `list_items` description**:
> "List all items on a Miro board"

**Proposed description**:
> "List all items on a Miro board. Items can be sorted by creation time to approximate visual stacking order (newer items typically appear on top). Note: Actual z-index/layer control is only available in Miro Web SDK, not REST API."

**Outcome**: User has correct expectations.

---

## Acceptance Criteria (Updated)

Original LAYER2 acceptance criteria need adjustment for REST API constraints:

### ✅ Achievable

1. **User can list items in creation order**
   - Sort by `createdAt` timestamp
   - Oldest first = probable bottom layer

2. **User understands coordinate context**
   - Know if coordinates are board-relative or frame-relative
   - Understand `position.relativeTo` field

3. **User sees item hierarchy**
   - Parent frame relationships via `parent.id`
   - Items within frames vs board root

### ⚠️ Partially Achievable (with caveats)

4. **User infers likely visual stacking**
   - Assumption: newer items on top
   - Not guaranteed by API
   - Could be invalidated by Web SDK layer manipulation

### ❌ Not Achievable (REST API limitation)

5. **User controls layer order**
   - No bringToFront/sendToBack in REST API
   - Requires Web SDK

6. **User reads actual z-index**
   - No `layerIndex` field in REST API
   - Requires Web SDK

---

## Implementation Estimate

**Complexity**: Low (add sorting parameter + documentation)

**Changes Required**:
1. Update `MiroItem` interface to include timestamps (DONE in investigation)
2. Add `sort_by` parameter to `list_items` tool schema
3. Implement sorting in `miro-client.ts`
4. Update tool descriptions with caveats
5. Add examples to documentation

**Testing**:
- Verify sorting works correctly
- Confirm timestamps are included in responses
- Test with items in frames vs board root

**Estimated Effort**: ~30 minutes

---

## Alternative: Full Implementation (if needed)

If true layer control is required, consider:

**Option A: Web SDK Integration**
- Add iframe-based Web SDK wrapper
- Expose layer control methods
- Complexity: High (different architecture)

**Option B: Hybrid Approach**
- REST API for CRUD operations
- Web SDK for layer control only
- Complexity: Medium

**Recommendation**: Start with REST API implementation (LAYER2 read-only). Add Web SDK later if users request layer control.

---

## Next Steps

1. ✅ Research complete (findings in `LAYER_INVESTIGATION_FINDINGS.md`)
2. **TODO**: Implement sorting in `list_items` tool
3. **TODO**: Update tool descriptions with limitations
4. **TODO**: Add tests for sorting behavior
5. **TODO**: Document coordinate context in README
6. **TODO**: Update user story to reflect REST API constraints

---

## Open Questions (for user)

1. **Is creation-time sorting sufficient for LAYER2?**
   - Or do you need actual layer control?
   - If latter, consider Web SDK integration

2. **Should we add a dedicated position description tool?**
   - Or is coordinate context in `list_items` enough?

3. **How to handle the caveat about layer assumptions?**
   - Tool description warning?
   - Separate "confidence" field in response?

---

## Files Created

1. **Investigation findings**: `LAYER_INVESTIGATION_FINDINGS.md` (detailed research)
2. **Test script**: `src/test-layer-api.ts` (for validating API behavior)
3. **This proposal**: `LAYER2_IMPLEMENTATION_PROPOSAL.md` (implementation plan)

**Status**: Ready to proceed with implementation or gather user feedback.
