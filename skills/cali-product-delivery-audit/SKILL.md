---
name: cali-product-delivery-audit
description: >
  [Cali] Post-implementation delivery audit: verify scope completion, implementation quality,
  NFR coverage, edge cases, doc/tests, and produce a gap registry with decision matrix.
  Supports 4 modes: workflow (spec-tech.md), plan (spec-product.md), context (dir/URL),
  and standalone (auto-detects via sem diff + git). Merges and replaces
  cali-post-execution-check (deprecated).
metadata:
  frequency: weekly
  category: meta
  context-cost: medium
---

# Delivery Audit

Run a structured audit after any implementation — whether it followed the full
`cali-product-workflow` or was done ad-hoc. Every evaluation criterion runs in
every mode; only the **source of truth** differs based on what input is available.

> **Tools:** See `../cali-product-workflow/references/cli-tools/subagents.md` for subagent patterns.
> See `../cali-product-workflow/references/cli-tools/context-mode.md` for processing large outputs.

---

## 🔀 Input Detection

Detect the input type before proceeding:

```
Input received:
  ├── Is a path ending in spec-tech*.md?
  │   └→ 🗺️ Mode: Workflow Audit (source of truth = plan scopes)
  ├── Is a path ending in spec-product*.md or spec-*.md?
  │   └→ 📋 Mode: Plan Audit (source of truth = product spec)
  ├── Is a directory path or URL?
  │   └→ 📁 Mode: Context Audit (source of truth = sem diff + git + session)
  └── NOTHING / no input?
      └→ 💻 Mode: Standalone Audit (source of truth = auto-discovered)
         Run: sem diff HEAD~1, sem diff, git diff, session file list
         If nothing found: ask "What changed?"
```

---

## 🔄 When to Use

This skill activates automatically as Stage 14 in `cali-product-workflow`,
but can also be used standalone when you say:

- "done", "finished", "completed"
- "check my work", "verify implementation"
- "gap analysis", "what did I miss"
- After any multi-step task, plan execution, or feature implementation

---

## 📋 Fixed Evaluation Criteria (always runs all)

| # | Criteria | Description |
|---|----------|-------------|
| 1 | **Scope/Plan Completeness** | Check each scope/item against implementation |
| 2 | **Implementation Quality** | Syntax, imports, broken refs, anti-patterns |
| 3 | **Invisible 20% Check** | Error handling, observability, security, validation |
| 4 | **Edge Cases** | Null/empty, network, permission, concurrency, boundaries |
| 5 | **Doc & Test Update Check** | README, AGENTS.md, CHANGELOG, test coverage |
| 6 | **Gap Registry** | Missing, partial, new scope, quality, debt |
| 7 | **Lessons Learned** | What went well, what could improve |
| 8 | **Decision Matrix** | Close, document, follow-up, human review |

> All 8 criteria run in every mode. Only the **source of truth** differs.

---

## 🗺️ Mode: Workflow Audit

For use after a `cali-product-workflow` cycle. Requires a path to `spec-tech_v{N}.md`.

### 1. Read the plan

Read the most recent spec-tech.md from the provided path:

```bash
# Find latest version
ls -t .cali-product-workflow/*/plans/spec-tech_v*.md 2>/dev/null | head -1
```

Parse all scopes — each has type, DoD, acceptance criteria, and (if present) NFRs.

### 2. Run `sem diff` for entity-level change detection

```bash
sem diff HEAD~1     # entities modified in last commit
sem diff            # working tree changes (if any)
sem stats           # diff statistics
```

Each modified entity maps to one or more plan scopes. Entities with no matching
scope are flagged as **scope creep**. Plan scopes with no matching entities are
flagged as **missing scope**.

### 3. Run all 8 criteria

For each scope, evaluate:

**Scope Completeness (criteria 1):**
| Scope | Type | Implemented? | Tested? | Docs Updated? |
|-------|------|-------------|---------|---------------|

**Implementation Quality (criteria 2):**
Check all changed files for:
- Syntax errors
- Missing imports
- Broken references
- Anti-patterns: secrets in code, global mutable state, god functions (>100 lines)

**Invisible 20% (criteria 3):**
| Dimension | Check |
|-----------|-------|
| Error handling | Retry/backoff implemented? Fallback defined? |
| Observability | Structured logging? Correlation IDs? |
| Security | Auth consistent? Input sanitization? Rate limiting? |
| Validation | Null/empty/boundary handling? |

**Edge Cases (criteria 4):**
- Null/empty inputs
- Network/file failures
- Permission denied
- Concurrency (race conditions, deadlocks)
- Boundary conditions

**Doc & Test Update Check (criteria 5):**
- README.md updated?
- AGENTS.md updated? (if architecture changed)
- CHANGELOG.md has entry?
- Unit/integration tests exist for new code?
- Mutation score adequate? (target from testing-strategy.md if available)

