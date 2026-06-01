# Risks

Assumptions, open questions, and known risks for cali-product-workflow.

## Context Rot

Research shows LLM compliance drops from ~73% to ~33% over 16 turns. This affects every stage where the LLM must follow structured instructions.

See [[decisions#ADR-4: Context Rot Mitigation]] for the 4-part mitigation strategy. This includes fresh context between stages, reading from disk, and no patching in degraded context.

## 80% Problem (Happy Path Bias)

LLMs consistently implement the visible "happy path" while omitting error handling, observability, security, input validation, and rollback. This is documented across multiple studies (Osmani 2026, GitClear 2025).

See [[business-rules#Invisible 20% Enforcement]] for the required 5-dimension verification.

## Model Dependency

Artifacts from different LLMs have different quality profiles. A Claude Opus spec vs a Gemini Flash spec will differ in depth, consistency, and safety review. See [[business-rules#Model Provenance]] — every artifact records `generated_by` for proper scrutiny.

## Shallow Review Trap

The Plannotator gate catches flow, affordance, and clarity issues in visual plans, but it does NOT catch business logic correctness, security flaws, or edge cases in code.

Mitigated by clearly documenting the gate's scope and requiring independent verification for code-level issues.

## Plan Staleness

As workflows progress through 15 stages, earlier decisions may be forgotten or misremembered. Mitigated by re-reading artifacts from disk at each critical stage (execution, verification, execution critique) instead of trusting conversation memory.

## Partial Implementation

Agents may implement only part of a scope and ask to "fix the rest" in the same degraded context. Mitigated by the no-patching rule: if execution is partial or fails, create a new goal with fresh context.

## OpenCode Plugin API Changes

The OpenCode plugin depends on `@opencode-ai/plugin` API which may change. Mitigated by pinning to known versions and testing on update.

## Claude Commands Not Discoverable

Claude uses markdown-based commands which live in `~/.claude/commands/`. Users may not know they exist. Mitigated by documenting in README and adding to AGENTS.md.

## Command Drift

As new commands are added to Pi, OpenCode and Claude implementations may fall behind. Mitigated by `cli-agents/COMMANDS.md` being the single source of truth — all implementations must reference it.
