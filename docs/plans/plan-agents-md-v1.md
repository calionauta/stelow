# AGENTS.md Plan - REVISED

## Feedback do Plannotator

1. **"O principal é installation?"** - Sim! AGENTS.md no repo deve ser útil para outros desenvolvedores
2. **"Sumarize melhor baseado no README"** - Principios devem vir dos diferenciais
3. **Remover "Betting table"** - Não quer esse conceito
4. **"pq pi only?"** - Auto-trigger é específico do pi, mas o resto serve para todos

## Análise do AGENTS.md Global do Usuário

O `~/.pi/agent/AGENTS.md` contém:
- Regras de codificação (KISS, DRY, Locality of Behavior, SSE-first, HATEOS)
- Context Mode obrigator
- Testing Protocol
- Subagents workflow
- Plannotator gate
- File naming convention

**Isso é específico da instalação local, não do repo.**

## Propósito do AGENTS.md do Repo

O AGENTS.md do repo serve para:
1. **Desenvolvedores que clonam** → orientações gerais do projeto
2. **LLMs de outros agents** (opencode, claude-code, codex) → sabem como usar o workflow
3. **Pi (quando usado em outros projetos)** → o auto-trigger funciona

## Novo AGENTS.md Proposto

```markdown
# cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

This package brings [Shape Up](https://basecamp.com/shapeup) methodology to AI coding agents.

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

- **Product domain libraries** — 8 domains auto-detected from your language (Pricing, Trust, Ads, Promotions, Open Source, Health, Marketplace, Business Models)
- **Visual review gate** — Plannotator opens the full plan for point-by-point comments
- **Interface exploration** — 5 approaches in ASCII art, then LLM creates hybrid
- **IN/OUT scope boundaries** — Define what NOT to build before coding
- **Typed technical scopes** — feature, spike, optimize, test-* with dependency mapping

## Key Principles

- **Measure twice, cut once** — Shape proposals with IN/OUT boundaries BEFORE coding
- **Visual review gate** — Plans must pass Plannotator before execution
- **Domain libraries** — Auto-detects 8 product domains from your input
- **Technical scope mapping** — Breaks down into typed scopes, maps dependencies, sequences execution

## Installation

```bash
./install.sh  # Auto-detects CLI
```

For detailed docs: [docs/INSTALLATION.md](docs/INSTALLATION.md)

## File Naming

All project files must use `lowercase-kebab-case`:
- ✅ `spec-product.md`, `tech-planning.md`
- ❌ `SpecProduct.md`, `TECH-PLANNING.md`

## Auto-Trigger (pi only)

This file auto-triggers when detecting:
- Product planning, roadmap, features
- Interface design, UX, components
- Technical planning, architecture
- Product critique, review

**To disable:** `rm ~/.pi/agent/AGENTS.md`

## For Developers

- **Skills:** 16 specialized skills in `skills/` directory
- **CLI Support:** pi, opencode, claude-code, codex
- **License:** MIT
- **Repo:** https://github.com/renatocaliari/cali-product-workflow
```

## Documentos Questionáveis - Diagnóstico

| Arquivo | Diagnóstico | Ação |
|---------|-------------|------|
| `docs/PORTABILITY.md` | Arquitectura técnica útil para devs que vão adaptar para outros CLIs | **Manter** - documenta decisões de design |
| `docs/CI-TEST-PRACTICES.md` | Best practices de testes - útil mas muito específico | **Mover para `.github/`** como doc interno |
| `docs/ABOUT-AUTO-TRIGGER.md` | Explica trade-off do auto-trigger - conteúdo já está no AGENTS.md | **Remover** - redundante |
| `RELEASE_WORKFLOW.md` | Instruções para LLMs fazerem releases | **Mover para `.github/`** como doc interno |
| `cali-product-workflow.json` | Schema JSON - necessário para validação | **Manter** |
| `cali-product-workflow.schema.json` | Schema JSON - necessário para validação | **Manter** |

## Resumo das Ações

| Tipo | Arquivos |
|------|----------|
| **Remover** | `docs/ABOUT-AUTO-TRIGGER.md`, `progress.md`, `context.md`, `research.md` |
| **Mover para .github/** | `docs/CI-TEST-PRACTICES.md`, `RELEASE_WORKFLOW.md` |
| **Manter** | `docs/PORTABILITY.md`, `docs/INSTALLATION.md`, `docs/DUAL-INSTALL-PATTERN.md` |
| **Atualizar** | `AGENTS.md` com novo conteúdo |

## Recommended Action

**APPROVE** - Execute cleanup plan and update AGENTS.md