# Investigação — Sessão Mobile Adaptativo (2026-05-22)

**Objetivo:** Investigar falhas no workflow de product-workflow durante sessão em worktree, documentar hipóteses e propor soluções.

---

## Contexto da Sessão

**Sessão:** `/Users/cali/.pi/agent/sessions/--Users-cali-Library-Application Support-Muxy-worktree-checkouts-52A56F1F-DB92-452E-AB09-D94772CD03E5-mobile-adaptative--/2026-05-22T20-28-50-679Z_019e5160-5e77-7025-8b60-5ace4d955520.jsonl`

**O que aconteceu:**
1. Usuário chamou `/skill:cali-product-workflow` → "quero fazer o sistema funcionar em tela"
2. Workflow executou 11 fases
3. Goal criado via ordered-execution-goal (sistema automático)
4. Goal completado, auditor aprovou (2ª tentativa)

---

## Problemas Identificados

### P1: Footer de fases não apareceu

**O que deveria acontecer:**
- TUI do pi mostrar `[pw] workflow-name  │  ◆ Phase N/11`
- Extensão `cali-product-workflow` atualizar footer via `updateFooter()` e `notifyPhase()`

**O que aconteceu:**
- Nenhuma fase visível no footer durante execução

**Hipóteses:**

| # | Hipótese | Probabilidade | evidência |
|---|----------|---------------|-----------|
| H1 | Extensão não carregou | Alta | Extension auto-discovered de `~/.pi/agent/extensions/` ou `.pi/extensions/`, mas skill está em `~/.agents/skills/` |
| H2 | Hook não executou em worktree | Alta | worktree pode isolar eventos de extensão |
| H3 | `pi-goal-state` sobrescreveu `workflow-state` | Média | Goal foi criado ANTES da extensão atualizar footer |
| H4 | `currentPhase` não sincronizou com TUI | Média | Código em `ui.ts:129-137` pode não ter sido chamado |

**Verificação necessária:**
```bash
# 1. Verificar se extensão existe no path correto
ls ~/.pi/agent/extensions/

# 2. Verificar se extensão carregou em worktree
cd /Users/cali/Library/Application\ Support/Muxy/worktree-checkouts/52A56F1F-DB92-452E-AB09-D94772CD03E5/mobile-adaptative
pi --version

# 3. Iniciar workflow e verificar footer
pi /skill:cali-product-workflow
# observar se footer mostra fases
```

**Solução proposta:**
1. Criar `~/.pi/agent/extensions/cali-product-workflow/` (symlink ou copy)
2. Adicionar no hook de mensagem sync entre `pi-goal-state` e `workflow-phase`
3. Testar em worktree para validar

---

### P2: Sisyphus usado onde não deveria perguntar

**O que está documentado:**
- `goals.md`: "DO NOT ask 'Create ordered-execution-goal?' — execução automática após Tech Planning"
- Mas na prática o sistema criou goal via `/sisyphus` (com discussão implícita)

**Do README do pi-goal:**
```
/sisyphus <topic>       Discuss/grill a Sisyphus-style goal, then confirm a draft
/sisyphus-set <objective> Immediately create and start a Sisyphus-style goal
```

**Contexto do workflow:**
- Após Tech Planning, o plano já está aprovado
- **Não deveria haver discussão adicional**
- Deveria usar `/sisyphus-set` para iniciar imediatamente

**Hipótese:**
- O workflow usou `/sisyphus` (com confirmação) ao invés de `/sisyphus-set` (sem confirmação)
- Isso pode ter causado delay desnecessário

**Solução proposta:**
1. Atualizar `skills/cali-product-workflow/phases/execution.md`:
   - Trocar `/sisyphus` → `/sisyphus-set`
   - Adicionar nota: "Use sisyphus-set para execução automática após Tech Planning"
2. Atualizar `goals.md`: mesma alteração

---

### P3: Pergunta com 5 opções deu validation failed

