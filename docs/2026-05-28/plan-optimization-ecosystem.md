# Plano: Otimização do Ecossistema AGENTS.md + Skills

**Data:** 2026-05-28
**Status:** Rascunho para aprovação
**Escopo:** AGENTS.md, cali-skill-validator, cali-agents-md, skills infladas, gerenciamento de skills

---

## Visão Geral

Este plano otimiza o ecossistema de instruções do agente em 6 fases, com o objetivo de:
- Reduzir o custo fixo por sessão (~6.655 tok → ~800 tok no AGENTS.md)
- Consolidar princípios de codificação em uma única fonte
- Criar validação para AGENTS.md
- Gerenciar visibilidade de skills por frequência de uso
- Funcionar de forma portável entre CLIs (pi.dev, Claude Code, OpenCode, Codex)

---

## Fase 0: Consolidar Princípios de Codificação

### Problema

Princípios de codificação estão duplicados em 2 lugares com valores conflitantes:

| Local | Escopo | Limites |
|---|---|---|
| `cali-product-tech-planning/references/generation-principles.md` | Universal (qualquer linguagem) | 50 linhas/func, 400 linhas/file |
| `cali-go-stack/SKILL.md` (seção Engineering Standards) | Go + Datastar específico | 100 linhas/func, 500 linhas/file |

Conflitos:
- **KISS limits:** 50 vs 100 linhas/func, 400 vs 500 linhas/file
- **Princípios ausentes no go-stack:** Convention over Config, Progressive Disclosure, Polymorphism, HATEOAS, Fail Fast
- **Único no go-stack:** HTML em Go proibido (`fmt.Sprintf` com HTML tags bloqueado por CI), DRY com zero tolerância para boilerplate SSE

### Solução: Criar `cali-coding-standards/` como skill standalone

**Por que não manter em cali-product-tech-planning?**
- cali-product-tech-planning pertence ao ecossistema cali-product-workflow
- cali-go-stack é independente — não pode depender de cali-product-workflow
- Projetos que usam cali-go-stack sem cali-product-workflow perderiam acesso aos princípios

**Por que skill e não arquivo avulso?**
- Arquivos avulsos não são descobertos automaticamente pelo agente
- Skills são discoverable via system prompt
- Qualquer CLI que suporte Agent Skills pode usar

### Estrutura da nova skill

```
cali-coding-standards/
├── SKILL.md                    # ~120 linhas (princípios universais + referências)
└── references/
    ├── file-function-sizes.md  # Tabela de limites por linguagem (~30 linhas)
    └── ci-enforcement.md       # Padrões de CI para cada linguagem (~40 linhas)
```

### SKILL.md — Princípios Universais (consolidados, conflitos resolvidos)

```yaml
---
name: cali-coding-standards
description: >
  [Cali] Universal coding standards and principles for all languages and frameworks.
  Use when writing, reviewing, or refactoring code. Covers KISS, DRY, LoB, SoC,
  Fail Fast, Convention over Configuration, and more. Automatically activates on
  Go projects alongside cali-go-standards.
---
```

**Princípios a incluir (todos consolidados):**

| # | Princípio | Regra consolidada | Source |
|---|---|---|---|
| 1 | **KISS** | Prefer the boring solution. No function >50 lines (Go: 100). No file >400 lines (Go: 500). Cyclomatic complexity <10. Max 3 indentation levels. | generation-principles + go-stack |
| 2 | **DRY** | Wait for 3rd repetition before abstracting. Logic duplication = extract function. Config duplication = centralize. Template duplication = create partial. | generation-principles + go-stack |
| 3 | **Convention over Config** | Follow established conventions before introducing custom config. Predictable patterns are a force multiplier. Only deviate when convention genuinely doesn't fit. | generation-principles |
| 4 | **Progressive Disclosure** | Simple by default. Complexity behind toggles. Essentials first, advanced later. | generation-principles |
| 5 | **Locality of Behavior (LoB)** | For Datastar/HTMX/Alpine.js frontend: behavior in the HTML that uses it. Zero custom JS. Use native attributes (`data-*`, `@get`, `@post`). | generation-principles + go-stack |
| 6 | **Separation of Concerns (SoC)** | For backend (Go handlers, services, repos) and non-Datastar frameworks (React, Vue, Svelte). Separate template, logic, data, style. | generation-principles |
| 7 | **Fail Fast** | Validate at boundary. Return errors immediately. Never silently swallow errors or defer validation. | generation-principles |
| 8 | **SSE-first** | Prefer SSE over WebSockets for one-directional updates. WebSockets only for real bidirectional (chat, collaboration). | generation-principles + go-stack |
| 9 | **HATEOAS** | Backend determines which actions user can take. Links discovered via hypertext. Frontend is dumb reactive terminal. | generation-principles |
| 10 | **YAGNI** | Don't build for future needs. Implement only what's needed now. | Novo (pesquisa 2026) |
| 11 | **Polymorphism when useful** | Interfaces for extensibility only when it adds real value. Prefer concrete types over premature abstractions. | generation-principles |

