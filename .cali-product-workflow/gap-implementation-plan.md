# Gap Implementation Plan (Revised per Reviewer)

## Execution Order

```
Gap E (subagents.md foundation - no deps)
  ├── Gap D (relies on subagents.md parallel pattern)
  ├── Gap A (setup.md#0c - session-knowledge injection)
  ├── Gap B (setup.md#0d - external context injection)
  ├── Gap F (shape-up SKILL.md - output validation)
  ├── Gap H (tech-planning SKILL.md - output validation)
  ├── Gap C (execution-critique SKILL.md - artifact links)
  └── Gap G (plannotator.md + gate.md - fallback strength)
```

## Gaps

### Gap E: Subagent Retry Wrapper (Foundation)
**File:** `skills/cali-product-workflow/references/cli-tools/subagents.md`
**Changes:**
- Add "## Error Recovery" section before existing "Fallback (Generic)"
- Pattern: timeout-aware retry → 1 attempt, retry once, skip with logged error

### Gap D: Multi-Dimensional Parallel Critique
**File:** `skills/cali-product-plan-critique/SKILL.md`
**Changes:**
- Replace single `reviewer` subagent with 4 parallel subagents:
  1. Flows + States
  2. Data + System
  3. Affordances + UX
  4. Feasibility
- Add Step 3b: consolidation subagent (reads 4 reports, produces unified report)
- Use `.cali-product-workflow/{date}/{_dir}/critiques/` (not `.cali-plan-critique/`)
- Verify: critique stage allows `subagent` ✅ and `write` ✅

### Gap A: Session Knowledge Injection in Setup
**File:** `skills/cali-product-workflow/stages/setup.md`
**Changes:**
- Add "0c. Session Knowledge Injection" after "0b. Lessons Learned Injection"
- Read `.cali-product-workflow/session-knowledge/*.md` files
- Passive context (no forced reflection, unlike lessons learned)

### Gap B: External Context Pre-Load (MOVED from context to setup per reviewer)
**File:** `skills/cali-product-workflow/stages/setup.md`
**Changes:**
- Add "0d. External Context Injection" after 0c
- Ask user: "Do you have external context to load? (competitive analysis, customer research, third-party audit)"
- If yes, read file(s) and inject as session context
- All pre-loading centralized in setup stage

### Gap F: Shape Up Output Validation
**File:** `skills/cali-product-shape-up/SKILL.md`
**Changes (insert after real save, not after Output doc section):**
- After `.cali-product-workflow/.../plans/spec-product_{v}.md` is saved:
  - Validate required sections: Appetite, IN/OUT, Risks
  - If missing → regenerate once with validation error as feedback
  - Then proceed normally

### Gap H: Tech Planning Output Validation
**File:** `skills/cali-product-tech-planning/SKILL.md`
**Changes:**
- After subagent generates spec-tech_{v}.md:
  - Validate each scope has: TYPE, DoD, AC
  - If missing → regenerate once with validation error
  - Verify no circular deps (>5 levels → warn)
- Document both validation steps inline in the process flow

### Gap C: Lessons Learned with Artifact References
**File:** `skills/cali-product-execution-critique/SKILL.md`
**Changes:**
- Add `## Artifact references` section to lessons learned template
- Include paths to spec, plan, critique artifacts

### Gap G: Plannotator Fallback Strengthening
**Files:** `skills/cali-product-workflow/references/cli-tools/plannotator.md`, `skills/cali-product-workflow/stages/gate.md`
**Changes:**
- Add explicit "if tool command fails → save manual review file" path
- Path: `.plannotator/gate-manual-approval-required.md`
- Document that the gate is NEVER skipped — just degraded gracefully
