# Development Guidelines

## Project Overview

`pi-product-workflow` is a pi.dev extension package that provides product planning workflows using Shape Up methodology. It bundles 13 specialized skills for product planning, strategy, and execution.

## Quick Start

```bash
# Install locally
pi install ./pi-product-workflow

# Or from npm (when published)
pi install npm:@renatocaliari/pi-product-workflow
```

## Development

### Testing Changes

**Before committing ANY code change:**

```bash
# Run all tests
npm run test

# Or use pre-commit hook (auto-runs on git commit)
```

**Test Layers:**

| Layer | Command | What It Tests |
|-------|---------|---------------|
| Unit | `npm run test:unit` | State functions (TypeScript) |
| Integration | `npm run test:integration` | Workflow lifecycle |
| Skills | `npm run test:skills` | SKILL.md structure |
| Artifacts | `npm run test:artifacts` | Artifact schemas |
| Golden | `npm run test -- tests/golden` | Golden dataset validation |

**CI Testing:**

```bash
# For CI with JUnit output and coverage
npm run test:ci
# Outputs:
#   test-results/junit.xml     (65KB, JUnit XML)
#   test-results/coverage/      (HTML reports)
```

**If tests fail:**
1. Fix the failing tests or code
2. Do NOT use `--no-verify` unless absolutely necessary
3. Re-run `npm run test` until all pass

### Skill Development

Skills are in `skills/` directory. Each skill has:
- `SKILL.md` - The skill definition with triggers and prompts
- `references/` - Optional reference files coupled to the skill

**Skill structure rules:**
- All text in English (no Portuguese)
- Tool references in `references/pi-tools/`
- Gates must use `--gate` flag (never skip)
- Phase sequence must be documented

### Extension Development

Extensions are in `extensions/` directory. See [pi.dev docs](https://pi.dev/docs/extensions) for API details.

**Extension rules:**
- All public functions must be tested in `tests/unit/state-real.test.ts`
- Type definitions in `types.ts`
- State management in `state.ts`
- Commands in `commands.ts`
- UI in `ui.ts`

## Related Extensions

This package integrates with:
- `pi-subagents` (nicobailon) - Subagent orchestration
- `pi-goal` (capyup) - Goal management
- `plannotator` (backnotprop) - Plan review
- `pi-autoresearch` (davebcn87) - Experiment loops
- `pi-intercom` (nicobailon) - Session messaging
- `pi-supervisor` (tintinweb) - Chat steering
- `ask-user-question` (juicesharp) - Structured questions

## Publishing

```bash
# Version bump
npm version patch  # or minor, major

# Publish
npm publish --access public

# Or use release-please for automated releases
```

## Architecture

```
pi-product-workflow/
├── skills/
│   ├── workflow/                    # 1 orchestrator
│   │   └── cali-product-workflow/
│   ├── strategic-analysis/          # 5 exploration skills (Phase 2a)
│   │   ├── cali-product-job-to-be-done/
│   │   ├── cali-product-evolutionary-principles/
│   │   ├── cali-product-opportunity-mapping/
│   │   ├── cali-product-multi-method-market-analysis/
│   │   └── cali-product-short-cycle/
│   ├── domain-libraries/            # 8 tactical playbooks (Phase 2b)
│   │   ├── cali-product-ads/
│   │   ├── cali-product-business-models/
│   │   ├── cali-product-health/
│   │   ├── cali-product-marketplace-playbook/
│   │   ├── cali-product-open-source/
│   │   ├── cali-product-pricing/
│   │   ├── cali-product-promotions/
│   │   └── cali-product-trust-building/
│   └── execution/                   # 1 autonomous executor
│       └── cali-product-scope-executor/
├── extensions/
│   └── cali-product-workflow/
└── scripts/
```

## Test Coverage

Current coverage (2026-05-19):
- **293 passing tests** (7 skipped for future pi-test-harness)
- **16.41% line coverage** on extension code
- Coverage focused on state.ts (74.55%)

**Note:** Extension coverage is low because most code is UI/event handlers that require a real PI session. For full extension testing, see `tests/integration/pi-harness.example.ts` (requires PI environment).

## Commands

- `/skill:cali-product-workflow` - Main workflow
- `/skill:cali-product-short-cycle` - Short cycle validation
- `/skill:cali-product-opportunity-mapping` - Opportunity analysis
- etc.

## License

MIT - See LICENSE file