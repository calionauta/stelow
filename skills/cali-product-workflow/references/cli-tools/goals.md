# Tool: Goal System (pi-goal)

> Package: @capyup/pi-goal (capyup)
> Provides: ordered-execution-goal, ordered-discussion-goal, flexible-goal

---

## Command Variants

The goal system offers four modes based on two dimensions:

| Semantic name | Command | Discussion | Preserves order | Best for |
|---------------|---------|-------------|-----------------|----------|
| **ordered-execution-goal** | `/sisyphus-set` | No | ✅ | Post-approval execution, automatic workflow |
| **ordered-discussion-goal** | `/sisyphus` | Yes | ✅ | Discuss before executing, blocked needs clarification |
| **flexible-execution-goal** | `/goals-set` | No | ❌ | Open-ended work without fixed sequence |
| **flexible-discussion-goal** | `/goals` | Yes | ❌ | Vague objectives needing research/grill |

### When to use each

```
After Tech Planning approval:
  → ordered-execution-goal (/sisyphus-set) — no discussion, starts immediately

During execution, blocked:
  → ordered-discussion-goal (/sisyphus) — stop and ask

Exploratory work:
  → flexible-discussion-goal (/goals) or flexible-execution-goal (/goals-set)
```

### How to discover the command

Read this file (`goals.md`) to find the command for each mode.

---

## When to Use

| Phase | Purpose |
|-------|---------|
| Phase 12 (Execution) | Scoped implementation per scope |
| Phase 13 (Delivery Audit) | Verify implementation, gap analysis |
| After Tech Planning | Each scope becomes a goal |

---

## Scope Types

| Type | Description | Executor |
|------|-------------|----------|
| `feature` | New functionality | ordered-execution-goal |
| `optimization` | Measurable metric improvement | autoresearch |
| `spike` | Research/prototype | ordered-execution-goal |
| `test-unit` | Unit tests with mutation validation | ordered-execution-goal + testing gates |
| `test-integration` | Integration tests with real dependencies | ordered-execution-goal + testing gates |
| `test-security` | SAST and security gates | ordered-execution-goal + testing gates |
| `test-behavior` | Behavioral testing for agent workflows | ordered-execution-goal + testing gates |

---

## Pattern for ordered-execution-goal

After Tech Planning approval, use **ordered-execution-goal** (`/sisyphus-set`):

```bash
/sisyphus-set Scope: [scope-name]
  Objective: {from scope description}
  DoD: {from scope}
  Files in scope: {from plan}
  Constraints: tests must pass
```

### DoD Format

```markdown
Done when:
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

### Test Scope Goals (test-* scopes)

```bash
/sisyphus-set Scope: test-unit-[feature-name]
  Objective: Generate unit tests with mutation validation
  DoD: mutation_score >= 70% (critical) or 50% (standard)

/sisyphus-set Scope: test-integration-[feature-name]
  Objective: Integration tests with real dependencies
  DoD: All DB/API boundaries tested, no over-mocking

/sisyphus-set Scope: test-security-[feature-name]
  Objective: Security scanning for critical paths
  DoD: security_findings == 0, CVSS < 7.0
```

---

## Testing Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Mutation Score | < target | 🔴 BLOCK |
| Security | > 0 critical | 🔴 BLOCK |
| Flaky Rate | > 5% | 🟡 WARN |

---

## Fallback (Other Harnesses)

If goal system is not available:
- Use todo tool for progress tracking
- Create checkpoint files for resume
- Mark `[DONE:n]` in responses

**Abstraction:** "Goal with typed scopes and acceptance criteria"

---

## Related

- Stage 12: Execution (see `stages/execution.md`)
- spec-tech scopes
- Testing strategy (see `skills/cali-product-testing-ai-code/SKILL.md`)