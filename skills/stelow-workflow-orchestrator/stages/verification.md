## Verification

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the testing protocol before delivery audit.

### 🛡️ Quality Floor (never breadth-gated)

**Exploration breadth governs scope (how much the product does), never quality (how rigorously the product is verified).** The following gates ALWAYS run regardless of breadth — they are the floor, not the ceiling:

- ✅ **test-suite** — the project's test suite always runs
- ✅ **code-quality-gate** — lint, typecheck, static analysis always run
- ✅ **invisible-20%** — error handling, observability, security, validation, rollback checks always run
- ✅ **static a11y/lint when UI files exist** — syntax-level accessibility checks always run when `.templ`, `.html`, `.tsx`, `.jsx`, or `.css` files changed
- ✅ **Quick Tier interactive-testing** — browserless logic audit (event handlers, state management, API patterns) always runs

Quality controls **depth** (how thoroughly), not **whether** these run:

| Quality | What changes (additive depth) |
|----------|-------------------------------|
| `production` | Parallel code review (multiple reviewers); codebase-mode UX review (browserless, ~80% coverage); + Live-site UX audit (browser, real a11y); + Thermo-Nuclear code quality review; + Full-Tier browser interactive testing |
| `experimental` | Light single-reviewer code review (parallel skipped); static UI audit only. Probes only — never ship as-is. |

**Rationale:** LLMs systematically overestimate implementation time and tend to cut quality out of fear of complexity (Estimation Bias Correction, Shape Up SKILL § Estimation Bias). If verification feels "too expensive", the answer is to cut scope, not to cut quality. The scope ceiling (9) is enforced by `appetite_fit` (shape-up SKILL § shape:20) and the Plan Critique scope-fit checklist, not by skipping quality gates here.

### Quality Gate (verification depth)

**Before running verification steps, read quality (with legacy appetite mapping):**

```bash
QUALITY=$(grep -oP '^quality:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "")
if [ -z "$QUALITY" ]; then
  # Legacy appetite line maps to production for every legacy value.
  QUALITY="production"
fi
SCOPE_COUNT=$(ls .stelow/{YYYY-MM-DD}/{_dir}/plans/scopes/*.md 2>/dev/null | wc -l | tr -d ' ')
```

| Quality | test-suite | code-review | ui-quality | interactive-testing | code-quality-gate | code-quality-review | invisible-20% |
|----------|-----------|-------------|------------|-------------------|-------------------|---------------------|---------------|
| `production` | ✅ Run | ✅ Parallel reviewers + Thermo-Nuclear when applicable | ✅ Live Site mode | ✅ Quick + Full Tier (browser) | ✅ Run | ✅ Mandatory for `Product Spec + Interface + Tech Review` and `Product Spec + Interface + Tech Review + Code Diff` | ✅ Run |
| `experimental` | ✅ Run | ✅ Light (single reviewer) | ✅ Static a11y/lint | ✅ Quick Tier | ✅ Run | ✅ Light (skip Thermo-Nuclear) | ✅ Run |

**Rationale (per row):**
- **Production code-review:** Parallel reviewers + Thermo-Nuclear when risk warrants it. Quality floor + maximum depth.
- **Experimental code-review:** A single fresh-context reviewer runs the standard check. Not skipped — quality floor. Probes only.
- **Production ui-quality:** Live Site mode opens a real browser for contrast, keyboard, screen reader audit; codebase mode adds semantic correctness checks (AccessGuru 2025: ~84% violation score decrease from HTML-source analysis).
- **Experimental ui-quality:** Static a11y/lint catches syntactic WCAG violations (~40%, Deque 2026) without a browser.
- **Production interactive-testing:** Quick + Full Tier when interactive elements exist.
- **Experimental interactive-testing:** Quick Tier is browserless — event handlers, state mgmt, API patterns. Catches `data-on` vs `data-on:` syntax bugs without a browser.
- **Experimental code-quality-review:** The lightweight gate (lint + typecheck) runs. Thermo-Nuclear is skipped unless explicitly requested.
- **Production code-quality-review:** Thermo-Nuclear runs for software/hybrid code changes, mandatory in `Product Spec + Interface + Tech Review` and `Product Spec + Interface + Tech Review + Code Diff`.

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