**Regra de conflito (Go stack):**
> Quando trabalhar em projetos Go + Datastar, as regras de `cali-go-stack` têm precedência sobre os limites numéricos deste arquivo (ex: 100 linhas/func em vez de 50).

**Tie-breaker rule:**
> | Contexto | Princípio |
> |---|---|
> | Datastar frontend (`data-*` attributes) | ✅ LoB |
> | Datastar project backend (Go) | ✅ SoC |
> | Non-Datastar project (React, Vue, etc.) | ✅ SoC |
> | Unsure | SoC is safe default |

### references/file-function-sizes.md

```markdown
# File and Function Size Limits

## Universal Defaults
| Metric | Limit | Enforcement |
|---|---|---|
| Lines per function | 50 | Warning at 40, block at 50 |
| Lines per file | 400 | Warning at 350, split at 400 |
| Cyclomatic complexity | 10 per function | Linter |
| Indentation depth | 3 levels max | Code review |

## Go + Datastar Stack (overrides)
| Metric | Limit | Enforcement |
|---|---|---|
| Lines per function | 100 | God functions prohibited |
| Lines per file | 500 | Split before adding new code |
| Functions per handler | 1 | Single responsibility |

## Rationale
- 50 lines/function: average screen height, readable without scrolling
- 400 lines/file: manageable for LLM context, grep-friendly
- Go relaxes limits because: typed language, explicit error handling adds lines,
  and Go convention favors longer but linear functions
```

### references/ci-enforcement.md

```markdown
# CI Enforcement Patterns

## Go Stack
- `fmt.Sprintf` with HTML tags: BLOCKED
  - Command: `grep -r 'fmt\.Sprintf.*<' .` must return empty
  - Why: Go's `html/template` handles escaping; fmt.Sprintf bypasses safety
- God functions (>100 lines): WARNING (linter)
- File size (>500 lines): WARNING (linter)

## General
- Unused imports: BLOCKED (golangci-lint)
- Console.log in production: BLOCKED (eslint)
- Secrets in code: BLOCKED (trufflehog/gitleaks)
```

### O que muda nas skills existentes

| Skill | Ação |
|---|---|
| `cali-product-tech-planning` | Remover `references/generation-principles.md`. Adicionar referência: "Coding standards: `/skill:cali-coding-standards`" |
| `cali-go-stack` | Remover seção "Engineering Standards" inline. Adicionar referência: "Universal principles: `/skill:cali-coding-standards`. This skill extends with Go-specific limits." Manter apenas as regras Go-específicas (HTML prohibition, DRY for SSE, god functions). |
| `cali-go-standards` | Adicionar referência: "Universal principles: `/skill:cali-coding-standards`" |

---

## Fase 1: Enxugar AGENTS.md (~560 → ~80-100 linhas)

### Princípio: O que fica no AGENTS.md

