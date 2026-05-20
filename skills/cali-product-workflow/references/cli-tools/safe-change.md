# Tool: safe-change

> Regression check before planning using pi-agent-codebase-workflows.

---

## Specific Command (PI)

```bash
safe-change
```

| Info | Value |
|------|-------|
| Package | pi-agent-codebase-workflows (PriNova) |
| Command | `safe-change` |

---

## When to Use

| Phase | Purpose |
|-------|---------|
| Phase 1b (Setup) | Validate impact before planning |

---

## Output

Returns analysis of:
- Files that will be affected
- Possible regressions
- Warnings and risks

---

## Fallback (Other Harnesses)

If `safe-change` is not available:
- Manually check relevant files with `git diff`
- Run existing tests to verify regressions
- Document manual analysis

**Abstraction:** "Regression check before changes"