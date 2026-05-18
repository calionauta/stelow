# Plan: Refatorar cali-product-workflow em Subskills

**Date:** 2026-05-18  
**Status:** Draft for Plannotator Review (v2 - addressing feedback)  
**Author:** Cali (pi-agent)

---

## 🎯 Objective

Transformar o `cali-product-workflow` monolith (que referencia procedures e references internamente) em **subskills independentes** que podem ser carregadas individualmente, mantendo as mesmas capacidades mas com maior modularidade e reusabilidade.

---

## 🔍 Research Summary

### Current State

```
skills/
├── workflow/
│   └── cali-product-workflow/          # SKILL.md principal (8695 bytes)
│       ├── procedures/                 # 8 phase procedures
│       │   ├── phase-1-setup.md
│       │   ├── phase-2-context.md
│       │   ├── phase-3-shape.md
│       │   ├── phase-4-interface.md
│       │   ├── phase-5-critique.md
│       │   ├── phase-6-gate.md
│       │   ├── phase-7-tech-planning.md
│       │   └── phase-8-execution.md
│       └── references/                 # Domain references (subdivided)
│           ├── shape-up/               # 6 files
│           ├── interface/              # 7 files
│           ├── plan-critique/          # 6 files
│           ├── tech-planning/          # 4 files
│           ├── environment-adaptation.md
│           └── output-expectations.md
├── strategic-analysis/                 # 5 standalone skills
│   ├── cali-product-short-cycle/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-evolutionary-principles/
│   └── cali-product-multi-method-market-analysis/
└── domain-libraries/                  # 8 standalone skills
    ├── cali-product-ads/
    ├── cali-product-pricing/
    └── ... (6 more)
```

### How Skills Work (pi.dev)

1. **Discovery:** Pi scans `skills/` dirs recursively for `SKILL.md` files
2. **Loading:** At startup, only `name` + `description` enter context
3. **Activation:** On match, full `SKILL.md` is loaded via `read` tool
4. **References:** Use relative paths from skill root

**Key insight from Agent Skills spec:**
> "When a skill supports multiple domains/frameworks, organize by variant... Claude reads only the relevant reference file."

This suggests nested structure WITHIN a skill is the intended pattern — not splitting into separate skills.

### Chaining Patterns (rpiv-pi reference)

The rpiv-pi project demonstrates skill chaining:
```
/skill:discover → /skill:research → /skill:design → /skill:plan → /skill:implement
```

Each skill produces an artifact consumed by the next. This is a **horizontal** chain (sequential), different from our **vertical** phases within one workflow.

---

## 🚀 Proposed Architecture

### Option A: Subskills as Separate Skill Directories (Similar to rpiv-pi)

Sim, é similar ao **rpiv-pi** que faz chain sequencial de skills.
**Diferença crucial:** O rpiv-pi usa chain **horizontal** (sequencial, cada skill produz artifact pro próximo). Nossa proposta é **vertical** (mesmo workflow, mas fases são carregáveis independentemente).

```
skills/
├── workflow/
│   ├── cali-shape-up/              # NEW: Can be triggered independently
│   │   └── /skill:cali-shape-up
│   ├── cali-interface-brainstorm/   # NEW: Can be triggered independently
│   │   └── /skill:cali-interface-brainstorm
│   ├── cali-plan-critique/         # NEW: Can be triggered independently
│   │   └── /skill:cali-plan-critique
│   ├── cali-tech-planning/          # NEW: Can be triggered independently
│   │   └── /skill:cali-tech-planning
│   └── cali-product-workflow/       # Orchestrator: coordinates subskills
│       └── /skill:cali-product-workflow (loads subskills in sequence)
```

**Como funciona:**
1. User chama `/skill:cali-product-workflow` para executar o workflow completo
2. O orchestrator gerencia a sequência de fases
3. Cada fase delega para a skill específica via `/skill:cali-shape-up`, etc.
4. Cada subskill pode ser chamada **independentemente** se o usuário quiser executar só aquela fase

### Chain Horizontal vs Vertical: Análise

