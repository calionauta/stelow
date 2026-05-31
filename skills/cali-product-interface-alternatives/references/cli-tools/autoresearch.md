# Tool: Optimization Goal (formerly experiment-loop)

> **DEPRECATED:** `pi-autoresearch` / experiment-loop is superseded by **Optimization Goals**
> via `subagent() + acceptance` with benchmark `verify` commands.
>
> See `goals.md` → **Optimization Goals** section for the updated pattern.

---

## Why the change

pi-subagents `subagent()` tool supports acceptance-based goals natively.
Optimization scopes are now goals with benchmark verify commands —
no separate extension needed.

**Before (autoresearch/experiment-loop):**

```bash
/skill:autoresearch-create
```

**After (goal with acceptance):**

```typescript
subagent({
  agent: "worker",
  task: "Optimize function F for speed. Baseline: 200µs",
  acceptance: {
    criteria: [{ id: "OPT-1", must: "Performance improves measurably", severity: "required" }],
    verify: [{ id: "benchmark", command: "go test -bench=. ./pkg/" }]
  }
})
```

See `goals.md` → **Optimization Goals** section for detailed patterns,
iteration loop examples, and self-contained optimizer agent setup.

---

## When to Use (Legacy Reference)

| Scope Type | Legacy Executor | Current Executor |
|------------|----------------|------------------|
| `[TYPE] optimization` | experiment-loop | subagent + acceptance (benchmark verify) |
| Spike with measurable metric | experiment-loop | subagent + acceptance (benchmark verify) |

---

## Fallback (Other Harnesses)

If neither subagent acceptance nor a goal system is available:
- Manual benchmark tracking in a log file
- Iterative improvement with manual metric monitoring
- Use todo tool for progress tracking

**Abstraction:** "Automated metric-driven optimization"

---

## Related

- Goals system (see `goals.md`)
- Scope executor (see `skills/cali-product-scope-executor/SKILL.md`)
- Testing strategy (see `skills/cali-product-testing-ai-code/SKILL.md`)
