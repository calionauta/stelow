# stelow

**Transform product ideas into approved, testable plans — systematically.**

## Project Overview

**Type:** Skills-only, host-agnostic product workflow library. The product is
25 portable agentskills-compatible skills (`skills/stelow-product-*` + `skills/stelow-workflow-*`) plus a
zero-dependency shell helper (`scripts/stelow`). There is **no extension code,
no compiled plugin, and no per-host adapter** in the repo.
**Stack:** bash + python3 (runtime), Node 20+, TypeScript strict (tooling/tests).
**Hosts:** any agent that reads `~/.agents/skills/<name>/SKILL.md` (the
agentskills.io standard) — pi.dev, Fusion, Multica, Claude Code, Codex, Cursor,
Continue, OpenCode, …

## Architecture

See [architecture.md](architecture.md) for module layout, data flow, and how to
extend. The 17-stage state machine is defined in
`skills/stelow-workflow-orchestrator/stages.yaml` (single source of truth);
`skills/stelow-workflow-orchestrator/references/transitions.md` is the
data-only mirror that `scripts/stelow advance` and the router validate against
(regenerate from `stages.yaml` — do not edit by hand). Visual review gates
(`gate`, `int-gate`, `plan-gate`, `diff-gate`) are conditional by review mode —
see `stages.yaml`.

### Top-level layout

| Directory | Purpose |
|---|---|
| `skills/stelow-workflow-entry/` | Entry point: intent classification, `state.md` scaffold, first-stage selection (loaded when `STELOW_WORKFLOW=1`). |
| `skills/stelow-workflow-router/` | Router: validate next candidate, `advance` via helper, load next stage, append hand-off audit. |
| `skills/stelow-workflow-orchestrator/` | Orchestrator + `stages.yaml` + `stages/*.md` + `references/transitions.md`. |
| `skills/stelow-product-*/` + `skills/stelow-workflow-*/` | The 23 other self-contained planning sub-skills. |
| `scripts/stelow` | Portable helper: `status [--json]`, `advance <candidate>`, `doctor [--json]` (lock + TTL, invariants). |
| `types/stages.ts` | Stage-model TS interfaces mirroring `stages.yaml`. |
| `stelow.schema.json` / `stelow.json` | Workflow tracking schema + per-project runtime state. |
| `tests/` | Vitest: `unit/` + `integration/` + `skills/` contract tests. |
| `docs/design/`, `docs/agents-md-refs/` | Historical design docs + agent reference notes. |

## Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Begin planning (entry skill) |
| `/sw-status` | Show workflow status (`scripts/stelow status`) |

`/sw-*` are skill-provided commands routed by `stelow-workflow-entry`/`stelow-workflow-router` on
**every** agentskills-compatible host — there is no host command registry.

## Source of Truth (do not guess)

Stage/skill/command counts are pinned to the canonical sources by regression
tests — not from this file:

- **Skills (28)**: `find skills -maxdepth 2 -name SKILL.md \( -path '*/stelow-product-*' -o -path '*/stelow-workflow-*' \) | wc -l` (14 workflow + 14 product). Pinned against the README `## 📋 Skills` section by `tests/integration/skill-count-readme-contract.test.ts`.
- **Stages (17)**: `skills/stelow-workflow-orchestrator/stages.yaml` + its mirror `references/transitions.md` (the `triage`..`audit` chain).
- **Stage transitions and conditional gates**: `skills/stelow-workflow-orchestrator/stages.yaml`.
- **Helper mechanics**: `scripts/stelow` (status/advance/doctor), pinned by `tests/unit/stelow-helper.test.ts`, `tests/integration/stelow-fs.test.ts`, `tests/integration/stelow-e2e.test.ts`.

