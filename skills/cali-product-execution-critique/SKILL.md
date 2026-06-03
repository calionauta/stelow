---
name: cali-product-execution-critique
description: >
  [Cali] Post-implementation execution critique: verify scope completion, implementation quality,
  NFR coverage, edge cases, doc/tests, produce a gap registry with decision matrix.
  Supports 4 modes: workflow (spec-tech.md), plan (spec-product.md), context (dir/URL),
  and standalone (auto-detects via sem diff + git). Merges and replaces cali-post-execution-check (deprecated).
  Falls back to git diff when sem is not installed.
metadata:
  frequency: weekly
  category: meta
  context-cost: medium
---

# Execution Critique

## Overview

Run a structured audit after any implementation — whether it followed the full
`cali-product-workflow` or was done ad-hoc. Every evaluation criterion runs in
every mode; only the **source of truth** differs based on what input is available.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.
> See `references/cli-tools/context-mode.md` for processing large outputs.

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
         Run: sem diff HEAD~1 (or git fallback), git diff, session file list
         If nothing found: ask "What changed?"
```

---

## 🔧 Tool Availability & Fallbacks

Before entering any mode, check what's available:

```bash
# Check sem
command -v sem && HAS_SEM=1 || HAS_SEM=0

# Check if HEAD~1 exists (new repos, first commit)
git rev-parse HEAD~1 >/dev/null 2>&1 && HAS_PREV=1 || HAS_PREV=0

# Check if .cali-product-workflow/ exists
[ -d ".cali-product-workflow/" ] && HAS_WORKFLOW_DIR=1 || HAS_WORKFLOW_DIR=0
```

### sem not installed

If `sem` is absent, fall back to git:
- `sem diff HEAD~1` → `git log --name-only HEAD~1..HEAD` + `git diff --stat HEAD~1`
- `sem diff` (working tree) → `git diff --stat -- .`
- `sem stats` → `git diff --stat HEAD~1`
- `sem entities` → `find ./ -name '*.go' -o -name '*.ts' -o -name '*.py' | head -50`

**Never block** an audit on `sem` being absent. The audit quality drops
(structural analysis lost) but the remaining criteria (implementation
quality, NFRs, edge cases, docs/tests) still deliver value.

### No prior commit (`HEAD~1` doesn't exist)

New repo or first commit. Fall back:
- Use `git diff HEAD` for working tree changes
- Use `git diff --staged` for staged changes
- Show: "This is the first commit — auditing working tree and staged changes."

### `.cali-product-workflow/` doesn't exist

If this directory is missing:
- In Workflow mode: show "No workflow directory found. The project may not
  have run through `cali-product-workflow`. Switching to Standalone mode."
- In other modes: no impact (they don't depend on this directory)

---

## 🔄 When to Use

This skill activates automatically at the `audit` stage in `cali-product-workflow`,
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

> **Appetite-aware depth:** All 8 criteria always run. For PoC/Focused, report is
> concise (summary + gap registry). For Comprehensive, full recommendations + lessons.
> Coverage is identical regardless of appetite.

---

## 📋 Examples

### Example 1: Workflow mode (spec-tech.md path)

**Input:** "@.cali-product-workflow/teste/plans/spec-tech_v1.md — audit implementation"

**Output:**
```markdown
# Execution Critique Report

**Mode:** workflow
**Source:** spec-tech_v1.md (12 scopes: 8 feature, 2 optimization, 2 test-*)

## Summary
| Items evaluated | 12 |
| Items complete | 10 |
| Items partial | 2 |
| Gaps identified | 3 |

### 1. Scope Completeness
| Scope | Status | Notes |
|-------|--------|-------|
| S1: Auth middleware | ✅ | |
| S2: Login page | ✅ | |
| S3: Rate limiter | ⚠️ | Missing tests |

### Decision
⚠️ Follow-up: S3 needs integration tests before next cycle
```

### Example 2: Standalone mode (no input)

**Input:** "Check my work" (in a Git repo, after implementing a feature)

**Output:**
```markdown
# Execution Critique Report
**Mode:** standalone
**Source:** sem diff + git diff (5 entities changed)

