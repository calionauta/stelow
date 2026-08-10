# Tool: safe-change

> Regression check before planning using pi-agent-codebase-workflows.

---

## Install

**Pi:**
```bash
pi install git:github.com/PriNova/pi-agent-codebase-workflows
```

**Universal fallback (any agent that supports skill installation):**
```bash
npx skills add Prinova/pi-agent-codebase-workflows -g
```
The `-a <cli>` flag is no longer required — the skill installs to `~/.agents/skills/` and
the agent picks it up automatically. The flagship install path (`pi install git:...`)
remains for Pi users who prefer the registry install.

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