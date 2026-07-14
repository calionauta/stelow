# stelow

**Transform product ideas into approved, testable plans — systematically.**

## Project Overview

**Type:** Workflow CLI for product planning (skills + stages).
**Stack:** Node 20+, TypeScript 6.0 strict, npm.

## Architecture

See [architecture.md](architecture.md) for module layout, data flow, and how to extend. Skills live in `skills/*/SKILL.md`; stages defined in `stages.yaml` (single source of truth). Visual review gates: `gate`, `int-gate`, `plan-gate`, `diff-gate` (Plannotator) — conditional by review mode.

### Critical Muxy extension knowledge

**Permission `files:read` is required but NOT in the pinned schema.**
The Muxy files API (`muxy.files.read/write/list`) requires
`files:read` and `files:write` in `manifest.permissions` *per the
official Muxy docs*. However, the pinned manifest schema at
`integrations/muxy/stelow/manifest.schema.json` is
OUTDATED — it was fetched before Muxy added these permissions to
the schema enum. **Do NOT trust the pinned schema as the source
of truth for valid permissions.** The source of truth is:
- https://muxy.app/docs/extensions/files (docs)
- https://muxy.app/docs/extensions/permissions (permissions list)
- Muxy.app runtime validator (what actually accepts/rejects)

The pinned schema is only useful for structural validation
(panel keys, command shapes) — NOT for permission validity.
If a muxy extension suddenly shows "No workflow data" despite
correct workspace, check that `files:read` and `files:write`
are present in package.json muxy.permissions.

### Top-level layout

| Directory | Purpose |
|---|---|
| `skills/` | Stelow skills consumed by pi coding agents (LLM-facing) |
| `extensions/stelow/` | Pi runtime extension (in-process TS) — single extension, all `/sw-*` commands and hooks live here. Workflow root detection (`workflow-root.ts`) is the source of truth across all integrations; mirror functions exist in `integrations/muxy/` and `integrations/herdr/`. |
| `integrations/<host>/<plugin>/` | Plugins for **external hosts** (Muxy, Herdr, etc.) — each host has its own incompatible extension model. Shipped via `package.json#files[]` and synced through `scripts/version-sync.mjs`. |
| `docs/design/` | Design docs, plans, ADR (PT-BR discussion, EN artifacts) |
| `stelow.schema.json` / `stelow.json` | Workflow tracking schema + runtime state |


## Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Begin planning |
| `/sw-status` | Show workflow status |

> **Command aliases:** `/stelow-*` names are registered alongside `/sw-*` for readability. Both prefixes work.

> **Source of Truth:** Stage/skill counts derive from `stages.yaml` and `ls skills/*/SKILL.md | wc -l`. Never update counts here without verifying.

```bash
npm run build            # Compile TypeScript
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:skills      # Skill structure tests
npm run typecheck        # Type check
```

## Testing policy

> **Count is not quality. 1000 trivial tests is worse than 50 focused tests.**
> **Every test must catch a real bug. If you can't name the bug it catches, delete it.**

### Always write tests of these kinds

1. **Mutation-killing tests.** A test that exercises the contract so that mutating the code breaks it. The bug it catches: "I refactored and broke behavior X." If your test passes against a no-op stub of the function, it's worthless.

2. **Edge case tests.** Null, empty, boundary, concurrent, malformed input. These catch the bugs that only manifest in production.

3. **Regression tests for known bugs.** Label them with the bug/issue. If a bug took time to diagnose, write a test that fails when the bug regresses.

4. **Property-based tests.** When the contract is "for any valid input, property P holds" — use fast-check. Catches input combinations your hand-picked cases miss.

5. **Integration tests for real I/O paths.** Anything that touches the filesystem, network, or subprocess must be tested against the real thing — not a mock. Mock the **boundaries** (network ports, time, randomness), not the internals.

### Never write tests of these kinds

1. **Snapshot tests that capture everything.** A snapshot of "whatever the code happens to produce" is a blank check. Snapshots are only useful for stable, intentional outputs (serialized data formats).

2. **Tests that mock the code under test.** If `vi.mock()` mocks the function you're testing, you're testing the mock. Delete the test.

3. **Tests with 0 or 1 assertion that just check "doesn't throw".** `expect(() => fn()).not.toThrow()` proves nothing — it would pass against `function fn() {}`. A test must assert on a specific value.

4. **Tests that duplicate another test's coverage with different inputs.** If test A covers "writes valid JSON" and test B covers "writes valid JSON with extra field", B adds noise, not coverage. Combine or delete.

5. **Tests that depend on `process.env`, global state, or test execution order.** These are flaky. If a test must touch global state, isolate it via temp dirs + `beforeEach` reset, OR delete it.

6. **Tests for behavior that the type system already guarantees.** Don't write `expect(add(1, 2)).toBe(3)` for a function whose return type is `3`. The TS compiler is the test.

### Maintenance rules

