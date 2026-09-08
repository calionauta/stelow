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

### 3. Run all 11 criteria

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

**Record Evidence (criteria 6):**

For every scope with `status: 'completed'` in `stelow.json`, verify the
Record evidence block exists and is non-vacuous. Per
`stelow-workflow-scope-executor` SKILL Step 3e-bis, the Record is the
**claim-proof artifact** — without it, the ✅ is unearned.

Check each completed scope:

| Scope | record present? | record.verified? | files_count > 0? | commands_count > 0? | suggested_commit set? |
|-------|-----------------|------------------|------------------|----------------------|------------------------|

Flag as gap if any of:
- `record` is missing entirely → **block**: cannot claim completion.
- `record.verified !== true` → **warning**: Verification checklist incomplete.
- `record.commands_count === 0` → **warning**: "verified via vibes" pattern.
- `record.suggested_commit` is empty → **minor**: no commit guidance for next PR.
- `iteration-state-{SCOPE-ID}.md` lacks a `## Record` section even when
  `stelow.json` has the mirror fields → **warning**: mirror may be hallucinated.

Severity ladder:
- **block**: missing `record` entirely on a `completed` scope. close audit.
- **warning**: incomplete verification or zero commands. document in gap registry.
- **minor**: cosmetic (suggested_commit missing). Note in lessons learned.

Note: `record` field uses snake_case (`completed_at`, `files_count`,
`commands_count`, `suggested_commit`) to match the rest of `stelow.json`
schema (target_files, actual_files, start_sha, lock_ttl_seconds).

Convention reminder (paraphrased from Evidence Ladder): unchecked items
are blockers; record `Limitations / non-claims` honestly rather than
omitting the section.

**Gap Registry (criteria 7):**

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

**Lessons Learned (criteria 8):**
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

### Gap-to-Scope Conversion (criteria 9)

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

// ESCALATED gaps from audit (build this list from criteria 7)
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

**Decision Matrix (criteria 10):**
| Situation | Action |
|-----------|--------|
| All FIXED or DOCUMENTED, no ESCALATED | ✅ Close cycle |
| ESCALATED gaps exist | 🔄 Workflow loops back to Execution |
| Critical gaps, high impact | 🔄 Workflow loops — scope executor handles |

**Tasks Tracking (criteria 11):**

For every completed scope, verify the Shape Up hill-chart collapse actually happened. Per `stelow-workflow-scope-executor` SKILL Step 3e-ter, `wf.scopes[i].tasks[]` is the runtime checklist that proves the scope did the work it claimed. Without it, the scope-vs-task boundary is unclear and the audit is reduced to "trust me, I implemented it".

Check each completed scope:

| Scope | tasks present? | planned done? | discovered count > 0? | discovered tasks have note? |
|-------|----------------|---------------|------------------------|------------------------------|

Flag as gap if any of:
- `status: 'completed'` AND `tasks` is missing entirely → **warning**:
  scope-vs-task confusion likely. Some scopes legitimately ship with
  no tasks table (small DoD-only scopes); cite `iteration-state-{SCOPE-ID}.md`
  to explain.
- `tasks` present AND zero `status: 'done'` AND zero `status: 'skipped'`
  → **warning**: scope closed with all tasks pending. Either the
  executor skipped marking them done (discipline lapse) or the table
  was stale.
- `tasks` filtered to `source: 'discovered'` AND any task has empty
  `note` → **warning** (Record Evidence via convention): discovered
  tasks must explain the trigger. (Hard-blocked at write time when
  `STELOW_VALIDATE=1`. Without the env var, the warning is the only
  guard — check each discovered task's note explicitly.)
- `discovered_tasks_count > 5` → **minor**: high discovery ratio
  signals either under-planning at spec-tech time OR scope boundary
  drift. Not a blocker; surface in lessons learned.
- **Rule of thumb** (paraphrased from shape-up): if a discovered task
  grew large enough to be its own delivery unit, it should have been
  ESCALATED to a new scope (Criterion 9). Flag if you see any
  discovered task with `risk >= 4`.

Convention reminder (paraphrased from scope-executor Step 3e-ter):
tasks are NOT separate execution units. They are a checklist inside
a scope. The hill chart's job is to make scope size honest.

---
