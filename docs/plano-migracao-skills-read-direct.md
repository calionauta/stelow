# Plano: Migrar Skills para Leitura Direta (Opção B)

**Data:** 2026-05-23
**Estratégia:** Ler SKILL.md diretamente em vez de usar `/skill:` para subskills

---

## 1. MAPEAMENTO COMPLETO DE REFERÊNCIAS

### 1.1 Referências ao Orchestrator (cali-product-workflow)

**Mantém `/skill:cali-product-workflow`** — É a skill root, fica no lugar certo.

| Arquivo | Linha | Contexto | Ação |
|---------|-------|----------|------|
| `extensions/cali-product-workflow/start.ts` | 192 | `"/skill:cali-product-workflow"` | ✅ Manter |
| `extensions/cali-product-workflow/start.ts` | 201 | `pi.sendUserMessage("/skill:cali-product-workflow\n\n...")` | ✅ Manter |
| `extensions/cali-product-workflow/commands.ts` | 282 | `pi.sendUserMessage("/skill:cali-product-workflow\n\n...")` | ✅ Manter |
| `extensions/cali-product-workflow/commands.ts` | 962 | `"/skill:cali-product-workflow"` (doc) | ✅ Manter |
| `extensions/cali-product-workflow/adapters/commands/dispatcher.ts` | 229 | `"/skill:cali-product-workflow"` (doc) | ✅ Manter |
| `scripts/init-workflow.sh` | 30 | `echo "Run /skill:cali-product-workflow to start"` | ✅ Manter |
| `scripts/setup.sh` | 76 | `echo "Use: /skill:cali-product-workflow"` | ✅ Manter |
| `tests/README.md` | 230 | `when('/skill:cali-product-workflow', [...])` | ✅ Manter |

---

### 1.2 Referências às Subskills (skills-workflow)

**MUDAR para leitura direta via `read()`**

| Skill | Arquivo | Linha | Referência Atual | Novo Formato |
|-------|---------|-------|------------------|--------------|
| **cali-shape-up** | `SKILL.md` (orchestrator) | 9 | `/skill:cali-shape-up` | `read("skills-workflow/cali-shape-up/SKILL.md")` |
| **cali-shape-up** | `SKILL.md` (orchestrator) | 111 | `delegate to subskills via /skill:` | `read("skills-workflow/{name}/SKILL.md")` |
| **cali-shape-up** | `cali-shape-up/SKILL.md` | 17 | `1. Standalone: /skill:cali-shape-up` | Atualizar doc para `read()` |
| **cali-plan-critique** | `SKILL.md` (orchestrator) | 11 | `/skill:cali-plan-critique` | `read("skills-workflow/cali-plan-critique/SKILL.md")` |
| **cali-plan-critique** | `cali-plan-critique/SKILL.md` | 14 | `1. Standalone: /skill:cali-plan-critique` | Atualizar doc |
| **cali-interface-brainstorm** | `SKILL.md` (orchestrator) | 10 | `/skill:cali-interface-brainstorm` | `read("skills-workflow/cali-interface-brainstorm/SKILL.md")` |
| **cali-interface-brainstorm** | `cali-interface-brainstorm/SKILL.md` | 16 | `1. Standalone: /skill:cali-interface-brainstorm` | Atualizar doc |
| **cali-tech-planning** | `SKILL.md` (orchestrator) | 12 | `/skill:cali-tech-planning` | `read("skills-workflow/cali-tech-planning/SKILL.md")` |
| **cali-tech-planning** | `cali-tech-planning/SKILL.md` | 15 | `1. Standalone: /skill:cali-tech-planning` | Atualizar doc |

---

### 1.3 Referências às Execution Skills

**MUDAR para leitura direta**

| Skill | Arquivo | Linha | Referência Atual | Novo Formato |
|-------|---------|-------|------------------|--------------|
| **cali-testing-ai-code** | `SKILL.md` (orchestrator) | 13, 218 | `/skill:cali-testing-ai-code` | `read("skills-execution/cali-testing-ai-code/SKILL.md")` |
| **cali-product-scope-executor** | `SKILL.md` (orchestrator) | 229, 233 | `/skill:cali-product-scope-executor` | `read("skills-execution/cali-product-scope-executor/SKILL.md")` |
| **cali-product-scope-executor** | `phases/execution.md` | 148, 155 | `/skill:cali-product-scope-executor` | `read("skills-execution/cali-product-scope-executor/SKILL.md")` |
| **cali-product-scope-executor** | `skills-execution/cali-product-scope-executor/SKILL.md` | 327, 336 | `/skill:cali-scope-executor` | Atualizar doc |

