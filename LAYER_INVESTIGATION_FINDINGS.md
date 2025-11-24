# Miro REST API v2 - Layer/Z-Order Investigation

## Research Context
**Date**: 2025-11-10
**Goal**: Determine what layer/z-order information is available in Miro REST API v2 to implement LAYER2 user story ("User understands item stacking order when reading/creating items")

**Background**: LAYER1 (controlling layers with bringToFront/sendToBack) is blocked - only available in Web SDK, not REST API.

---

## Key Findings

### 1. Z-Index/Layer Control: Web SDK Only ❌

**Finding**: The Miro REST API v2 does **NOT** provide z-index or layer control capabilities.

**Evidence**:
- Official documentation states: "V2 introduces new methods in board.ui for managing the Z-index of an item" (Web SDK reference)
- Layer index methods (`getLayerIndex`, `setLayerIndex`, `bringToFront`, `sendToBack`) are **Web SDK exclusive**
- No z-index, layer, or order fields found in REST API item response schema

**Implication**: We cannot programmatically control layer order via REST API v2.

---

### 2. Item Response Schema Analysis

Based on official documentation and example responses, here are **ALL** fields returned by GET `/v2/boards/{board_id}/items`:

```typescript
interface MiroItemResponse {
  // Identity
  id: string;                    // Unique identifier
  type: string;                  // 'sticky_note', 'shape', 'text', 'frame', 'connector', etc.

  // Timestamps
  createdAt: string;             // ISO 8601 timestamp
  modifiedAt: string;            // ISO 8601 timestamp

  // Ownership
  createdBy: {
    id: string;
    type: 'user';
  };
  modifiedBy: {
    id: string;
    type: 'user';
  };

  // Content (item-type specific)
  data: {
    content?: string;            // HTML content
    shape?: string;              // For shapes/sticky notes
    // ... other type-specific fields
  };

  // Visual style (item-type specific)
  style: {
    fillColor?: string;
    borderColor?: string;
    color?: string;
    // ... other style fields
  };

  // Position
  position: {
    x: number;
    y: number;
    origin?: 'center' | string;           // Where x,y refers to
    relativeTo?: 'canvas_center' | string; // What x,y is relative to
  };

  // Size
  geometry: {
    width?: number;
    height?: number;
    rotation?: number;
  };

  // Hierarchy
  parent?: {
    id: string;                  // Parent frame/item ID
    links?: { ... };
  };

  // API links
  links: {
    self: string;
    related?: string;
  };
}
```

**Critical Observation**: **No z-index, layer, layerIndex, stack, or order field exists.**

---

### 3. What We CAN Observe: Creation Timestamps ✓

**Finding**: Items have `createdAt` timestamps that reflect creation order.

**What This Means**:
- We can infer creation order by comparing `createdAt` timestamps
- Items created first have earlier timestamps
- This gives us a **proxy for layer order** (assumption: newer items appear on top)

**Limitation**: This is an **assumption**, not guaranteed by API documentation. Miro could theoretically:
- Change layer order independently of creation time
- Allow users to manually reorder layers (in Web SDK)
- Not follow a consistent stacking model

---

### 4. What We CAN Do: Position.RelativeTo Field

**Finding**: The `position.relativeTo` field exists but doesn't indicate stacking.

**What It Actually Means**:
- `relativeTo: 'canvas_center'` - Coordinates are relative to board center
- `relativeTo: 'parent_top_left'` - Coordinates are relative to parent frame's top-left corner (when item has `parent.id`)
- This is about **coordinate system**, not layer order

**Use Case**:
- Understanding coordinate context when reading positions
- Knowing whether coordinates are board-relative or frame-relative

---

### 5. API Response Order: Unknown ⚠️

**Question**: In what order does `GET /items` return items?

**Need to Test**:
- Is it creation order (oldest first)?
- Reverse creation order (newest first)?
- Random/undefined order?
- Z-order (bottom to top or top to bottom)?

**Test Plan** (in `test-layer-api.ts`):
1. Create 3 items at same position in specific order
2. Retrieve items via GET /items
3. Compare retrieval order to creation order
4. Document the pattern

**Status**: Test written but requires valid OAuth tokens to run.

---

## What We CAN Implement for LAYER2

### Capability A: Understand Creation Order ✓

**Implementation**:
```typescript
// When listing items, sort by creation timestamp
const items = await miro.listItems(boardId);
const orderedByCreation = items.sort((a, b) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);

// Oldest first = likely bottom layer
// Newest last = likely top layer
```

**User Value**:
- "Show me items from bottom to top"
- "Which item was created first?"
- "What's the likely visual stacking?"