| Aspecto | Chain Horizontal (rpiv-pi) | Chain Vertical (Proposta)
|---|---|---|
| **Acoplamento** | Alto - cada skill depende do output do anterior | Baixo - skills são independentes
| **Flexibilidade** | Baixa - deve seguir sequência rígida | Alta - pode executar qualquer fase
| **Testabilidade** | Média - depende de chain completo | Alta - cada skill testável isoladamente
| **Reusabilidade** | Baixa - skill só faz sentido no chain | Alta - skill standalone
| **User Experience** | Sequência clara mas rígida | Mais choices, mais complexo

**É possível implementar chain horizontal?** Sim! Seria:
```
/skills:cali-shape-up → artifact → /skill:cali-interface-brainstorm → artifact → /skill:cali-plan-critique...
```

**Prós do chain horizontal:**
- Mais simples de entender (pipeline claro)
- Menos decisões para o usuário (flow automático)
- Sem ambiguidade sobre dependências

**Contras:**
- Perde flexibilidade (não pode pular fases)
- Não pode executar fase isolada
- Se uma fase quebra, todo chain precisa ser refeito

**Recomendação:** Manter **vertical** com orchestrator. O workflow atual já tem "auto-chaining rules" que determinam sequências. A diferença é que cada fase é uma skill carregável. Isso preserva:
- Auto-chaining (automático após escolha inicial)
- Flexibilidade (pode executar qualquer fase)
- Independência (testar uma phase sem as outras)

### Option B: Single Skill with Clear References (Current Optimized)

Keep `cali-product-workflow` as the orchestrator but clarify the subskill pattern:

```
cali-product-workflow/
├── SKILL.md                        # Orchestrator with explicit references
├── phases/                         # Renamed from "procedures"
│   ├── setup.md
│   ├── shape-up.md
│   ├── interface.md
│   ├── critique.md
│   ├── gate.md
│   ├── tech-planning.md
│   └── execution.md
├── references/
│   └── [keep structure as-is]
└── assets/
    └── [templates, if any]
```

---

## 📋 Detailed Refactoring Plan (Option A)

### Orchestrator Responsibilities (cali-product-workflow)

O orchestrator **NÃO executa** as fases diretamente. Ele:
- Gerencia a sequência de fases
- Mantém as safety rules (Review Gate é obrigatório)
- Chama subskills via `/skill:` commands
- Mantém estado cross-skill (paths, versions)
- Define auto-chaining rules

### Sub-skill Responsibilities

Cada subskill:
- Executa sua fase de forma independente
- Pode ser carregada diretamente via `/skill:`
- Tem suas próprias references
- Referencia o orchestrator para contexto cross-skill

### Phase 1: Create Individual Phase Skills

1. **Create `cali-shape-up` skill**
   - Move `procedures/phase-3-shape.md` → `cali-shape-up/SKILL.md`
   - Move `references/shape-up/*` → `cali-shape-up/references/`
   - Update description to trigger independently
   - Add cross-references to related skills

2. **Create `cali-interface-brainstorm` skill**
   - Move `procedures/phase-4-interface.md` → `cali-interface-brainstorm/SKILL.md`
   - Move `references/interface/*` → `cali-interface-brainstorm/references/`
   - Add references to Shape Up output format

3. **Create `cali-plan-critique` skill**
   - Move `procedures/phase-5-critique.md` → `cali-plan-critique/SKILL.md`
   - Move `references/plan-critique/*` → `cali-plan-critique/references/`
   - Include audit/critique frameworks

4. **Create `cali-tech-planning` skill**
   - Move `procedures/phase-7-tech-planning.md` → `cali-tech-planning/SKILL.md`
   - Move `references/tech-planning/*` → `cali-tech-planning/references/`
   - Add execution routing patterns

### Phase 2: Update Workflow Orchestrator