- **Run `npx tsx scripts/scan-test-value.ts` before adding a PR with new tests.** If your new test shows up as DELETE or REVIEW, fix it before merging.
- **Any test that fails in parallel CI (but passes in isolation) is broken. Delete or fix immediately.** Flaky tests teach the team to ignore failures.
- **Untracked test files (`git status` shows `??`) are WIP. Commit or delete within the same PR that created them.** Stale untracked tests are a code smell.
- **When deleting a test, state why in the commit message.** The reasoning must be auditable.

### Test value scanner

`scripts/scan-test-value.ts` classifies test files as:

- **DELETE** — likely safe to remove (zero asserts, trivial single-line expects, etc.)
- **REVIEW** — multiple weak signals; needs manual decision (low assert density + no edge cases, untracked + flaky, etc.)
- **OK** — high signal: covers mutations, edges, or real I/O

Run before releases. A test file moving from OK to REVIEW over time signals rot.

## Conventions

- **Commits:** conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Squash merge to main.
- **Files:** `lowercase-kebab-case` (e.g. `spec-product.md`, not `SpecProduct.md`).
- **Stage headings:** must use `slug:major.minor` format — see [docs/agents-md-refs/stage-numbering.md](docs/agents-md-refs/stage-numbering.md) for the gap-based numbering rules.
- **Tool calls in stage files:** never call `ask_user_question`, `subagent`, or `start_supervision` directly. Use the CLI-agnostic reference in `references/cli-tools/{tool}.md` — see [docs/agents-md-refs/tool-reference-pattern.md](docs/agents-md-refs/tool-reference-pattern.md).
- **Product name:** `stelow` (canonical). All runtime paths, skill prefixes, and filesystem artifacts use the `stelow` prefix.

## Versioning

- **Single source:** `package.json` → `npm run version:sync` syncs plugin files.
- **Tag and Release are linked — never create one without the other.** A git tag alone does not create a GitHub Release; the landing page shows only Releases, not tags.
- **Full release workflow (do NOT skip steps):**
  1. `npm version <major.minor.patch> --no-git-tag-version` — bump `package.json`
  2. `npm run version:sync` — sync plugin files
  3. Update `CHANGELOG.md` — add entry with changes
  4. `git add -A && git commit -m "chore: bump to v<version>"`
  5. `git tag -a v$(node -p "require('./package.json').version") -m "v<version>: <summary>"`
  6. `git push origin main --tags`
  7. **`gh release create v$(node -p "require('./package.json').version") --title "v<version>" --notes "<changelog>"`** — required for GitHub landing page visibility
- **Never guess the version** — always read `package.json` first.

## Don'ts

- **Do NOT put ops-only config inside `skills/*/`.** Files consumed by extension/ops
  code (never by the LLM in runtime) go at project root. If a file is read by
  `extensions/`, `scripts/`, or `install.sh` — not by `SKILL.md` — it belongs at
  root, not inside a skill directory. Example: `retired-skills.yaml`.
- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)
- Do NOT add dependencies without asking
- Do NOT put secrets in AGENTS.md
- Do NOT guess version numbers — always read `package.json` first

## External Tools (Optional)

- **cymbal** — codebase navigation for Tech Preview / Feature Recon. Cross-platform install: `brew install 1broseidon/tap/cymbal` (macOS / Linuxbrew), `irm https://raw.githubusercontent.com/1broseidon/cymbal/main/install.ps1 | iex` (Windows PowerShell). Fallback: find/git.
- **ctx7** — live library docs during execution setup. Use: `npx @vedanth/context7`. Fallback: skip.
- **sem** ([Ataraxy-Labs/sem](https://github.com/Ataraxy-Labs/sem)) — entity-level diff for Execution Critique (functions, types, methods instead of raw lines). Cross-platform install: `curl -fsSL https://raw.githubusercontent.com/Ataraxy-Labs/sem/main/install.sh | sh` (macOS / Linux), `winget install AtaraxyLabs.sem` (Windows), `brew install sem-cli` (macOS / Linuxbrew). Fallback: `git diff` — raw line-level only. NOTE: GNU Parallel ships a `sem` binary; if a non-Ataraxy `sem` is found, see https://ataraxy-labs.com/#name-conflict-with-gnu-parallel.

All optional — workflow runs without them. `scripts/setup.sh` auto-detects + offers install (default Y).

## Token Efficiency

See `skills/stelow-product-orchestrator/references/cli-tools/context-efficiency.md` for patterns:
- Batch multi-symbol cymbal lookups (`show X Y Z`)
- Batch agent_browser extractions (`snapshot` + batch `get text`)
- Output truncation with `offset/limit` instead of full `read`
- Cache-friendly SKILL.md layout (stable prefix before `CACHE BOUNDARY`)

## Detailed references

- [docs/agents-md-refs/differentiators.md](docs/agents-md-refs/differentiators.md) — what makes this workflow different; key principles. Read when the user asks "why this approach?" or when designing a new stage.
- [docs/agents-md-refs/source-of-truth.md](docs/agents-md-refs/source-of-truth.md) — skills, extensions, distribution model. Read when adding a skill or discussing packaging.
- [docs/agents-md-refs/workflow-integration.md](docs/agents-md-refs/workflow-integration.md) — how to trigger the workflow, repo/license metadata. Read on first user interaction in a fresh project.
