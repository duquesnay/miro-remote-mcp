# Miro Layer Capabilities - Synthèse Technique pour Projet Parallèle

**Date**: 2025-11-10
**Context**: Investigation des possibilités d'implémentation des layers dans Miro API

---

## 1. Clarification Terminologique Critique

### ⚠️ Miro N'a PAS de "Layers" comme Photoshop

Miro a **deux concepts distincts** souvent confondus:

| Concept | Terme Miro | Fonction | API Support |
|---------|-----------|----------|-------------|
| **Organisation logique** | Frames (parent-child) | Regrouper items en containers | ✅ REST API v2 |
| **Ordre visuel** | Z-index (stacking order) | Contrôler qui apparaît devant/derrière | ❌ REST API v2<br>✅ Web SDK only |

**Important**: `parent_id` (frames) ≠ layer control (z-index)

---

## 2. Ce Qui N'EST PAS Possible via REST API v2

### ❌ Contrôle de l'Ordre Visuel (Z-Index)

**Méthodes absentes** (Web SDK uniquement):
```javascript
// Ces méthodes n'existent PAS dans REST API v2
item.bringToFront()
item.sendToBack()
item.bringForward()
item.sendBackward()
item.setLayerIndex(index)
item.getLayerIndex()
```

**Champs absents** dans les réponses API:
```typescript
interface MiroItemResponse {
  // Ces champs n'existent PAS
  zIndex?: number;        // ❌
  layer?: number;         // ❌
  layerIndex?: number;    // ❌
  stack?: number;         // ❌
  order?: number;         // ❌
}
```

**Impact**: Impossible de contrôler ou lire l'ordre d'empilement visuel via REST API.

---

## 3. Ce Qui EST Possible via REST API v2

### ✅ A. Organisation Hiérarchique (Frames/Parent-Child)

**Champ disponible**: `parent.id`

```typescript
// Créer un item dans un frame
POST /v2/boards/{board_id}/sticky_notes
{
  "data": { "content": "Hello" },
  "position": { "x": 100, "y": 200 },
  "parent": { "id": "frame_id_123" }  // ← Place item IN frame
}

// Déplacer un item dans un autre frame
PATCH /v2/boards/{board_id}/items/{item_id}
{
  "parent": { "id": "new_frame_id" }
}
```

**Schema complet**:
```typescript
interface MiroItemResponse {
  parent?: {
    id: string;              // ID du frame parent
    links?: {
      self: string;
    };
  };
}
```

**Use Cases**:
- Organiser items en groupes logiques
- Créer hiérarchies (frame → sections → items)
- Coordonnées relatives au parent
- Navigation parent → children

**Limites**:
- ⚠️ N'affecte PAS le z-index visuel
- ⚠️ Items dans même frame peuvent quand même se chevaucher
- ⚠️ Parent = organisation logique, pas visuelle

**Analogie**: Comme dossiers/fichiers (organisation), pas couches Photoshop (visuel)

---

### ✅ B. Inférence d'Ordre de Création

**Champ disponible**: `createdAt` (timestamp ISO 8601)

```typescript
interface MiroItemResponse {
  createdAt: string;     // "2024-11-10T14:30:00Z"
  modifiedAt: string;    // "2024-11-10T15:45:00Z"
}
```

**Heuristique possible**:
```typescript
// Assomption: Items créés plus tard apparaissent au-dessus
const items = await listItems(boardId);
const probableStackOrder = items.sort((a, b) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);
// Index 0 = probablement bottom
// Index n = probablement top
```

**⚠️ Limitations**:
1. **Assumption non documentée** - Miro API ne garantit pas que creation order = z-index
2. **Invalidé par Web SDK** - Users avec Web SDK peuvent réordonner après création
3. **Ordre de retour API inconnu** - GET /items ne garantit aucun ordre spécifique

**Confidence Level**: Moyen (heuristic basé sur assumption)

**Use Cases**:
- "Quel item a été créé en premier?"
- "Ordre de création chronologique"
- "Pile visuelle probable" (avec disclaimer)

