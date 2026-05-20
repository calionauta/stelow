# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Quick Commands

| Command | Description |
|---------|-------------|
| `/skill:cali-product-workflow` | Start the workflow |
| `/pw:start` | Begin planning |
| `/pw:menu` | Show status |

## Workflow Phases

```
Setup → Strategic → Shape Up → Interface → Critique → Tech Planning
  1         2           3          4          5           6
```

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

## Installation

```bash
./install.sh  # Auto-detects CLI (pi, opencode, claude-code, codex)
```

For detailed docs: [docs/INSTALLATION.md](docs/INSTALLATION.md)

## File Naming

All project files must use `lowercase-kebab-case`:
- ✅ `spec-product.md`, `tech-planning.md`
- ❌ `SpecProduct.md`, `TECH-PLANNING.md`

## Auto-Trigger

### How it works (pi only)

Pi reads `~/.pi/agent/AGENTS.md` at startup and matches keywords against user input. When detecting:
- Product planning, roadmap, features
- Interface design, UX, components
- Technical planning, architecture
- Product critique, review

It automatically triggers `/skill:cali-product-workflow`.

### Why not other CLIs?

| CLI | AGENTS.md Support | Auto-Trigger |
|-----|-------------------|---------------|
| **pi** | ✅ Global `~/.pi/agent/AGENTS.md` | ✅ Keyword-based |
| **opencode** | ✅ Project-level rules | ❌ Manual `/skill` |
| **claude-code** | ✅ Plugin manifest | ❌ Manual |
| **codex** | ✅ Global + local | ❌ Heuristic-based |

**To disable (pi):** `rm ~/.pi/agent/AGENTS.md`

## For Developers

- **Skills:** 16 specialized skills in `skills/` directory
- **CLI Support:** pi, opencode, claude-code, codex
- **License:** MIT
- **Repo:** https://github.com/renatocaliari/cali-product-workflow