Run affected tests first: for each changed entity, `sem impact <entity> --tests`
lists the tests that touch it — run those before the full suite so failures
surface fast. When `sem` is absent, run the full suite directly.

**Block until tests pass.** Do not proceed with failing tests.

### Guard red-proof (a passing test proves nothing until it can fail)

A green suite is a claim, not evidence. For every test or guard this
verification adds or changes, prove it can fail **before** counting it:

```bash
# Mutate the behavior the test claims to guard, run it, expect failure.
# Then restore and re-run, expect green. Both directions, every guard.
cp lib/foo.mjs /tmp/foo.bak
sed -i 's/<guarded-behavior>/<inverted>/' lib/foo.mjs
node --test tests/foo.test.mjs   # MUST FAIL
cp /tmp/foo.bak lib/foo.mjs
node --test tests/foo.test.mjs   # MUST PASS
```

Record the mutation and its result in `verification/tests.json`. A guard you
did not see fail is a guard you know nothing about — that is how a card ships
five consecutive cycles where verification finds something every earlier gate
passed.

**Independence:** the agent that wrote the behavior may not be the only author
of the test that guards it. Hand a fresh subagent the requirement plus the
test — *not* the implementation — and ask "would this catch an inverted
behavior?". Self-authored tests resolve far fewer real defects than an
independent pass (TDFlow, EACL 2026). See
`../../stelow-workflow-testing-ai-code/references/test-targets-and-gates.md`.

Tests you cannot make fail are not verification. Say so in the report rather
than counting them green.

### Convergence (stop re-verifying the same thing)

Verification → audit → execution → verification is a loop, and a loop with no
bound reads as diligence forever while the same gaps stay open.

- Each new cycle must name **what changed** since the last one. "Found more
  issues" is not a change.
- After **two consecutive cycles that find a real defect in the same place**,
  stop, record it as a known-open item with an owner, and escalate to the user
  with the specific decision needed. Do not open cycle three.
- A guard that keeps passing while a real defect sits behind it is a finding
  about the guard, not about the code: fix or replace the guard.
- The same rule applies to items deferred as "inherited debt" — a deferral
  names its file and stays open; it does not become a reason to re-verify.

### code-review (quality-aware depth)

Code review is **quality protection** and runs at every setting — quality only changes the depth. The Quality Floor above defines the minimum: one reviewer always runs. Production adds parallelism and rigor.

**Reviewer independence:** prefer a reviewer running a different model family than the worker when the host offers one (provider/model presets, band routing); otherwise fresh context on the same model. Same model + same context never reviews its own output — that is the shallow-review trap, not a review.

```bash
QUALITY=$(grep -oP '^quality:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "production")
# Entity-first sizing: what changed (functions/types) decides review depth,
# not raw file count. sem → git fallback (same convention as the audit skill).
if command -v sem &>/dev/null; then
  DIFF_UNITS=$(sem diff HEAD~1 --format json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('summary',{}).get('total',0))" 2>/dev/null || echo "0")
  DIFF_UNIT="entities"
else
  DIFF_UNITS=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')
  DIFF_UNIT="files"
fi

# Quality Floor: code review always runs at least one reviewer.
# Production adds parallelism and review depth, never skips the floor.
case "$QUALITY" in
  experimental)
    echo "CODE_REVIEW_LIGHT: quality experimental — single fresh-context reviewer, no parallelism."
    REVIEWER_COUNT=1
    ;;
  production)
    if [ "$DIFF_UNITS" -ge 3 ]; then
      echo "CODE_REVIEW_PARALLEL: quality production, $DIFF_UNITS $DIFF_UNIT changed — launching parallel reviewers."
      REVIEWER_COUNT=5
    else
      echo "CODE_REVIEW_LIGHT: quality production, $DIFF_UNITS $DIFF_UNIT — single reviewer with full checklist."
      REVIEWER_COUNT=1
    fi
    ;;
  *)
    echo "CODE_REVIEW_DEFAULT: unknown quality, defaulting to production behavior."
    REVIEWER_COUNT=5
    ;;
esac
```