---

### ✅ C. Contexte de Coordonnées

**Champs disponibles**: `position.relativeTo`, `position.origin`

```typescript
interface Position {
  x: number;
  y: number;
  origin?: 'center' | string;                          // Point de référence de l'item
  relativeTo?: 'canvas_center' | 'parent_top_left';    // Système de coordonnées
}
```

**Exemples**:
```json
// Coordonnées relatives au centre du board
{
  "position": {
    "x": 100,
    "y": 200,
    "origin": "center",
    "relativeTo": "canvas_center"
  }
}

// Coordonnées relatives au coin top-left du parent frame
{
  "position": {
    "x": 50,
    "y": 75,
    "origin": "center",
    "relativeTo": "parent_top_left"
  },
  "parent": { "id": "frame_123" }
}
```

**Use Cases**:
- Comprendre le système de coordonnées utilisé
- Calculer position absolue depuis position relative
- Positionner précisément nouveaux items
- Savoir si coordonnées board-relative ou frame-relative

**Confidence Level**: Élevé (documenté officiellement)

---

## 4. Schema Complet de Réponse API

```typescript
interface MiroItemResponse {
  // ===== IDENTITY =====
  id: string;
  type: 'sticky_note' | 'shape' | 'text' | 'frame' | 'connector' | 'image' | ...;

  // ===== TIMESTAMPS (UTILISABLES POUR INFÉRENCE) =====
  createdAt: string;      // ISO 8601 - "2024-11-10T14:30:00Z"
  modifiedAt: string;     // ISO 8601

  // ===== OWNERSHIP =====
  createdBy: {
    id: string;
    type: 'user';
  };
  modifiedBy: {
    id: string;
    type: 'user';
  };

  // ===== POSITION & SIZE =====
  position: {
    x: number;
    y: number;
    origin?: 'center';
    relativeTo?: 'canvas_center' | 'parent_top_left';  // UTILISABLE
  };
  geometry?: {
    width?: number;
    height?: number;
    rotation?: number;
  };

  // ===== HIERARCHY (UTILISABLE POUR FRAMES) =====
  parent?: {
    id: string;           // Frame parent
    links?: {
      self: string;
    };
  };

  // ===== CONTENT (type-specific) =====
  data: {
    content?: string;
    shape?: string;
    title?: string;
    // ... varies by type
  };

  // ===== VISUAL STYLE =====
  style: {
    fillColor?: string;
    borderColor?: string;
    color?: string;
    // ... varies by type
  };

  // ===== API METADATA =====
  links: {
    self: string;
  };

  // ===== CHAMPS ABSENTS (z-index control) =====
  // ❌ zIndex
  // ❌ layer
  // ❌ layerIndex
  // ❌ stack
  // ❌ order
}
```

---

## 5. Proposition d'Implémentation par Phases

### Phase 1: Capabilities Sûres (High Confidence)

**1.1 Organisation Hiérarchique**
```typescript
// Tool: create_item with parent_id
{
  name: 'create_sticky_note',
  parameters: {
    board_id: string,
    content: string,
    parent_id?: string,  // Optional frame ID
    // ...
  }
}

// Tool: move_item_to_frame
{
  name: 'update_item',
  parameters: {
    board_id: string,
    item_id: string,
    parent_id?: string,  // Move to different frame
  }
}
```

**Outcome**: Users créent structures organisées (frames → sections → items)

---

**1.2 Contexte de Position**
```typescript
// Enhancement: Include position context in responses
{
  id: "item_123",
  position: {
    x: 100,
    y: 200,
    relativeTo: "canvas_center"
  },
  positionDescription: "100px right, 200px down from board center"  // NEW
}
```

**Outcome**: Users comprennent systèmes de coordonnées

---

**1.3 Tri par Création**
```typescript
// Tool: list_items with sorting
{
  name: 'list_items',
  parameters: {
    board_id: string,
    sort_by?: 'creation_date' | 'modification_date' | 'none',
    include_timestamps?: boolean  // Include createdAt/modifiedAt
  }
}
```