**Confidence**: High (based on timestamps, not assumptions)

---

### Capability B: Document Coordinate Context ✓

**Implementation**:
```typescript
// When reading item positions, explain the coordinate system
function describePosition(item: MiroItem): string {
  const coordContext = item.position.relativeTo === 'canvas_center'
    ? 'board center'
    : 'parent frame top-left';

  return `Position (${item.position.x}, ${item.position.y}) relative to ${coordContext}`;
}
```

**User Value**:
- "Where exactly is this item?"
- "How do I position a new item relative to this one?"
- "What coordinate system is in use?"

**Confidence**: High (documented API field)

---

### Capability C: Infer Likely Visual Stack (with caveats) ⚠️

**Implementation**:
```typescript
// ASSUMPTION: Newer items appear on top (not API-guaranteed)
function inferVisualStack(items: MiroItem[]): MiroItem[] {
  return items.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  // Returns items from bottom (oldest) to top (newest)
}
```

**User Value**:
- "Which item is probably on top?"
- "Show me the likely visual order"

**Confidence**: Medium (assumption-based, not API-guaranteed)

**Caveats**:
1. Miro Web SDK users could reorder layers after creation
2. API doesn't guarantee visual stacking matches creation order
3. This is a heuristic, not ground truth

---

## Recommended LAYER2 Implementation

### Phase 1: Safe Capabilities (High Confidence)

**Tool: `describe_item_position`**
```typescript
{
  name: 'describe_item_position',
  description: 'Understand item position and coordinate context',
  // Returns: coordinates, coordinate system, parent context
}
```

**Tool Enhancement: `list_items` sorting**
```typescript
{
  name: 'list_items',
  parameters: {
    sort_by: 'creation_date' | 'modification_date' | 'none'
  }
  // Returns items with creation timestamps
}
```

**User Story Outcome**:
- ✅ User knows when items were created (objective)
- ✅ User understands coordinate systems (documented)
- ✅ User can sort by creation order

---

### Phase 2: Heuristic Capabilities (Medium Confidence)

**Tool: `infer_visual_stack`**
```typescript
{
  name: 'infer_visual_stack',
  description: 'Estimate likely visual stacking order (assumption: newer items on top)',
  // Returns items ordered bottom-to-top with confidence caveat
}
```

**User Story Outcome**:
- ⚠️ User has educated guess about visual order
- ⚠️ Clear disclaimer that this is not API-guaranteed

---

### What We CANNOT Do

❌ **Control layer order** - No bringToFront/sendToBack in REST API
❌ **Read actual z-index** - No layerIndex field in API response
❌ **Guarantee visual stacking accuracy** - API doesn't expose this
❌ **Move items forward/backward** - Web SDK exclusive

---

## Testing Strategy

### Hypothesis to Test
**Hypothesis**: Miro REST API returns items in creation order (oldest first).

**Alternative Hypotheses**:
1. Items returned in reverse creation order (newest first)
2. Items returned in z-order (bottom to top)
3. Items returned in reverse z-order (top to bottom)
4. Items returned in undefined/random order

**Test Approach**:
1. Create 3 items at same position with delays (to ensure different timestamps)
2. Retrieve items via GET /items
3. Check if retrieval order matches creation order
4. Repeat test 3 times to confirm consistency

**Status**: Test script ready at `src/test-layer-api.ts` (requires auth)

---

## Conclusion

### What LAYER2 Can Achieve

**Minimal Viable Implementation**:
- Sort items by `createdAt` timestamp (objective data)
- Explain coordinate systems via `position.relativeTo`
- Document creation order (factual)

**Enhanced Implementation** (with caveats):
- Infer likely visual stack based on creation order (assumption)
- Provide confidence levels for stacking estimates
- Clear documentation of limitations

**User Value**:
- Better than nothing: Users get creation order and coordinate context
- Partial answer to "what's the layer order" via heuristics
- Foundation for future Web SDK integration (if needed)

### What Requires Web SDK

- Actual layer control (bringToFront/sendToBack)
- Reading true z-index values
- Guaranteed visual stacking information

### Recommendation

**Implement LAYER2 as "Layer Information (Read-Only)"**:
1. Document creation order (high confidence)
2. Explain coordinate systems (documented feature)
3. Provide stacking heuristics (with clear caveats)
4. Update user story to reflect REST API limitations

**Accept**:
- We cannot control layers via REST API
- We cannot read true z-index
- We provide best-effort inference based on available data

**Alternative Path**:
- If layer control is critical, consider Web SDK integration
- REST API is sufficient for read-only layer understanding
