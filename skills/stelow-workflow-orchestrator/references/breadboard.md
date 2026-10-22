# Breadboard

> **Part of stelow** — the Interface stage's structured map of a chosen
> interface. Read by the Interface Selection stage and by the render script.

A breadboard is the **source of truth for the interface's shape**: which places
the user can be in, what they can act on in each, and how those things are
wired. The prose in `interfaces/selected-interface.md` is its commentary — it
explains the breadboard, it does not replace it.

This mirrors how a breadboard works in the room: the sketch is not the
artifact, the **map** is. The diagram is a projection of the map.

## Why JSON, and not Mermaid

The map has to survive being edited by an agent and being diffed by a human.
That decides the format:

| Need | JSON | Mermaid text | Markdown table |
|---|---|---|---|
| Machine-editable (an agent rewrites one affordance) | ✅ | ⚠️ rewrites the whole file | ⚠️ rewrites the whole file |
| Diff shows only what changed | ✅ one affordance | ⚠️ reflows | ❌ column-width churn |
| Validated against a contract | ✅ JSON Schema | ❌ | ❌ |
| Rendered to a diagram | ✅ (via a serializer) | ✅ directly | ❌ needs a serializer |
| Readable by a human directly | ⚠️ | ✅ | ✅ |

Mermaid is a **rendering target**, not a storage format. It has no schema, no
stable id, and no way to say "change N3's wires without touching anything
else" — every wire is re-serialized and the diff becomes noise. So the map is
JSON and the diagram is generated from it.

The serializer lives in `scripts/render-diagram.mjs`. It is deterministic:
the same map always produces the same Mermaid, so a diff in the diagram is a
diff in the map.

## The model

### Places

A **Place** is a bounded context of interaction. While you are in a Place you
have a specific set of affordances available, and you cannot interact with
what is behind it — you must act to leave.

**The blocking test** decides it: *can the user interact with what is behind?*

| Answer | Meaning |
|---|---|
| No | Different Place |
| Yes | Same Place, with local state changes |

A modal, a confirmation popover, and an edit mode that transforms the whole
screen are Places. A dropdown, a tooltip, and a checkbox that reveals fields
are not — you can click away from them.

Places are perceptual, not technical. "Which URL am I on" is the wrong
question; "what can I do right now" is the right one.

Ids: `P1`, `P2`, … for places, `P2.1` for a subplace inside `P2`.

### Affordances

| Kind | Id | What it is | Qualifies when |
|---|---|---|---|
| `ui` | `U1` | What the user sees and acts on | It is a button, input, list, spinner, displayed text |
| `code` | `N1` | What the code acts on | You can point at it in the code — `handleSubmit()`, `results$` |
| `store` | `S1` | State that is written and read | A property, array, or observable that holds data |

Three things are **not** affordances, even though they look like them:

- **Visual containers** — a `modal-frame wrapper` cannot be acted on; it is a
  Place boundary.
- **Internal transforms** — `letterDataTransform()` is a detail of its caller.
- **Navigation mechanisms** — `modalService.open()` is the *how* of reaching a
  Place. Wire to the Place instead.

These are the usual source of a breadboard that looks detailed and says
nothing.

### Wiring

Two kinds, kept apart on purpose:

| | Field | Tracks | Points at |
|---|---|---|---|
| **Control flow** | `wiresOut` | What triggers what | An affordance, or a **Place** when the user navigates |
| **Data flow** | `returnsTo` | Where output goes | An affordance |

Navigation wires to the **Place**, not to an affordance inside it:

```
✅ N1 wiresOut: ["P2"]     (navigate to Edit Mode)
❌ N1 wiresOut: ["U3"]     (wiring to an affordance inside P2)
```

## The checks that catch real gaps

These are the failure modes a breadboard hides when it is written from memory.
Check each one before saving.

1. **Every display has a source.** A UI affordance that shows data must have
   something feeding it — a store, or a code affordance that returns it.
   `U6: letter list` with nothing pointing at it means either the source is
   missing from the map, or `U6` is not real.

2. **Every code affordance connects.** One with neither `wiresOut` nor
   `returnsTo` is suspicious. Handlers wire out; queries return to; stores are
   read by something.

3. **Both flows trace.** Follow the navigation flow (Place to Place) and the
   data flow (what fills each display). They are orthogonal: navigation can
   happen without a data change, and a data change can happen without
   navigation.

4. **External state gets a store.** An affordance that writes the browser URL,
   `localStorage`, the clipboard, or browser history writes to something
   outside the app. Model that as a store, or the write goes nowhere in the map.

5. **Names are real.** For code affordances, the actual method or property.
   `DATABASE` is not a name. `userRepo.save()` is.

## Writing it

The breadboard is written **after** the interface is chosen, not for every
alternative — a breadboard of five options is noise. At the Interface Selection
stage, the chosen proposal becomes one map.

```json
{
  "schemaVersion": 1,
  "interfaceId": "A",
  "selectedBy": "human",
  "places": [
    { "id": "P1", "name": "Inbox", "description": "The list of saved ideas" },
    { "id": "P2", "name": "Idea Editor", "mode": "Edit Mode" }
  ],
  "affordances": [
    { "id": "U1", "kind": "ui", "name": "New Idea button", "place": "P1",
      "control": "click", "wiresOut": ["P2"] },
    { "id": "U2", "kind": "ui", "name": "Problem input", "place": "P2",
      "control": "type", "returnsTo": ["S1"] },
    { "id": "N1", "kind": "code", "name": "saveIdea()", "place": "P2",
      "control": "call", "wiresOut": ["N2"], "returnsTo": ["S1"] },
    { "id": "S1", "kind": "store", "name": "draftIdea", "place": "P2",
      "control": "write", "returnsTo": ["U2"] }
  ]
}
```

## Rendering it

```bash
node scripts/render-diagram.mjs breadboard \
  --input .stelow/{date}/{dir}/interfaces/breadboard.json \
  --out   .stelow/{date}/{dir}/interfaces/breadboard.html
```

The output is a self-contained HTML file with the diagram as inline SVG, zoom
enabled, and the theme driven by CSS variables. It is a **view**: the JSON is
what the workflow reads, diffs, and validates. If the render fails — no Node,
no renderer available — the map still stands and the workflow still advances.

The renderer degrades rather than blocks:

- The JSON is always written first and is always valid on its own.
- The Mermaid source can be written separately with `--emit-mermaid`, for
  hosts that render diagrams themselves.
- The HTML is optional. Nothing downstream reads it.

## Related

- `../../stelow-workflow-interface-contrast/SKILL.md` — the alternatives that
  feed the pick.
- `../../stelow-workflow-interface-alternatives/SKILL.md` — where the wireframe
  and the interaction flow are produced.
- `../cli-tools/visual_review.md` — how the interface gate reviews a document.
