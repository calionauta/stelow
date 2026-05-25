# Testing Strategy

This document describes how tests are structured and what each layer validates.

## Quick Reference

```bash
# Run all tests
npm run test

# Run by layer
npm run test:unit      # Extension TypeScript functions
npm run test:integration  # Workflow lifecycle
npm run test:skills   # Skill documentation structure
npm run test:artifacts # Artifact schema definitions
```

## Test Layers

Tests are organized in layers, from most concrete to most abstract:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer A: Extension (TypeScript)                              │
│  WHAT: Real functions from state.ts                           │
│  TESTS: 23 tests in tests/unit/state-real.test.ts             │
│  VALIDATES: readTracking, writeTracking, renameWorkflow, etc │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer B: SKILL.md Structure (Documentation)                  │
│  WHAT: Main orchestrator has correct structure               │
│  TESTS: 45 tests in tests/skills/skill-structure.test.ts     │
│  VALIDATES: Phase Index, Safety Rules, Tool References       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer C: Skill Implementation (Markdown)                    │
│  WHAT: Each skill has required gates, references, process    │
│  TESTS: 47 tests in tests/skills/skill-implementation.test.ts │
│  VALIDATES: cali-product-shape-up, cali-product-tech-planning, etc           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer E: Artifact Schema (Output)                            │
│  WHAT: Workflow artifacts follow correct schema              │
│  TESTS: 27 tests in tests/artifacts/artifact-schema.test.ts  │
│  VALIDATES: spec-product.md, spec-tech.md, interfaces.md     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer D: LLM Behavior (NOT TESTED)                          │
│  WHY: Non-deterministic, impossible to test deterministically │
│  ALTERNATIVE: Layer B + C catches broken instructions        │
└─────────────────────────────────────────────────────────────┘
```

## Why These Layers?

### What We Test (Deterministic)

| Layer | Why Testable |
|-------|-------------|
| Extension | Pure TypeScript, deterministic functions |
| SKILL.md | Static markdown, patterns can be validated |
| Skill | Static markdown, patterns can be validated |
| Artifact Schema | Static patterns, file structure |

### What We Don't Test (Non-Deterministic)

| Layer | Why Not |
|-------|---------|
| LLM Behavior | Even same input → different outputs |
| LLM Understanding | Meta-testing, circular |
| Subagent Calls | Internal LLM decision |

**Rule:** If the LLM breaks but SKILL.md is correct, we catch it. If SKILL.md is correct but LLM still breaks, that's a model problem — not ours to fix with tests.

## CI & Hooks

### Pre-commit Hook

Before every commit, tests run automatically:

```bash
# .git/hooks/pre-commit
npm run test
```

If tests fail, commit is blocked. Use `--no-verify` only in emergencies.

### GitHub Actions

On every push to `main` and PR:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test
```

## Test Files

```
tests/
├── artifacts/
│   └── artifact-schema.test.ts    # Schema definitions
├── integration/
│   ├── skill-orchestration.test.ts # Skill chains
│   └── workflow-lifecycle.test.ts  # Workflow CRUD
├── skills/
│   ├── skill-implementation.test.ts # Per-skill validation
│   └── skill-structure.test.ts      # SKILL.md structure
└── unit/
    └── state-real.test.ts         # Real state functions
```

## What Each Test File Does

### tests/unit/state-real.test.ts

Imports real functions from `extensions/cali-product-workflow/state.ts` and tests them:

- ✅ `readTracking` / `writeTracking` — JSON persistence
- ✅ `getActiveWorkflow` / `getAllActiveWorkflows` — Filtering
- ✅ `renameWorkflow` — Name changes
- ✅ `archiveWorkflowOnDisk` — Archiving
- ✅ `reconcileTracking` — Disk reconciliation
- ✅ `parseInputForWorkflow` — Input parsing
- ✅ `generateDirHash`, `hashToWorkflowId` — Utilities

### tests/skills/skill-structure.test.ts

Validates `SKILL.md` has:

