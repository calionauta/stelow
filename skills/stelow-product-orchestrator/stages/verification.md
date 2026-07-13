## Verification

> **Part of stelow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the testing protocol before delivery audit.

### 🛡️ Quality Floor (never appetite-gated)

**Appetite governs scope (how much the product does), never quality (how rigorously the product is verified).** The following gates ALWAYS run regardless of appetite — they are the floor, not the ceiling:

- ✅ **test-suite** — the project's test suite always runs
- ✅ **code-quality-gate** — lint, typecheck, static analysis always run
- ✅ **invisible-20%** — error handling, observability, security, validation, rollback checks always run
- ✅ **static a11y/lint when UI files exist** — syntax-level accessibility checks always run when `.templ`, `.html`, `.tsx`, `.jsx`, or `.css` files changed
- ✅ **Quick Tier interactive-testing** — browserless logic audit (event handlers, state management, API patterns) always runs

Appetite controls **depth** (how thoroughly), not **whether** these run:

| Appetite | What changes (additive depth) |
|----------|-------------------------------|
| `Lean` | Light single-reviewer code review (parallel skipped); static UI audit only |
| `Core` | Parallel code review (multiple reviewers); codebase-mode UX review (browserless, ~80% coverage) |
| `Complete` | + Live-site UX audit (browser, real a11y); + Thermo-Nuclear code quality review; + Full-Tier browser interactive testing |

**Rationale:** LLMs systematically overestimate implementation time and tend to cut quality out of fear of complexity (Estimation Bias Correction, Shape Up SKILL § Estimation Bias). If verification feels "too expensive" for an appetite, the answer is to cut scope, not to cut quality. The appetite ceiling for scope is enforced by `appetite_fit` (shape-up SKILL § shape:20) and the Plan Critique scope-fit checklist, not by skipping quality gates here.

### Appetite Gate (verification depth)

