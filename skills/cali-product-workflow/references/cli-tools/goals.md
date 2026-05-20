# Tool: /sisyphus, /goal

> Goal tracking with typed scopes and step-by-step execution for PI.

---

## Specific Command (PI)

```bash
/sisyphus [scope-name]
/goal [description]
pause_goal
```

| Info | Value |
|------|-------|
| Package | @capyup/pi-goal (capyup) |
| Commands | /sisyphus, /goal, pause_goal |

---

## When to Use

| Phase | Purpose |
|-------|---------|
| Phase 11 (Execution) | Scoped implementation per scope |
| After Tech Planning | Each scope becomes a goal |

---

## Scope Types

| Type | Description | Executor |
|------|-------------|----------|
| `feature` | New functionality | worker |
| `optimization` | Measurable metric improvement | autoresearch |
| `spike` | Research/prototype | scout + researcher |
| `test-unit` | Unit tests with mutation validation | worker |
| `test-integration` | Integration tests with real dependencies | worker |
| `test-security` | SAST and security gates | worker |
| `test-behavior` | Behavioral testing for agent workflows | worker |

---

## Pattern for Scope Execution

```bash
/sisyphus Scope: [scope-name]
  Step 1: [description with DoD]
    - Criterion A
    - Criterion B
  Step 2: [description]
  ...
```

### DoD Format
```markdown
Done when:
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

---

## Goal Generation (After Tech Planning)

For each scope in approved spec-tech:

```bash
/sisyphus Scope: [scope-name]
  Objective: {from scope description}
  DoD: {from scope}
  Files in scope: {from plan}
  Constraints: tests must pass
```

### Test Scope Goals (test-* scopes)

```bash
/sisyphus Scope: test-unit-[feature-name]
  Objective: Generate unit tests with mutation validation
  DoD: mutation_score >= 70% (critical) or 50% (standard)
  
/sisyphus Scope: test-integration-[feature-name]
  Objective: Integration tests with real dependencies
  DoD: All DB/API boundaries tested, no over-mocking
  
/sisyphus Scope: test-security-[feature-name]
  Objective: Security scanning for critical paths
  DoD: security_findings == 0, CVSS < 7.0
  
/sisyphus Scope: test-mutation-[feature-name]
  Objective: Mutation testing validation
  DoD: Mutation score meets target threshold
```

### Testing Gates

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

- Phase 11: Execution
- spec-tech scopes