---

### 1.4 Referências a External Skills (autoresearch-create)

**MANTER `/skill:autoresearch-create`** — É uma skill externa, não está no nosso package.

| Arquivo | Linha | Referência Atual | Ação |
|---------|-------|------------------|------|
| `phases/execution.md` | 71, 72, 73, 94, 149, 169 | `/skill:autoresearch-create` | ✅ Manter (external) |
| `skills-workflow/cali-tech-planning/SKILL.md` | 161, 184 | `/skill:autoresearch-create` | ✅ Manter (external) |
| `scopes-and-sequencing.md` | 113 | `/skill:autoresearch-create` | ✅ Manter (external) |

---

### 1.5 Referências a Domain/Strategic Skills

**MANTER `/skill:cali-product-{name}`** — São skills standalone que usuário pode invocar diretamente.

| Arquivo | Linha | Referência Atual | Ação |
|---------|-------|------------------|------|
| `SKILL.md` (orchestrator) | 17-18 | `cali-product-pricing, cali-product-ads, etc.` | ✅ Manter (standalone) |
| `scripts/fix-readme.js` | 14, 42 | `/skill:cali-product-{name}` | ✅ Manter (documentação) |

---

### 1.6 Referências a External Skills (thermo-nuclear)

**MANTER `/skill:thermo-nuclear-code-quality-review`** — É skill externa.

| Arquivo | Linha | Referência Atual | Ação |
|---------|-------|------------------|------|
| `references/cli-tools/codequality-review.md` | 32 | `/skill:thermo-nuclear-code-quality-review` | ✅ Manter (external) |

---

## 2. RESUMO DAS ALTERAÇÕES

### 2.1 Arquivos a MODIFICAR (7 arquivos)

| # | Arquivo | Tipo de alteração |
|---|---------|-------------------|
| 1 | `skills/cali-product-workflow/SKILL.md` | Substituir `/skill:` das subskills por `read()` |
| 2 | `skills/cali-product-workflow/phases/execution.md` | Substituir `/skill:` do scope-executor |
| 3 | `skills/cali-product-workflow/skills-workflow/cali-shape-up/SKILL.md` | Atualizar doc standalone |
| 4 | `skills/cali-product-workflow/skills-workflow/cali-plan-critique/SKILL.md` | Atualizar doc standalone |
| 5 | `skills/cali-product-workflow/skills-workflow/cali-interface-brainstorm/SKILL.md` | Atualizar doc standalone |
| 6 | `skills/cali-product-workflow/skills-workflow/cali-tech-planning/SKILL.md` | Atualizar doc standalone |
| 7 | `skills/cali-product-workflow/skills-execution/cali-product-scope-executor/SKILL.md` | Atualizar doc standalone |

### 2.2 Arquivos a IGNORAR (não precisa mexer)

- ✅ Extensões (commands.ts, start.ts, dispatcher.ts) — Mantêm `/skill:cali-product-workflow`
- ✅ Scripts (init-workflow.sh, setup.sh) — São user-facing
- ✅ Docs de domain/strategic — Skills standalone externas
- ✅ External skills (autoresearch-create, thermo-nuclear) — Não estão no nosso package
- ✅ Testes — Testam o mecanismo, não o conteúdo

---

## 3. TEMPLATE DE SUBSTITUIÇÃO

### 3.1 Para o Orchestrator (SKILL.md principal)

**ANTES:**
```markdown
Sub-skills (4 workflow phases):
- /skill:cali-shape-up — Shape Up planning
- /skill:cali-interface-brainstorm — Interface brainstorming
- /skill:cali-plan-critique — Plan critique
- /skill:cali-tech-planning — Tech planning
- /skill:cali-testing-ai-code — AI-aware testing strategy
```

**DEPOIS:**
```markdown
Sub-skills (4 workflow phases):
These are internal skills bundled with this package. Read the SKILL.md directly:

- Shape Up planning: read `skills-workflow/cali-shape-up/SKILL.md`
- Interface brainstorming: read `skills-workflow/cali-interface-brainstorm/SKILL.md`
- Plan critique: read `skills-workflow/cali-plan-critique/SKILL.md`
- Tech planning: read `skills-workflow/cali-tech-planning/SKILL.md`
- AI-aware testing: read `skills-execution/cali-testing-ai-code/SKILL.md`

For execution:
- Scope executor: read `skills-execution/cali-product-scope-executor/SKILL.md`
```

### 3.2 Para a instrução de delegação

