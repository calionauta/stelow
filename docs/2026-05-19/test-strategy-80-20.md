# Test Strategy — 80/20 Coverage

> Focus integration tests on highest-value workflows.

---

## Test Philosophy

**80/20 Rule:** 80% of bugs come from 20% of the code paths.

**Focus Areas:**
1. Phase transitions (workflow state changes)
2. Skill orchestration (calls between skills)
3. Gate flow (Plannotator approval)
4. File artifact creation (specs, interfaces, plans)

**Excluded (low ROI):**
- Markdown formatting (content correctness)
- User-facing ask patterns (UI tested manually)
- Individual domain skills (tested separately)

---

## Test Suite Structure

```
tests/
├── unit/
│   ├── state.test.ts        # Tracking state management
│   ├── phases.test.ts       # Phase name/index utilities
│   └── artifacts.test.ts    # Artifact path generation
├── integration/
│   ├── workflow-lifecycle.test.ts  # Start → Complete flow
│   ├── phase-transitions.test.ts  # Phase advancement
│   ├── skill-orchestration.test.ts # Skill calls
│   └── gate-flow.test.ts          # Plannotator gate
└── fixtures/
    ├── spec-product-v1.md
    ├── interfaces-v1.md
    └── spec-tech-v1.md
```

---

## Critical Test Cases (80/20)

### Unit Tests (fast, isolated)

| Test | Why | Expected |
|------|-----|----------|
| `state:createWorkflow` | Core state management | Workflow in tracking.json |
| `state:renameWorkflow` | Rename feature | name + _dir updated |
| `state:archiveWorkflow` | Archive feature | status = archived |
| `phases:nextPhase` | Phase advancement | currentPhase + 1 |
| `artifacts:pathGeneration` | File path construction | Correct spec/interfaces/plans paths |

### Integration Tests (end-to-end)

| Test | Flow | Key Assertion |
|------|------|---------------|
| `workflow:start` | `/pw:start` → workflow created | index.json exists |
| `workflow:rename` | `/pw:rename` → name changes | Workflow.name updated |
| `phase:advance` | `/pw:next` → phase 1→2 | currentPhase = 2 |
| `gate:approval` | spec-product.md → stamp approved | approved: true |
| `skill:cali-shape-up` | Invoke → spec created | spec-product_v1.md exists |

---

## Mock Strategy

**Avoid real dependencies:**
- Mock `ExtensionAPI` for unit tests
- Mock filesystem with temp dirs
- Mock `subagent` for skill orchestration tests

**Integration tests can use real filesystem** (isolated temp dir).

---

## Running Tests

```bash
# All tests
pnpm test

# Unit only (fast)
pnpm test:unit

# Integration only
pnpm test:integration

# Single file
pnpm test:unit state.test.ts
```

---

## Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| State management | 90% | Critical for cross-session |
| Phase transitions | 95% | Core workflow mechanic |
| Skill orchestration | 70% | Complex, manual check ok |
| Gate flow | 80% | Plannotator is external |

**Overall target: 85% coverage on unit + integration**

---

## CI/CD

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:integration
```

---

## Fixtures

Create reusable test fixtures:

```
tests/fixtures/
├── workflows/
│   ├── minimal/           # Just started
│   ├── mid-progress/      # Phase 5
│   └── completed/          # All phases done
├── specs/
│   ├── unapproved.md
│   └── approved.md
└── configs/
    └── tracking.json
```

---

## Smoke Test (pre-commit)

```bash
# Quick sanity check (< 30s)
pnpm test:smoke

# Runs:
# 1. state:createWorkflow
# 2. state:renameWorkflow
# 3. phases:nextPhase
# 4. artifacts:pathGeneration
```

---

## Maintenance

- Add test for every bug found
- Review coverage quarterly
- Remove stale fixtures
- Update mocks when dependencies change