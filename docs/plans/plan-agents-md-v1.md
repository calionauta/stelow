# AGENTS.md Plan - FINAL

## Feedback do Plannotator (2 items)

1. **Falta Shape Up + Gap Analysis nos diferenciais** - Adicionar
2. **Por que auto-trigger só funciona no Pi?** - Explicar que é mecanismo específico do Pi

## Respostas

### 1. Diferenciais Completos

Adicionar:
- **Shape Up methodology** - Appetite, Hill Chart, Rabbit Holes, IN/OUT scope
- **Gap analysis** - Adversarial critique com identification de gaps, risks, assumptions
- **Job To Be Done** - Entender o "job" que o usuário contrata o produto para fazer

### 2. Por que auto-trigger só funciona no Pi?

O Pi tem um mecanismo específico:
- Lê `~/.pi/agent/AGENTS.md` automaticamente ao iniciar
- Compara keywords do AGENTS.md com entrada do usuário
- Dispara skill automaticamente quando detecta match

Outros CLIs:
- **opencode**: Lê AGENTS.md como "rules" mas NÃO tem auto-trigger por keyword
- **claude-code**: Plugin system, AGENTS.md é para agents customizados
- **codex**: Lê AGENTS.md para contexto global, mas auto-trigger seria baseado em heurística diferente

## Novo AGENTS.md Final

```markdown
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
|-----|-------------------|--------------|
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
```

## Executar Cleanup

```bash
# 1. Remove arquivos temporários
rm progress.md context.md research.md
rm docs/ABOUT-AUTO-TRIGGER.md

# 2. Mover para .github/
mv docs/CI-TEST-PRACTICES.md .github/
mv RELEASE_WORKFLOW.md .github/

# 3. Atualizar AGENTS.md
# (escrever novo conteúdo)

# 4. Commit
git add -A && git commit -m "chore: cleanup - remove temp files, move docs, update AGENTS.md"

# 5. Push
git push origin main
```

## Recommended Action

**APPROVE** - Execute cleanup and update AGENTS.md