**Before running verification steps, read appetite:**

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
SCOPE_COUNT=$(ls .stelow/{YYYY-MM-DD}/{_dir}/plans/scopes/*.md 2>/dev/null | wc -l | tr -d ' ')
```

| Appetite | test-suite | code-review | ui-quality | interactive-testing | code-quality-gate | code-quality-review | invisible-20% |
|----------|-----------|-------------|------------|-------------------|-------------------|---------------------|---------------|
| `Lean` | ✅ Run | ✅ Light (single reviewer) | ✅ Static a11y/lint | ✅ Quick Tier | ✅ Run | ✅ Light (skip Thermo-Nuclear) | ✅ Run |
| `Core` | ✅ Run | ✅ Parallel reviewers | ✅ Codebase mode (~80%) | ✅ Quick Tier | ✅ Run | ✅ Conditional by risk (Nuclear if risk high) | ✅ Run |
| `Complete` | ✅ Run | ✅ Parallel + Thermo-Nuclear when applicable | ✅ Live Site mode | ✅ Quick + Full Tier (browser) | ✅ Run | ✅ Mandatory for `Product Spec + Interface + Tech Review` and `Product Spec + Interface + Tech Review + Code Diff` | ✅ Run |

**Rationale (per row):**
- **Lean code-review:** A single fresh-context reviewer runs the standard check. Not skipped — quality floor.
- **Core code-review:** Parallel reviewers run on the same diff (faster, more thorough). Quality floor + depth.
- **Complete code-review:** Parallel reviewers + Thermo-Nuclear when risk warrants it. Quality floor + maximum depth.
- **Lean ui-quality:** Static a11y/lint catches syntactic WCAG violations (~40%, Deque 2026) without a browser.
- **Core ui-quality:** Codebase mode adds semantic correctness checks (AccessGuru 2025: ~84% violation score decrease from HTML-source analysis).
- **Complete ui-quality:** Live Site mode opens a real browser for contrast, keyboard, screen reader audit.
- **Lean interactive-testing:** Quick Tier is browserless — event handlers, state mgmt, API patterns. Catches `data-on` vs `data-on:` syntax bugs without a browser.
- **Core interactive-testing:** Quick Tier runs by default; Full Tier only when a complex UI flow is in scope.
- **Complete interactive-testing:** Quick + Full Tier when interactive elements exist.
- **Lean code-quality-review:** The lightweight gate (lint + typecheck) runs. Thermo-Nuclear is skipped unless explicitly requested.
- **Complete code-quality-review:** Thermo-Nuclear runs for software/hybrid code changes, mandatory in `Product Spec + Interface + Tech Review` and `Product Spec + Interface + Tech Review + Code Diff`.

### Auto-chain

Verification runs **automatically after Execution** once all scopes complete.
After Verification passes, run the conditional Code Quality Review, then automatically proceed to Execution Critique.

### test-suite

Run the project's test suite:

```bash
# Go
go test ./...

# Node
npm test

# Python
pytest
```

**Block until tests pass.** Do not proceed with failing tests.

### code-review (appetite-aware depth)

Code review is **quality protection** and runs at every appetite — appetite only changes the depth. The Quality Floor above defines the minimum: one reviewer always runs. Appetite adds parallelism and rigor.

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
DIFF_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')

# Quality Floor: code review always runs at least one reviewer.
# Appetite adds parallelism and review depth, never skips the floor.
case "$APPETITE" in
  Lean)
    echo "CODE_REVIEW_LIGHT: appetite Lean — single fresh-context reviewer, no parallelism."
    REVIEWER_COUNT=1
    ;;
  Core)
    if [ "$DIFF_FILES" -ge 3 ]; then
      echo "CODE_REVIEW_PARALLEL: appetite Core, $DIFF_FILES files changed — launching parallel reviewers."
      REVIEWER_COUNT=3
    else
      echo "CODE_REVIEW_LIGHT: appetite Core, $DIFF_FILES file(s) — single reviewer."
      REVIEWER_COUNT=1
    fi
    ;;
  Complete)
    echo "CODE_REVIEW_PARALLEL: appetite Complete — parallel reviewers + Thermo-Nuclear when risk warrants."
    REVIEWER_COUNT=5
    ;;
  *)
    echo "CODE_REVIEW_DEFAULT: unknown appetite, defaulting to Core behavior — single reviewer."
    REVIEWER_COUNT=1
    ;;
esac
```

**Rule:** even at Lean, code review is never skipped. If file count is low (≤2), the reviewer uses a lighter checklist (correctness, security baseline) instead of architectural analysis. This keeps quality floor while keeping cost proportionate to scope.

If running, launch a fresh-context reviewer.
See `references/cli-tools/subagents.md` for the `subagent()` pattern — this works
on pi.dev, OpenCode, and Claude Code (all have native subagent support).
Run **automatically** with `context: "fresh"` — the fresh session provides
independent review without the degraded context of the original session.
This mitigates the shallow review trap (Ox Security 2025) even with the
same model, because the issue isn't identical models but contaminated context
(Gamage 2026 "Omission Constraints Decay").

**Code-reviewer subagent invocation contract:**

```typescript
// Parallel reviewers at Core/Complete appetite
subagent({
  agent: "reviewer",
  task: `Review diff for {dimension} (correctness | tests | simplicity | architecture).

Appetite: ${configAppetite}  // Lean = single reviewer, Core/Complete = parallel
Diff (git diff HEAD~1):
${diffOutput}

Read .stelow/{date}/{dir}/plans/spec-product_{v}.md for spec context (frontmatter: appetite, review_mode, domains_detected; body: scope, DoD).
Do NOT inherit orchestrator deliberation. Save review to {reviewOutputPath}.`,
  reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md"],
  output: reviewOutputPath,
  context: "fresh"
})
```

The reviewer gets:
- The diff (from task string — it can't be inferred)
- spec-product.md (from `reads` — appetite + scope + DoD)
- Fresh context (defeats context rot, mitigates shallow review trap)

The reviewer does NOT need:
- Parent's deliberation history (would inject context rot)
- Acceptance contract (this is review, not execution)

### ui-quality (appetite-aware)

Check appetite and UI scope before running:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
UI_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -cE '\.(templ|html|tsx|jsx|css)$' || echo "0")
```

| Appetite | UI files | Action |
|----------|---------|--------|
| `Lean` | any | **Static a11y/lint.** No browser/live audit unless upgraded. |
| `Core` | 0 | **Skip.** No UI. |
| `Core` | 1+ | **Normal.** Delegate to `stelow-product-ux-critique`. Codebase mode (browserless). |
| `Complete` | 0 | **Skip.** No UI. |
| `Complete` | 1+ | **Live Site mode.** Full browser audit. |

If running, delegate to `stelow-product-ux-critique`.

See the `stelow-product-ux-critique` skill for full instructions.

**Input routing:**
- **Source code available** → Codebase mode (browserless, ~80% coverage)
- **Live URL available** → Live Site mode (full browser audit)
- **Both available** → Codebase mode first, then Live Site mode for issues flagged `[needs browser]`

**Research basis:** AccessGuru (arXiv 2025) shows LLMs achieve ~84%
violation score decrease analyzing HTML source — no browser needed for
syntactic accessibility violations. Deque (2026) confirms ~40% of WCAG
issues are auto-detectable; LLMs push this further by evaluating semantic
correctness that rule-based tools cannot assess.

### interactive-testing (appetite-aware depth)

Interactive testing has two tiers. **Quick Tier (browserless) is the Quality Floor — it always runs.** Appetite controls whether Full Tier (browser) runs.

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
```

| Appetite | Quick Tier (browserless) | Full Tier (browser) |
|----------|--------------------------|---------------------|
| `Lean` | ✅ Always runs | **Skip** unless user requests browser testing |
| `Core` | ✅ Always runs | **Skip** unless a complex flow (modal, multi-step form, drag-drop) is in scope |
| `Complete` | ✅ Always runs | ✅ Runs when interactive elements exist |

If the feature has interactive elements (forms, clicks, inputs):

#### Quick Tier — Logic Audit (browserless) — Quality Floor

**Always runs.** Source-code analysis catches ~80% of event-handler and state-management defects without a browser:

- Event handlers: correct targets, proper cleanup (useEffect return)
- State management: optimistic updates, rollback on error
- API call patterns: correct endpoints, error handling, retry?
- **Framework syntax:** event attribute format (e.g. Datastar `data-on:click` vs `data-on-click`), CDN URL resolution, server-rendered HTML contains expected attributes

#### Full Tier — Browser Testing (agent-browser)

**Appetite-gated:** runs in Complete by default, in Core when a complex flow is in scope, in Lean only when explicitly requested.

See `references/cli-tools/agent_browser.md` for browser automation details.
Use `dogfood` skill for structured exploratory testing:
1. Open the feature in browser
2. Test happy path
3. Test error states
4. Test edge cases (empty states, loading, errors)
5. Capture screenshots for evidence

### code-quality-gate

Run static analysis appropriate to the project's language. This is language-
agnostic — adapt to your tech stack (not just eslint/tsc):

```bash
# Go
go vet ./... 2>&1 | head -20

# Node/TypeScript (if package.json exists)
npm run lint 2>&1 | head -20
# or
npx tsc --noEmit 2>&1 | head -20

# Python (if requirements.txt or pyproject.toml exists)
ruff check . 2>&1 | head -20
# or
pylint src/ 2>&1 | head -20

# Rust (if Cargo.toml exists)
cargo clippy -- -D warnings 2>&1 | head -20
```

**Block on errors** (not warnings) — warnings are informational and should be
reviewed but are not blockers. Address all errors before proceeding.

### code-quality-review (appetite-aware depth)

The code-quality-review stage has two layers. **A lightweight review (correctness, security baseline, naming, dead code) is the Quality Floor and always runs.** The ultra-strict Thermo-Nuclear review (1000-line files, complexity>5, abstraction quality) runs only when appetite or risk warrants it.

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")

# Quality Floor: lightweight review always runs (lint + security + dead-code scan).
# Thermo-Nuclear is appetite-gated and adds depth, not a floor.
case "$APPETITE" in
  Lean)
    echo "CODE_QUALITY_REVIEW_LIGHT: appetite Lean — lightweight review (lint + security + dead-code)."
    REVIEW_TIER="light"
    ;;
  Core)
    echo "CODE_QUALITY_REVIEW_CONDITIONAL: appetite Core — Thermo-Nuclear only if risk is high."
    REVIEW_TIER="conditional"
    ;;
  Complete)
    echo "CODE_QUALITY_REVIEW_NUCLEAR: appetite Complete — Thermo-Nuclear for software/hybrid code changes."
    REVIEW_TIER="nuclear"
    ;;
  *)
    REVIEW_TIER="light"
    ;;
esac
```

Use `/skill:thermo-nuclear-code-quality-review` only when `REVIEW_TIER` is `nuclear` (or `conditional` AND risk is high). See `references/cli-tools/codequality-review.md` for the full trigger matrix.

When Thermo-Nuclear runs, save or copy the result to:

```text
.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md
```

**Review Mode (orthogonal to appetite):**

- `Auto` / `Product Spec Gate`: run only if required by risk; fix simple issues or document accepted trade-offs.
- `Product Spec + Interface Gates`: escalate P0/P1 findings to the user.
- `Product Spec + Interface + Scopes`: P0/P1 findings require fix or explicit human acceptance.
- `Product Spec + Interface + Tech Review`: P0/P1 findings are blocking for software/hybrid code changes.
- `Product Spec + Interface + Tech Review + Code Diff`: P0/P1 findings are blocking. Code diff gate will re-run after fix.

**Fallback:** if the skill is not installed, run the manual fallback from
`references/cli-tools/codequality-review.md` and document the fallback in the
verification notes.

### final-checklist

- [ ] Unit tests pass
- [ ] Code review done (subagent or human)
- [ ] Code quality gate completed
- [ ] Code quality review completed (lightweight always; Thermo-Nuclear when appetite/risk warrant)
- [ ] No regressions detected
- [ ] UI accessible (if applicable — static a11y baseline always; Live Site when appetite warrants)
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

### invisible-20-percent

For each file changed in the diff, check:

| Dimension | Check |
|-----------|-------|
| **Error handling** | Retry/backoff implemented? Fallback defined? |
| **Observability** | Structured logging? Correlation IDs? |
| **Security** | Auth consistent across all endpoints? Input sanitization? Rate limiting? |
| **Validation** | Null/empty/boundary handling? |
| **Rollback** | Rollback strategy documented? Migration has reversal? |

This exists because LLMs tend to implement the happy path (80%) and omit
the "invisible 20%" (Osmani 2026, GitClear 2025).

### auto-proceed

After all verification steps pass, **automatically proceed to Code Quality Review when required, then Execution Critique**.

> **Note on browser dependency:** The Quick Tier (browserless) in
> `ui-quality` and `interactive-testing` works on ALL CLIs. The Full Tier
> (agent-browser) is pi.dev only per
> [agent_browser.md](references/cli-tools/agent_browser.md). Other CLIs should
> rely on the Quick Tier and note what couldn't be verified for human review.

See the `stelow-product-testing-execution` skill for the full testing protocol reference.