- Phase Index with 10+ phases
- Safety Rules (`--gate` mandatory, supervisor constraints)
- Tool References (pi-tools/*)
- Auto-chaining rules
- CRITICAL RULES section

### tests/skills/skill-implementation.test.ts

Validates each skill:

- Has tool reference header
- Has process section
- Gate presence (plannotator with `--gate`)
- Output documentation

### tests/artifacts/artifact-schema.test.ts

Defines what artifacts SHOULD look like:

- `spec-product.md`: Problem, Solution, Scope, IN, OUT
- `spec-tech.md`: TYPE, DoD, AC
- `interfaces.md`: 5 proposals + Hybrid
- Approval receipts, index.json

## Adding New Tests

### When to Add Tests

1. **New state function** → Add to `tests/unit/state-real.test.ts`
2. **New skill** → Add to `tests/skills/skill-implementation.test.ts`
3. **New artifact** → Add to `tests/artifacts/artifact-schema.test.ts`
4. **SKILL.md change** → Should already be caught by existing structure tests

### Test Naming

Use descriptive names that explain what is tested:

```typescript
// ❌ Bad
it('test1', () => { ... });

// ✅ Good
it('should archive workflow when user requests archive', () => { ... });
```

### Test Structure

Follow the pattern:

```typescript
describe('functionName', () => {
  it('should do X when Y', () => { ... });
  it('should fail when Z', () => { ... });
});
```

## Future: Golden Dataset

For testing skill behavior with LLM, we plan to create a golden dataset:

```typescript
// tests/golden/product-workflow.ts
export const goldenSet = [
  {
    input: 'Build a snake game',
    expectedPhases: ['Setup', 'Shape', 'Critique', ...],
    expectGate: true,
    expectArtifact: 'spec-product.md',
  },
];
```

This would run after real workflow executions to validate output.

## Future: pi-test-harness

For testing the extension TypeScript in a real PI environment, we plan to integrate `@marcfargas/pi-test-harness`:

```typescript
import { createTestSession, when, calls, says } from '@marcfargas/pi-test-harness';

it('starts workflow and advances to shape phase', async () => {
  const t = await createTestSession({
    extensions: ['./extensions/cali-product-workflow'],
  });

  await t.run(
    when('/skill:cali-product-workflow', [
      calls('write', { path: expect.stringContaining('index.json') }),
      says(expect.stringContaining('Setup')),
    ]),
  );
});
```

This requires the extension to be installed in a real PI environment, so it's future work.

## Anti-Patterns

### Don't Mock What You Test

```typescript
// ❌ Bad - mocks the function being tested
it('should do X', async () => {
  const mock = vi.fn().mockResolvedValue({ ok: true });
  vi.spyOn(state, 'getActiveWorkflow').mockImplementation(mock);
  // Now we're testing the mock, not the real function
});

// ✅ Good - test real code
it('should do X', () => {
  const result = getActiveWorkflow(tempDir);
  expect(result).toBeNull();
});
```

### Don't Test LLM Behavior

LLMs are non-deterministic. Tests that claim to test "LLM understanding" are fake tests.

Instead:
1. Test the documentation structure (Layers B, C)
2. Test the output artifacts (Layer E)
3. If output is wrong, fix the documentation, not the test

## Coverage Goals

Current: **208 tests** covering Layers A, B, C, E

| Layer | Coverage | Priority |
|-------|----------|----------|
| A: Extension | ~80% | Maintain |
| B: SKILL.md | ~85% | Maintain |
| C: Skills | ~70% | Improve if new skills added |
| E: Schema | ~60% | Improve if new artifacts added |
| D: LLM | 0% (impossible) | N/A |

## Troubleshooting

### Tests fail locally but pass in CI

1. Check Node.js version (`node --version` should be ≥20)
2. Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
3. Check for uncommitted changes to test files

### Tests pass in CI but fail locally

1. Update Node.js locally
2. Clear Vitest cache: `npx vitest --clearCache`
3. Check for environment-specific code in tests

### Pre-commit hook fails

You can bypass with `git commit --no-verify`, but this is strongly discouraged. Fix the tests instead.