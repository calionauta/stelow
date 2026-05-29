# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Commands

| Command | Description |
|---------|-------------|
| `/pw-start` | Begin planning |
| `/pw-menu` | Show workflow status |

## Workflow Stages

```
Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution
  0       1         2        3         4      5       6           7           8           9          10
```

Stages 2-3 and 7 run as skills (`cali-product-shape-up`, `cali-product-critique`, `cali-product-interface-brainstorm`).
Gates (4, 7) require Plannotator visual approval - never skip.
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

20 specialized skills in `skills/` — see directory structure for full list.

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
2. **Process:** Follow the structured workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit)
3. **Execute:** Only after visual review gate (Plannotator approval)

- **Repo:** https://github.com/renatocaliari/cali-product-workflow
- **License:** MIT