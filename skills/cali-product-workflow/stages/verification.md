## Verification

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the testing protocol before delivery audit.

### Appetite Gate (verification depth)

**Before running verification steps, read appetite:**

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
SCOPE_COUNT=$(ls .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/scopes/*.md 2>/dev/null | wc -l | tr -d ' ')
```

| Appetite | test-suite | code-review | ui-quality | interactive-testing | code-quality-gate | invisible-20% |
|----------|-----------|-------------|------------|-------------------|-------------------|---------------|
| `PoC` | ✅ Run | **Skip** | **Skip** | **Skip** | ✅ Run | ✅ Run |
| `Focused` | ✅ Run | **Skip (1-2 files)** | **Skip (no new UI)** | **Skip** | ✅ Run | ✅ Run |
| `Comprehensive` | ✅ Run | ✅ (3+ files) | ✅ Live Site | ✅ Full browser | ✅ Run | ✅ Run |

**Rationale:**
- **PoC code-review skip:** Codebase critique is useless for 1 file. Correctness covered by test-suite + invisible-20%.
- **PoC ui-quality skip:** No new UI, nothing to audit.
- **PoC interactive-testing skip:** 1 component has no complex interaction.

### Auto-chain

Verification runs **automatically after Execution** once all scopes complete.
After Verification passes, automatically proceed to Execution Critique.

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

Check appetite first — for PoC/Focused with few files, code-review is unnecessary:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
DIFF_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')

if [ "$APPETITE" = "PoC" ]; then
  echo "CODE_REVIEW_SKIP: appetite PoC — minimal scope, test-suite + invisible-20% covers."
elif [ "$APPETITE" = "Focused" ] && [ "$DIFF_FILES" -le 2 ]; then
  echo "CODE_REVIEW_SKIP: appetite Focused with $DIFF_FILES file(s) — does not justify structural review."
elif [ "$DIFF_FILES" -ge 3 ]; then
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
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
UI_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -cE '\.(templ|html|tsx|jsx|css)$' || echo "0")
```

| Appetite | UI files | Action |
|----------|---------|--------|
| `PoC` | any | **Skip.** No new UI or minimal scope — lint covers basic a11y. |
| `Focused` | 0 | **Skip.** No UI. |
| `Focused` | 1+ | **Normal.** Delegate to `cali-product-ux-critique`. Codebase mode (browserless). |
| `Comprehensive` | 0 | **Skip.** No UI. |
| `Comprehensive` | 1+ | **Live Site mode.** Full browser audit. |

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
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
```

| Appetite | Action |
|----------|--------|
| `PoC` | **Skip.** 1 component does not justify interactive testing — test-suite covers. |
| `Focused` | **Skip.** Small scope — test-suite + invisible-20% sufficient. |
| `Comprehensive` | **Run.** Full browser if applicable. |

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

### final-checklist

- [ ] Unit tests pass
- [ ] Code review done (subagent or human)
- [ ] No regressions detected
- [ ] UI accessible (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

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

After all verification steps pass, **automatically proceed to Execution Critique**.

> **Note on browser dependency:** The Quick Tier (browserless) in
> `ui-quality` and `interactive-testing` works on ALL CLIs. The Full Tier
> (agent-browser) is pi.dev only per
> [agent_browser.md](references/cli-tools/agent_browser.md). Other CLIs should
> rely on the Quick Tier and note what couldn't be verified for human review.

See the `cali-product-testing-execution` skill for the full testing protocol reference.
