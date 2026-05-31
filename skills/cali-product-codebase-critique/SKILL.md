---
name: cali-product-codebase-critique
description: >
  [Cali] Structural critique for codebases. Accepts a directory of source code and
  evaluates architecture, data flow, API contracts, performance, theming, responsive
  patterns, and AI slop in code — then generates a classified gap report.
  Part of cali-product-workflow (pre-implementation codebase review) but usable standalone.
  For codebases with visual UI, use cali-product-ux-critique instead.
metadata:
  frequency: weekly
  category: code
  context-cost: medium
---

# Codebase Critique

> **Foco:** Analisar criticamente a estrutura de um código-fonte — arquitetura,
> data flow, contratos, performance e anti-patterns.
> **Input:** Diretório de código-fonte.
> **Saída:** Relatório classificado com gaps (🚨/🤔/🔎) + recomendações.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

Structural codebase critique — evaluates architecture, data flow, API contracts, performance,
theming, responsive patterns, and AI slop in code.

## Visão Geral

Esta skill executa uma auditoria de código-fonte usando checklists focadas em
aspectos técnicos e estruturais (não visuais):

| Dimensão | O que avalia |
|----------|-------------|
| 🏗️ **Architecture** | Module structure, dependency flow, coupling |
| 🔄 **Data Flow** | Call chains, state management, event propagation |
| 📡 **System Contracts** | API definitions, error handling, logging |
| ⚡ **Performance** | Bundle size, re-renders, lazy loading |
| 🎨 **Theming** | Design tokens, dark mode support |
| 📱 **Responsive** | CSS breakpoints, media queries |
| 🤖 **AI Slop in Code** | Over-generated patterns, redundant code, boilerplate |

**Importante:** Esta skill é para análise de código-fonte de componentes e lógica.
Se você precisa de auditoria visual de UI (acessibilidade, design, UX), use
`cali-product-ux-critique` em Codebase mode.

### Appetite Gate (auto-skip for small scopes)

**Before running codebase critique**, check if appetite warrants it.
Codebase critique is for structural analysis — if the scope is 1 file,
the value is minimal.

```bash
# Read appetite from context (passed by orchestrator or inferred from scope count)
# Default to Focused if unknown
APPETITE="${APPETITE:-Focused}"
DIFF_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')
```

| Appetite | Files changed | Action |
|----------|--------------|--------|
| `PoC` | any | **Skip.** 1 file does not need structural critique. |
| `Focused` | 1-2 | **Skip.** Review via subagent is sufficient. |
| `Focused` | 3+ | **Quick critique.** Single reviewer, no parallel. |
| `Comprehensive` | any | **Normal.** One reviewer analyzes all dimensions with detailed recommendations. |

**Rationale:** Codebase critique analyzes architecture, coupling, and data flow.
For 1 new file or 2 changed files, the cost of structural critique
outweighs the benefit — code review already covers correctness.

### Standalone
```
Recebi um diretório de código e quero revisar a arquitetura.
```

### Via cali-product-scope-executor
Quando um scope técnico é executado e precisa de revisão de código-fonte.

### Via cali-product-workflow (Stage Verification)
O stage `code-review` delega para esta skill.

---

## 🔀 Input Detection

```
Input recebido:
  ├── É um diretório com código-fonte (sem UI visual)?
  │   └→ ✅ Mode: Codebase Critique
  └── É um diretório que contém componentes visuais?
      └→ Use cali-product-ux-critique (Codebase mode) — também cobre arquitetura
```

---

## Como Executar

### 1. Discover structure

```bash
find {INPUT_PATH} -maxdepth 3 -type f \( -name "*.templ" -o -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" -o -name "*.html" \) | head -50
```

### 2. Read reference files

| File | Covers |
|------|--------|
| `references/codebase-audit-dimensions.md` | Architecture, Data Flow, System, Performance, Theming, Responsive, AI Slop |
| `references/auto-resolve-rules.md` | Rules for auto-resolving gaps with defaults |
| `references/output-format.md` | Formato do relatório |

### 3. Run critique via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to critique the codebase:

```
Agent: reviewer
Task: Critique codebase (Codebase mode)
Reads: references/*.md
Input: {INPUT_PATH}
```
- codebase-audit-dimensions.md: Run ALL dimensions systematically:
  1. Architecture — module structure, dependency direction, coupling, abstraction layers
  2. Data Flow — call chains, state management (global vs local), event propagation
  3. System Contracts — API interfaces, error handling (typed vs untyped), logging patterns
  4. Performance — bundle size indicators, re-render triggers, lazy loading, memoization
  5. Theming — design tokens (CSS vars vs hardcoded values), dark mode coverage
  6. Responsive — media queries, breakpoint strategy, container queries
  7. AI Slop in Code — over-generated code, duplicate patterns, dead code, unnecessary
     abstraction, large identical blocks (>15 lines repeated)

For each issue: severity (P0/P1/P2/P3), what was observed, which dimension flagged it,
  actionable recommendation. Note if issue is structural (hard to fix) or cosmetic (easy fix).

Output per output-format.md.
Save to .cali-codebase-critique/critique-report.md.

### 4. Gap Resolution

| Severidade | Ação |
|------------|------|
| **P0 — Blocking** | Corrigir imediatamente (ex: security, data loss) |
| **P1 — Major** | Corrigir antes do release |
| **P2 — Minor** | Próximo ciclo |
| **P3 — Polish** | Se houver tempo |

---

## Output

```
.cali-codebase-critique/
  critique-report.md     ← gap report
```

---

## Integração com outras skills

### cali-product-scope-executor

Quando um scope técnico é executado, o executor pode delegar a verificação
de código para esta skill.

### cali-product-workflow (Stage Verification)

O stage `code-review` delega para esta skill quando o input é um código-fonte
não-visual.

---

## Related Skills

- **cali-product-ux-critique**: For visual/interface critique (use instead when you have UI)
- **cali-product-plan-critique**: For product plan critique (use instead when you have spec-product.md)
- **cali-product-execution-critique**: Post-implementation audit