**Outcome**: Users voient ordre chronologique de création

---

### Phase 2: Capabilities Heuristiques (Medium Confidence)

**2.1 Inférence de Stack Visuel**
```typescript
{
  name: 'infer_visual_stack',
  description: 'Estimate probable visual stacking based on creation time',
  parameters: {
    board_id: string,
    area?: { x1, y1, x2, y2 }  // Optional: items in specific area
  },
  response: {
    items: MiroItem[],  // Sorted bottom-to-top (oldest to newest)
    confidence: 'medium',
    assumptions: [
      'Based on creation timestamps',
      'Assumes newer items appear on top',
      'Not guaranteed by Miro API',
      'May not reflect manual reordering via Web SDK'
    ]
  }
}
```

**Outcome**: Users ont estimation éduquée avec disclaimers clairs

---

### Phase 3: Web SDK Integration (Si Contrôle Requis)

**Si REST API insuffisant**, deux architectures possibles:

**Option A: Hybrid MCP Server**
```
MCP Server
├── REST API Client (CRUD operations)
│   └── Fast, server-side, stateless
└── Web SDK Client (layer control)
    ├── Requires browser/iframe integration
    ├── Enables: bringToFront, sendToBack, getLayerIndex
    └── Stateful (requires active session)
```

**Option B: Browser Extension Bridge**
```
Browser Extension
├── Injects Miro Web SDK into board page
├── Exposes layer control API via extension messaging
└── MCP server calls extension API

Advantages:
✅ Full layer control
✅ No iframe complexity

Disadvantages:
❌ Requires browser extension
❌ User must have extension installed
```

**Complexité**: Élevée (front-end development, session management)

---

## 6. Décision Matrix

| Besoin | REST API | Web SDK | Effort | Recommendation |
|--------|----------|---------|--------|----------------|
| **Organiser items logiquement** | ✅ Frames | ✅ | Low | REST API |
| **Lire ordre de création** | ✅ createdAt | ✅ | Low | REST API |
| **Comprendre coordonnées** | ✅ relativeTo | ✅ | Low | REST API |
| **Inférer ordre visuel** | ⚠️ Heuristic | ✅ True z-index | Low | REST API (Phase 2) |
| **Contrôler ordre visuel** | ❌ | ✅ | **High** | **Web SDK required** |
| **Lire z-index réel** | ❌ | ✅ | **High** | **Web SDK required** |

---

## 7. Quick Decision Tree

```
Quel est le besoin utilisateur?
│
├─ "Organiser items en groupes logiques"
│  └─ ✅ REST API Phase 1 (frames/parent)
│     Effort: Low, Confidence: High
│
├─ "Comprendre ordre de création/modification"
│  └─ ✅ REST API Phase 1 (timestamps + sorting)
│     Effort: Low, Confidence: High
│
├─ "Estimer ordre visuel (read-only)"
│  └─ ⚠️ REST API Phase 2 (heuristic inference)
│     Effort: Low, Confidence: Medium
│     + Disclaimers nécessaires
│
└─ "Contrôler ordre visuel (bringToFront/sendToBack)"
   └─ ❌ REST API cannot do this
      └─ 🔧 Web SDK integration required
         Effort: High, Complexity: High
```

---

## 8. Code Examples

### Example 1: Organisation Hiérarchique
```typescript
// Créer une structure frame → sections → items
async function createOrganizedBoard(boardId: string) {
  // 1. Créer frame principal
  const mainFrame = await miro.createFrame(boardId, {
    title: "Project Overview",
    x: 0, y: 0,
    width: 1000, height: 800
  });

  // 2. Créer section dans frame
  const sectionFrame = await miro.createFrame(boardId, {
    title: "Phase 1",
    x: 100, y: 100,        // Relative to mainFrame
    width: 400, height: 300,
    parent_id: mainFrame.id  // ← Nested frame
  });

  // 3. Créer items dans section
  const task1 = await miro.createStickyNote(boardId, {
    content: "Task 1",
    x: 50, y: 50,           // Relative to sectionFrame
    parent_id: sectionFrame.id
  });

  const task2 = await miro.createStickyNote(boardId, {
    content: "Task 2",
    x: 150, y: 50,
    parent_id: sectionFrame.id
  });
}
```

