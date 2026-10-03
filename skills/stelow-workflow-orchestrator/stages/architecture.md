## Architecture Choice

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

### When This Stage Activates

After Selection completes with a chosen interaction direction (or a recorded
contract note for backend-only products). This stage decides how the product
is constructed. It does not write the tech plan — planning does that next,
citing the selected architecture.

### Process

1. **Read inputs** — the shaped proposal (`spec-product.md`), the approved
   scope map (`scope-map.json`) when one exists, and `selected-interface.md`
   when one exists. The construction must serve the chosen interaction
   direction, never reinterpret it. Record all three versions in the output.

2. **Diverge** — run `stelow-workflow-architecture-alternatives` with the
   active exploration breadth (count 2–5, hybrid whenever count ≥ 2).
   Each direction is generated in a fresh context by an independent worker.

3. **Decide** — run `stelow-workflow-architecture-contrast` (invariants-first):
   preserve the decision-maker's invariants before synthesis, bound the
   options, record provenance, trade-offs, missing evidence, and accepted
   sacrifice.

4. **Pick** — resolve the choice per the stage question contract:
   - At the tech-review threshold and above: structured question with
     direction sketches as previews and direction files as references.
   - Below the threshold: adopt the hybrid recommendation (or the single
     direction for count 1) with a worker receipt. Never park waiting
     for a pick nobody mandated.

5. **Save** — extract the pick to `architecture/selected-architecture.md`
   (complete direction: pattern, sketch, flow, trade-off, risks, exclusions).
   Tech planning reads this file next and must not regenerate it.

### Backend-only products

When the shaped proposal carries no UI surface, the interface stages collapse
to a contract note and this stage carries the divergence. Nothing else changes:
same breadth, same hybrid rule, same choice contract.

### Do NOT
- Start implementing any direction
- Regenerate the interaction decision or reinterpret `selected-interface.md`
- Mutate the approved scope map in place — boundary changes emit a challenge
  record and route through the canonical transition
- Combine directions silently — synthesis lives in the hybrid section only

### Completion

When the pick is saved (`architecture/selected-architecture.md`), advance to
planning automatically.
