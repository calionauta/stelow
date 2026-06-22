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

- **Unit tests pass ≠ user experience works.** E2E testing captures real flow problems that no unit test detects: loading states, double-submit, empty states, network errors, responsiveness. **E2E is the only guarantee that the user experience works.**
- **Accessibility is invisible until it breaks.** A screen reader user can't navigate your beautiful UI. WCAG audits catch contrast, keyboard navigation, and ARIA issues before users do.
- **AI-generated code has 1.7x more bugs** (CodeRabbit 2025). Parallel review by fresh-context reviewers catches over-generation, unnecessary complexity, and slop that original author blindspots miss.
- **Interactive features need real interaction.** Static analysis can't test loading states, error recovery, or edge cases that only appear in browser.

This protocol is the gate between "I finished coding" and "this is ready to ship."

## Decision Tree

**Answer these questions to determine which phases to run.** 
> **⚠️ E2E-first:** Models prioritize unit tests because they seem "easier", 
> but user experience is only guaranteed by E2E tests. 
> This order is intentional: E2E first, unit later.

```
Feature implemented?
│
├── Has interactive UI (forms, clicks, inputs)?
│   ├── YES → Phase 1 (E2E browser testing)
│   └── NO → Phase 1 (skip — no UI to test)
│
├── Has visual interface?
│   ├── YES → Phase 2 (UI quality audit)
│   └── NO → Phase 2 (skip)
│
├── Has existing unit tests?
│   ├── YES → Phase 3 (run existing suite)
│   └── NO → Phase 3 (skip — create only for critical path)
│
├── Touched 3+ files or critical path?
│   ├── YES → Phase 4 (subagent review)
│   └── NO → Phase 4 (skip, manual review)
│
└── Phase 5 (always — final checklist)
```

### Quick Reference Table

| Scenario | P1 (E2E) | P2 (UI) | P3 (Unit) | P4 (Review) | P5 (Check) |
|----------|:--------:|:-------:|:---------:|:-----------:|:----------:|
| Backend fix (1 file) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Backend feature (3+ files) | ❌ | ❌ | ✅ | ✅ | ✅ |
| UI feature (forms, inputs) | ✅ | ✅ | ✅* | ✅ | ✅ |
| API endpoint (no UI) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Config/docs only | ❌ | ❌ | ❌ | ❌ | ✅ |
| Critical path (auth, payments) | ✅* | ✅* | ✅ | ✅ | ✅ |

*If applicable

## Contents