**Rule:** code review is never skipped. If the change is small (≤2 entities/files), the reviewer still runs the full checklist at production quality. This keeps quality floor while keeping cost proportionate to scope.

If running, launch a fresh-context reviewer.
See `../references/cli-tools/subagents.md` for the delegation pattern — this works
on any harness with native subagent support.
Run **automatically** with fresh context — the fresh session provides
independent review without the degraded context of the original session.
This mitigates the shallow review trap (Ox Security 2025) even with the
same model, because the issue isn't identical models but contaminated context
(Gamage 2026 "Omission Constraints Decay").

**Code-reviewer subagent invocation contract:**

```typescript
// Parallel reviewers at production quality
subagent({
  agent: "reviewer",
  task: `Review diff for {dimension} (correctness | tests | simplicity | architecture).

Quality: ${configQuality}  // production = parallel reviewers, experimental = single reviewer
Diff (sem diff HEAD~1 entity diff when available, else git diff HEAD~1):
${diffOutput}

Read .stelow/{date}/{dir}/plans/spec-product_{v}.md for spec context (frontmatter: quality, review_mode, domains_detected; body: scope, DoD).
Do NOT inherit orchestrator deliberation. Save review to {reviewOutputPath}.`,
  reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md"],
  output: reviewOutputPath,
  context: "fresh"
})
```