```bash
npm run build            # Compile TypeScript + skill-sync sanity
npm test                 # Run all tests (523)
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
- **Local pre-push**: 60 (same) — the `.husky/pre-push` hook was removed with the tooling-dirs cleanup; run `npm run test:rigor` locally to enforce
- **Release target**: all test files should be B+ (80+)

**Practical reality check:** A-grade (90+) is rare in practice. Most well-written tests will be B (80–89). B is the realistic "good" target. C is acceptable for low-stakes coverage. Anything below C is façade.

**Why A-grade is hard:** Rigor caps each of 6 categories at 25 points. To hit 90+, you need to cover: every throw site (Error Coverage), numeric boundaries (Boundary Conditions), diverse inputs (Input Variety), AND no weak assertions. For general-purpose utility modules, this is structurally hard because not every function throws or has numeric boundaries. **Aim for B+, accept C for utility modules, demand A only for security/correctness-critical code.**

## Conventions

- **Commits:** conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Squash merge to main.
- **Files:** `lowercase-kebab-case` (e.g. `spec-product.md`, not `SpecProduct.md`).
- **Stage headings:** must use `slug:major.minor` format — see [docs/agents-md-refs/stage-numbering.md](docs/agents-md-refs/stage-numbering.md) for the gap-based numbering rules.
- **Tool calls in stage files:** never call `ask_user_question`, `subagent`, or `start_supervision` directly. Use the CLI-agnostic reference in `references/cli-tools/{tool}.md` — see [docs/agents-md-refs/tool-reference-pattern.md](docs/agents-md-refs/tool-reference-pattern.md).
- **Product name:** `stelow` (canonical). All runtime paths, skill prefixes, and filesystem artifacts use the `stelow` prefix.
- **Single working clone:** on the deploy host, `~/repos/stelow` is the **only** clone where methodology/skill work happens. Never edit skills in a throwaway `/tmp` clone — if you did, re-do or rebase the work onto `~/repos/stelow`. **Run `git pull --ff-only` here FIRST** before starting any edit, so work advances from `origin/main` and the auto-sync below propagates it. Push is the trigger: a local-only commit is invisible to consumers.
- **Propagation is automatic but on a schedule:** pushing to `calionauta/stelow@main` propagates automatically — the workflow skills (`stelow-workflow-*` + entry/router) reach `bb-plugin-stelow` via its 6h cron auto-sync, and the product playbooks (`stelow-product-*`) reach the agent skills hub on the daily 03:00 `npx skills update -g`. Neither needs a manual copy step.

## Versioning

- **Single source:** `package.json#version`. There is no plugin/artifact sync step — the repo distributes via Git/GitHub only.
- **Distribution:** Stelow ships **via Git/GitHub only** — there is no `npm publish` step. Release agents must not run `npm publish`.
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
  - `--mode=ci` — fails the run with a `::error::` annotation when
    `package.json#version` diverges from the latest annotated tag on
    `origin/main` and the HEAD commit body lacks one of the trailers above.
  - `--hook=commit-msg <msg-file>` — rejects any local commit whose staged
    `package.json` change lacks one of the trailers above (the `.husky/commit-msg`
    hook was removed with the tooling-dirs cleanup; run this mode manually or
    re-add the hook). (Bypass with `git commit --no-verify`.)
- Annotated-tag-only tag resolution (`git for-each-ref` + `cat-file -t` filter).
  Lightweight tags and `v<X.Y.Z>-rc.N` pre-release tags are ignored.
- The canonical trailer contract is documented in this section and enforced by
  `scripts/check-version-coherence.sh`. (The old `.changeset/sw-034-version-coherence-guard.md`
  template was removed with the `.changeset/` cleanup; release notes are composed
  directly from `CHANGELOG.md`.)

### Full release workflow (do NOT skip steps)
  1. `npm version <major.minor.patch> --no-git-tag-version` — bump `package.json`
  2. Update `CHANGELOG.md` — add entry with changes
  3. `git add -A && git commit -m "chore: bump to v<version>" -m "Release-Bump: v<version>"`
  4. `git tag -a v$(node -p "require('./package.json').version") -m "v<version>: <summary>"`
  5. `git push origin main --tags`
  6. **`gh release create v$(node -p "require('./package.json').version") --title "v<version>" --notes-file <changelog-section>`** — required for GitHub landing page visibility
- **Never guess the version** — always read `package.json` first.

## Don'ts

- **Do NOT put ops-only config inside `skills/*/`.** Files consumed by tooling/scripts
  (`scripts/`, `install.sh` — never by the LLM at runtime) go at project root, not
  inside a skill directory. Example: `retired-skills.yaml`.
- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)
- Do NOT add dependencies without asking
- Do NOT put secrets in AGENTS.md
- Do NOT guess version numbers — always read `package.json` first

## External Tools (Optional)

- **cymbal** — codebase navigation for Tech Preview / Feature Recon. Cross-platform install: `brew install 1broseidon/tap/cymbal` (macOS / Linuxbrew), `irm https://raw.githubusercontent.com/1broseidon/cymbal/main/install.ps1 | iex` (Windows PowerShell). Fallback: find/git.
- **ctx7** — live library docs during execution setup. Use: `npx @vedanth/context7`. Fallback: skip.
- **sem** ([Ataraxy-Labs/sem](https://github.com/Ataraxy-Labs/sem)) — entity-level diff for Execution Critique (functions, types, methods instead of raw lines). Cross-platform install: `curl -fsSL https://raw.githubusercontent.com/Ataraxy-Labs/sem/main/install.sh | sh` (macOS / Linux), `winget install AtaraxyLabs.sem` (Windows), `brew install sem-cli` (macOS / Linuxbrew). Fallback: `git diff` — raw line-level only.

All optional — workflow runs without them. `scripts/setup.sh` auto-detects + offers install (default Y).

## Token Efficiency

See `skills/stelow-workflow-orchestrator/references/cli-tools/context-efficiency.md` for patterns:
- Batch multi-symbol cymbal lookups (`show X Y Z`)
- Batch agent_browser extractions (`snapshot` + batch `get text`)
- Output truncation with `offset/limit` instead of full `read`
- Cache-friendly SKILL.md layout (stable prefix before `CACHE BOUNDARY`)

## Detailed references

- [docs/agents-md-refs/differentiators.md](docs/agents-md-refs/differentiators.md) — what makes this workflow different; key principles. Read when the user asks "why this approach?" or when designing a new stage.
- [architecture.md](architecture.md) — module layout, data flow, state model. Read when extending the repo or adding a skill.
- [docs/agents-md-refs/source-of-truth.md](docs/agents-md-refs/source-of-truth.md) — skills and distribution model. Read when adding a skill or discussing packaging.
- [docs/agents-md-refs/workflow-integration.md](docs/agents-md-refs/workflow-integration.md) — how to trigger the workflow, repo/license metadata. Read on first user interaction in a fresh project.