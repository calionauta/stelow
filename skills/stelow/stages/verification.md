## Verification

> **Part of stelow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the testing protocol before delivery audit.

### Appetite Gate (verification depth)

**Before running verification steps, read appetite:**

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
SCOPE_COUNT=$(ls .stelow/{YYYY-MM-DD}/{_dir}/plans/scopes/*.md 2>/dev/null | wc -l | tr -d ' ')
```

| Appetite | test-suite | code-review | ui-quality | interactive-testing | code-quality-gate | code-quality-review | invisible-20% |
|----------|-----------|-------------|------------|-------------------|-------------------|---------------------|---------------|
| `Lean` | ✅ Run | Run when files warrant it | ✅ Static a11y/lint if UI files | **Skip** | ✅ Run | **Skip** unless requested | ✅ Run |
| `Core` | ✅ Run | Run when files warrant it | ✅ Browserless/codebase a11y if UI files | **Skip** | ✅ Run | Conditional by risk | ✅ Run |
| `Complete` | ✅ Run | ✅ Run | ✅ Live Site a11y if UI files | ✅ Run when applicable | ✅ Run | ✅ Run when code changed; mandatory for `All Above + Tech Review` | ✅ Run |

**Rationale:**
- **Lean a11y baseline:** UI changes still get static a11y/lint checks; no browser/live audit unless the user upgrades appetite or mode.
- **Core a11y baseline:** UI changes get browserless/codebase a11y review.
- **Complete a11y baseline:** UI changes get live-site/browser audit when a URL is available.

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

### code-review (appetite-aware)

Check appetite first — code review is quality protection, not an appetite cut. Run it when file count or risk warrants it:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
DIFF_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')

if [ "$APPETITE" = "Lean" ] && [ "$DIFF_FILES" -le 2 ]; then
  echo "CODE_REVIEW_SKIP: appetite Lean with $DIFF_FILES file(s) — low scope, but keep smoke/unit tests and invisible-20%."
elif [ "$APPETITE" = "Core" ] && [ "$DIFF_FILES" -le 2 ]; then
  echo "CODE_REVIEW_SKIP: appetite Core with $DIFF_FILES file(s) — low file count, but keep unit/integration tests and invisible-20%."
elif [ "$APPETITE" = "Complete" ] || [ "$DIFF_FILES" -ge 3 ]; then
  echo "CODE_REVIEW_RUNNING: $DIFF_FILES files changed — launching parallel reviewer."
fi
```

If running, launch a fresh-context reviewer.
See `references/cli-tools/subagents.md` for the `subagent()` pattern — this works
on pi.dev, OpenCode, Claude Code, and Codex (all have native subagent support).
Run **automatically** with `context: "fresh"` — the fresh session provides
independent review without the degraded context of the original session.
This mitigates the shallow review trap (Ox Security 2025) even with the
same model, because the issue isn't identical models but contaminated context
(Gamage 2026 "Omission Constraints Decay").

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
| `Core` | 1+ | **Normal.** Delegate to `cali-product-ux-critique`. Codebase mode (browserless). |
| `Complete` | 0 | **Skip.** No UI. |
| `Complete` | 1+ | **Live Site mode.** Full browser audit. |

If running, delegate to `cali-product-ux-critique`.

See the `cali-product-ux-critique` skill for full instructions.

**Input routing:**
- **Source code available** → Codebase mode (browserless, ~80% coverage)
- **Live URL available** → Live Site mode (full browser audit)
- **Both available** → Codebase mode first, then Live Site mode for issues flagged `[needs browser]`

**Research basis:** AccessGuru (arXiv 2025) shows LLMs achieve ~84%
violation score decrease analyzing HTML source — no browser needed for
syntactic accessibility violations. Deque (2026) confirms ~40% of WCAG
issues are auto-detectable; LLMs push this further by evaluating semantic
correctness that rule-based tools cannot assess.

### interactive-testing (appetite-aware)

Check appetite before interactive testing:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
```

| Appetite | Action |
|----------|--------|
| `Lean` | **Skip interactive/browser testing.** Keep smoke/unit tests + static a11y when UI exists. |
| `Core` | **Skip interactive/browser testing unless a complex flow is in scope.** Keep unit/integration tests. |
| `Complete` | **Run when applicable.** Full browser for complex UI or multi-step flows. |

If the feature has interactive elements (forms, clicks, inputs):

#### Quick Tier — Logic Audit (browserless)

- Event handlers: correct targets, proper cleanup (useEffect return)
- State management: optimistic updates, rollback on error
- API call patterns: correct endpoints, error handling, retry?

#### Full Tier — Browser Testing (agent-browser)

**Run if:** the interaction involves complex UI state (modals, drag-and-drop,
multi-step forms) or the Quick Tier found issues that need live verification.

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

### code-quality-review (conditional ultra-strict gate)

`thermo-nuclear-code-quality-review` is an optional ultra-strict maintainability
review for implemented code. It runs **after `code-quality-gate` and only when
the appetite/mode/risk matrix says it should run**.

```bash
# Check whether the external skill is installed before invoking it.
# If missing, use the fallback documented in references/cli-tools/codequality-review.md.
```

Use `/skill:thermo-nuclear-code-quality-review` only when the trigger conditions
from `references/cli-tools/codequality-review.md` are met.

Save or copy the result to:

```text
.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md
```

**Review Mode behavior:**

- `Auto` / `Only Product Spec`: run only if required by risk; fix simple issues or document accepted trade-offs.
- `Product Spec + Interface Choice`: escalate P0/P1 findings to the user.
- `All Above + Scopes In/Out`: P0/P1 findings require fix or explicit human acceptance.
- `All Above + Tech Review`: P0/P1 findings are blocking for software/hybrid code changes.

**Fallback:** if the skill is not installed, run the manual fallback from
`references/cli-tools/codequality-review.md` and document the fallback in the
verification notes.

### final-checklist

- [ ] Unit tests pass
- [ ] Code review done (subagent or human)
- [ ] Code quality gate completed
- [ ] Code quality review completed or explicitly skipped
- [ ] No regressions detected
- [ ] UI accessible (if applicable)
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

See the `cali-product-testing-execution` skill for the full testing protocol reference.
