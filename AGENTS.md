# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Quick Commands

| Command | Description |
|---------|-------------|
| `/skill:cali-product-workflow` | Start the workflow |
| `/pw:start` | Begin planning |
| `/pw:menu` | Show workflow status |

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

## How to Integrate with Your AGENTS.md

All AI coding agents read `AGENTS.md` files and include their content in the LLM context. This works identically across all CLIs.

**To use this workflow, add the following section to your global/user AGENTS.md:**

```markdown
---

## cali-product-workflow Integration

When working on software projects, trigger the product workflow:

1. **Trigger:** Use `/skill:cali-product-workflow` or `/pw:start`
2. **Process:** Follow the 6-phase workflow
3. **Execute:** Only after visual review gate (Plannotator approval)

### Supported CLIs

| CLI | Command |
|-----|---------|
| pi | `/skill:cali-product-workflow` or `/pw:start` |
| opencode | `/skill cali-product-workflow` |
| claude-code | `/skill cali-product-workflow` |
| codex | `/skill cali-product-workflow` |

### Best Practices

- Run `/skill:cali-product-workflow` at the start of any product/feature work
- Use `/pw:menu` to track workflow state
- Get Plannotator approval before executing technical scopes
```

### Where to Add This

| CLI | Your AGENTS.md Location |
|-----|-------------------------|
| **pi** | `~/.pi/agent/AGENTS.md` |
| **opencode** | Project-level or `~/.config/opencode/` config |
| **claude-code** | `~/.claude/AGENTS.md` or plugin config |
| **codex** | `~/.codex/AGENTS.md` |

### Quick Setup (pi)

```bash
# Copy this project's AGENTS.md content to your global config
./scripts/setup.sh
# Or manually copy the section above to ~/.pi/agent/AGENTS.md

# To disable, remove:
rm ~/.pi/agent/AGENTS.md
```

## For Developers

- **Skills:** 16 specialized skills in `skills/` directory
- **CLI Support:** pi, opencode, claude-code, codex
- **License:** MIT
- **Repo:** https://github.com/renatocaliari/cali-product-workflow