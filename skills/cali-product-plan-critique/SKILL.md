---
name: cali-product-plan-critique
description: >
  [Cali] Systematic gap analysis for product plans. Accepts a spec-product.md file and
  evaluates flows, states, affordances, data handling, system contracts, and feasibility
  — then generates a classified gap report with actionable questions.
  Part of cali-product-workflow (`critique` stage) but usable standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: medium
---

# Plan Critique

> **Foco:** Analisar criticamente um plano de produto (`spec-product.md`) para encontrar
> ambiguidades, gaps, riscos e definições faltantes antes da implementação.
> **Input:** `spec-product.md` (único).
> **Saída:** Relatório classificado com gaps (🚨/🤔/🔎) + perguntas acionáveis.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

Systematic gap analysis for product plans — finds ambiguities, risks, and missing definitions
before implementation. Every finding becomes a specific, actionable question.

## Visão Geral

Esta skill executa uma **análise sistemática de gaps** em planos de produto usando 6 checklists
especializadas:

| Checklist | O que avalia |
|-----------|-------------|
| 🌀 **Flows** | Fluxo principal, alternativo, erro, rollback, sincronização |
| 🎯 **States** | Empty, loading, partial, error, boundary, edge |
| 👆 **Affordances** | Hover/focus/disabled states, touch targets, keyboard nav |
| 📊 **Data** | Validação, defaults, null handling, persistência |
| 🔧 **System** | API contracts, timeouts, retry, fallback, offline |
| ⚖️ **Feasibility** | Arquitetura, stack, segurança, effort estimation |

**Regra fundamental:** Cada gap encontrado vira uma **pergunta específica e acionável** —
nunca uma crítica vaga. O objetivo é destravar o time de implementação, não atrasá-lo.

## Como Ativar

### Standalone
```
Recebi um spec-product.md e quero revisar antes de implementar.
```

### Via cali-product-workflow (`critique` stage)
O workflow carrega esta skill automaticamente após o Tech Planning, antes do Plannotator.

### Via cali-product-tech-planning
Antes de gerar os scopes técnicos, o tech-planning chama esta skill para garantir
que o plano está sólido.

---

## 🔀 Input Detection

```
Input recebido:
  ├── É spec-product*.md?
  │   └→ ✅ Mode: Plan Critique
  └── É outro tipo de arquivo?
      └→ ❌ Não é o input correto — use cali-product-codebase-critique ou cali-product-ux-critique
```

---

## Como Executar

### 1. Read the plan

Read the full `spec-product.md` to understand the proposal scope, appetite, IN/OUT boundaries,
and implementation constraints.

### 2. Read reference files

| File | Covers |
|------|--------|
| `references/plan-critique-context.md` | Role, when to use, workflow position, output expectations |
| `references/checklists.md` | 6 checklists (flows, states, affordances, data, system, feasibility) |
| `references/auto-resolve-rules.md` | Rules for auto-resolving gaps with defaults |
| `references/output-format.md` | Formato do relatório |

### critique:30 — Run parallel subagents (4 dimensions)

Instead of a single reviewer running all 6 checklists, launch 4 parallel reviewers
using the subagents tool (see `references/cli-tools/subagents.md`),
each evaluating a different dimension of the same spec-product.md with fresh context.

```
Launch 4 parallel reviewers:
  A: Flows + States → critiques/critique-flows-states.md
  B: Data + System   → critiques/critique-data-system.md
  C: Affordances + UX → critiques/critique-affordances-ux.md
  D: Feasibility      → critiques/critique-feasibility.md

Each reads checklists.md from references/, outputs per output-format.md,
and auto-resolves clear defaults per auto-resolve-rules.md.
```

> **Error recovery:** If any parallel subagent fails, retry once per the
> retry pattern in `references/cli-tools/subagents.md`. If it fails again,
> log as SKIPPED and proceed with remaining dimensions. A missing dimension
> is better than a deadlocked workflow.

### critique:40 — Consolidate critique reports

After all 4 parallel reviews complete, run a consolidation step using the
subagents tool (see `references/cli-tools/subagents.md`) that merges them
into a single unified report:

```
Agent: worker
Task: Consolidate critique reports
Read: critiques/critique-{flows-states,data-system,affordances-ux,feasibility}.md
Output: critiques/critique-report.md (per output-format.md)
```
- Apply gap classification per table below

Output: a single critique-report.md ready for the Review Gate.
Save to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/critique-report.md`,
  reads: [
    "critiques/critique-flows-states.md",
    "critiques/critique-data-system.md",
    "critiques/critique-affordances-ux.md",
    "critiques/critique-feasibility.md"
  ],
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/critique-report.md"
})
```

### 4. Gap Classification

| Tag | Severity | Action |
|-----|----------|--------|
| 🚨 **Critical** | Blocking — missing essential definition | Must resolve before gate |
| 🤔 **Important** | Significant gap or risk | Should resolve before gate |
| 🔎 **Minor** | Polish or nice-to-have | Note for execution |

### 5. Resolve Mode

**Auto mode (default):** For each gap, check `auto-resolve-rules.md`. If the gap has
a clear best-practice default, apply it automatically and mark "resolved by default."
Only flag genuinely ambiguous gaps as unresolved.

---

## Output

```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/
  critique-flows-states.md     ← parallel reviewer 1
  critique-data-system.md      ← parallel reviewer 2
  critique-affordances-ux.md   ← parallel reviewer 3
  critique-feasibility.md      ← parallel reviewer 4
  critique-report.md           ← consolidated (single unified report)
```}

---

## Integração com outras skills

### cali-product-workflow (`critique` stage)

```
critique: Critique Gate
  └── cali-product-plan-critique (input: spec-product.md)
       ├── 6 checklists → gap report
       └── Auto-resolve → updated spec-product.md
```

### cali-product-tech-planning

Antes de gerar scopes, o tech-planning pode invocar esta skill para verificar
se o plano está suficientemente sólido.

### cali-product-shape-up

Após o shape-up produzir o spec-product, esta skill faz a revisão crítica antes
de seguir para tech planning.

---

## Related Skills

- **cali-product-ux-critique**: For visual/interface critique (use instead when you have a URL, codebase, or screenshot)
- **cali-product-codebase-critique**: For codebase architecture critique (use instead when you have a code directory)
- **cali-product-execution-critique**: Post-implementation audit (runs after execution to verify completeness)
