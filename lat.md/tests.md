# Tests

Test structure and specifications for cali-product-workflow. Test files live in `tests/` and use vitest as the runner.

## Unit Tests

Located in `tests/unit/`. Run with `npm run test:unit`.

### Key test areas

Key unit test files and their focus areas.

- `tests/unit/state-real.test.ts` — Real file I/O tests for state management (creating workflows, reading tracking, updating phases)
- `tests/unit/scan-workflow-dirs.test.ts` — Workflow directory scanning and auto-discovery

## Integration Tests

Located in `tests/integration/`. Run with `npm run test:integration`.

### Key test areas

Key integration test files and their focus areas.

- `tests/integration/workflow-lifecycle.test.ts` — Full workflow lifecycle: creation through phases
- `tests/integration/skill-orchestration.test.ts` — Skill orchestration across multiple stages
- `tests/integration/adapters.test.ts` — CLI adapter initialization and capability detection

## Skill Tests

Located in `tests/skills/`. Run with `npm run test:skills`.

### Key test areas

Key skill test files and their focus areas.

- Structure validation for all skill SKILL.md files
- Consistency checks for references and dependencies

## Phase Consistency Tests

Located in `tests/phase-consistency.test.ts`. Validates that stage files are consistent with `stages.yaml` definitions.

## Appetite Consistency Tests

Located in `tests/appetite-consistency.test.ts`. Validates appetite rules are correctly applied across shaped proposals.

## CI Test Suite

Run with `npm run test:ci`. Runs all test categories in sequence.

## Mutation Testing

Run with `npm run mutate` or `npx stryker run`. Uses the Stryker Mutator framework with vitest runner.

## Test Commands

Quick reference for all npm test commands.

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:skills` | Skill structure tests |
| `npm run test:ci` | CI test suite |
| `npm run test:coverage` | Test coverage report |
| `npm run mutate` | Mutation testing |
