# Tool: safe-change

> Regression check before planning using pi-agent-codebase-workflows.

---

## Install

**Pi:**
```bash
pi install git:github.com/PriNova/pi-agent-codebase-workflows
```

**Other CLIs (OpenCode, Claude Code, Codex):**
```bash
npx skills add Prinova/pi-agent-codebase-workflows -a <cli> -g
# Example: npx skills add Prinova/pi-agent-codebase-workflows -a opencode -g
```

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