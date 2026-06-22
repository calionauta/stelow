# stelow

**Transform product ideas into approved, testable plans — systematically.**

## Project Overview

**Type:** Workflow CLI for product planning (skills + stages).
**Stack:** Node 20+, TypeScript 6.0 strict, npm.

## Architecture

See [architecture.md](architecture.md) for module layout, data flow, and how to extend. Skills live in `skills/*/SKILL.md`; stages defined in `stages.yaml` (single source of truth). Visual review gates: `gate` and `int-gate` (Plannotator) — never skip.


## Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Begin planning |
| `/sw-menu` | Show workflow status |

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

## Conventions

- **Commits:** conventional (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`). Squash merge to main.
- **Files:** `lowercase-kebab-case` (e.g. `spec-product.md`, not `SpecProduct.md`).
- **Config/ops files at root, not inside skills/:** Files consumed by extension/ops code
  (never by the LLM in runtime) go at project root, not inside `skills/*/`. Example:
  `retired-skills.yaml` at root is consumed by `sync-skills.ts`, not by the LLM.
- **Stage headings:** must use `slug:major.minor` format — see [docs/agents-md-refs/stage-numbering.md](docs/agents-md-refs/stage-numbering.md) for the gap-based numbering rules.
- **Tool calls in stage files:** never call `ask_user_question`, `subagent`, or `start_supervision` directly. Use the CLI-agnostic reference in `references/cli-tools/{tool}.md` — see [docs/agents-md-refs/tool-reference-pattern.md](docs/agents-md-refs/tool-reference-pattern.md).

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

- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)
- Do NOT add dependencies without asking
- Do NOT put secrets in AGENTS.md
- Do NOT guess version numbers — always read `package.json` first

## External Tools (Optional)

- **cymbal** — codebase navigation for Tech Preview / Feature Recon. Install: `brew install 1broseidon/tap/cymbal`. Fallback: find/git.
- **ctx7** — live library docs during execution setup. Install: `npx ctx7 setup`. Fallback: skip.

All optional — workflow runs without them.

## Token Efficiency

See `skills/stelow/references/cli-tools/context-efficiency.md` for patterns:
- Batch multi-symbol cymbal lookups (`show X Y Z`)
- Batch agent_browser extractions (`snapshot` + batch `get text`)
- Output truncation with `offset/limit` instead of full `read`
- Cache-friendly SKILL.md layout (stable prefix before `CACHE BOUNDARY`)

## Detailed references

- [docs/agents-md-refs/differentiators.md](docs/agents-md-refs/differentiators.md) — what makes this workflow different; key principles. Read when the user asks "why this approach?" or when designing a new stage.
- [docs/agents-md-refs/source-of-truth.md](docs/agents-md-refs/source-of-truth.md) — skills, extensions, distribution model. Read when adding a skill or discussing packaging.
- [docs/agents-md-refs/workflow-integration.md](docs/agents-md-refs/workflow-integration.md) — how to trigger the workflow, repo/license metadata. Read on first user interaction in a fresh project.
