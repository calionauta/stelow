# Breadboard

> **Part of stelow** — the Interface stage's structured map of a chosen
> interface. Read by the Interface Selection stage and by the render script,
> then by Architecture and Planning.

A breadboard is the **source of truth for the interface's shape**: which places
the user can be in, what they can act on in each, and how those things are
wired. The prose in `interfaces/selected-interface.md` is its commentary — it
explains the breadboard, it does not replace it.

The idea is borrowed from electrical engineering, via Ryan Singer's shaping
work: a breadboard has all the components and wiring of the real device but no
industrial design. Deciding to include a search field is a different decision
from deciding where the field sits and how it looks — the map is where the
first kind of decision becomes checkable.

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

| Kind | Id | When |
|---|---|---|
| Place | `P1`, `P2` | A bounded context the user is in |
| Subplace | `P2.1` | A widget or section inside a larger Place |
| Mode | `P3` with `mode: "Edit Mode"` | The whole screen transforms |

A mode that transforms the screen is its own Place. The flag that switches it
(`editMode$`) is a **navigation mechanism**, not a data store — do not map it.

### Affordances

| Kind | Id | What it is | Qualifies when |
|---|---|---|---|
| `ui` | `U1` | What the user sees and acts on | It is a button, input, list, spinner, displayed text |
| `code` | `N1` | What the code acts on | You can point at it in the code — `handleSubmit()`, `results$` |
| `store` | `S1` | State that is written and read | A property, array, or observable that holds data |

**`control` is required.** It names what triggers the affordance: `click`,
`type`, `call`, `observe`, `write`, `render`. It is what distinguishes a
display (`render`) from an input (`type`) from a handler (`click` the user, or
`call` the code).

Three things are **not** affordances, even though they look like them:

- **Visual containers** — a `modal-frame wrapper` cannot be acted on; it is a
  Place boundary.
- **Internal transforms** — `letterDataTransform()` is a detail of its caller.
- **Navigation mechanisms** — `modalService.open()` is the *how* of reaching a
  Place. Wire to the Place instead.

These are the usual source of a breadboard that looks detailed and says
nothing.

#### Place references

When a nested Place has too many affordances to draw inside its parent,
detach it and leave a **reference** where it renders. This is one row of a
map, not a map of its own — `--check` on this fragment alone says there is
nothing to draw:

```json
{ "id": "_letter-browser", "kind": "ui", "name": "Letter browser",
  "place": "P1", "control": "render", "wiresOut": ["P3"] }
```

The reference is a UI affordance (it renders in the parent's context) and its
id keeps the leading underscore so a reader can tell it apart from a real
widget. The Place it names is defined in full elsewhere in the map.

### Wiring

Two kinds, kept apart on purpose:

| | Field | Tracks | Points at | Read as |
|---|---|---|---|---|
| **Control flow** | `wiresOut` | What triggers what | An affordance, or a **Place** when the user navigates | forwards: this triggers that |
| **Data flow** | `returnsTo` | Where output flows | An affordance | forwards: this output lands there |

The direction is one-way, and it is where most maps go wrong:

```
S2 -.-> U3      a store returns its data TO the display   ✅ display is fed
U3 -.-> S2      a display "returns" to the store that feeds it   ❌ says nothing
```

So:

- A **display** is fed by an **incoming** wire: something's `returnsTo` (a
  store or a query) or `wiresOut` (control that renders it) points at it.
- A **store** is read by its **outgoing** return: the data flows out of the
  store to whatever consumes it.
- An **input** returns to the store it writes (`U2 returnsTo S1`).

Navigation wires to the **Place**, not to an affordance inside it:

```
✅ N1 wiresOut: ["P2"]     (navigate to Edit Mode)
❌ N1 wiresOut: ["U3"]     (wiring to an affordance inside P2)
```

### Where things go

- **Stores live where they are read**, not where they are written. Trace the
  readers; that Place is the store's home, and writes from elsewhere are
  "reaching into" it.
- **A backend is a Place.** Resolvers and the tables they read belong in
  `P4: Backend`, not floating at the edge.
- **External state gets a store.** A write to the browser URL, `localStorage`,
  the clipboard, or browser history writes to something outside the app.
  Model it (`S15: Browser URL`) or the write goes nowhere in the map.
- **Show navigation inline.** Do not route every Place through a central
  `Router` node; wire directly to the destination.
- **The map follows the print.** Never fill it in from memory: read the code,
  scan the wiring for every affordance that points at your target, and check
  the row you are editing.

## The checks

These are the failure modes a breadboard hides when it is written from memory.
They are executable, because a rule that lives only in prose is a rule the
writer can forget:

```bash
node <stelow-checkout>/scripts/render-diagram.mjs breadboard --input <breadboard.json> --check
node <stelow-checkout>/scripts/render-diagram.mjs breadboard --input <breadboard.json> --check --strict
```

`<stelow-checkout>` is the stelow repository (e.g. `~/repos/stelow`). The
script is not in the product repo the workflow is writing into, and it is not
installed by `install.sh` — the map travels, the checker does not.

`--check` writes nothing and reports; `--strict` also exits non-zero when a
**gap** remains. Two severities, and the difference matters:

| Severity | Meaning | Examples |
|---|---|---|
| **error** | The map is wrong; no judgement needed to agree | unknown id in a wire, duplicate id, `kind` contradicting the id prefix, undeclared place, a violation of `schemas/breadboard.json` |
| **gap** | The map may be incomplete; the writer decides | a display with no source, a code affordance that connects to nothing, a store nothing reads, a placeholder name, navigation written as containment |

