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

### Do NOT

- Generate new interface proposals or wireframes here.
- Turn an agent preference into product approval.
- Park waiting for a human pick in `Auto` / `Product Spec Gate`.
- Mutate the approved Scope Map — a new boundary is a
  `scope-map-challenge.json`, never an in-place edit.

### Completion

`interfaces/selected-interface.md` written (human answer or agent
receipt recorded), then advance to Architecture automatically.
