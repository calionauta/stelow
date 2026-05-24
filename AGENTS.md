# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Quick Commands

| Command | Description |
|---------|-------------|
| `/pw-start` | Begin planning |
| `/pw-menu` | Show workflow status |

## Workflow Phases

```
Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution
  0       1         2        3         4      5       6           7           8           9          10
```

Phases 2-3 and 7 run as skills (`cali-shape-up`, `cali-plan-critique`, `cali-interface-brainstorm`).
Gates (4, 7) require Plannotator visual approval — never skip.
Phase 10 (Planning) generates typed scopes with dependency mapping.

## Key Differentiators

- **Shape Up methodology** — Appetite, Hill Chart, Rabbit Holes, IN/OUT scope boundaries
- **Job To Be Done** — Understand what job users hire the product to do
- **Gap analysis** — Adversarial critique identifying gaps, risks, and assumptions
- **Product domain libraries** — 8 domains auto-detected (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models)
- **Visual review gate** — Plannotator opens the full plan for point-by-point comments
- **Interface exploration** — 5 approaches in ASCII art, then LLM creates hybrid
- **Typed technical scopes** — feature, spike, optimize, test-* with dependency mapping
- **External skill references** — third-party skills documented in `references/cli-tools/` with install instructions and fallbacks

## Key Principles

- **Measure twice, cut once** — Shape proposals with IN/OUT boundaries BEFORE coding
- **Visual review gate** — Plans must pass Plannotator before execution
- **Domain-driven** — Auto-detects product domain from your language
- **Technical scope mapping** — Breaks down into typed scopes, maps dependencies

## See Also

- **[architecture.md](architecture.md)** — System architecture, modules, data flow, how to extend
- `skills/.../references/cli-tools/todo.md` — Todo system docs
- `extensions/.../modules/` — Reusable code (file-store, cache, task)

## Development

Requires Node >=20 and npm.

```bash
npm run build            # Compile TypeScript (tsc -p tsconfig.build.json)
npm test                 # Run all tests (vitest)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:skills      # Skill structure tests
npm run test:ci          # CI test suite (scripts/test-ci.sh)
npm run typecheck        # Type check (tsc --noEmit)
npm run mutate           # Mutation testing (stryker)
npm run version:sync     # Sync version across plugin configs
```

- Do NOT use `npm install` in CI — use `npm ci` with committed `package-lock.json`
- Do NOT edit generated files in `build/`
- Do NOT use `require()` — this is ESM (`"type": "module"`)

## Commits

Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
Keep PRs focused. Squash merge to main.

## File Naming

All project files must use `lowercase-kebab-case`:
## External Skill Dependencies

Any skill referenced by this workflow that is NOT part of cali-product-workflow must:
1. Have a reference file in `references/cli-tools/{descriptive-name}.md`
2. Include:
   - Install instructions for CLIs or generic
   - Quick summary of what it does
   - Fallback instructions when not installed

Example: `codequality-review.md` for the thermo-nuclear review.

- ✅ `spec-product.md`, `tech-planning.md`
- ❌ `SpecProduct.md`, `TECH-PLANNING.md`

## Skills

19 specialized skills in `skills/` directory:

```
skills/cali-product-workflow/
├── skills-workflow/              # Shape Up, Interface, Critique, Tech Planning
│   ├── cali-shape-up/
│   ├── cali-interface-brainstorm/
│   ├── cali-plan-critique/
│   └── cali-tech-planning/
├── skills-strategic-analysis/    # JTBD, Discovery, Opportunity Mapping, Market Analysis, Evolution
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-discovery/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-multi-method-market-analysis/
│   └── cali-product-evolutionary-principles/
├── skills-domain-libraries/      # 8 domain playbooks
│   ├── cali-product-pricing/
│   ├── cali-product-ads/
│   ├── cali-product-trust-building/
│   ├── cali-product-promotions/
│   ├── cali-product-business-models/
│   ├── cali-product-health/
│   ├── cali-product-marketplace-playbook/
│   └── cali-product-open-source/
└── skills-execution/             # Scope routing, AI testing strategy
    ├── cali-product-scope-executor/
    └── cali-testing-ai-code/
```

## Extensions

- `extensions/cali-product-workflow/` — Pi extension (13 slash commands, event hooks, TUI)
- `extensions/cali-pw-pi/` — Pi stub (re-exports from build)
- `.claude-plugin/` — Claude Code marketplace plugin definition (gitignored, local only)
- `.codex-plugin/` — Codex marketplace plugin definition (gitignored, local only)
- `.opencode-plugin/` — OpenCode plugin definition, skills only (gitignored, local only)

## CLI Support

| CLI | How it loads skills | Deeper integration |
|-----|-------------------|-------------------|
| **Pi** | `pi install git:...` + `npx skills` | ✅ JS extension (hooks, TUI, commands) |
| **OpenCode** | `npx skills` + `skills.paths` | ❌ Skills only |
| **Claude Code** | `npx skills` + marketplace | ⚠️ Via GitHub marketplace |
| **Codex** | `npx skills` + marketplace | ⚠️ Via GitHub marketplace |

## Distribution

Git-based primary distribution (npm publish configured but not actively used — see [docs/SECURITY.md](docs/SECURITY.md) for rationale).
d05|
## Tool Reference Pattern
d05|
For skills development, see [docs/TOOL-REFERENCE-PATTERN.md](docs/TOOL-REFERENCE-PATTERN.md) for the pattern that ensures portability across CLIs.
d05|
Rules:
- Skills reference tools via `references/cli-tools/{tool}.md`, not direct calls
- Question templates come from `phases/ask-patterns.md`
- When adding a new tool, create the reference doc first following the pattern
d05|
## Workflow Integration
d05|
When working on software projects, trigger the product workflow:
d05|
1. **Trigger:** Use `/skill cali-product-workflow` or `/pw-start`
d05|
2. **Process:** Follow the 11-phase structured workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution)
3. **Execute:** Only after visual review gate (Plannotator approval)
d05|
- **Repo:** https://github.com/renatocaliari/cali-product-workflow

- **Repo:** https://github.com/renatocaliari/cali-product-workflow
- **License:** MIT