| Phase | What | When to skip |
|-------|------|--------------|
| [Phase 1: E2E Browser Testing](#phase-1-e2e-browser-testing) | Interactive QA via browser | Non-interactive features |
| [Phase 2: UI Quality](#phase-2-ui-quality-if-visual) | Accessibility + design audit | Non-visual features |
| [Phase 3: Unit Tests](#phase-3-unit-tests) | Run existing suite, add tests for critical logic | No existing tests + non-critical path |
| [Phase 4: Code Review](#phase-4-parallel-code-review-via-subagents) | Parallel subagent review | <3 files changed + non-critical |
| [Phase 5: Final Checklist](#phase-5-final-checklist) | Pre-completion verification | Never |

---

## Phase 1: E2E Browser Testing

**Why:** User experience is not guaranteed by unit tests alone. 
E2E tests capture problems no other phase detects: 
loading states, error recovery, double-submit, empty states, 
responsiveness, and complete flows. 

**Real scenario:** A signup form passes all unit 
tests, but the real user sees an unhandled error flash when 
the network drops mid-submit. The submit button shows no loading state. 
The user clicks twice and creates duplicates. Only E2E/browser testing 
catches this.

Load `agent-browser` and `dogfood` skills for interactive testing:

```
/dogfood
```

Steps:
1. Open the feature in browser
2. Test happy path (E2E)
3. Test error states
4. Test edge cases (empty states, loading, errors)
5. Capture screenshots for evidence

**Block until E2E tests pass for the critical path.**
Do not proceed if the main user flow is broken.

## Phase 2: UI Quality (if visual)

**Why:** 15% of the world population has some form of disability. Accessibility isn't optional — it's a legal requirement in many countries and ethical obligation everywhere.

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

## Phase 3: Unit Tests

**Why:** Unit tests verify your code does what you think it does. They complement E2E — while E2E guarantees user experience, unit tests ensure internal logic is correct.

**Real scenario:** A payment handler passes E2E but fails under race condition when two requests hit simultaneously. Unit tests covering concurrency logic catch this.

Run the project's test suite:

```bash
# Go
go test ./...

# Node
npm test

# Python
pytest
```

**If no tests exist:** Create unit tests only for critical business logic (auth, payment, data validation). Skip for CRUD/standard paths.

**Block until tests pass.** Do not proceed with failing tests.

## Phase 4: Parallel Code Review via Subagents

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

## Phase 5: Final Checklist

Before marking feature complete:

- [ ] E2E/browser testing done (if interactive UI)
- [ ] UI accessible (if applicable)
- [ ] Unit tests pass (if applicable)
- [ ] Code review done (subagent or human)
- [ ] No regressions detected
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

## Workflow Summary

```
Implement feature
    ↓
E2E/browser testing (if interactive UI) → FAIL? Fix first
    ↓
UI audit + critique (if visual)
    ↓
Unit tests (run existing, add for critical logic)
    ↓
Parallel subagent review (if 3+ files or critical path)
    ↓
Final checklist → All green? Mark complete
```

## Examples

### Example 1: Backend fix (1 file)

**Input:** "Fixed the rate limiter bug in auth_handler.go"

**Decision tree:**
- Interactive UI? → No → P1 ❌ (no UI to test)
- Visual UI? → No → P2 ❌
- Has existing tests? → Yes → P3 ✅
- 3+ files? → No (1 file) → P4 ❌
- Final checklist → P5 ✅

**Steps:**
1. Skip E2E (backend only)
2. Skip UI (backend)
3. Run: `go test ./...`
4. Skip subagent review (1 file)
5. Complete checklist

**Output:** "E2E skipped (no UI). Tests pass. Checklist complete. Rate limiter fix verified."

### Example 2: Complex backend feature (6 files)

**Input:** "Just finished the payment system — touches 6 files"

**Decision tree:**
- Interactive UI? → No → P1 ❌ (no UI to test)
- Visual UI? → No → P2 ❌
- Has existing tests? → Yes → P3 ✅
- 3+ files? → Yes (6) → P4 ✅
- Final checklist → P5 ✅

**Steps:**
1. Skip E2E (backend only)
2. Skip UI (backend)
3. Run: `go test ./...`
4. Launch subagent review (2 reviewers)
5. Complete checklist

**Output:** "E2E skipped (no UI). Tests pass. Subagent review found 1 issue (missing error handling in payment_handler.go). Fixed."

### Example 3: UI feature with forms

**Input:** "Finished the dashboard redesign — new charts, filters, and export button"

**Decision tree:**
- Interactive UI? → Yes (forms, buttons) → P1 ✅
- Visual UI? → Yes → P2 ✅
- Has existing tests? → Yes → P3 ✅
- 3+ files? → Yes → P4 ✅
- Final checklist → P5 ✅

**Steps:**
1. Run: `/dogfood` (E2E browser testing) → all interactive elements work. Found: network error flash on slow connection, double-submit creates duplicate.
2. Run: `cali-product-ux-critique` (URL mode) → found contrast issue on chart labels, high cognitive load on filters
3. Run: `npm test`
4. Launch subagent review (3+ files)
5. Complete checklist

**Output:** "E2E found 2 issues (network error flash, double-submit). UI critique found 1 contrast issue (P1). Unit tests pass. Review clean."

## Edge Cases

### E2E tests find critical issue
- STOP. Do not proceed to other phases.
- Fix the issue first
- Re-run E2E after fix
- Tell user: "E2E found critical issue — fixed and re-tested"

**Why:** If the user experience is broken, unit testing or code review is pointless. E2E is the main gate.

### UI audit finds WCAG violations
- FIX before marking complete
- Document what was fixed
- If can't fix: document accepted risk with reason

**Why:** WCAG violations are legal risks in many jurisdictions. Even if not legally required, they exclude users with disabilities.

### Unit tests fail
- STOP. Do not proceed to review.
- Fix tests first
- Tell user: "Tests are failing — fix before review"

**Why:** Proceeding with failing tests wastes review time.

### Subagent review finds critical issue
- STOP. Do not mark complete.
- Fix the issue
- Re-run review on fixed code
- Tell user: "Review found critical issue — fixed and re-reviewed"

**Why:** Critical issues (security, data loss, race conditions) must be fixed before merge. Re-review confirms the fix doesn't introduce new issues.

### Feature touches <3 files
- Skip subagent review (not worth the overhead)
- Do manual review instead
- Still run E2E (if UI) and unit tests and checklist

**Why:** Subagent review has overhead (context loading, prompt engineering). For small changes, manual review is faster and equally effective.

### Critical path (auth, payments, data)
- ALWAYS run all applicable phases
- E2E testing is **mandatory** even if UI seems "simple"
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
- `references/cli-tools/subagents.md` — Subagent task structure patterns