5. **Refactor `cali-product-workflow` as orchestrator**
   - Keep as the main entry point (`/skill:cali-product-workflow`)
   - **Orchestrator responsibilities:**
     - Phase sequence management
     - Auto-chaining rules
     - Safety rules (Review Gate is mandatory)
     - Calls subskills via `/skill:cali-shape-up`, etc.
   - **Subskill responsibilities:**
     - Independent execution of their phase
     - Can be triggered directly OR from orchestrator
   - This is similar to how rpiv-pi chains skills but with the orchestrator coordinating

### Phase 3: Update Procedures

6. **Update phase procedures**
   - Phase 1: Can reference Shape Up as external skill
   - Phase 2: Explicitly use strategic analysis skills
   - Phase 3-7: Delegate to `/skill:cali-shape-up`, etc.
   - Phase 6: Keep gate as part of workflow (it's meta)

7. **Update SKILL.md of each new skill**
   - Add frontmatter (`name`, `description`)
   - Add cross-references to workflow orchestrator
   - Include "Part of cali-product-workflow" note

---

## 📝 File Mapping

| Original | New Location | Skill |
|---|---|---|
| `procedures/phase-1-setup.md` | `cali-product-workflow/phases/setup.md` | orchestrator |
| `procedures/phase-2-context.md` | `cali-product-workflow/phases/context.md` | orchestrator |
| `procedures/phase-3-shape.md` | `cali-shape-up/SKILL.md` | **new** |
| `procedures/phase-4-interface.md` | `cali-interface-brainstorm/SKILL.md` | **new** |
| `procedures/phase-5-critique.md` | `cali-plan-critique/SKILL.md` | **new** |
| `procedures/phase-6-gate.md` | `cali-product-workflow/phases/gate.md` | orchestrator |
| `procedures/phase-7-tech-planning.md` | `cali-tech-planning/SKILL.md` | **new** |
| `procedures/phase-8-execution.md` | `cali-product-workflow/phases/execution.md` | orchestrator |
| `references/shape-up/*` | `cali-shape-up/references/*` | **new** |
| `references/interface/*` | `cali-interface-brainstorm/references/*` | **new** |
| `references/plan-critique/*` | `cali-plan-critique/references/*` | **new** |
| `references/tech-planning/*` | `cali-tech-planning/references/*` | **new** |

---

## ✅ Benefits of This Refactoring

1. **Independent Loading:** Each phase can be triggered directly (`/skill:cali-shape-up`)
2. **Better Discoverability:** Skills appear in `/skill:` list with their own descriptions
3. **Reusability:** Shape Up skill can be used standalone for quick shaping sessions
4. **Modular Testing:** Each skill can be evaluated independently
5. **Clearer Ownership:** Each skill has its own references, reducing cognitive load

---

## ⚠️ Considerations

1. **Cross-skill references:** Need to maintain references between skills
   - Use relative paths: `../cali-shape-up/SKILL.md`
   - Or skill commands: `/skill:cali-shape-up` to load skill directly

2. **Version synchronization:** If a shared concept (e.g., "scope types") changes in one skill, other skills referencing it might become outdated. 
   - **Mitigation:** Keep shared concepts in the orchestrator or a common reference file
   - Each subskill should be self-contained for its phase
   - Only cross-skill state (like the spec file path) lives in the orchestrator

3. **Artifact path consistency:** Must maintain `.cali-product-workflow/` path convention across skills
   - All skills write to the same artifact directory
   - Orchestrator defines the path structure; subskills follow it

---

## 🛠 Implementation Steps

1. [ ] Create new skill directories under `skills/workflow/`
2. [ ] Copy/move SKILL.md content for each phase
3. [ ] Copy/move references to new locations
4. [ ] Update frontmatter (name, description) for each new skill
5. [ ] Add cross-references between skills
6. [ ] Refactor orchestrator to use `/skill:` commands
7. [ ] Update strategic analysis skills to add references to workflow
8. [ ] Test skill loading and chaining
9. [ ] Update package.json if needed

---

**Questions for Review:**
1. Does this architecture match your intent for subskill loading?
2. Should phases like "Setup" and "Gate" remain in orchestrator or become skills?
3. How should cross-skill artifact paths be managed?