1. **Every display has a source.** A UI affordance with `control: "render"`
   must have something feeding it — an incoming return from a store or a
   query, or an incoming wire that renders it. A display nothing points at
   means either the source is missing from the map, or the display is not real.

2. **Every code affordance connects.** It wires out, returns to, or something
   wires into it. A leaf at the end of a call chain is connected by the call
   that reaches it; one with no incoming wire and no outgoing wire is dead
   code or missing wiring.

3. **Every store is read.** A store whose own return goes nowhere is state
   nothing consumes — or its reader is missing from the map.

4. **Both flows trace.** Follow the navigation flow (Place to Place) and the
   data flow (what fills each display). They are orthogonal: navigation can
   happen without a data change, and a data change can happen without
   navigation.

5. **Navigation lands on Places.** Reaching a UI affordance in another Place
   is navigation; wiring directly to it hides that the whole screen changed.
   A code affordance calling one in another Place is a **call**, not
   navigation — the frontend handler calling the backend resolver does not
   move the user.

6. **Names are real.** For code affordances, the actual method or property.
   `DATABASE` is not a name. `userRepo.save()` is.

7. **Ids are unique, and the prefix matches the kind.** `U…` is UI, `N…` is
   code, `S…` is a store. A `U1` that declares `kind: "code"` is a row the
   reader will misread, and two `U1`s merge into one node in every view. Two
   `P1`s merge two screens.

8. **Every place has something to act on.** A place with no affordances is
   either a section of another place or a place whose affordances are missing
   from the map. There is nothing a user can do in it.

The schema check runs the published contract (`schemas/breadboard.json`) and
is fail-closed: a property the map invents (`wiresout`) is an error rather
than a silently ignored field.

**When the script is not there**, the checks cannot run. That is not a pass:
say in the hand-off that the map is unchecked rather than implying it was
verified. The script lives in the stelow checkout, not in the product repo —
if the workflow runs elsewhere, point the command at that checkout.

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
    { "id": "U3", "kind": "ui", "name": "Title heading", "place": "P2",
      "control": "render" },
    { "id": "N1", "kind": "code", "name": "saveIdea()", "place": "P2",
      "control": "call", "wiresOut": ["N2"], "returnsTo": ["S2"] },
    { "id": "N2", "kind": "code", "name": "ideaRepo.save()", "place": "P2",
      "control": "call" },
    { "id": "S1", "kind": "store", "name": "draftIdea", "place": "P2",
      "control": "write", "returnsTo": ["U2"] },
    { "id": "S2", "kind": "store", "name": "savedIdea", "place": "P2",
      "control": "write", "returnsTo": ["U3"] }
  ]
}
```

Read it as a story: the button navigates to the editor; the input feeds the
draft store, which feeds the input back (a controlled field); saving writes the
saved store, which feeds the heading.

## Scope coverage

`scopeCoverage` ties the interface to the approved Scope Map: each entry names
a scope id and says whether this interface **serves** it or creates
**friction** (with a note saying where). When no map exists, the field is
omitted and the contrast brief says why — never invent coverage.

Scope ids and affordance ids are separate namespaces that can look alike: a
store `S1` and a scope `S1` are unrelated. The coverage table is the only
place a scope id appears in this map.

## Rendering it

```bash
node <stelow-checkout>/scripts/render-diagram.mjs breadboard \
  --input ".stelow/{date}/{dir}/interfaces/breadboard.json" \
  --emit-markdown --with-diagram \
  --out   ".stelow/{date}/{dir}/interfaces/breadboard.html"
```

Two views, two jobs:

- `breadboard.md` (from `--emit-markdown`) is what the **visual review**
  reads: the same tables as this document, plus the diagram source when
  `--with-diagram` is set, plus a section listing the checks' findings. It is
  written next to the map and registered by `stelow advance` like any other
  workflow file.
- `breadboard.html` (from `--out`) is the durable, self-contained page: inline
  SVG, zoom, light/dark theme, and **no external request**. Send it, open it
  offline, keep it beside the plan.

The picture distinguishes kinds by shape, not only by colour: UI is a
rectangle, code a double-bordered rectangle, a store a cylinder; solid arrows
are control flow, dashed arrows are data flow. A subplace (`P2.1`) is drawn
inside its parent's box — the same containment the id already says. Shape survives a monochrome
print and a host that ignores styling.

The renderer is repo-side tooling, so it is not installed by `install.sh` and
is absent on a standalone host. It degrades rather than blocks:

- **An error** (a wire to an id nobody declares, a contract violation) refuses
  every view. A view of a broken map presents a hole as a decision.
- **A gap** is reported on stderr and written into the views. The writer
  decides; the picture does not pretend the map is finished.
- **No renderer available** → the JSON stands, no HTML, exit 0.
- **The render itself fails** → the JSON stands, exit 0 with a note.

Nothing downstream reads the views. The Architecture and Planning stages read
the JSON.

## Related

- `../../stelow-workflow-interface-contrast/SKILL.md` — the alternatives that
  feed the pick.
- `../../stelow-workflow-interface-alternatives/SKILL.md` — where the wireframe
  and the interaction flow are produced.
- `../cli-tools/visual_review.md` — how the interface gate reviews a document.
- `../stages/interface-selection.md` — the stage that writes the map.
