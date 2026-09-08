# Tool: safe-change

> Pre-execution impact check: what breaks if this plan touches the codebase?
> No third-party package — this is a code-map query plus `git status`.

---

## Check

Before tech planning generates scopes, answer three questions with the
code-map ladder (see `code-map.md`):

1. **What exists?** Orient on the touched area (entry points, modules).
2. **Who connects?** References/callers of the modules in scope.
3. **What breaks?** Blast radius of the planned change.

Plus `git status` for uncommitted work that changes the baseline.

---

## Command

No install. This is a procedure, not a package:

```bash
# 1. Orient (see code-map.md for the ladder)
# 2. git baseline
git status --short
```

| Info | Value |
|------|-------|
| Command | (procedure — no binary) |

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

## Fallback (no code-map CLI available)

If no code-map tool is installed:
- Manually check relevant files with `git diff`
- Run existing tests to verify regressions
- Document manual analysis

**Abstraction:** "Regression check before changes"