**ANTES:**
```markdown
Follow the sequence below. For phases 3-5 and 7, delegate to subskills via `/skill:`.
```

**DEPOIS:**
```markdown
Follow the sequence below. For phases 3-5 and 7, read the subskill SKILL.md directly:

1. Phase 3 (Shape): read `skills-workflow/cali-shape-up/SKILL.md`
2. Phase 4 (Critique): read `skills-workflow/cali-plan-critique/SKILL.md`
3. Phase 6 (Interface): read `skills-workflow/cali-interface-brainstorm/SKILL.md`
4. Phase 7 (Int. Gate): read `skills-workflow/cali-tech-planning/SKILL.md`

Follow the instructions in each file. Do NOT use /skill: for internal subskills.
```

### 3.3 Para as Subskills Standalone

**ANTES (em cada subskill):**
```markdown
This skill executes the Shape Up planning phase. It can be run:
1. **Standalone:** `/skill:cali-shape-up` — for quick shaping sessions
2. **Via Orchestrator:** Called by `/skill:cali-product-workflow`
```

**DEPOIS:**
```markdown
This skill executes the Shape Up planning phase.

## How to Load

This skill can be loaded in two ways:

### Via Orchestrator (recommended)
The orchestrator reads this file directly: `skills-workflow/cali-shape-up/SKILL.md`

### Standalone
To run standalone, the orchestrator (or user) reads this file and follows instructions inline.
There is no `/skill:` command — this is a bundled skill, not standalone.
```

---

## 4. GAP ANALYSIS

### 4.1 O que pode quebrar?

| # | Gap | Risco | Mitigação |
|---|-----|-------|-----------|
| G1 | LLM pode não saber ler paths relativos | Baixo | Documentar claramente o path |
| G2 | LLM pode tentar usar `/skill:` mesmo assim | Médio | Adicionar "DO NOT use /skill: for internal subskills" |
| G3 | Progressive disclosure não funciona | Baixo | Não é necessário para nosso caso |
| G4 | Autocomplete não funciona para subskills | Baixo | Não é standalone |

### 4.2 O que não pode quebrar?

| # | Requisito | Como garantir |
|---|-----------|---------------|
| R1 | `/skill:cali-product-workflow` funciona | ✅ Manter unchanged |
| R2 | Extensões continuam funcionando | ✅ Manter unchanged |
| R3 | User pode invocar domain skills standalone | ✅ Manter unchanged |
| R4 | External skills (autoresearch) funcionam | ✅ Manter unchanged |

---

## 5. DOUBLE CHECK

### 5.1 Verificar se todas as referências foram mapeadas

```bash
# Buscar todas as ocorrências de /skill: no projeto
grep -r "/skill:" --include="*.md" --include="*.ts" --include="*.js" \
  | grep -v "cali-product-workflow" \
  | grep -v "autoresearch" \
  | grep -v "thermo-nuclear" \
  | grep -v "tests/" \
  | grep -v "research/"
```

**Esperado:** Apenas as subskills que vamos mudar.

### 5.2 Verificar paths corretos

| Skill | Path atual | Path novo |
|-------|-----------|----------|
| cali-shape-up | `/skill:cali-shape-up` | `read("skills-workflow/cali-shape-up/SKILL.md")` |
| cali-plan-critique | `/skill:cali-plan-critique` | `read("skills-workflow/cali-plan-critique/SKILL.md")` |
| cali-interface-brainstorm | `/skill:cali-interface-brainstorm` | `read("skills-workflow/cali-interface-brainstorm/SKILL.md")` |
| cali-tech-planning | `/skill:cali-tech-planning` | `read("skills-workflow/cali-tech-planning/SKILL.md")` |
| cali-testing-ai-code | `/skill:cali-testing-ai-code` | `read("skills-execution/cali-testing-ai-code/SKILL.md")` |
| cali-product-scope-executor | `/skill:cali-product-scope-executor` | `read("skills-execution/cali-product-scope-executor/SKILL.md")` |

---

## 6. PRÓXIMOS PASSOS

1. [ ] Criar backup dos arquivos a modificar
2. [ ] Modificar `SKILL.md` do orchestrator (line 9-13, 111, 218, 229, 233)
3. [ ] Modificar `phases/execution.md` (line 148-155, 169)
4. [ ] Modificar cada subskill standalone doc (4 arquivos)
5. [ ] Modificar `cali-product-scope-executor/SKILL.md`
6. [ ] Rodar double check com grep
7. [ ] Testar em sessão limpa

---

*Plano gerado: 2026-05-23*