---

### Example 2: Inférence de Stack Order
```typescript
async function inferStackOrder(boardId: string, area?: BoundingBox) {
  // 1. Récupérer tous les items
  let items = await miro.listItems(boardId);

  // 2. Filtrer par area si spécifié
  if (area) {
    items = items.filter(item =>
      item.position.x >= area.x1 && item.position.x <= area.x2 &&
      item.position.y >= area.y1 && item.position.y <= area.y2
    );
  }

  // 3. Trier par timestamp de création
  const sorted = items.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 4. Annoter avec inferred layer index
  return sorted.map((item, index) => ({
    ...item,
    inferredLayerIndex: index,  // 0 = bottom, n = top
    confidence: 'medium',
    caveat: 'Based on creation time assumption, not API-guaranteed z-index'
  }));
}
```

---

### Example 3: Description de Position
```typescript
function describePosition(item: MiroItemResponse): string {
  const { position, parent } = item;

  // Déterminer système de coordonnées
  const coordSystem = position.relativeTo === 'canvas_center'
    ? 'board center'
    : parent?.id
      ? `parent frame ${parent.id}`
      : 'unknown reference';

  // Décrire position
  return `Item positioned at (${position.x}, ${position.y}) relative to ${coordSystem}`;
}

// Exemple output:
// "Item positioned at (100, 200) relative to board center"
// "Item positioned at (50, 75) relative to parent frame 3074457354792903229"
```

---

## 9. Testing Strategy

### Test 1: Valider Assumption de Stack Order
```typescript
// Test: Est-ce que creation order = visual z-index?
async function testStackOrderAssumption() {
  const boardId = "test_board_123";

  // Créer 3 items au même endroit avec délais
  const item1 = await miro.createStickyNote(boardId, {
    content: "Bottom (created first)",
    x: 0, y: 0
  });
  await sleep(1000);

  const item2 = await miro.createStickyNote(boardId, {
    content: "Middle (created second)",
    x: 0, y: 0
  });
  await sleep(1000);

  const item3 = await miro.createStickyNote(boardId, {
    content: "Top (created last)",
    x: 0, y: 0
  });

  // Récupérer items
  const items = await miro.listItems(boardId);

  // Vérifier ordre de création
  const sorted = items.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  console.log("Creation order:", sorted.map(i => i.data.content));
  // Expected: ["Bottom", "Middle", "Top"]

  // MANUEL: Vérifier visuellement dans Miro UI
  // - Est-ce que "Top" apparaît effectivement au-dessus?
  // - Est-ce que "Bottom" est derrière?
  // - Si OUI → assumption validée
  // - Si NON → assumption invalide, ne pas implémenter Phase 2
}
```

---

### Test 2: Valider Ordre de Retour API
```typescript
// Test: Dans quel ordre GET /items retourne-t-il les items?
async function testAPIReturnOrder() {
  const boardId = "test_board_123";

  // Créer 5 items avec délais connus
  const creationOrder = [];
  for (let i = 1; i <= 5; i++) {
    const item = await miro.createStickyNote(boardId, {
      content: `Item ${i}`,
      x: i * 100, y: 0
    });
    creationOrder.push(item.id);
    await sleep(500);
  }

  // Récupérer sans tri
  const items = await miro.listItems(boardId);
  const returnOrder = items.map(i => i.id);

  // Analyser
  const isCreationOrder = arraysEqual(returnOrder, creationOrder);
  const isReverseOrder = arraysEqual(returnOrder, [...creationOrder].reverse());

  console.log("Creation order:", creationOrder);
  console.log("API return order:", returnOrder);
  console.log("Matches creation?", isCreationOrder);
  console.log("Matches reverse?", isReverseOrder);

  // Résultat détermine si on peut se fier à l'ordre de retour
}
```