**O que aconteceu:**
- Sessão tentou usar `ask_user_question` com 5 opções para Strategic Exploration (Phase 2)
- Erro: `"questions.0.options: must have at most 4 items"`
- Agente reduziu para 4, mas informação pode ter sido perdida

**Documentado em `ask-patterns.md:23`:**
```
`ask_user_question` supports:
- **2-6 options** per question (MAX_OPTIONS = 6)
```

**Hipótese:**
- A versão da CLI na sessão tinha limite de 4 opções
- A skill atualizada para 6, mas CLI desatualizada

**Alternativa para Future:**
Se tool não permite N opções:
1. **Single-select (>4):** Dividir em 2 perguntas sequenciais
2. **Multi-select (>4):** Duas etapas (domínio + abordagem)

**Regra a implementar em `ask-patterns.md`:**
```markdown
## Limite de Options

Antes de chamar `ask_user_question`:
1. Verificar se N opções é suportado
2. Se validation failed:
   - Single-select >4: dividir em 2 perguntas
   - Multi-select >4: "Quais domínios?" depois "Quais abordagens?"

Para Interface Brainstorming (5 + 1 híbrido):
- Etapa 1: mostrar 5 geradas
- Etapa 2: criar híbrida baseada nas escolhidas
```

---

### P4: Subagent cali-shape-up falhou (402)

**O que aconteceu:**
- Sessão tentou usar `subagent({ agent: "cali-shape-up" })`
- Erro: `402` (budget esgotado)
- Agente fez fallback manual

**Hipótese:**
- Subagent tentou usar modelo sem budget disponível
- Agente root tinha budget diferente e executou manualmente

**Problema adicional:**
- Subagent procurar skill em `~/.agents/skills/` por default
- Mas `cali-shape-up` está em `~/.agents/skills/cali-product-workflow/skills-workflow/`

**Por que não encontrou?**
Do docs de skills:
> "Skill name collision resolution is based on arbitrary scan order"

O subagent pode ter procurado errado path ou usado versão desatualizada.

**Soluções:**
1. Usar `/skill:cali-shape-up` (ativa skill diretamente, não subagent)
2. Especificar path completo: `subagent({ skill: "cali-product-workflow/cali-shape-up" })`
3. Adicionar fallback no workflow: se subagent falhar, executar fase manualmente

---

## Resumo — Ações Prioritárias

| # | Prioridade | Ação | Arquivo |
|---|------------|------|---------|
| 1 | Alta | Criar symlink extensão em `~/.pi/agent/extensions/` | Setup |
| 2 | Alta | Testar extensão em worktree (verificar footer) | Test |
| 3 | Alta | Trocar ordered-discussion-goal → ordered-execution-goal na execução | `execution.md`, `goals.md` |
| 4 | Média | Adicionar sync entre `pi-goal-state` e `workflow-phase` | `index.ts` |
| 5 | Média | Adicionar regra de fallback para `ask_user_question` | `ask-patterns.md` |
| 6 | Baixa | Documentar path de skills para subagent | `execution.md` |

---

## Comandos de Verificação

```bash
# Verificar extensão
ls ~/.pi/agent/extensions/

# Verificar skills
ls ~/.agents/skills/cali-product-workflow/skills-workflow/

# Testar workflow em worktree (criar nova sessão)
cd /Users/cali/Library/Application\ Support/Muxy/worktree-checkouts/52A56F1F-DB92-452E-AB09-D94772CD03E5/mobile-adaptative
pi /skill:cali-product-workflow
# observer footer
```

---

## Referências

- **Sessão completa:** `/Users/cali/.pi/agent/sessions/...mobile-adaptativo...jsonl`
- **pi-goal README:** `/tmp/pi-github-repos/capyup/pi-goal/README.md`
- **Documentação extensão:** `extensions/cali-product-workflow/`
- **Skills docs:** `skills/cali-product-workflow/`
- **Ask patterns:** `phases/ask-patterns.md`

---

*Documento para double-check por outra LLM*  
*Gerado: 2026-05-22*