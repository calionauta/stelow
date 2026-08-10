# stelow

**Transform product ideas into approved, testable plans — systematically.**

## Project Overview

**Type:** Host-agnostic product workflow library (skills + stages + adapters).
**Stack:** Node 20+, TypeScript 6.0 strict, npm.
**Hosts:** Pi (native extension), Fusion (compiled plugin at
`plugins/fusion-plugin-stelow/`), and generic agentskills-compatible agents.

## Architecture

See [architecture.md](architecture.md) for module layout, data flow, and how to extend. Skills live in `skills/*/SKILL.md`; stages are defined in
`skills/stelow-product-orchestrator/stages.yaml` (single source of truth). The
phases in `extensions/stelow/types.ts#PHASE_NAMES` are the canonical
17-stage state machine. Visual review gates (`gate`, `int-gate`, `plan-gate`,
`diff-gate`) are conditional by review mode — see `stages.yaml`.

### Top-level layout

| Directory | Purpose |
|---|---|
| `skills/` | Stelow skills consumed by coding agents (LLM-facing content). |
| `extensions/stelow/` | Host-agnostic core: state, schema, locking, phases, command registry, adapter contract. |
| `extensions/stelow/adapters/pi/` | Pi-only hooks, native `/sw-*` commands, TUI, Plannotator. |
| `extensions/stelow/adapters/fusion.ts` | Fusion tool mapping, generated command/workflow/settings resources. |
| `extensions/stelow/adapters/generic.ts` | Portable no-op fallbacks for non-Pi, non-Fusion agents. |
| `plugins/fusion-plugin-stelow/` | Compiled Fusion package: 25 plugin-local skills, validated settings/workflow IR, full-runtime project artifact installation, one managed project-scoped workflow, dependency-free `dist/index.js`. |
| `docs/design/` | Design docs, plans, ADR (PT-BR discussion, EN artifacts). |
| `stelow.schema.json` / `stelow.json` | Workflow tracking schema + per-project runtime state. |


## Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Begin planning |
| `/sw-status` | Show workflow status |

> **Command aliases:** `/stelow-*` names are registered alongside `/sw-*` for readability. Both prefixes work.

> **Source of Truth (do not guess):** Stage/skill/command counts and exposure derive from the canonical sources below, not from this file. The shared
> documentation regression test in `tests/integration/documentation-contract.test.ts` asserts these counts and pins them to the source files.
>
> - **Skills (25)**: `find skills -maxdepth 2 -name SKILL.md -path '*/stelow-product-*' | wc -l` (canonical product-orchestrator + 24 sub-skills).
> - **Phases (17)**: `extensions/stelow/types.ts#PHASE_NAMES` (the `Triage`..`Audit` array).
> - **Stage transitions and conditional gates**: `skills/stelow-product-orchestrator/stages.yaml`.
> - **Commands (16)**: `extensions/stelow/adapters/commands/dispatcher.ts#WORKFLOW_COMMANDS` (host-agnostic; v0.57.0 removed `sw-inbox`/`sw-pulse`).
> - **Fusion commands (16)**: `WORKFLOW_COMMANDS.length` (v0.57.0 — no `piOnly` descriptors remain in the host-agnostic registry).
> - **Pi commands (17)**: host-agnostic 16 + 1 Pi-local (`sw-unlock`, registered in `extensions/stelow/adapters/pi/commands.ts#PI_LOCAL_COMMANDS`).

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

### Rigor quality gate