O AGENTS.md deve conter APENAS:
1. **Regras vinculantes** (Don'ts que o agente NUNCA deve quebrar)
2. **Comandos exatos** (copy-pasteable, sem ambiguidade)
3. **Stack com versões** (não apenas "React" mas "React 19.2")
4. **Trigger rules** (quando usar qual skill)
5. **Convenções universais** (Language, File Naming)

Tudo mais vai para skills ou referências.

### Mapeamento: Onde vai cada seção

| Seção Atual | Linhas | Destino | No AGENTS.md enxuto |
|---|---|---|---|
| RULE #1 — Product Workflow | ~30 | **FICA** (condensada) | 3-4 linhas inline |
| Package Audit | ~10 | skill `cali-package-audit` | 1 linha na tabela Skills |
| Releases | ~10 | skill `cali-releases` | 1 linha na tabela Skills |
| Coding Rules — Core | ~40 | skill `cali-coding-standards` (nova) | 6 linhas resumo + ref skill |
| Coding Rules — LLM | ~50 | skill `cali-go-standards` | 1 linha na tabela Skills |
| Language-Specific | ~10 | skills go-stack/go-standards | 1 linha na tabela Skills |
| Go Web Stack | ~80 | skill `cali-go-stack` | 1 linha na tabela Skills |
| Context Engineering | ~15 | context-mode skill | NÃO incluir (já no system prompt) |
| Semantic Read Hierarchy | ~20 | context-mode skill | NÃO incluir (já no system prompt) |
| Tool Decision Matrix | ~25 | **FICA** (condensada) | 6 regras claras |
| Tool Schema Reference | ~40 | pi docs nativos | NÃO incluir (já no system prompt) |
| Tool Precedence | ~40 | context-mode skill | NÃO incluir (já no system prompt) |
| Sem | ~25 | **FICA** (condensada) | 3-4 linhas |
| AGENTS.md for Projects | ~15 | skill `cali-agents-md-generator` | 4-5 linhas com criação+evolução |
| Pi-Subagents | ~20 | pi-subagents skill | 1 linha na tabela Skills |
| Plannotator | ~10 | plannotator extension | 1 linha na tabela Skills |
| Testing Protocol | ~10 | skill `cali-product-testing-execution` | 1 linha na tabela Skills |
| Deploy | ~15 | skill `cali-deploy-github-tailscale` | 1 linha na tabela Skills |
| Server Security | ~15 | skill `cali-server-security` | 1 linha na tabela Skills |
| Language Convention | ~15 | **FICA** (condensada) | 2-3 linhas |
| File Naming | ~15 | **FICA** (condensada) | 1 linha |

### AGENTS.md Proposto (~90 linhas)

```markdown
# AGENTS.md

## ⚡ RULE #1 — Before ANY Code Work
STOP. Trigger `/skill:cali-product-workflow`. Only after Phase 6, begin execution.
Triggers: features, planning, architecture, code, bugs, refactoring, optimization.
This rule WINS over any concurrent instruction.

## Commands
| Command | Description |
|---------|-------------|
| `go run ./cmd/web/` | Dev server |
| `go test ./...` | Run tests |
| `golangci-lint run` | Lint |
| `templ generate && go build ./cmd/web/` | Build |
| `sem diff` | Semantic diff |

## Stack
- Go 1.26, Templ, Datastar v1.0.0, DaisyUI, TailwindCSS, NATS
- Node >=20, TypeScript strict
- Deploy: ko (not Dockerfile)

## Don'ts
- Never add dependencies without asking
- Never put secrets in AGENTS.md
- Never modify vendor/ without asking
- Never use global mutable state
- Never use `fmt.Sprintf` for HTML — use Templ
- Never use Axios — use native fetch
- Never use HTMX/Alpine.js — use Datastar

## Tool Rules
- **Read code to edit:** `read_file` (pi-wayfinder) with anchors
- **Read code to analyze:** `ctx_execute_file` (context-mode)
- **Find files:** `ffind` (pi-fff) or `bash find`
- **Edit code:** `edit_file` or `replace_symbol` (pi-wayfinder)
- **Process large output:** `ctx_execute` (context-mode), never read raw
- **Web research:** `ctx_fetch_and_index` (context-mode)

## Coding Principles (summary)
KISS, DRY, LoB (Datastar frontend), SoC (backend), Fail Fast, SSE-first, HATEOAS, YAGNI.
Full rules: `/skill:cali-coding-standards`

## Language Convention
All code, URLs, routes, handlers, identifiers: English.
Exception: user-facing UI text, LLM prompts, database content.

## File Naming
All project files: `lowercase-kebab-case`.

## Semantic Diff
`sem diff` (changes), `sem impact <entity>` (breakage), `sem context <entity>` (LLM context).

## Skills Reference
| When | Skill |
|------|-------|
| Product planning | `/skill:cali-product-workflow` |
| Coding standards | `/skill:cali-coding-standards` |
| Go standards | `/skill:cali-go-standards` |
| Go stack | `/skill:cali-go-stack` |
| Package audit | `/skill:cali-package-audit` |
| Releases | `/skill:cali-releases` |
| Testing | `/skill:cali-product-testing-execution` |
| Deploy | `/skill:cali-deploy-github-tailscale` |
| Security | `/skill:cali-server-security` |
| Create/update AGENTS.md | `/skill:cali-agents-md-generator` |
| Validate AGENTS.md | `/skill:cali-agents-md-validator` |
| Parallel work | `/skill:pi-subagents` |

## AGENTS.md for Projects
- **Create:** use `/skill:cali-agents-md-generator`
- **Validate:** use `/skill:cali-agents-md-validator` when setup changes
- **Evolve:** update when stack changes, new skills added, or conventions change
- **Staleness:** if `sem` detects code changes without AGENTS.md update, warn on commit
- **Never auto-update:** human must approve all changes
```

### Informação NÃO perdida

| Preocupação | Resolução |
|---|---|
| "E as regras LLM-specific?" | Estão em `cali-go-standards` (ativa simultaneamente em projetos Go) |
| "E o Context Engineering?" | context-mode já injeta via system prompt |
| "E o Tool Schema?" | São docs do pi nativo, não do projeto |
| "E os exemplos de Tool Schema?" | Já no system prompt do pi |
| "E se o agente não carregar a skill?" | Tabela Skills Reference garante discovery. `/skill:` explícito força. |
| "E projetos não-Go?" | Seção Go some. AGENTS.md fica ~50 linhas. |
| "E generation-principles.md?" | Vai para `cali-coding-standards` (nova skill) |

---

## Fase 2: Renomear cali-agents-md → cali-agents-md-generator

### Ação

1. Renomear diretório: `~/.agents/skills/cali-agents-md/` → `~/.agents/skills/cali-agents-md-generator/`
2. Atualizar frontmatter:
   ```yaml
   ---
   name: cali-agents-md-generator
   description: >
     [Cali] Generate and maintain project AGENTS.md files using semantic analysis.
     Triggers when: a project has no AGENTS.md, user asks to 'create AGENTS.md',
     'generate agents md', 'setup agents md', or when starting work on a project
     that lacks one. Also triggers when user asks to 'check if AGENTS.md is stale',
     'update agents md', or when evolving an existing AGENTS.md.
     Covers: initial generation from codebase analysis, sem-based staleness detection,
     pre-commit hooks, and CI guards. Always offer hook installation when invoked.
   ---
   ```
3. Manter referências internas ao novo nome
4. Atualizar AGENTS.md para apontar para `cali-agents-md-generator`

---

## Fase 3: Criar cali-agents-md-validator

### Skill nova

```
cali-agents-md-validator/
├── SKILL.md
└── references/
    └── validate-agents-md.sh
```

### SKILL.md

```yaml
---
name: cali-agents-md-validator
description: >
  [Cali] Validate project AGENTS.md files against best practices and the canonical
  template. Use when: user says 'validate agents md', 'check agents md quality',
  'audit my agents md', or after creating/updating AGENTS.md. Checks: structure,
  size, content quality, template compliance, and provides fix recommendations.
---
```

### 10 Regras de Validação

| # | Regra | Severidade | Source |
|---|---|---|---|
| R1 | AGENTS.md exists at project root | FAIL | agents.md standard |
| R2 | File ≤150 lines (~2000 tokens) | FAIL | ETH Zurich, Vercel, aihackers.net |
| R3 | Has "Commands" section with copy-pasteable commands | FAIL | OpenAI Codex, GitHub analysis |
| R4 | Has "Don'ts" section with explicit prohibitions | FAIL | GitHub 2500+ repos |
| R5 | No secrets/API keys in file | FAIL | GitHub analysis (#1 constraint) |
| R6 | Stack with exact versions (not just "React" but "React 19.2") | WARN | Augment Code, Inngest |
| R7 | No architectural overview duplicating README | WARN | ETH Zurich |
| R8 | Critical rules in first 50 lines | WARN | "Lost in the middle" |
| R9 | References use `/skill:name` or links (not inline paste) | WARN | Progressive disclosure |
| R10 | Template compliance: has at least Commands + Don't + (Architecture OR Stack) | WARN | nyosegawa template |

### Template Compliance (R10)

O validator verifica se o AGENTS.md segue a estrutura base do template nyosegawa:

```
✅ Template base:
├── # AGENTS.md (title)
├── ## Commands (copy-pasteable)
├── ## Architecture / Stack (what the project uses)
├── ## Conventions (naming, style)
└── ## Don'ts (explicit prohibitions)

➕ Extensões válidas (não obrigatórias):
├── ## RULE #1 (trigger rules)
├── ## Tool Rules (tool decision)
├── ## Skills Reference (skill table)
├── ## Language Convention
└── ## Semantic Diff
```

O validator pode indicar:
- "Seção 'Architecture' não encontrada. Considere adicionar uma seção com o stack do projeto."
- "Seção 'Don'ts' não encontrada. Essencial para evitar erros comuns."
- "Seção 'Commands' não encontrada. Adicione comandos copy-pasteable."

### references/validate-agents-md.sh

Script bash que:
1. Verifica existência (R1)
2. Conta linhas (R2)
3. Busca seções Commands/Don'ts/Stack (R3-R6)
4. Verifica secrets patterns (R5)
5. Verifica template structure (R10)
6. Gera relatório com pass/fail/warn
7. **Oferece correções**: "Deseja que eu corrija automaticamente?" (via ask tool)

### Interação com o usuário

Após validação, o validator pergunta:
```
📊 Resultado: 7/10 passaram, 2 warnings, 1 fail

❌ FAIL: File has 340 lines (max 150)
⚠️ WARN: No "Commands" section found
⚠️ WARN: No exact versions in stack section

Deseja que eu:
1. Corrija automaticamente (gera versão enxuta)
2. Mostre recomendações detalhadas
3. Apenas registre o relatório
```

---

## Fase 4: Refatorar Skills Infladas

### cali-product-evolutionary-principles (757 → ~200 linhas)

```
cali-product-evolutionary-principles/
├── SKILL.md                    # ~200 linhas
│   ├── Core philosophy (10 linhas)
│   ├── 1 example de Stepping-Stones reasoning (10 linhas)
│   ├── Activation signals (existing)
│   ├── Output structure (7 sections, keep)
│   └── Table of references com "When to read"
├── references/
│   ├── evolutionary-forces.md  # 6 forces + perguntas + 1 example per force (~250 linhas)
│   ├── evaluation-criteria.md  # 5 criteria + perguntas + 1 scoring example (~150 linhas)
│   ├── cross-domain.md         # Adaptação cross-domain (~80 linhas)
│   └── interaction-guide.md    # Workshop facilitation + warnings (~80 linhas)
```

### cali-go-stack (872 → ~300 linhas)

```
cali-go-stack/
├── SKILL.md                    # ~300 linhas (decision tree + key rules + feature modules)
├── references/
│   ├── (existing refs...)
│   ├── deploy/
│   │   ├── dockerfile.md        # Dockerfile template + ko explanation
│   │   ├── github-actions.md    # CI/CD pipeline templates
│   │   └── update-script.md     # Server update script
│   ├── datastar/
│   │   ├── (existing...)
│   │   ├── migration-checklist.md
│   │   └── troubleshooting.md   # Common Pitfalls + Troubleshooting
│   └── engineering-standards.md # Go-specific rules (HTML prohibition, DRY SSE, god functions)
```

### skill-creator e nlm-skill: NÃO MEXER

Mantidos como estão. São skills baixadas, não modificáveis.

---

## Fase 5: Classificar Skills por Frequência + Gerenciamento

### Metadata no frontmatter

Adicionar ao frontmatter de cada skill:

```yaml
---
name: cali-server-security
description: "..."
metadata:
  frequency: rare          # daily | weekly | monthly | rare
  category: infra          # product | code | infra | research | meta
  context-cost: medium     # low (<1K) | medium (1-3K) | high (3K+)
---
```

### Classificação completa

| Skill | frequency | category | context-cost | hiddenSkills? |
|---|---|---|---|---|
| cali-product-workflow | daily | product | medium | ❌ |
| cali-go-stack | daily | code | high | ❌ |
| cali-go-standards | daily | code | medium | ❌ |
| cali-coding-standards (nova) | daily | code | low | ❌ |
| cali-releases | weekly | infra | low | ❌ |
| cali-package-audit | weekly | infra | low | ❌ |
| cali-product-testing-execution | weekly | code | medium | ❌ |
| cali-product-shape-up | weekly | product | low | ❌ |
| cali-product-critique | weekly | product | low | ❌ |
| cali-product-tech-planning | weekly | product | low | ❌ |
| cali-product-scope-executor | weekly | product | low | ❌ |
| dogfood | weekly | code | medium | ❌ |
| cali-product-discovery | monthly | product | low | ❌ |
| cali-product-job-to-be-done | monthly | research | low | ✅ |
| cali-product-interface-brainstorm | monthly | product | low | ❌ |
| cali-agents-md-generator | monthly | meta | low | ❌ |
| cali-agents-md-validator | monthly | meta | low | ❌ |
| cali-product-testing-ai-code | monthly | code | medium | ❌ |
| cali-skill-validator | monthly | meta | low | ❌ |
| skill-creator | monthly | meta | high | ❌ (não mexer) |
| plannotator-compound | monthly | meta | high | ❌ |
| plannotator-setup-goal | monthly | meta | medium | ❌ |
| cali-product-evolutionary-principles | rare | research | medium (pós-refatoração) | ✅ |
| cali-product-multi-method-market-analysis | rare | research | low | ✅ |
| cali-product-opportunity-mapping | rare | research | medium | ✅ |
| cali-product-pricing | rare | research | low | ✅ |
| cali-product-ads | rare | research | low | ✅ |
| cali-product-trust-building | rare | research | low | ✅ |
| cali-product-promotions | rare | research | low | ✅ |
| cali-product-business-models | rare | research | low | ✅ |
| cali-product-health | rare | research | low | ✅ |
| cali-product-marketplace-playbook | rare | research | low | ✅ |
| cali-product-open-source | rare | research | low | ✅ |
| cali-questions-quality | rare | research | medium | ✅ |
| cali-server-security | rare | infra | low | ✅ |
| cali-deploy-github-tailscale | rare | infra | low | ✅ |
| cali-docker-server-dashboard | rare | infra | low | ✅ |
| cali-codebase-spec | monthly | meta | medium | ❌ |
| nlm-skill | rare | research | high | ✅ (não mexer) |
| cali-starhtml | rare | code | medium | ✅ |
| cali-starstream | rare | code | low | ✅ |
| generative-ui | rare | code | medium | ✅ |
| emulate | rare | infra | low | ✅ |
| github | rare | infra | medium | ✅ |
| google | rare | infra | low | ✅ |
| vercel | rare | infra | medium | ✅ |
| pocketbase | rare | code | medium | ✅ |
| pocketbase-best-practices | rare | code | low | ✅ |
| find-skills | rare | meta | low | ✅ |
| thermo-nuclear-code-quality-review | rare | code | low | ✅ |

### Configuração pi-skillful (settings.json)

```json
{
  "skillful": {
    "hiddenSkills": [
      "cali-product-job-to-be-done",
      "cali-product-evolutionary-principles",
      "cali-product-multi-method-market-analysis",
      "cali-product-opportunity-mapping",
      "cali-product-pricing",
      "cali-product-ads",
      "cali-product-trust-building",
      "cali-product-promotions",
      "cali-product-business-models",
      "cali-product-health",
      "cali-product-marketplace-playbook",
      "cali-product-open-source",
      "cali-questions-quality",
      "cali-server-security",
      "cali-deploy-github-tailscale",
      "cali-docker-server-dashboard",
      "nlm-skill",
      "cali-starhtml",
      "cali-starstream",
      "generative-ui",
      "emulate",
      "github",
      "google",
      "vercel",
      "pocketbase",
      "pocketbase-best-practices",
      "find-skills",
      "thermo-nuclear-code-quality-review"
    ]
  }
}
```

**Economia:** ~28 skills × ~100 tok = **~2.800 tok fixos economizados** no system prompt.

### Toggle slots para uso frequente

```json
{
  "skillful": {
    "hiddenSkills": ["..."],
    "toggleSlots": {
      "1": "cali-product-workflow",
      "2": "cali-go-stack",
      "3": "cali-coding-standards",
      "4": "cali-product-testing-execution",
      "5": "cali-releases"
    },
    "toggleModifier": "alt"
  }
}
```

---

## Fase 6: disable-model-invocation Cross-CLI

### Como pi-skillful funciona (descoberta técnica)

pi-skillful **programaticamente altera** `disableModelInvocation` em runtime:

```typescript
// skill-visibility.ts
hidden.has(skill.name) 
  ? { ...skill, disableModelInvocation: true } 
  : skill

// session-skill-toggles.ts  
disableModelInvocation: !isSkillActive(normalizeSkillName(skill.name))
```

Isso significa:
- **hiddenSkills** → `disableModelInvocation: true` (não aparece no system prompt)
- **toggleSlots active** → `disableModelInvocation: false` (visível)
- **toggleSlots inactive** → `disableModelInvocation: true` (oculto)
- **default (não configurado)** → valor original do frontmatter

### Estratégia Cross-CLI em 2 Camadas

**Camada 1: Frontmatter (fonte da verdade para todos os CLIs)**

Para skills `rare` + `context-cost: high`, adicionar no SKILL.md:
```yaml
---
name: cali-server-security
description: "..."
disable-model-invocation: true
---
```

Isso funciona em:
- ✅ Pi.dev (via agentskills.io spec)
- ✅ Claude Code (via frontmatter)
- ✅ Cursor (via frontmatter)
- ✅ VS Code Copilot (via agentskills.io spec)
- ⚠️ OpenAI Codex (parcial — project-level ainda não filtra global)

**Camada 2: pi-skillful (override dinâmico no pi.dev)**

pi-skillful OVERRIDES o frontmatter em runtime:
- Skills em `hiddenSkills` → forçado a `disableModelInvocation: true`
- Skills NÃO em `hiddenSkills` → mantém valor original do frontmatter
- Toggle slots → forçado baseado no estado active/inactive

**Fluxo completo:**

```
SKILL.md frontmatter: disable-model-invocation: true
        ↓
Pi.dev lê frontmatter → skill é hidden por padrão
        ↓
pi-skillful: hiddenSkills não a lista → skill fica visible (override)
        ↓
Usuario: alt+1 toggle → skill fica active/inactive
        ↓
Claude Code: lê frontmatter → skill é hidden (respeita standard)
        ↓
OpenAI Codex: lê frontmatter → skill é hidden (respeita standard)
```

### Regra para configurar disable-model-invocation

| frequency | context-cost | disable-model-invocation | hiddenSkills (pi.dev) |
|---|---|---|---|
| daily | any | ❌ false (default) | ❌ |
| weekly | any | ❌ false (default) | ❌ |
| monthly | low-medium | ❌ false (default) | ❌ |
| monthly | high | ✅ true | ❌ (pi-skillful gerencia) |
| rare | any | ✅ true | ✅ |

### Economia total

| Mecanismo | Economia |
|---|---|
| AGENTS.md enxugado | ~5.856 tok (6.655 → 800) |
| hiddenSkills (28 skills) | ~2.800 tok fixos |
| disable-model-invocation (cross-CLI) | ~2.800 tok para outros CLIs |
| Skills refatoradas (quando ativadas) | ~3.000 tok por ativação |
| **Total por sessão (pi.dev)** | **~8.656 tok economizados** |

---

## Ordem de Execução

| Fase | Dependências | Esforço | Impacto |
|---|---|---|---|
| **Fase 0:** Consolidar princípios | Nenhuma | Médio | Elimina duplicação |
| **Fase 1:** Enxugar AGENTS.md | Fase 0 (referencia nova skill) | Baixo | -5.856 tok/sessão |
| **Fase 2:** Renomear → generator | Nenhuma | Muito baixo | Clareza |
| **Fase 3:** Criar validator | Fase 2 (distingue generator de validator) | Médio | Qualidade AGENTS.md |
| **Fase 4:** Refatorar skills infladas | Fase 0 (consolida princípios) | Médio | -3.000 tok por ativação |
| **Fase 5:** Classificar + pi-skillful | Nenhuma | Baixo | -2.800 tok fixos |
| **Fase 6:** disable-model-invocation | Fase 5 (classificação define quais) | Muito baixo | Cross-CLI |

**Recomendação:** Executar Fases 0→1→2→5 primeiro (maior impacto, menor esforço). Fases 3→4→6 depois.

---

## Validação Final

Antes de marcar cada fase como completa:

1. **Fase 0:** Rodar `cali-skill-validator` na nova skill `cali-coding-standards`
2. **Fase 1:** Verificar que AGENTS.md tem <150 linhas e todas as seções essenciais
3. **Fase 2:** Verificar que todas as referências a `cali-agents-md` apontam para `cali-coding-standards`
4. **Fase 3:** Rodar `validate-agents-md.sh` no novo AGENTS.md — deve passar em todas as regras
5. **Fase 4:** Rodar `cali-skill-validator` nas skills refatoradas
6. **Fase 5:** Verificar que pi-skillful settings.json está correto
7. **Fase 6:** Testar disable-model-invocation em Claude Code e OpenAI Codex
