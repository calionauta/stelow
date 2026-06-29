---
name: cali-product-execution-critique
description: >
  [Cali] Post-implementation execution critique: verify scope completion, implementation quality,
  NFR coverage, edge cases, doc/tests, produce a gap registry with decision matrix.
  Supports 4 modes: workflow (spec-tech.md), plan (spec-product.md), context (dir/URL),
  and standalone (auto-detects via sem diff + git). Falls back to git diff when sem is not installed.
metadata:
  frequency: weekly
  category: meta
  context-cost: medium
---

# Execution Critique

> **`sem diff` is the primary diff tool.** When `sem` is available, always use `sem diff` first for entity-level change detection (functions, types, methods). Use `git diff` only as fallback when `sem` is absent. The entire skill follows this convention — the fallback table in [Tool Availability](#-tool-availability--fallbacks) covers every `sem` command's git equivalent.

**Standalone awareness:** when inside stelow, reads scope + mode from `.stelow/*/plans/spec-tech*.md` and `index.json`. When standalone, auto-detects input type (plan path, directory, URL, or nothing). The `HAS_WORKFLOW_DIR` flag gates stelow-specific features; all audit criteria work in both modes.

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
| 6 | **Gap Registry** | Missing, partial, new scope, quality, debt |
| 7 | **Lessons Learned** | What went well, what could improve |
| 8 | **Gap-to-Scope** | Convert ESCALATED gaps to new scopes for re-execution |
| 9 | **Decision Matrix** | Close, document, follow-up, human review |

> All 9 criteria run in every mode. Only the **source of truth** differs.

> **Appetite-aware depth:** All 9 criteria always run. For Lean/Core, report is
> concise (summary + gap registry). For Complete, full recommendations + lessons.
> Coverage is identical regardless of appetite.

---

## 📋 Examples

### Example 1: Workflow mode (spec-tech.md path)

**Input:** "@.stelow/teste/plans/spec-tech_v1.md — audit implementation"

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

For use after a `stelow` cycle. Requires a path to `spec-tech_v{N}.md`.
If `verification/code-quality-review.md` exists, read it before running the
audit and include unresolved P0/P1 findings in the Gap Registry.

### 1. Read the plan and verification evidence

Read the most recent spec-tech.md from the provided path:

```bash
# Find latest version
ls -t .stelow/*/plans/spec-tech_v*.md 2>/dev/null | head -1
```

Also read optional verification evidence, including the ultra-strict code
quality review report when present:

```bash
CODE_QUALITY_REPORT=".stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md"
[ -f "$CODE_QUALITY_REPORT" ] && cat "$CODE_QUALITY_REPORT"
```

If the external code quality review wrote elsewhere, locate its report and read
it. Treat unresolved P0/P1 findings as audit input, not as noise.

Parse all scopes — each has type, DoD, acceptance criteria, and (if present) NFRs.

### 2. Run entity-level change detection

```bash
if command -v sem &>/dev/null; then
  sem diff HEAD~1   # entities modified in last commit
  sem diff          # working tree changes
  sem stats
  sem verify --diff # catch broken callers from signature changes
  echo "--- dead code candidates (entities with no callers) ---"
  sem graph --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
caller_ids = set()
for e in data.get('edges', []):
    caller_ids.add(e[0])
orphans = [e for e in data.get('entities', []) if e.get('id') not in caller_ids and e.get('kind') in ('function','method')]
for o in orphans[:20]:
    print(f"  {o.get('name','?')} ({o.get('file','?')})")
if len(orphans) > 20:
    print(f"  ... and {len(orphans)-20} more")
" 2>/dev/null || echo "  (could not compute)
fi
```

Each modified entity maps to one or more plan scopes. Entities with no matching
scope are flagged as **scope creep**. Plan scopes with no matching entities are
flagged as **missing scope**.

### 3. Run all 9 criteria

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
- Optional code quality review findings: files >1000 lines, functions >150 lines, complexity >5, leaky abstractions, dead code
- **Dead code candidates**: see `references/cli-tools/dead-code-candidates.md`

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
- Critical-path coverage adequate? (target from testing-strategy.md if available)

**Gap Registry (criteria 6):**

Start the report with YAML frontmatter containing structured gap data.
This feeds the gap-to-scope loop without re-parsing narrative text:

```yaml
---
gaps:
  - type: missing-tests          # missing-tests | incomplete | quality | new-scope | debt
    area: "Scope or module affected"
    description: "What's missing or incomplete"
    impact: medium               # low | medium | high
    resolution: escalate         # fixed | documented | escalate
    scope_candidate: false       # true if this gap should become a new scope
  - type: incomplete
    area: "Another area"
    description: "..."
    impact: high
    resolution: fixed
    scope_candidate: false
lessons_learned:
  - "What went well"
  - "What could improve"
---
```

Then output the narrative table for human review:

| Gap Type | Description | Impact | Resolution |
|----------|-------------|--------|------------|

**Lessons Learned (criteria 7):**
- What went well
- What could improve
- Issues to watch in future cycles

**Save lessons to disk for future cycles:**
```bash
mkdir -p .stelow/lessons-learned/
cat >> .stelow/lessons-learned/{date}-{workflow-name}.md << 'EOF'
---
date: {timestamp}
workflow: {workflow-name}
model: {model_name}
spec: .stelow/{date}/{_dir}/specs/spec-product_v{N}.md
plan: .stelow/{date}/{_dir}/plans/spec-tech_v{N}.md
critique: .stelow/{date}/{_dir}/critiques/critique-report_v{N}.md
---

## What went well
- 

## What could improve
- 

## Issues to watch
- 
EOF
```

Lessons are saved to `.stelow/lessons-learned/` so future workflow
sessions can read them during setup. The `setup.md` stage will automatically
check for and inject prior lessons at workflow start.

### Gap-to-Scope Conversion (criteria 8)

After the Gap Registry is complete, **convert ESCALATED gaps into new scopes**.
This creates a self-healing loop: the workflow re-enters Execution to fix gaps
automatically, then re-audits until clean.

**Classification rules:**
| Impact | Effort to Fix | Action |
|--------|---------------|--------|
| low | any | ✅ **FIXED** — apply inline fix now |
| medium | trivial (< 5 min) | ✅ **FIXED** — apply inline fix now |
| medium | moderate | 📝 **DOCUMENTED** — note for next cycle |
| high | any | 🔄 **ESCALATED** — becomes new scope |
| critical | any | 🔄 **ESCALATED** — becomes new scope |

**What to fix inline (FIXED):**
- Missing imports, unused imports, typo in identifiers
- Missing error handling (empty catch, no fallback)
- Missing null/undefined checks on public APIs
- Inconsistent naming (one-offs, not architectural)
- Unused variables, dead code in changed files
- Formatting inconsistencies in changed code

**What to document (DOCUMENTED):**
- Medium-impact items that need architectural consideration
- Nice-to-haves that don't block delivery
- Tech debt acknowledged for next iteration

**What becomes a new scope (ESCALATED):**
- Missing tests for critical logic
- Security gaps (auth, input validation, rate limiting)
- Performance issues identified by audit
- Missing NFR coverage (observability, error handling)
- Scope items from plan that were not implemented

**Process:**
```
1. For each gap in Gap Registry:
   - Classify: Impact × Effort
   - Decision: FIXED / DOCUMENTED / ESCALATED

2. FIXED gaps:
   - Apply fix now
   - Re-run relevant tests
   - If tests pass → mark FIXED
   - If tests fail → revert, mark DOCUMENTED

3. ESCALATED gaps → write as new scopes:
```

**Writing ESCALATED gaps to tracking file:**
```bash
# Add ESCALATED gaps as new scopes in stelow.json
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (!wf) process.exit(0);

// ESCALATED gaps from audit (build this list from criteria 6)
const escalatedGaps = [
  // { description: 'Missing rate limiter on login', impact: 'high' }
];

if (escalatedGaps.length > 0) {
  const maxId = wf.scopes?.reduce((max, s) => {
    const num = parseInt(s.id.replace('scope-', ''));
    return num > max ? num : max;
  }, 0) || 0;

  if (!wf.scopes) wf.scopes = [];
  escalatedGaps.forEach((gap, i) => {
    wf.scopes.push({
      id: 'scope-' + (maxId + i + 1),
      name: gap.description.slice(0, 50),
      type: 'feature',
      status: 'pending',
      source: 'audit-gap',
    });
  });
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
  console.log('Added ' + escalatedGaps.length + ' gap(s) as new scopes');
}
"
```

**Decision Matrix (criteria 9):**
| Situation | Action |
|-----------|--------|
| All FIXED or DOCUMENTED, no ESCALATED | ✅ Close cycle |
| ESCALATED gaps exist | 🔄 Workflow loops back to Execution |
| Critical gaps, high impact | 🔄 Workflow loops — scope executor handles |

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
  sem verify --diff
else
  echo "⚠️  sem not installed — using git fallback"
  git diff --stat HEAD~1
  git log --name-only HEAD~1..HEAD
fi
```

### 3. Run all 9 criteria

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

### Run all 9 criteria

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

### Run all 9 criteria

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

- **Don't skip criteria** — Each of the 9 criteria catches different issues.
- **Don't assume** — Verify against the source of truth, don't guess.
- **Don't rush** — A thorough audit saves hours of debugging later.
- **Don't ignore warnings** — Even minor gaps compound over multiple cycles.
- **Don't trust the same model** — audit with a different model (or human) for genuine blind-spot detection.

---

## Related Skills

- **stelow**: Coordinates this skill as the `audit` stage
- **cali-product-plan-critique**: Pre-implementation critique (use before coding, complements this post-implementation audit)
- **cali-product-testing-execution**: Post-implementation testing protocol (runs before this audit)
- **cali-product-scope-executor**: Routes plan scopes to execution (feeds this audit's input)

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