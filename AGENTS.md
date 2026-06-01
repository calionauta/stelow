# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Commands

| Command | Description |
|---------|-------------|
| `/pw-start` | Begin planning |
| `/pw-menu` | Show workflow status |

> **Source of Truth:** All stage/skill counts derive from the master list in
> `stages.yaml` (slugs + order) and `ls skills/*/SKILL.md | wc -l`
> (skill count). This AGENTS.md is a summary; never update counts here without
> verifying against those sources.
>
> **Slug convention:** `<stage-slug>:<major>.<minor>` — see **Stage Numbering Convention** below.
>
> **Tool Reference Pattern:** Stage files must NEVER call technical tools directly
> (e.g. `ask_user_question({...})`, `subagent({...})`, `start_supervision({...})`).
> Instead, reference the CLI-agnostic `.md` file in `references/cli-tools/` that
> documents the tool (see `docs/TOOL-REFERENCE-PATTERN.md`). The exception is
> the `.md` files inside `references/cli-tools/` themselves, which may document
> per-CLI syntax.

## Stage Numbering Convention

All stages and substeps follow this pattern:

```
<stage-slug>:<major>        — Major step (gaps of 10 for insertability)
<stage-slug>:<major>.<minor> — Sub-step within a major step
```

**Slugs** come from `stages.yaml` (single source of truth):
`triage`, `select`, `setup`, `context`, `shape`, `critique`, `gate`,
`scope`, `interface`, `int-gate`, `selection`, `planning`, `execution`,
`verification`, `audit`

### Rules

**Pattern:** Gap-based hierarchical — combines gap-based spacing (10, 20, 30)
with DFD-style leveling (`slug:major.minor`).

1. **Major steps use gaps of 10** (10, 20, 30, 40...). This allows inserting
   new steps between existing ones without renumbering.
2. **Sub-steps also use gaps of 10, on the decimal scale** (`<major>.10`,
   `<major>.20`). Not `<major>.1`, `<major>.2` — always two decimal digits
   to match the gap convention visually.
3. **Pre-steps** (steps before the first major action) use the `0.` prefix
   with gaps of 10: `0.10`, `0.20`, `0.30`. This preserves insertability.
4. **Every step heading** in a stage file starts with `slug:major.minor`.
   Example: `### setup:10 — Auto-Discovery Check`
5. **Cross-references** use slug.step: "See `setup:0.20`" not "See pre-step B".

### Examples

```
## setup:0.10 — Inbox Check
## setup:0.20 — Lessons Learned Injection
## setup:0.30 — Session Knowledge Injection
## setup:0.40 — External Context Pre-Load
## setup:10   — Auto-Discovery Check
## setup:20   — Stage Selection

## critique:30     — Parallel Critique Execution
## critique:30.10  — Reporter A: Flows + States
## critique:30.20  — Reporter B: Data + System
## critique:30.30  — Reporter C: Affordances + UX
## critique:30.40  — Reporter D: Feasibility
## critique:40     — Consolidate Reports
```

Before inserting a new step, check if an existing gap is available.
If no gap fits, add a decimal level: `setup:15` fits between `setup:10`
and `setup:20`; `setup:0.15` fits between `setup:0.10` and `setup:0.20`.

## Workflow Stages

```
triage → select → setup → context → shape → critique → gate → scope → interface → int-gate → selection → planning → execution → verification → audit
```

The `shape`, `critique`, and `interface` stages run as skills (`cali-product-shape-up`, `cali-product-plan-critique`, `cali-product-interface-alternatives`).
The `gate` and `int-gate` stages require Plannotator visual approval — never skip.
The Planning stage generates typed scopes with dependency mapping.

## Key Differentiators

- **Shape Up methodology** — Appetite, Hill Chart, Rabbit Holes, IN/OUT scope boundaries
- **Job To Be Done** — Understand what job users hire the product to do
- **Gap analysis** — Adversarial critique identifying gaps, risks, and assumptions
- **Product domain libraries** — 8 domains auto-detected (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models)
- **Visual review gate** — Plannotator opens the full plan for point-by-point comments
- **Interface exploration** — 5 approaches in ASCII art, then LLM creates hybrid
- **Typed technical scopes** — feature, spike, optimize, test-* with dependency mapping

## Key Principles

