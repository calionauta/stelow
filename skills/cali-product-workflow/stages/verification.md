## Verification

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the full testing protocol before delivery audit.

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

### code-review (if 3+ files)

If the diff touches 3+ files, launch fresh-context reviewers in parallel.
See `references/cli-tools/subagents.md` for the `subagent()` pattern — this works
on pi.dev, OpenCode, Claude Code, and Codex (all have native subagent support).

**Actively offer** cross-model review after the parallel review using the
[`structured-question`](references/cli-tools/structured-question.md) pattern:

```typescript
ask_user_question({
  questions: [{
    question: `The code review is done. Want to run a cross-model review?

Mitigates the shallow review trap — a different CLI/agent reviews the same
code, catching what this model missed. Requires another CLI installed
(opencode, claude, codex).

See references/cli-tools/cross-model-review.md for commands.`,
    header: "Cross-review",
    options: [
      {
        label: "Yes — run cross-model review (Recommended)",
        description: "Invokes another CLI agent for an independent pass. Catches blind spots."
      },
      {
        label: "No — skip this time",
        description: "Only parallel subagent review. OK for low-risk changes."
      }
    ]
  }]
})
```

See `references/cli-tools/cross-model-review.md` for details on invoking a different
CLI/agent (pi.dev, opencode, claude-code, codex) for an independent pass.

```typescript
subagent({
  tasks: [
    {
      agent: "reviewer",
      task: "Review this diff for correctness, regressions, and edge cases. Focus on: logic errors, missing error handling, security issues, performance regressions.",
      output: false
    },
    {
      agent: "reviewer",
      task: "Review this diff for simplicity and code quality. Focus on: unnecessary complexity, dead code, naming clarity, adherence to project conventions.",
      output: false
    }
  ],
  concurrency: 2,
  context: "fresh"
})
```

### ui-quality (if visual)

If the scope involves a visual interface, use a **two-tier approach**.
The Quick Tier (browserless) catches ~80% of issues from source code alone.
The Full Tier (agent-browser) catches the remaining ~20% that require a
live browser.

See `references/cli-tools/agent_browser.md` for browser automation details.

#### Quick Tier — Source Code Analysis (browserless, ~80% coverage)

Analyze the component source code and styles directly. This catches most
accessibility and design issues without the cost of a live browser:

```typescript
subagent({
  agent: "reviewer",
  task: `Review these components for UI quality from source code:

**Accessibility (from source):**
- ARIA attributes on interactive elements
- Semantic HTML (nav, main, button vs div)
- alt text on images
- Form labels and error associations
- Keyboard event handlers (onKeyDown, onKeyPress)
- Focus management (tabIndex, focus() calls)
- Color contrast via CSS variables / design tokens (compute from source)
- Heading hierarchy (h1→h6 structure)

**Design (from source):**
- Cognitive load: too many choices, unclear labels?
- Visual hierarchy: clear primary/secondary/tertiary?
- AI slop detection: generic text, icon-only buttons without labels?

Report what you CAN verify from source, and flag what needs a live browser.`,
  context: "fresh"
})
```

**Research basis:** AccessGuru (arXiv 2025) shows LLMs achieve ~84%
violation score decrease analyzing HTML source — no browser needed for
syntactic accessibility violations. Deque (2026) confirms ~40% of WCAG
issues are auto-detectable; LLMs push this further by evaluating semantic
correctness (e.g., "is this alt text meaningful?") that rule-based tools
cannot assess.

#### Full Tier — Browser Verification (agent-browser, remaining ~20%)

**Only run if:**
1. Quick Tier flagged issues that need a live browser to confirm
2. The feature has complex CSS (animations, transitions, responsive)
3. Screen reader behavior needs verification
4. Visual regression is a concern

Use `agent_browser` per `references/cli-tools/agent_browser.md`:
- Open the component/feature in the browser
- Snapshot interactive elements
- Verify color contrast (rendered, not computed)
- Check hover/focus/active states
- Test keyboard navigation end-to-end
- Test with viewport resizing

Take screenshots for evidence. Compare against the Quick Tier findings.

### interactive-testing (if interactive)

If the feature has interactive elements (forms, clicks, inputs):

#### Quick Tier — Logic Audit (browserless)

Review the interaction logic from source code:
- Form validation: required fields, input types, error messages
- Loading/error/empty states: are all states rendered?
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

See `skills/cali-product-testing-execution/SKILL.md` for the full testing protocol reference.
