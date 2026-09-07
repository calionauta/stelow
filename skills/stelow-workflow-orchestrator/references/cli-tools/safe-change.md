# Tool: safe-change

> Regression check before planning (impact analysis, affected files, risks).

---

## Install

Any agent that supports skill installation:

```bash
npx skills add Prinova/pi-agent-codebase-workflows -g
```

The skill installs to `~/.agents/skills/` and the agent picks it up automatically.

---

## Command

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
| Phase 2 (Setup) | Validate impact before planning |

---

## Output

Returns analysis of:
- Files that will be affected
- Possible regressions
- Warnings and risks

---

## Fallback (Not Installed)

If `safe-change` is not available:
- Manually check relevant files with `git diff`
- Run existing tests to verify regressions
- Document manual analysis

**Abstraction:** "Regression check before changes"