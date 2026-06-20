---
name: cali-product-testing-execution
description: "Run post-implementation testing protocol. Triggers when: user says 'test this', 'run tests', 'QA', 'dogfood', 'check quality', user finishes implementing a feature, or when a PR is ready for review. Also triggers on mentions of: test coverage, accessibility audit, WCAG, design review, code review, subagent review, UX quality audit. Covers: parallel review via subagents, UX/UI quality audit (via cali-product-ux-critique), accessibility check, and browser testing."
metadata:
  frequency: weekly
  category: code
  context-cost: medium
---

# Testing Protocol

After implementing any feature, run this protocol before marking complete.

## Why This Protocol

This protocol exists because of real patterns observed across projects:

- **Unit tests pass ≠ code is correct.** Tests verify expected behavior but miss logic errors, race conditions, and missing error handling. Subagent review catches what tests can't.
- **Accessibility is invisible until it breaks.** A screen reader user can't navigate your beautiful UI. WCAG audits catch contrast, keyboard navigation, and ARIA issues before users do.
- **AI-generated code has 1.7x more bugs** (CodeRabbit 2025). Parallel review by fresh-context reviewers catches over-generation, unnecessary complexity, and slop that original author blindspots miss.
- **Interactive features need real interaction.** Static analysis can't test loading states, error recovery, or edge cases that only appear in browser.

This protocol is the gate between "I finished coding" and "this is ready to ship."

## Decision Tree

**Answer these questions to determine which phases to run:**

```
Feature implementada?
│
├── Tem testes unitários?
│   ├── SIM → Phase 1 (sempre)
│   └── NÃO → Phase 1 (criar testes primeiro)
│
├── Tocou 3+ arquivos?
│   ├── SIM → Phase 2 (subagent review)
│   └── NÃO → Phase 2 (skip, review manual)
│
├── Tem interface visual?
│   ├── SIM → Phase 3 (UI quality)
│   └── NÃO → Phase 3 (skip)
│
├── Tem interatividade (forms, clicks, inputs)?
│   ├── SIM → Phase 4 (browser testing)
│   └── NÃO → Phase 4 (skip)
│
└── Phase 5 (sempre — final checklist)
```

### Quick Reference Table

| Scenario | P1 | P2 | P3 | P4 | P5 |
|----------|:--:|:--:|:--:|:--:|:--:|
| Backend fix (1 file) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Backend feature (3+ files) | ✅ | ✅ | ❌ | ❌ | ✅ |
| UI feature (forms, inputs) | ✅ | ✅ | ✅ | ✅ | ✅ |
| API endpoint (no UI) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Config/docs only | ❌ | ❌ | ❌ | ❌ | ✅ |
| Critical path (auth, payments) | ✅ | ✅ | ✅* | ✅* | ✅ |

*Se aplicável

## Contents