`npm run test:rigor` runs [rigor](https://github.com/enriquesanchez-elastic/rigor), a Rust-based static analyzer that scores test files 0–100 across 6 categories: Assertion Quality, Error Coverage, Boundary Conditions, Test Isolation, Input Variety, AI Smells.

**Score → Grade scale:**

| Grade | Score | Action |
|-------|-------|--------|
| A | 90–100 | Excellent — keep as reference |
| B | 80–89 | Good — solid baseline for new tests |
| C | 70–79 | Fair — improvable; fix when touching the file |
| D | 60–69 | Poor — flagged; CI warns |
| F | 0–59 | Failing — must delete or rewrite |

**Thresholds:**

- **CI gate**: 60 (anything below fails the build)
- **Local pre-push** (`.husky/pre-push`): 60 (same)
- **Release target**: all test files should be B+ (80+)

**Practical reality check:** A-grade (90+) is rare in practice. Most well-written tests will be B (80–89). B is the realistic "good" target. C is acceptable for low-stakes coverage. Anything below C is façade.

**Why A-grade is hard:** Rigor caps each of 6 categories at 25 points. To hit 90+, you need to cover: every throw site (Error Coverage), numeric boundaries (Boundary Conditions), diverse inputs (Input Variety), AND no weak assertions. For general-purpose utility modules (like `state.ts`), this is structurally hard because not every function throws or has numeric boundaries. **Aim for B+, accept C for utility modules, demand A only for security/correctness-critical code.**

**Reference A-grade patterns (canonical examples):**

- `tests/integration/pi-sandbox-install.test.ts` (B: 81) — covers real I/O, no mocks, multiple modules
- `tests/integration/sw-status-json.test.ts` (B: 84) — strong assertions (`toEqual` on full objects), edge cases
- `tests/integration/concurrency.test.ts` (B: 80) — property-style parallel writes with assertions on final state

**Anti-patterns to avoid (these drag scores down to F/D):**

- `expect(result).toBeNull()` / `.toBeUndefined()` / `.toBeDefined()` — weak; replaces with `expect(result).toEqual({...specific shape...})`
- Tests where the only assert is `not.toBeNull()` followed by `find()` without asserting on the found value
- Mock declared with `vi.fn()` but never verified with `toHaveBeenCalledWith(...)`
- Single-assertion tests that just check "doesn't throw"
- Tests that don't reset state in `beforeEach`

## Conventions

- **Commits:** conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Squash merge to main.
- **Files:** `lowercase-kebab-case` (e.g. `spec-product.md`, not `SpecProduct.md`).
- **Stage headings:** must use `slug:major.minor` format — see [docs/agents-md-refs/stage-numbering.md](docs/agents-md-refs/stage-numbering.md) for the gap-based numbering rules.
- **Tool calls in stage files:** never call `ask_user_question`, `subagent`, or `start_supervision` directly. Use the CLI-agnostic reference in `references/cli-tools/{tool}.md` — see [docs/agents-md-refs/tool-reference-pattern.md](docs/agents-md-refs/tool-reference-pattern.md).
- **Product name:** `stelow` (canonical). All runtime paths, skill prefixes, and filesystem artifacts use the `stelow` prefix.

## Versioning

- **Single source:** `package.json` → `npm run version:sync` syncs plugin files.
- **Distribution:** Stelow ships **via Git/GitHub only** — there is no
  `npm publish` step. Release agents must not run `npm publish`.
- **Tag and Release are linked — never create one without the other.** A git tag alone does not create a GitHub Release; the landing page shows only Releases, not tags.

### Commit-message trailer contract

Any commit that edits `package.json#version` **must** carry exactly one of the
following two trailers:

- `Release-Bump: v<X.Y.Z>` — a legitimate forward version bump. Regex: `^Release-Bump: v[0-9]+\.[0-9]+\.[0-9]+$`.
- `Rollback: v<X.Y.Z> → v<A.B.C> — <reason>` — a deliberate rollback. Regex:
  `^Rollback: v[0-9]+\.[0-9]+\.[0-9]+ → v[0-9]+\.[0-9]+\.[0-9]+ — [^[:space:]].*`.
  The `— <reason>` segment is **mandatory**: a `Rollback:` trailer without a
  non-empty reason is rejected by the guard.

The contract exists because SW-028 (`27188f7`) deliberately rolled the
`package.json#version` field back from `v0.55.2` to `v0.55.1` without any
declared intent in the commit message, and the drift was only caught by
manual `git show` inspection long after merge. See the post-mortem at
`docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md` §"Proposed guard"
for the full rationale.

Enforcement:

- `scripts/check-version-coherence.sh` is the canonical implementation. It
  runs in two modes:
  - `--mode=ci` (default) — invoked from `.github/workflows/version-coherence.yml`;
    fails the PR with a `::error::` annotation when `package.json#version`
    diverges from the latest annotated tag on `origin/main` and the HEAD
    commit body lacks one of the trailers above.
  - `--hook=commit-msg <msg-file>` — invoked from `.husky/commit-msg`; rejects
    any local commit whose staged `package.json` change lacks one of the
    trailers above. (Bypass with `git commit --no-verify`.)
- Annotated-tag-only tag resolution (`git for-each-ref` + `cat-file -t` filter).
  Lightweight tags and `v<X.Y.Z>-rc.N` pre-release tags are ignored.
- See `.changeset/sw-034-version-coherence-guard.md` for the canonical
  frontmatter template that future release notes use to compose the v0.55.3+
  changelog with the trailer contract documented.

### Full release workflow (do NOT skip steps)
  1. `npm version <major.minor.patch> --no-git-tag-version` — bump `package.json`
  2. `npm run version:sync` — sync plugin files (`manifest.json`, plugin `package.json`)
  3. **`npm run prepare:fusion-plugin && npm run build:fusion-plugin`** — re-bake `plugins/fusion-plugin-stelow/src/skills.ts#STELOW_PLUGIN_VERSION` and the compiled `artifacts/settings.json` from `manifest.json#version`. SW-008 shipped v0.55.0 with stale `0.54.3` baked into these files because this step was skipped on the release commit; SW-010 v0.55.1 fixed it as a side-effect. **Do not skip.**
  4. Update `CHANGELOG.md` — add entry with changes
  5. Verify the six-point version agreement: `package.json`, `package-lock.json`, `manifest.json`, plugin `package.json`, `STELOW_PLUGIN_VERSION` in `src/skills.ts` and `dist/skills.d.ts`. **All six must equal the new version.**
  6. `git add -A && git commit -m "chore: bump to v<version>" -m "Release-Bump: v<version>"`
  7. `git tag -a v$(node -p "require('./package.json').version") -m "v<version>: <summary>"`
  8. `git push origin main --tags`
  9. **`gh release create v$(node -p "require('./package.json').version") --title "v<version>" --notes-file <changelog-section>`** — required for GitHub landing page visibility
- **Build-artifact drift guard (CI runtime check).** After `npm run build`,
  `scripts/check-dist-skills-drift.sh` runs as a step in the CI `test` job and
  asserts the compiled `plugins/fusion-plugin-stelow/dist/skills.d.ts#STELOW_PLUGIN_VERSION`
  matches `manifest.json#version`. The guard catches the SW-008 historical-miss
  pattern (v0.55.0 shipped with `STELOW_PLUGIN_VERSION="0.54.3"` baked into the
  dist because the release commit skipped step 3 above). See
  `docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md` §"Secondary guard".
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
