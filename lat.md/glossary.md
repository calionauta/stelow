# Glossary

Domain-specific terms and their meanings in cali-product-workflow.

## Appetite
A timebox constraint for a shaped proposal. The appetite bounds the solution — if the work can't fit within the appetite, the proposal returns to the shaping phase rather than extending the deadline.

## Gate
Visual review step using Plannotator. Two mandatory gates exist: `gate` (after critique/shape) and `int-gate` (after interface exploration). See [[business-rules#Plannotator Gate]].

## Rabbit Hole
A potential implementation risk identified during shaping. If a rabbit hole becomes a real blocker, the proposal returns to the shaping phase instead of proceeding with unvalidated assumptions.

## Slug
A short identifier prefix for each stage, derived from `stages.yaml`. Used in the stage numbering convention.

The 15 slugs are: `triage`, `select`, `setup`, `context`, `shape`, `critique`, `gate`, `scope`, `interface`, `int-gate`, `selection`, `planning`, `execution`, `verification`, `audit`.

## Typed Scope
A technical scope with an explicit type: `feature`, `spike`, `optimize`, or `test-*`. Each scope includes acceptance criteria (DoD), dependencies, and optional NFR requirements.

## Invisible 20%
The portion of implementation work that LLMs typically omit — error handling, observability, security, input validation, and rollback. The "happy path" represents the visible 80%. See [[business-rules#Invisible 20% Enforcement]].

## Context Rot
The degradation of LLM compliance with instructions over extended conversation turns. Research shows compliance drops from ~73% (turn 5) to ~33% (turn 16). See [[decisions#ADR-4: Context Rot Mitigation]].

## Plannotator
A visual review tool that opens plans in a browser with point-by-point annotation support. Every annotation returns structured feedback to the LLM for revision. Used for mandatory [[glossary#Gate|gates]].

## Hill Chart
A Shape Up artifact that tracks progress from "figuring out" to "making it happen." Not currently used in this implementation but part of the Shape Up methodology that inspired the workflow.

## Job To Be Done (JTBD)
The "job" a user hires a product to do. The workflow supports JTBD analysis as a strategic approach in the Context stage (`cali-product-job-to-be-done` skill).

## Skill Sync
Auto-mirror of project skills from the cloned git repo into `~/.agents/skills/` on every Pi session start. Tracks git HEAD hash to skip when unchanged. See [[architecture#Skill Auto-Sync (Pi Extension)]].

## Retired Skill
A skill that was once part of the project but has been removed (renamed, split, merged, or deleted). Listed in `skills/cali-product-workflow/retired-skills.yaml` so the sync can actively remove stale copies from user machines. See [[architecture#Skill Auto-Sync (Pi Extension)]].