| Phase | What | When to skip |
|-------|------|--------------|
| [Phase 1: Unit Tests](#phase-1-unit-tests) | Run test suite, block on failure | Never |
| [Phase 2: Code Review](#phase-2-parallel-code-review-via-subagents) | Parallel subagent review | <3 files changed |
| [Phase 3: UI Quality](#phase-3-ui-quality-if-visual) | Accessibility + design audit | Non-visual features |
| [Phase 4: Browser Testing](#phase-4-browser-testing-if-interactive) | Interactive QA | Non-interactive features |
| [Phase 5: Final Checklist](#phase-5-final-checklist) | Pre-completion verification | Never |

## Phase 1: Unit Tests

**Why:** Unit tests verify your code does what you think it does. They're the foundation — if tests fail, nothing else matters.

**Real scenario:** A payment handler passes all unit tests but fails under race condition when two requests hit simultaneously. Tests didn't cover concurrency because they run sequentially. Subagent review (Phase 2) catches this.

Run the project's test suite first:

```bash
# Go
go test ./...

# Node
npm test

# Python
pytest
```

**Block until tests pass.** Do not proceed with failing tests.

## Phase 2: Parallel Code Review via Subagents

**Why:** Fresh eyes catch what the original author can't see. Two reviewers with different focus areas (correctness vs simplicity) catch complementary issues.

**Real scenario:** Developer implements auth flow. Subagent reviewer finds: (1) missing rate limiting on login endpoint, (2) JWT token not invalidated on password change, (3) error messages leak user existence. None of these showed in unit tests.

**When to use subagents:**
- Diff touches 3+ files
- Feature involves multiple components
- Changes affect critical paths (auth, payments, data)

**When to skip:**
- Single-file typo fix
- Config-only change
- Documentation update

Use the subagents tool (see `references/cli-tools/subagents.md`) in parallel for context gathering:

```
2 parallel scouts (fresh context):
1. Map current code state → context/current-state.md
2. Map technical risks → context/risks.md
```

**Error handling:** If a scout fails, retry per the retry pattern in `references/cli-tools/subagents.md`.

## Phase 3: UI Quality (if visual)

**Why:** 15% of the world population has some form of disability. Accessibility isn't optional — it's法律 requirement in many countries and ethical obligation everywhere.

**Real scenario:** Beautiful dashboard with perfect colors... but contrast ratio is 3.5:1 (WCAG requires 4.5:1). Screen reader can't navigate the chart. Keyboard users can't reach the filter panel. None of this shows in visual inspection.

Only if the scope involves a visual interface.

### UI Critique

Use `cali-product-ux-critique` for a focused UX/UI quality audit.

**Input routing:**
- **Live URL** → `cali-product-ux-critique` in Live Site mode (full browser audit)
- **Source code** → `cali-product-ux-critique` in Codebase mode (static analysis, ~80% coverage)
- **Screenshot** → `cali-product-ux-critique` in Screenshot mode (quick visual check)

**What it covers:**
- **Accessibility:** Color contrast, ARIA, keyboard nav, alt text, focus management, semantic HTML
- **Nielsen Heuristics:** All 10 usability heuristics scored
- **Design Quality:** Visual hierarchy, cognitive load, consistency, mobile/responsive, AI slop detection
- **UX:** Emotional journey, design personas, flows & affordances

**Output:** Classified gap report (🚨/🤔/🔎) with actionable recommendations per issue, saved to `.cali-ux-critique/`.

## Phase 4: Browser Testing (if interactive)

**Why:** Static analysis can't test loading states, error recovery, or edge cases that only appear with real user interaction. What looks perfect in code can break in browser.

**Real scenario:** Form submits correctly... but what happens when network drops mid-submit? User clicks submit twice? Server returns 500? Empty state shows correctly? Loading spinner appears? Browser testing catches these.

Load `agent-browser` and `dogfood` skills for interactive testing:

```
/dogfood
```

Steps:
1. Open the feature in browser
2. Test happy path
3. Test error states
4. Test edge cases (empty states, loading, errors)
5. Capture screenshots for evidence

## Phase 5: Final Checklist

Before marking feature complete:

- [ ] Unit tests pass
- [ ] Code review done (subagent or human)
- [ ] No regressions detected
- [ ] UI accessible (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

## Workflow Summary

```
Implement feature
    ↓
Run unit tests → FAIL? Fix first
    ↓
Parallel subagent review (if 3+ files)
    ↓
UI audit + critique (if visual)
    ↓
Browser testing (if interactive)
    ↓
Final checklist → All green? Mark complete
```

## Examples

### Example 1: Backend fix (1 file)

**Input:** "Fixed the rate limiter bug in auth_handler.go"

**Decision tree:**
- Has tests? → Yes → P1 ✅
- 3+ files? → No (1 file) → P2 ❌
- Visual UI? → No → P3 ❌
- Interactive? → No → P4 ❌
- Final checklist → P5 ✅

**Steps:**
1. Run: `go test ./...`
2. Skip subagent review (1 file)
3. Skip UI (backend)
4. Skip browser (no UI)
5. Complete checklist

**Output:** "Tests pass. Checklist complete. Rate limiter fix verified."

### Example 2: Complex backend feature (6 files)

**Input:** "Just finished the payment system — touches 6 files"

**Decision tree:**
- Has tests? → Yes → P1 ✅
- 3+ files? → Yes (6) → P2 ✅
- Visual UI? → No → P3 ❌
- Interactive? → No → P4 ❌
- Final checklist → P5 ✅

**Steps:**
1. Run: `go test ./...`
2. Launch subagent review (2 reviewers)
3. Skip UI (backend only)
4. Skip browser (no UI)
5. Complete checklist

**Output:** "Tests pass. Subagent review found 1 issue (missing error handling in payment_handler.go). Fixed."

### Example 3: UI feature with forms

**Input:** "Finished the dashboard redesign — new charts, filters, and export button"

**Decision tree:**
- Has tests? → Yes → P1 ✅
- 3+ files? → Yes → P2 ✅
- Visual UI? → Yes → P3 ✅
- Interactive? → Yes (forms, buttons) → P4 ✅
- Final checklist → P5 ✅

**Steps:**
1. Run: `npm test`
2. Launch subagent review (3+ files)
3. Run: `cali-product-ux-critique` (URL mode) → found contrast issue on chart labels, high cognitive load on filters
4. Run: `/dogfood` → all interactive elements work
5. Complete checklist

**Output:** "Tests pass. Review clean. UI critique found 1 contrast issue (P1) and 2 design issues (P2). Fixed contrast, noted cognitive load for next iteration."

## Edge Cases

### Tests fail
- STOP. Do not proceed to review.
- Fix tests first
- Tell user: "Tests are failing — fix before review"

**Why:** Proceeding with failing tests wastes review time. The reviewer will find issues that are already caught by tests.

### Subagent review finds critical issue
- STOP. Do not mark complete.
- Fix the issue
- Re-run review on fixed code
- Tell user: "Review found critical issue — fixed and re-reviewed"

**Why:** Critical issues (security, data loss, race conditions) must be fixed before merge. Re-review confirms the fix doesn't introduce new issues.

### UI audit finds WCAG violations
- FIX before marking complete
- Document what was fixed
- If can't fix: document accepted risk with reason

**Why:** WCAG violations are legal risks in many jurisdictions. Even if not legally required, they exclude users with disabilities.

### Feature touches <3 files
- Skip subagent review (not worth the overhead)
- Do manual review instead
- Still run tests and checklist

**Why:** Subagent review has overhead (context loading, prompt engineering). For small changes, manual review is faster and equally effective.

### Critical path (auth, payments, data)
- ALWAYS run all applicable phases
- Never skip subagent review
- Consider adding security-focused reviewer

**Why:** Critical paths have highest blast radius. A bug in auth affects all users. A bug in payments costs money. Extra review is cheap insurance.

## Test Cases

### Should activate
- "Test this feature"
- "Run QA on my changes"
- "Check if this is ready to ship"
- "Dogfood the new feature"
- "Review my code before merge"

### Should NOT activate
- "Write tests" (writing tests, not running QA)
- "What testing framework do we use?" (question, not action)
- "Fix the flaky test" (fixing, not reviewing)

## References

- **cali-product-testing-ai-code**: Use this BEFORE implementation to generate testing strategy, coverage/risk targets, and test scopes. This execution skill uses those targets as quality gates.
- `references/subagent-patterns.md` — Subagent task structure patterns
