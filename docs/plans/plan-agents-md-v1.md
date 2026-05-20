# AGENTS.md Plan for cali-product-workflow

## Current State

O AGENTS.md atual tem:
- Auto-trigger instructions (quando usar `/skill`)
- File naming convention (lowercase-kebab-case)
- Quando desabilitar

Faltando:
- Propósito do pacote
- Comandos disponíveis
- Fases do workflow
- Princípios-chave
- Instalação rápida

## Research: O que AGENTS.md deve conter

Baseado na pesquisa sobre pi, opencode, claude-code e codex:

### Padrão Comum (todos suportam AGENTS.md)

| CLI | Como usa AGENTS.md |
|-----|-------------------|
| **pi** | `~/.pi/agent/AGENTS.md` - carrega automaticamente |
| **opencode** | `.opencode/AGENTS.md` ou raiz - "rules" |
| **claude-code** | `.claude/AGENTS.md` - plugin system |
| **codex** | `~/.codex/AGENTS.md` - hierarquia global>local |

### Conteúdo Recomendado

1. **Header**: Nome e propósito
2. **Quick Reference**: Comandos principais
3. **Workflow Phases**: Mapa do processo
4. **Key Principles**: Filosofia e convenções
5. **Installation**: Como ativar
6. **Best Practices**: Convenções de nomenclatura

## Proposta: Novo AGENTS.md

```markdown
# @renatocaliari/cali-product-workflow

**Transform product ideas into approved, testable plans — systematically.**

## Quick Commands

| Command | Description |
|---------|-------------|
| `/skill:cali-product-workflow` | Start the workflow |
| `/pw:start` | Begin planning session |
| `/pw:menu` | Show workflow status |

## Workflow Phases

```
Setup → Strategic → Shape Up → Interface → Critique → Tech Planning
  1         2           3          4          5           6
```

## Key Principles

- **Measure twice, cut once** — Define IN/OUT scope before coding
- **Betting table** — Every proposal has a budget (appetite)
- **Visual review gate** — Plans must pass Plannotator before execution
- **Typed scopes** — feature, spike, optimize, test-*

## Auto-Trigger (pi only)

This file auto-triggers when detecting:
- Product planning, roadmap, features
- Interface design, UX, components
- Technical planning, architecture
- Product critique, review

**To disable:** `rm ~/.pi/agent/AGENTS.md`

## File Naming

All project files must use `lowercase-kebab-case`:
- ✅ `spec-product.md`, `tech-planning.md`
- ❌ `SpecProduct.md`, `TECH-PLANNING.md`

## Installation

```bash
./install.sh  # Auto-detects CLI
```

For detailed docs: [INSTALLATION.md](docs/INSTALLATION.md)
```

## Changes from Current

| Aspect | Current | Proposed |
|--------|---------|----------|
| Header | Auto-trigger only | Full purpose + commands |
| Commands | Only `/skill` | Full table with descriptions |
| Workflow | Not shown | 6-phase map |
| Principles | None | 4 key principles |
| Installation | None | Quick reference |
| File naming | Extensive | Condensed (already good) |

## Impact Analysis

- ✅ **Pi**: Gets proper instructions, not just auto-trigger
- ✅ **opencode**: Works with rules system
- ✅ **claude-code**: Works with plugin manifest
- ✅ **codex**: Works with AGENTS.md hierarchy
- ⚠️ **Breaking**: None - additive only

## Verification Plan

1. Update AGENTS.md
2. Run tests: `npm run test`
3. Verify typecheck: `npm run typecheck`
4. Commit and push
5. Test in a fresh clone

## Risks

- **Low**: AGENTS.md é arquivo markdown simples
- **Reversible**: Git guarda histórico

## Recommended Action

**APPROVE** - Update AGENTS.md with new content