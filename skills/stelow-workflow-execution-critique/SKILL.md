---
name: stelow-workflow-execution-critique
description: >
  [stelow] Post-implementation execution critique: verify scope completion, implementation quality,
  NFR coverage, edge cases, doc/tests, produce a gap registry with decision matrix.
  Supports 4 modes: workflow (spec-tech.md), plan (spec-product.md), context (dir/URL),
  and standalone (auto-detects via sem diff + git). Falls back to git diff when sem is not installed.
metadata:
  frequency: weekly
  category: workflow
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

# Execution Critique

> **`sem diff` is the primary diff tool.** When `sem` is available, always use `sem diff` first for entity-level change detection (functions, types, methods). Use `git diff` only as fallback when `sem` is absent. The entire skill follows this convention — the fallback table in [Tool Availability](#-tool-availability--fallbacks) covers every `sem` command's git equivalent.

**Standalone awareness:** when inside stelow, reads scope + mode from `.stelow/*/plans/spec-tech*.md` and `stelow.json`. When standalone, auto-detects input type (plan path, directory, URL, or nothing). The `HAS_WORKFLOW_DIR` flag gates stelow-specific features; all audit criteria work in both modes.

## Overview

Run a structured audit after any implementation — whether it followed the full
`stelow` or was done ad-hoc. Every evaluation criterion runs in
every mode; only the **source of truth** differs based on what input is available.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.
> For large outputs, use `bash` with output truncation, or `read` with offset/limit.

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
  ├── User described what changed verbally?
  │   └→ Use description to scope the audit. Still run sem diff / git diff
  │      to auto-discover changes, but use inline text as the primary
  │      scope anchor for what to evaluate.
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

# Check cymbal (structural overview: entry points, hotspots)
command -v cymbal && HAS_CYMBAL=1 || HAS_CYMBAL=0
# Full tool ladder (orient → navigate → structural): references/cli-tools/code-map.md

# Check if HEAD~1 exists (new repos, first commit)
git rev-parse HEAD~1 >/dev/null 2>&1 && HAS_PREV=1 || HAS_PREV=0

# Check if .stelow/ exists
[ -d ".stelow/" ] && HAS_WORKFLOW_DIR=1 || HAS_WORKFLOW_DIR=0
```

### sem not installed

If `sem` is absent, fall back to git:
- `sem diff HEAD~1` → `git log --name-only HEAD~1..HEAD` + `git diff --stat HEAD~1`
- `sem diff` (working tree) → `git diff --stat -- .`
- `sem stats` → `git diff --stat HEAD~1`
- `sem entities` → `find ./ -name '*.go' -o -name '*.ts' -o -name '*.py' | head -50`
- `sem verify --diff` → fallback: manual check of changed function signatures vs callers
- `sem graph --json` → fallback: `find ./ -name '*.go' | head -20` (no graph data)

**Never block** an audit on `sem` being absent. The audit quality drops
(structural analysis lost) but the remaining criteria (implementation
quality, NFRs, edge cases, docs/tests) still deliver value.

### No prior commit (`HEAD~1` doesn't exist)

New repo or first commit. Fall back:
- Use `git diff HEAD` for working tree changes
- Use `git diff --staged` for staged changes
- Show: "This is the first commit — auditing working tree and staged changes."

### `.stelow/` doesn't exist

If this directory is missing:
- In Workflow mode: show "No workflow directory found. The project may not
  have run through `stelow`. Switching to Standalone mode."
- In other modes: no impact (they don't depend on this directory)

---

## 🔄 When to Use

This skill activates automatically at the `audit` stage in `stelow`, after
Verification and the conditional Code Quality Review. It can also be used
standalone when you say:

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
| 6 | **Record Evidence** | Claim-proof artifact present, verified, non-vacuous |
| 7 | **Gap Registry** | Missing, partial, new scope, quality, debt |
| 8 | **Lessons Learned** | What went well, what could improve |
| 9 | **Gap-to-Scope** | Convert ESCALATED gaps to new scopes for re-execution |
| 10 | **Decision Matrix** | Close, document, follow-up, human review |
| 11 | **Tasks Tracking** | Shape Up hill chart: planned tasks executed, discoveries noted |

> All 11 criteria run in every mode. Only the **source of truth** differs.

> **Appetite-aware depth:** All 11 criteria always run. For Lean/Core, report is
> concise (summary + gap registry). For Complete, full recommendations + lessons.
> Coverage is identical regardless of appetite.

---

## 📋 Examples

Two full worked reports (workflow mode + standalone mode) with gap decisions:
`references/examples.md`.

## 🗺️ Mode: Workflow Audit

Audit executed scopes against spec-tech (completeness, quality, gaps), then
classify FIXED / DOCUMENTED / ESCALATED. Full criteria flow, gap handling and
scope-fanout rules: `references/workflow-audit.md`.


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
  sem verify --diff
else
  echo "⚠️  sem not installed — using git fallback"
  git diff --stat HEAD~1
  git log --name-only HEAD~1..HEAD
fi
```

### 3. Run all 11 criteria

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

# Cymbal structural overview (if available)
command -v cymbal &>/dev/null && cymbal structure {INPUT_PATH} 2>/dev/null || echo "⚠️  cymbal not available"

# Entity-level changes (sem fallback to git)
if command -v sem &>/dev/null; then
  sem diff HEAD~1
  sem diff
  sem entities
  sem verify --diff
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

### Run all 11 criteria

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
  sem verify --diff
else
  echo "⚠️  sem not installed — git fallback"
  git diff --stat HEAD~1 && git diff --stat -- .
fi

# Cymbal structural overview (entry points, most-referenced symbols)
command -v cymbal &>/dev/null && cymbal structure 2>/dev/null || true

git log --oneline -10
```

Each modified entity becomes an **inferred scope** in the gap registry.

If none of the above produce results, ask the user:
> "No plan file or recent changes detected. What was this implementation about?
> Describe the expected scope or what should be checked."

### Run all 11 criteria

Same evaluation as Workflow mode. Inferred scopes replace planned scopes.

---

## 📤 Output

Always save or display in this format. The Lessons Learned section also writes to
`.stelow/lessons-learned/{date}-{name}.md` for cross-session injection.

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
| Gap Type | Description | Impact | Effort | Action | Status |
|----------|-------------|--------|--------|--------|--------|
| | | | | FIX/DOC/ESCALATE | FIXED/DOCUMENTED/ESCALATED |

### 7. Lessons Learned
- What went well:
- What could improve:
- Issues to watch:

### 8. Gap Conversion Summary
| Fixed | Documented | Escalated (new scopes) |
|-------|------------|------------------------|
| N | N | N |

## Decision

| Situation | Action Taken |
|-----------|-------------|
| All FIXED or DOCUMENTED, no ESCALATED | ✅ Close cycle |
| ESCALATED gaps exist | 🔄 Loops back to Execution |
| New scopes added to tracking file | 🔄 Workflow re-enters Execution → Verification → Audit |
```

---

## ⚠️ Audit Warnings

- **Don't skip criteria** — Each of the 11 criteria catches different issues.
- **Don't assume** — Verify against the source of truth, don't guess.
- **Don't rush** — A thorough audit saves hours of debugging later.
- **Don't ignore warnings** — Even minor gaps compound over multiple cycles.
- **Don't trust the same model** — audit with a different model (or human) for genuine blind-spot detection.

---

## Related Skills

- **stelow**: Coordinates this skill as the `audit` stage
- **stelow-workflow-plan-critique**: Pre-implementation critique (use before coding, complements this post-implementation audit)
- **stelow-workflow-testing-execution**: Post-implementation testing protocol (runs before this audit)
- **stelow-workflow-scope-executor**: Routes plan scopes to execution (feeds this audit's input)

## References

| Reference | Purpose | When to consult |
|-----------|---------|-----------------|
| [Tool Availability & Fallbacks](#-tool-availability--fallbacks) | sem/git fallback strategy | Before any mode |
| `references/cli-tools/subagents.md` | Subagent patterns for parallel audit | Workflow mode with many scopes |
| `references/cli-tools/README.md` | Tool capability references | Any tool reference needed |
| `references/cli-tools/dead-code-candidates.md` | Dead code detection via `sem graph --json` | Implementation Quality check (criteria 2) |

## Environment Adaptation

If a tool is unavailable, see [Tool Availability & Fallbacks](#-tool-availability--fallbacks) above.
For subagent and large-output patterns, see `references/cli-tools/`.

## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : execution
description    : Implementation. Execute planned scopes.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : verification
gate           : none
rework-on      : shape
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **execution** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Implementation. Execute planned scopes.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

