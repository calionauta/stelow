# Tool: experiment-loop

> Package: pi-autoresearch (earendil-works)
> Provides: experiment-loop

---

## Purpose

Autonomous optimization via metric-driven experiment loops. Replaces manual trial-and-error with automated benchmarking and iteration.

## Semantic Name

**experiment-loop** (see this file)

---

## When to Use

| Scope Type | Executor |
|------------|----------|
| `[TYPE] optimization` | **experiment-loop** |
| Spike with measurable metric | **experiment-loop** |
| `[EXECUTOR] autoresearch` override | **experiment-loop** |

---

## Command Discovery

Read this file (`autoresearch.md`) to find the invocation command.

### Invocation

```bash
/skill:autoresearch-create
```

---

## How It Works

```
1. Setup → define metric + baseline
2. Loop → mutate, measure, compare
3. Exit → target met or max iterations
```

### Metrics Format

```markdown
METRIC {name}={value}
```

Example:
```markdown
METRIC compile_µs=15200
```

---

## Routing

**⚠️ IMPORTANT: experiment-loop NEVER runs in the main agent.**

```
main agent → cali-product-scope-executor → subagent (delegate/worker) → /skill:autoresearch-create
```

The cali-product-scope-executor delegates to a subagent that executes the experiment loop.
Never invoke autoresearch directly in the main agent — this creates infinite loops.

---

## Fallback (Other Harnesses)

If experiment-loop is not available:

- Manual benchmark tracking in a log file
- Iterative improvement with manual metric monitoring
- Use todo tool for progress tracking

**Abstraction:** "Automated metric-driven optimization"

---

## Related

- Scope executor (see `skills/cali-product-scope-executor/SKILL.md`)
- Testing strategy (see `skills/cali-product-testing-ai-code/SKILL.md`)