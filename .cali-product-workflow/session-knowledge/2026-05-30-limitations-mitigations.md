# Sessão: 2026-05-30 — Limitações, Transparência e Mitigações

> **Propósito:** Preservar decisões e análises feitas nesta sessão para refinar o README,
> arquitetura do delivery audit, e mensagens de transparência do cali-product-workflow.
> *Documento temporário — será usado como base para alterações reais após discussão.*

---

## 1. Pesquisa de 2026 — O que LLMs/frameworks ainda falham

### Problemas estruturais (afetam TODOS os frameworks)

| # | Problema | Evidência | Frameworks transparentes? |
|---|----------|-----------|---------------------------|
| 1 | **Context Rot** — compliance da LLM com as próprias regras cai de 73% (turno 5) → 33% (turno 16) | Gamage 2026, 4.416 trials | Nenhum (BMAD 47K⭐, Superpowers 183K⭐, SpecKit, GSD) |
| 2 | **80% Problem** — IA entrega CRUD funcional, omite error handling, security, observability, retry, circuit breakers | Osmani Jan 2026, GitClear 2025 (refactored 22%→10%, copy/paste 8.3%→12.3%) | Nenhum |
| 3 | **Constraint Decay** — agente viola progressivamente as regras que ele mesmo escreveu | arXiv 2026 | Nenhum |
| 4 | **Shallow Review Trap** — mesma IA escreve código E testes; green ≠ correct | Ox Security "Army of Juniors" 2025 | Nenhum |
| 5 | **Model Dependency** — qualidade varia drasticamente entre LLMs (Claude Opus ≠ Gemini Flash ≠ GPT-4o) | Veracode 2025 (45% código gerado contém falhas) | Nenhum |
| 6 | **Code Hallucination** — 20.41% das falhas são APIs/contratos inventados | arXiv 2024 | Nenhum |
| 7 | **80% Problem de pipelines** — pipeline não tem memória cross-session dos próprios padrões de falha | Flamehaven 2026 | Nenhum |
| 8 | **Plan Staleness** — plano gerado contra snapshot desatualizado do código | Superpowers Issue #989 | Issue aberta (não no README) |
| 9 | **Parent agent blocked** — paralelismo quebrado quando child espera aprovação | Superpowers Issue #1051 | Issue aberta |
| 10 | **Token limit output** — agente bate no limite de saída | Superpowers Issue #771 | Issue aberta |
| 11 | **Expertise Cliff** — IA falha em codebases maduros com conhecimento tácito | Tian Pan Mai 2026 | Nenhum |

### Evidências específicas

- **METR 2025:** Devs experientes ficam 19% MAIS lentos com IA (CI: +2% a +39%), apesar de prever 24% de speedup. 0% dos PRs de IA são mergeáveis como estão.
- **Faros AI 2025:** Times com alta adoção de AI interagem com 9% mais tarefas e 47% mais PRs/dia — mas atividade ≠ produtividade.
- **Cursor longitudinal:** 3-5x velocidade no mês 1, dissipa no mês 2. Static analysis warnings sobem 30%, code complexity 41%.
- **Stack Overflow 2025:** ~45% dos devs reportam que debugar código de IA é mais demorado que o esperado.
- **Anthropic Jan 2026:** Devs que usam IA pontuam 17% MENOS em testes de compreensão. Mas os que usam IA pra perguntar "por que?" em vez de "faça pra mim" pontuam igual ao grupo manual.

---

## 2. Análise: Delivery Audit standalone (fundir stage + post-execution)

### Situação atual

| Componente | Onde está | O que faz |
|------------|-----------|-----------|
| `delivery-audit.md` | `skills/cali-product-workflow/stages/` | Scope completeness, gap registry, lessons learned, decision matrix |
| `cali-post-execution-check` | `~/.agents/skills/` (standalone) | 5 fases: Plan Compliance, Implementation Quality, Edge Cases, Doc & Tests, Summary Report |

### Proposta de fusão

**Criar:** `skills/cali-product-delivery-audit/SKILL.md` — skill standalone com 2 modos:

```
Passo 1: Existe .cali-product-workflow/state/ + spec-tech.md?
  ├── SIM → Modo "Workflow Audit" (profundo)
  │   • Lê spec-tech.md (scopes planejados)
  │   • Scope-by-scope completeness
  │   • Gap registry + lessons learned (do delivery-audit)
  │   • Decision matrix (fecha/alerta)
  │   • + Edge Cases + Anti-Patterns (do post-execution)
  │
  └── NÃO → Modo "Standalone Audit" (adaptativo)
      • Analisa git diff, arquivos alterados recentemente
      • Quality check (imports, syntax, naming, anti-patterns)
      • Edge cases
      • Doc/test update check
      • Gap registry adaptativo
```

### O que substitui:
1. `stages/delivery-audit.md` → vira wrapper curto que chama a skill
2. `cali-post-execution-check` → deprecado, conteúdo migrado
3. Stage 14 no orchestrator → aponta pra nova skill

### Ganhos:
- Cobertura standalone: não só quality, mas gap registry + lessons learned
- Cobertura workflow: não só scopes, mas edge cases + anti-patterns
- Manutenção única (1 SKILL.md vs 3 lugares)
- Pode ser chamada de qualquer CLI, com ou sem workflow

### Trade-offs:
- Dois modos = mais código, mas branching simples (if file exists)
- Modo standalone sem plan pode ser mais superficial — mas melhor que hoje (que não existe)
- Perde lessons learned formal se não tem ciclo pra documentar

---

## 3. Propostas de implementação por limitação

### 3.1 Context Rot

