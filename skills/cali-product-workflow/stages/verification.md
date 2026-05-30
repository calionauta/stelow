## Verification

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

After all scopes are executed, run the full testing protocol before delivery audit.

### Auto-chain

Verification runs **automatically after Execution** once all scopes complete.
After Verification passes, automatically proceed to Delivery Audit.

### 1. Run Test Suite (Phase 1)

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

### 2. Parallel Code Review (Phase 2, if 3+ files)

If the diff touches 3+ files, launch fresh-context reviewers in parallel:

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

### 3. UI Quality (Phase 3, if visual)

If the scope involves a visual interface:

**Accessibility Audit** — use `cali-product-critique` in Site mode:
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- ARIA attributes
- Focus management

**Design Review** — use `cali-product-critique` in Site mode:
- Cognitive load
- Visual hierarchy
- AI slop detection

### 4. Browser Testing (Phase 4, if interactive)

If the feature has interactive elements (forms, clicks, inputs):

Use `agent-browser` and `dogfood` skills:
1. Open the feature in browser
2. Test happy path
3. Test error states
4. Test edge cases (empty states, loading, errors)
5. Capture screenshots for evidence

### 5. Final Checklist

- [ ] Unit tests pass
- [ ] Code review done (subagent or human)
- [ ] No regressions detected
- [ ] UI accessible (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] AGENTS.md updated (if architecture changed)

### 5.5 Invisible 20% Verification

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

### 6. Auto-proceed

After all verification phases pass, **automatically proceed to Delivery Audit**.

See `skills/cali-product-testing-execution/SKILL.md` for the full testing protocol reference.