The reviewer gets:
- The diff (from task string — it can't be inferred)
- spec-product.md (from `reads` — quality + scope + DoD)
- Fresh context (defeats context rot, mitigates shallow review trap)

The reviewer does NOT need:
- Parent's deliberation history (would inject context rot)
- Acceptance contract (this is review, not execution)

### ui-quality (quality-aware)

Check quality and UI scope before running:

```bash
QUALITY=$(grep -oP '^quality:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "production")
if command -v sem &>/dev/null; then
  UI_FILES=$(sem diff HEAD~1 --format json 2>/dev/null | python3 -c "import json,sys; print(sum(1 for c in json.load(sys.stdin).get('changes',[]) if str(c.get('filePath','')).endswith(('.templ','.html','.tsx','.jsx','.css'))))" 2>/dev/null || echo "0")
else
  UI_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -cE '\.(templ|html|tsx|jsx|css)$' || echo "0")
fi
```

| Quality | UI files | Action |
|----------|---------|--------|
| `experimental` | any | **Static a11y/lint.** No browser/live audit unless upgraded. |
| `production` | 0 | **Skip.** No UI. |
| `production` | 1+ | **Live Site mode.** Full browser audit (codebase mode first, then browser for flagged issues). |

If running, delegate to `stelow-workflow-ux-critique`.

See the `stelow-workflow-ux-critique` skill for full instructions.

**Input routing:**
- **Source code available** → Codebase mode (browserless, ~80% coverage)
- **Live URL available** → Live Site mode (full browser audit)
- **Both available** → Codebase mode first, then Live Site mode for issues flagged `[needs browser]`

**Research basis:** AccessGuru (arXiv 2025) shows LLMs achieve ~84%
violation score decrease analyzing HTML source — no browser needed for
syntactic accessibility violations. Deque (2026) confirms ~40% of WCAG
issues are auto-detectable; LLMs push this further by evaluating semantic
correctness that rule-based tools cannot assess.

### interactive-testing (quality-aware depth)

Interactive testing has two tiers. **Quick Tier (browserless) is the Quality Floor — it always runs.** Quality controls whether Full Tier (browser) runs.

```bash
QUALITY=$(grep -oP '^quality:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "production")
```

| Quality | Quick Tier (browserless) | Full Tier (browser) |
|----------|--------------------------|---------------------|
| `experimental` | ✅ Always runs | **Skip** unless user requests browser testing |
| `production` | ✅ Always runs | ✅ Runs when interactive elements exist |

If the feature has interactive elements (forms, clicks, inputs):

#### Quick Tier — Logic Audit (browserless) — Quality Floor

**Always runs.** Source-code analysis catches ~80% of event-handler and state-management defects without a browser:

- Event handlers: correct targets, proper cleanup (useEffect return)
- State management: optimistic updates, rollback on error
- API call patterns: correct endpoints, error handling, retry?
- **Framework syntax:** event attribute format (e.g. Datastar `data-on:click` vs `data-on-click`), CDN URL resolution, server-rendered HTML contains expected attributes

#### Full Tier — Browser Testing (agent-browser)

**Quality-gated:** runs in production by default when interactive elements exist; in experimental only when explicitly requested.

See `../references/cli-tools/agent_browser.md` for browser automation details.
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

### code-quality-review (quality-aware depth)

The code-quality-review stage has two layers. **A lightweight review (correctness, security baseline, naming, dead code) is the Quality Floor and always runs.** The ultra-strict Thermo-Nuclear review (1000-line files, complexity>5, abstraction quality) runs at production quality.

```bash
QUALITY=$(grep -oP '^quality:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "production")

# Quality Floor: lightweight review always runs (lint + security + dead-code scan).
# Thermo-Nuclear is quality-gated and adds depth, not a floor.
case "$QUALITY" in
  experimental)
    echo "CODE_QUALITY_REVIEW_LIGHT: quality experimental — lightweight review (lint + security + dead-code)."
    REVIEW_TIER="light"
    ;;
  production)
    echo "CODE_QUALITY_REVIEW_NUCLEAR: quality production — Thermo-Nuclear for software/hybrid code changes."
    REVIEW_TIER="nuclear"
    ;;
  *)
    REVIEW_TIER="nuclear"
    ;;
esac
```

Use `/skill:thermo-nuclear-code-quality-review` only when `REVIEW_TIER` is `nuclear` (or `conditional` AND risk is high). See `../references/cli-tools/codequality-review.md` for the full trigger matrix.

When Thermo-Nuclear runs, save or copy the result to:

```text
.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md
```

**Review Mode (orthogonal to quality):**

- `Auto` / `Product Spec Gate`: run only if required by risk; fix simple issues or document accepted trade-offs.
- `Product Spec + Interface Gates`: escalate P0/P1 findings to the user.
- `Product Spec + Interface + Scopes`: P0/P1 findings require fix or explicit human acceptance.
- `Product Spec + Interface + Tech Review`: P0/P1 findings are blocking for software/hybrid code changes.
- `Product Spec + Interface + Tech Review + Code Diff`: P0/P1 findings are blocking. Code diff gate will re-run after fix.

**Fallback:** if the skill is not installed, run the manual fallback from
`../references/cli-tools/codequality-review.md` and document the fallback in the
verification notes.

### final-checklist
- [ ] Unit tests pass
- [ ] Every new/changed guard proved it can fail (mutation + red result recorded)
- [ ] Tests for behavior you wrote have an independent red-team pass
- [ ] Code review done (subagent or human)
- [ ] Code quality gate completed
- [ ] Code quality review completed (lightweight always; Thermo-Nuclear at production quality)
- [ ] No regressions detected
- [ ] UI accessible (if applicable — static a11y baseline always; Live Site at production quality)
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

### Close the loop on checklists

Every `- [ ]` checkbox this workflow generated and verification just
checked — DoD items, acceptance criteria, scope lists, test plans, in ANY
artifact — must be ticked in place with its evidence link:

```md
- [x] Win in a row, column, and diagonal is detected and announced → evidence/velha-test.cjs §2 (32/32)
```

Spec prose stays frozen — only checkbox state plus evidence links change.
An unticked box after a passing verification reads as "not done" to the
next reader; the audit-report mapping alone does not fix the source.
Unverifiable items stay unticked and are called out explicitly instead.

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
> `ui-quality` and `interactive-testing` works on ALL harnesses. The Full Tier
> (agent-browser) needs a browser-capable tool per
> [agent_browser.md](../references/cli-tools/agent_browser.md). Without one, rely
> on the Quick Tier and note what couldn't be verified for human review.

See the `stelow-workflow-testing-execution` skill for the full testing protocol reference.