## Summary
| Items evaluated | 5 |
| Items complete | 5 |
| Gaps identified | 1 |

### Gap: No tests for auth.go (new file)
| Gap Type: missing-tests | Impact: medium | Resolution: Add unit tests |

### Decision
📝 Document gap, close cycle. Add tests in next PR.
```

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

### 2. Run entity-level change detection

```bash
if command -v sem &>/dev/null; then
  sem diff HEAD~1   # entities modified in last commit
  sem diff          # working tree changes
  sem stats
else
  echo "⚠️  sem not installed — using git fallback"
  git diff --stat HEAD~1
  git log --name-only HEAD~1..HEAD
fi
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

**Save lessons to disk for future cycles:**
```bash
mkdir -p .cali-product-workflow/lessons-learned/
cat >> .cali-product-workflow/lessons-learned/{date}-{workflow-name}.md << 'EOF'
---
date: {timestamp}
workflow: {workflow-name}
model: {model_name}
spec: .cali-product-workflow/{date}/{_dir}/specs/spec-product_v{N}.md
plan: .cali-product-workflow/{date}/{_dir}/plans/spec-tech_v{N}.md
critique: .cali-product-workflow/{date}/{_dir}/critiques/critique-report_v{N}.md
---

## What went well
- 

## What could improve
- 

## Issues to watch
- 
EOF
```

Lessons are saved to `.cali-product-workflow/lessons-learned/` so future workflow
sessions can read them during setup. The `setup.md` stage will automatically
check for and inject prior lessons at workflow start.

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

### 2. Run change detection

```bash
if command -v sem &>/dev/null; then
  sem diff HEAD~1
  sem diff
  sem entities
else
  echo "⚠️  sem not installed — using git fallback"
  git diff --stat HEAD~1
  git log --name-only HEAD~1..HEAD
fi
```

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

# Entity-level changes (sem fallback to git)
if command -v sem &>/dev/null; then
  sem diff HEAD~1
  sem diff
  sem entities
else
  echo "⚠️  sem not installed — using git fallback"
  git diff --stat HEAD~1
  git log --name-only HEAD~1..HEAD
fi
```

### URL input

Use the browser tool (see `references/cli-tools/agent_browser.md`) to open the site:

```
agent_browser: open URL → snapshot → explore flows → snapshot → compare vs spec
```

Visit:
- Main flow (happy path) — does it match spec?
- Empty state — is it handled?
- Error state — clear feedback?
- Edge cases — what breaks?

Capture before/after snapshots for evidence.

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
# Entities changed since last commit
if command -v sem &>/dev/null; then
  sem diff HEAD~1 && sem diff && sem stats
else
  echo "⚠️  sem not installed — git fallback"
  git diff --stat HEAD~1 && git diff --stat -- .
fi

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

Always save or display in this format. The Lessons Learned section also writes to
`.cali-product-workflow/lessons-learned/{date}-{name}.md` for cross-session injection.

```markdown
# Execution Critique Report

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
- **Don't trust the same model** — audit with a different model (or human) for genuine blind-spot detection.

---

## Related Skills

- **cali-product-workflow**: Coordinates this skill as the `audit` stage
- **cali-product-plan-critique**: Pre-implementation critique (use before coding, complements this post-implementation audit)
- **cali-product-testing-execution**: Post-implementation testing protocol (runs before this audit)
- **cali-product-scope-executor**: Routes plan scopes to execution (feeds this audit's input)

## References

| Reference | Purpose | When to consult |
|-----------|---------|-----------------|
| [Tool Availability & Fallbacks](#-tool-availability--fallbacks) | sem/git fallback strategy | Before any mode |
| `references/cli-tools/subagents.md` | Subagent patterns for parallel audit | Workflow mode with many scopes |
| `references/cli-tools/context-mode.md` | Processing large codebase outputs | Output exceeds viewport |

## Environment Adaptation

If a tool is unavailable, see [Tool Availability & Fallbacks](#-tool-availability--fallbacks) above.
For subagent and large-output patterns, see `references/cli-tools/`.