---

## 10. Effort/Value Analysis

| Implementation | Effort | Value | Risk | Recommendation |
|----------------|--------|-------|------|----------------|
| **Phase 1: Safe Capabilities** | Low (2-4h) | High | Low | ✅ **Start here** |
| └─ Frames/parent hierarchy | 1h | High | None | Already implemented |
| └─ Timestamp sorting | 1h | Medium | None | Quick win |
| └─ Position context | 2h | Medium | None | Good UX |
| **Phase 2: Heuristic Inference** | Low (2h) | Medium | Medium | ⚠️ **Test assumption first** |
| └─ Infer stack order | 2h | Medium | Medium | Requires disclaimer |
| **Phase 3: Web SDK Integration** | High (40-80h) | High | High | ❌ **Only if necessary** |
| └─ iframe/extension setup | 20h | - | High | Complex architecture |
| └─ Layer control methods | 10h | High | Low | If Phase 3 chosen |
| └─ Session management | 10h | - | High | Stateful complexity |

---

## 11. Recommendation Finale

### Pour Projet Parallèle - Start Simple

**Chemin recommandé**:
1. **Implémenter Phase 1** (frames + timestamps + position context)
   - Effort: 3-4h
   - Value: Élevé pour organisation logique
   - Risk: Très faible
   - **Decision**: ✅ Always implement

2. **Tester assumption de Phase 2** (creation order = z-index)
   - Effort: 30min test
   - If validated → Implement Phase 2 (2h)
   - If invalidated → Skip Phase 2
   - **Decision**: ⚠️ Test before committing

3. **Évaluer besoin Phase 3** (Web SDK)
   - Only if users explicitly request layer control
   - Only if read-only inference insufficient
   - **Decision**: ❌ Don't implement unless proven necessary

### Quick Start Path

```
DAY 1: Phase 1 Implementation (3-4h)
├─ Add parent_id to creation tools
├─ Add timestamp fields to responses
├─ Add sort_by parameter to list_items
└─ Document position.relativeTo

DAY 2: Validation Testing (30min)
├─ Test creation order assumption
└─ Decide on Phase 2

IF assumption valid:
  DAY 3: Phase 2 Implementation (2h)
  └─ Add infer_visual_stack tool with disclaimers

IF layer control needed (unlikely):
  WEEK 2+: Phase 3 Architecture
  └─ Design Web SDK integration approach
```

---

## 12. Liens & Ressources

### Documentation Miro
- **REST API v2**: https://developers.miro.com/reference/api-reference
- **Web SDK**: https://developers.miro.com/docs/websdk-reference-overview
- **Web SDK Layer Methods**: https://developers.miro.com/docs/websdk-reference-board#layer-index-management

### Investigation Locale
- **Findings complets**: `LAYER_INVESTIGATION_FINDINGS.md`
- **Test script**: `src/test-layer-api.ts`
- **Implementation proposal**: `LAYER2_IMPLEMENTATION_PROPOSAL.md`

---

## 13. TL;DR Ultra-Condensé

**Miro Layers Reality Check**:

✅ **Organisation logique (frames)**: REST API ✓
- parent_id pour hiérarchie
- Effort: Low, Value: High

⚠️ **Ordre visuel (inférence)**: REST API ~ (assumption-based)
- createdAt timestamps comme proxy
- Effort: Low, Value: Medium, Risk: Disclaimers requis

❌ **Contrôle layers (z-index)**: REST API ✗, Web SDK ✓
- bringToFront/sendToBack uniquement dans Web SDK
- Effort: High, Complexity: High

**Decision Tree**:
- Need organization? → Phase 1 (frames)
- Need creation order? → Phase 1 (timestamps)
- Need visual stack estimate? → Phase 2 (test first)
- Need layer control? → Phase 3 (Web SDK)

**Recommendation**: Start Phase 1, test Phase 2 assumption, only do Phase 3 if users explicitly request z-index control.