**Gap Registry (criteria 6):**
| Gap Type | Description | Impact | Resolution |
|----------|-------------|--------|------------|

**Lessons Learned (criteria 7):**
- What went well
- What could improve
- Issues to watch in future cycles

**Decision Matrix (criteria 8):**
| Situation | Action |
|-----------|--------|
| All scopes complete, no gaps | ✅ Close cycle |
| Minor gaps, low impact | 📝 Document gaps, close cycle |
| Significant gaps, medium impact | ⚠️ Create follow-up plan? |
| Critical gaps, high impact | 🚨 Human review required |

---

## 📋 Mode: Plan Audit

For use when a `spec-product*.md` is provided but no tech plan exists. The source
of truth is the product spec's IN/OUT scope and DoD.

### 1. Read the product spec

Parse IN scope items and their acceptance criteria. Each IN item becomes an
"inferred scope" for the audit.

### 2. Run `sem diff` + `git diff`

Same as Workflow mode — detect what entities changed and map them to IN items.

### 3. Run all 8 criteria

Same evaluation as Workflow mode, but source of truth is product requirements
rather than technical scopes. The gap registry compares what was specified vs
what was implemented.

---

## 📁 Mode: Context Audit

For use with a directory path (codebase) or URL (live site). The source of truth
is the current state of the codebase or site.

### Directory input

```bash
# Quick structural overview
find {INPUT_PATH} -maxdepth 3 -type f | head -100

# Semantic diff for entity-level changes
sem diff HEAD~1
sem diff
sem entities
```

### URL input

Use `agent_browser` to open and explore the site:
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

### Run all 8 criteria

Same evaluation, adapted for context. Scope completeness is inferred from:
- What files changed (git)
- What entities changed (sem)
- What was discussed in the session

---

## 💻 Mode: Standalone Audit

For use when no plan file is provided — pure post-hoc audit. The skill
auto-discovers what changed.

### Auto-discovery

```bash
# Entities modified since last commit
sem diff HEAD~1

# Working tree changes
sem diff

# Entity statistics
sem stats

# Git log of recent changes
git log --oneline -10
```

Each modified entity becomes an **inferred scope** in the gap registry.

If none of the above produce results, ask the user:
> "No plan file or recent changes detected. What was this implementation about?
> Describe the expected scope or what should be checked."

### Run all 8 criteria

Same evaluation as Workflow mode. Inferred scopes replace planned scopes.

---

## 📤 Output

Always save or display in this format:

```markdown
# Delivery Audit Report

**Date:** {timestamp}
**Mode:** [workflow | plan | context | standalone]
**Source of truth:** [spec-tech_v{N}.md | spec-product_v{N}.md | sem diff + session context]
**Model used for audit:** {model_name}

## Summary

| Metric | Value |
|--------|-------|
| Items evaluated | N |
| Items complete | N |
| Items partial | N |
| Gaps identified | N |

## Evaluation

### 1. Scope/Plan Completeness
| Scope | Status | Notes |
|-------|--------|-------|

### 2. Implementation Quality
| Issue | Severity | File |
|-------|----------|------|

### 3. Invisible 20%
| Dimension | Status | Notes |
|-----------|--------|-------|
| Error handling | ✅/⚠️/❌ | |
| Observability | ✅/⚠️/❌ | |
| Security | ✅/⚠️/❌ | |
| Input validation | ✅/⚠️/❌ | |

### 4. Edge Cases
| Edge case | Status | Notes |
|-----------|--------|-------|

### 5. Doc & Tests
| Item | Status |
|------|--------|

### 6. Gap Registry
| Gap Type | Description | Impact | Resolution |
|----------|-------------|--------|------------|

### 7. Lessons Learned
- What went well:
- What could improve:
- Issues to watch:

## Decision

| Situation | Action Taken |
|-----------|-------------|
| [All OK | Minor gaps | Significant gaps | Critical] | [✅ Close | 📝 Document | ⚠️ Follow-up | 🚨 Human Review] |
```

---

## ⚠️ Audit Warnings

- **Don't skip criteria** — Each of the 8 criteria catches different issues.
- **Don't assume** — Verify against the source of truth, don't guess.
- **Don't rush** — A thorough audit saves hours of debugging later.
- **Don't ignore warnings** — Even minor gaps compound over multiple cycles.
- **Don't trust the same model** — If the implementation was done by model X,
  a different model (or a human) should do the audit for genuine blind-spot
  detection.

---

## Related Skills

- **cali-product-workflow**: Coordinates this skill as Stage 14
- **cali-product-critique**: Pre-implementation critique (complements this post-implementation audit)
- **cali-product-testing-execution**: Post-implementation testing protocol (runs before this audit)
- **cali-scope-executor**: Routes plan scopes to execution (feeds this audit's input)

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/cli-tools/`
