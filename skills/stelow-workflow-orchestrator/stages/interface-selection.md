## Interface Selection

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> **Stage Status:** Read `../references/cli-tools/stage-status.md` for ASCII status display and CLI commands.
> **When human waits apply:** Read `../references/human-gates.md` before any wait. A wait issued in the wrong review mode is a stuck workflow, not diligence.

### What this stage owns

The actual interface pick — and only the pick. The `interface` stage
already ran reaction-first Interface Contrast and wrote
`interfaces/contrast.json` plus the readable `interfaces/*.md` rendering.
This stage never regenerates or reinterprets the interface: it resolves who
chooses, records the choice, and moves on.

### Process

1. **Read the receipt** — Load `interfaces/contrast.json` and note its
   route, brief status, and disposition.
2. **Refuse cleanly when there is nothing to pick** — A stop, shape,
   research, or repair route is not a pick: follow its destination
   (`human`, `shape`, `research`, back to `interface`) instead of asking.
   A single existing interface (`existing-interface-no-comparison`) is
   adopted as-is — no comparison, no question.
3. **Build the question from receipt options only** — Follow
   `ask-patterns.md` Pattern 2: one option per receipt option (`label` is
   the option id verbatim, description names primary value plus
   served/friction scope coverage, preview is ≤15 rows from receipt fields
   only, artifact is the readable rendering). Never invent a wireframe,
   coverage, or recommendation — authority lives with the decider.
4. **Ask only when the review mode requires a human pick** — In
   `Product Spec + Interface Gates` and above, ask via Pattern 2 and record
   the answer. In `Auto` / `Product Spec Gate`, the worker adopts the
   disposition's direction itself and records it as an agent receipt. A
   wait with no mode mandate is a stuck workflow.
5. **Save the pick as a permanent artifact** — Extract the chosen
   direction into `interfaces/selected-interface.md` with who chose it
   (`selected_by: human` with the mode, or `selected_by: llm`). The tech
   planning and execution stages read this file for UI direction.

   Extract the proposal **whole**, not as a summary. The artifact is
   validated against the alternatives contract (Work Pattern, Philosophy,
   Trade-Off, State Coverage, the ASCII sketch, at least 800 words), and a
   thin receipt reads to the host as a missing interface:

   ```bash
   PROPOSAL_LABEL="{chosen_proposal_label}"  # e.g. "A — Convention Navigator"
   OUTPUT=".stelow/{YYYY-MM-DD}/{_dir}/interfaces/selected-interface.md"

   awk -v label="$PROPOSAL_LABEL" '
     /^## Proposal / && !started { started = ($0 ~ label); next }
     /^## Proposal / && started { exit }
     started { print }
   ' ".stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md" > "$OUTPUT"

   grep -q "Work Pattern" "$OUTPUT" || { echo "ERROR: missing Work Pattern Declaration"; exit 1; }
   grep -q "Breadboarding" "$OUTPUT" || { echo "ERROR: missing Breadboarding section"; exit 1; }
   ```

   The skill that generated the proposals does not do this, and must not: it
   runs once per explored alternative, and only one of those proposals becomes
   the chosen interface.
6. **Map the pick into a breadboard** — Write `interfaces/breadboard.json`:
   the places the user can be in, the affordances in each, and the wiring
   between them. The prose above says WHAT the interface is; the map says
   WHERE it is, and it is what the Architecture and Planning stages read when
   they need the shape of the thing they are building.

   Read `../references/breadboard.md` before writing — it holds the schema
   (`schemas/breadboard.json`), the blocking test that decides a place, the
   direction of the two wires, and the checks that catch a map which looks
   complete and says nothing.

   Then run the checks **before** saving. They are the difference between a
   rule in prose and a rule that runs:

   ```bash
   node scripts/render-diagram.mjs breadboard \
     --input ".stelow/{YYYY-MM-DD}/{_dir}/interfaces/breadboard.json" --check
   ```

   Fix every `error` (a wire to an id nobody declares, a duplicate id, a kind
   that contradicts its prefix, a contract violation). A `gap` is a judgement
   call: either fix the map or keep it and let the view carry the finding.

   Then write the two views — the markdown is what a reader (or the review
   gate) can actually read, the HTML is the durable picture:

   ```bash
   node scripts/render-diagram.mjs breadboard \
     --input ".stelow/{YYYY-MM-DD}/{_dir}/interfaces/breadboard.json" \
     --emit-markdown --with-diagram \
     --out   ".stelow/{YYYY-MM-DD}/{_dir}/interfaces/breadboard.html"
   ```

   The renderer is a repo tool, not a host dependency: only `scripts/stelow`
   is installed by `install.sh` and synced by the plugin, so on a standalone
   host the command may be absent. The map is the artifact; the views are
   views. If the render fails or the script is missing, the map still stands —
   never let a diagram block the pick. **But a missing script is not a passing
   check:** say in the hand-off that the map was not checked, so the next stage
   knows the difference between "clean" and "unchecked".

### Do NOT

- Generate new interface proposals or wireframes here.
- Turn an agent preference into product approval.
- Park waiting for a human pick in `Auto` / `Product Spec Gate`.
- Mutate the approved Scope Map — a new boundary is a
  `scope-map-challenge.json`, never an in-place edit.

### Completion

`interfaces/selected-interface.md` and `interfaces/breadboard.json` written
(human answer or agent receipt recorded), then advance to Architecture
automatically.