- **Measure twice, cut once** — Shape proposals with IN/OUT boundaries BEFORE coding
- **Visual review gate** — Plans must pass Plannotator before execution
- **Domain-driven** — Auto-detects product domain from your language
- **Technical scope mapping** — Breaks down into typed scopes, maps dependencies

## Living Documentation (lat.md)

This project uses [[lat.md/lat.md]] as its living documentation — a knowledge
graph of markdown files with [[wiki links]], `// @lat:` code refs, and semantic
search. The Pi extension (`.pi/extensions/lat.md.ts`) provides tools for
querying and validating this documentation.

### Roles

| Layer | What it contains | Who updates |
|---|---|---|
| `lat.md/` (markdown files) | Business rules, architecture, data model, ADRs, risks, glossary, guides | Agents + maintainers during development |
| `// @lat:` annotations in code | Links from source code → documentation sections | Agents during implementation (add when creating/modifying a documented entity) |
| `.pi/extensions/lat.md.ts` | 6 native tools: `lat_search`, `lat_section`, `lat_locate`, `lat_check`, `lat_expand`, `lat_refs` | Template from `lat.md` — updated via `npm update -g lat.md` |

### Freshness Policy

- **Workflow artifacts** (`spec-*.md`, `critique-*.md`, `session-knowledge/*.md`)
  are **historical records** — they document what was *planned*, not what was *built*.
- **`lat.md/` is the source of truth for what the code does today.**
  It supersedes planning artifacts for future decisions.
- After implementing a scope, run `lat check` and update any `lat.md/` sections
  whose `// @lat:` entities were affected.
- If code changes faster than documentation, agents should flag staleness
  (see `cali-lat-md-seed` skill, Step 5 freshness check).

### Available Tools (via Pi extension)

| Tool | Description |
|------|-------------|
| `lat_search <query>` | Semantic search across all lat.md documentation |
| `lat_section <path>` | Read a specific section by path (e.g. `architecture#System Layers`) |
| `lat_locate <term>` | Find everywhere a term is documented |
| `lat_check` | Validate all wiki links, code refs, and section structure |
| `lat_expand` | Visualize the wiki link graph between documents |
| `lat_refs <section>` | List all `// @lat:` annotations pointing to a section |

## See Also

- **[architecture.md](architecture.md)** — System architecture, modules, data flow, how to extend
- `skills/.../references/cli-tools/todo.md` — Todo system docs
- `extensions/.../modules/` — Reusable code (file-store, cache, task)

## Stack

- **Runtime:** Node 20.0+, npm
- **Language:** TypeScript 5.0 strict
- **Build:** tsc, vitest, stryker

## Development

```bash
npm run build            # Compile TypeScript
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:skills      # Skill structure tests
npm run test:ci          # CI test suite
npm run typecheck        # Type check
npm run mutate           # Mutation testing
npm run version:sync     # Sync versions
```

## Commits

Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
Keep PRs focused. Squash merge to main.

## File Naming

All project files must use `lowercase-kebab-case`:
- ✅ `spec-product.md`, `tech-planning.md`
- ❌ `SpecProduct.md`, `TECH-PLANNING.md`

## Skills

See the **Source of Truth** section above for how stage/skill counts are derived.

## Extensions

- Pi extension, Pi stub, CLI agents configs in `extensions/` and `cli-agents/`
- Skills install to `~/.agents/skills/` across Pi, OpenCode, Claude Code

## Don'ts

- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)
- Do NOT add dependencies without asking
- Do NOT put secrets in AGENTS.md

## Distribution

Git-based primary distribution (npm publish configured but not actively used — see [docs/SECURITY.md](docs/SECURITY.md) for rationale).

## Tool Reference Pattern

For skills development, see [docs/TOOL-REFERENCE-PATTERN.md](docs/TOOL-REFERENCE-PATTERN.md) for the pattern that ensures portability across CLIs.

Rules:
- Skills reference tools via `references/cli-tools/{tool}.md`, not direct calls
- Question templates come from `stages/ask-patterns.md`
- When adding a new tool, create the reference doc first following the pattern

## Workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill cali-product-workflow` or `/pw-start`
2. **Process:** Follow the 15-stage structured workflow in `skills/cali-product-workflow/SKILL.md` (Stage Index).
3. **Execute:** Only after visual review gate (Plannotator approval)

- **Repo:** https://github.com/renatocaliari/cali-product-workflow
- **License:** MIT