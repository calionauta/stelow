# Design Decisions

Architecture Decision Records and rationale for key choices in cali-product-workflow.

## ADR-1: CLI Adapter Pattern

**Date:** 2026-05-22

**Context:** The workflow must support 4 CLI platforms (Pi, OpenCode, Claude Code, Codex) with varying capabilities. Pi supports 15 commands with full TypeScript extensions, while Codex only supports basic markdown commands.

**Decision:** Implement a CLI adapter pattern with a common `BaseAdapter` interface. Each CLI platform gets its own adapter that declares its capabilities (e.g., `hasCapability('tui')`, `hasCapability('hooks')`). Commands are dispatched through a central dispatcher that checks capabilities before routing.

See [[architecture#CLI Adapter Pattern]] for the component diagram.

**Consequences:**
- Adding a new CLI platform = new adapter class
- Commands automatically degrade gracefully on CLIs without certain capabilities
- Common code lives in base class, CLI-specific in adapters

## ADR-2: CLI-Based Directory Organization (replaces flat structure)

**Date:** 2026-05-22

**Context:** Earlier versions had a flat `extensions/` directory mixing Pi and multi-CLI concerns. As OpenCode and Claude support were added, the structure became confusing.

**Decision:** Move all CLI-related files to `cli-agents/{cli}/`:
- `cli-agents/COMMANDS.md` is the single source of truth for all commands
- Each CLI has its own subdirectory with `commands/`, `plugin/` (OpenCode), and `install.sh`
- `extensions/` remains for Pi-specific files

**Consequences:**
- Clear separation of concerns between CLIs
- DRY: command definitions live once in `COMMANDS.md`
- KISS: each CLI directory is self-contained

## ADR-3: Plannotator Visual Gate (Mandatory Approval)

**Date:** 2026-05-22

**Context:** Verbal approval was insufficient for catching flow, affordance, and clarity issues in product specs. Agents would skip verification or approve shallowly.

**Decision:** Make Plannotator `--gate` mandatory for both `gate` and `int-gate` stages. The tool opens plans in a visual browser with point-by-point annotation. Every annotation is returned as structured feedback to the LLM for revision. The gate is NEVER skipped — if the tool fails, a manual review file is saved instead.

See [[business-rules#Plannotator Gate]] for rules and [[architecture#Stage Index]] for stage ordering context.

**Consequences:**
- Visual review catches issues verbal approval misses
- Structured feedback loop improves quality
- Degradation path prevents blocking the workflow
- Gate acts as an immutable stage that cannot be bypassed

## ADR-4: Context Rot Mitigation

**Date:** 2026-05-30

**Context:** Research shows LLM compliance drops from ~73% (turn 5) to ~33% (turn 16) in long sessions. This affects plan quality, scope compliance, and delivery verification.

**Decision:** Implement a 4-part mitigation strategy:
1. Fresh context between stages (>15 turns → new session)
2. Read artifacts from disk, not memory (every critical stage)
3. No patching in degraded context (create new goal instead)
4. Model provenance tracking via YAML frontmatter

**Consequences:**
- Slightly more overhead in session management
- Significantly more reliable execution, especially for multi-stage workflows
- Artifact files become the authoritative source of truth

## ADR-5: Execution Critique (formerly Delivery Audit)

**Date:** 2026-05-30 (delivery audit) → 2026-06-01 (renamed to execution critique)

**Context:** Previously had `cali-post-execution-check` which only verified against plans. Missing: invisible 20% check, NFR validation, gap registry, and lesson learning.

**Decision:** Create a unified `cali-product-execution-critique` skill (originally named `cali-product-delivery-audit`, renamed to harmonize with other critique skills — see commit `482fe74`). It evaluates 8 fixed criteria: scope completeness, implementation quality, invisible 20%, edge cases, documentation/tests, gap registry, lessons learned, and decision matrix. Deprecated `cali-post-execution-check`.

**Consequences:**
- Single skill replaces multiple ad-hoc checks
- Consistent output format across all modes
- Gap registry captures both quality issues and scope creep
- Decision matrix provides actionable outcomes
- Name aligns with the `cali-product-critique` family (plan-critique, codebase-critique, ux-critique, execution-critique)