| Ação | Arquivo | Instrução |
|------|---------|-----------|
| Fresh context check | `skills/cali-product-workflow/SKILL.md` | "⚠️ Se >15 turns ou LLM parece esquecer decisões, inicie novo chat e passe spec-product_v{N}.md" |
| Re-read from disk | `stages/execution.md` | "Leia spec-tech.md do disco. Não confie na memória da conversa." |
| Extra thorough audit | `skills/cali-product-delivery-audit/SKILL.md` (novo) | "Plan e execution podem estar no mesmo contexto degradado. Gap analysis deve ser extra cuidadosa." |
| No patching degraded | `skills/cali-product-workflow/SKILL.md` | "Se execution falhou ou produziu parcial, não peça correção no mesmo contexto. Crie novo goal." |

### 3.2 80% Problem (invisible 20%)

| Ação | Arquivo | Instrução |
|------|---------|-----------|
| NFR checklist per scope | `skills/cali-product-tech-planning/references/scopes-and-sequencing.md` | Cada scope listar: error handling, observability, security, retry/fallback |
| Verification 20% check | `stages/verification.md` | Checklist: □ Retry? □ Logging? □ Auth? □ Edges? □ Rollback? |
| Critique NFR detection | `skills/cali-product-critique/references/checklists.md` | Item "Invisible 20% Gap Detection" no sistema |

### 3.3 Model Dependency

| Ação | Arquivo | Instrução |
|------|---------|-----------|
| Track model in artifacts | `skills/cali-product-shape-up/SKILL.md` | "Generated by: {model_name}" no frontmatter do spec |
| Model provenance no gate | `stages/gate.md` | Mostrar qual modelo gerou cada artifact |
| README disclaimer | `README.md` | "Resultados dependem da LLM. Rastreamos proveniência." |

### 3.4 Partial Implementation & Doom Loops

| Ação | Arquivo | Instrução |
|------|---------|-----------|
| Partial detection | `skills/cali-product-scope-executor/SKILL.md` | "Se output truncado/erro, não corrija no mesmo turno. Fresh goal." |
| Subagent progress | `stages/execution.md` | "Documente gaps parciais no delivery audit em vez de re-executar no mesmo contexto." |

### 3.5 Shallow Review Trap

| Ação | Arquivo | Instrução |
|------|---------|-----------|
| Self-validation warning | `stages/verification.md` | "Testes foram escritos pela mesma IA que escreveu o código. Green ≠ correct." |
| Gate review depth | `stages/gate.md` | "Plannotator é visual. Não substitui code review humano." |

---

## 4. Decisões pendentes

- [ ] **Incluir cali-post-execution-check no projeto?** Análise acima recomenda fundir em cali-product-delivery-audit e deprecar a skill standalone.
- [ ] **Delivery audit standalone ou skill separada?** Recomendação: uma skill com 2 modos (workflow/standalone).
- [ ] **Inverter estágios 13 e 14?** Não — verification testa, depois audit audita. Faz sentido.
- [ ] **Como lidar com context rot na prática?** O workflow já salva artifacts em disco. O problema é o orchestrator reconhecer que está degradado e sugerir fresh session.

---

## 5. O que dizer no README (vs o que corrigir)

### O que DEVE estar no README (seja honesto):

```markdown
## ⚠️ Transparência: O que esta ferramenta NÃO resolve

Este workflow é uma ferramenta de amplificação de julgamento humano, não um
substituto. Ele força disciplina onde times pulam etapas. Mas a IA ainda:

- **Perde contexto** — quanto mais avança no workflow, mais a LLM esquece
  decisões anteriores. O delivery audit existe pra mitigar isso, mas não elimina.
- **Depende do modelo** — Claude Opus, Gemini 2.5 Flash e GPT-4o produzem
  planos de qualidade diferente. Resultados variam.
- **Gera soluções subótimas** — a IA propõe o que "funciona", não
  necessariamente o que é melhor pro seu contexto.
- **Implementa parcialmente** — nos estágios de execução, detalhes do plano
  são esquecidos. O supervisor ajuda, mas não garante.
- **Precisa de revisão humana** — todo output é rascunho. Trate cada artefato
  como um primeiro draft que precisa de olhos humanos.

Nenhum outro framework (BMAD 47K⭐, Superpowers 183K⭐) é honesto sobre
isso nos READMEs. Estamos sendo.
```

### O que PODEMOS dizer sobre as mitigações que implementamos:

```markdown
## Como mitigamos cada limitação

| Limitação | O que o workflow faz |
|-----------|---------------------|
| **Context rot** | Salvamos artifacts em disco a cada estágio. O delivery audit lê do disco, não da memória. Recomendamos fresh sessions entre estágios longos. |
| **80% Problem** | O Tech Planning exige NFRs por scope. A Verification tem checklist explícita do "invisible 20%". O Critique detecta gaps de NFR. |
| **Model dependency** | Rastreamos qual modelo gerou cada artifact no frontmatter dos specs. Você sabe o que esperar. |
| **Partial implementation** | Se execution falha, documentamos no gap registry em vez de tentar corrigir no contexto degradado. Novo goal = fresh context. |
| **Shallow review** | O Plannotator Gate é visual e independente. A Verification alerta que testes da própria IA não são prova de correção. |
| **Plan staleness** | Cada estágio lê o artifact do disco, não da memória da conversa. O plan é imutável entre estágios. |

⚠️ **Nenhuma dessas mitigações elimina os problemas — elas reduzem o impacto.**
**Review humano ainda é necessário.**
```

---

*Fim do documento temporário. Após decidir os pontos acima, refinaremos e implementaremos.*
