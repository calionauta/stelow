# Investigação — Sessão Mobile Adaptativo e Melhorias

## 1. Sisyphus nos arquivos do projeto

**Localização:**
- `skills/cali-product-workflow/references/cli-tools/goals.md` — documentação principal
- `extensions/cali-product-workflow/state.ts:157` — mapeamento `goals: "goal/sisyphus"`
- `skills/cali-product-workflow/phases/execution.md` — tabelas de routing

**Resumo:**
- `/sisyphus` é usado para scopes: `feature`, `spike`, `test-*`
- `/autoresearch-create` para `optimization`
- O documento especifica que **não se deve perguntar** "Create /sisyphus?" — execução é automática após Tech Planning

---

## 2. Perguntas com >4 opções vs ask_user_question

**Documentado em `ask-patterns.md:23`:**
```
`ask_user_question` supports:
- **2-6 options** per question (MAX_OPTIONS = 6)
```

**Problema real:**
Na sessão mobile-adaptativo houve `validation failed: "questions.0.options: must have at most 4 items"`.

**Hipótese:** A sessão estava usando uma versão mais antiga da skill ou da CLI que tinha limite de 4. A skill `ask-patterns.md` já foi atualizada para 6, mas pode haver desatualização em cascata.

**Regra a implementar:**
1. Antes de usar `ask_user_question`, verificar o limite de options
2. Se >4 para single-select com 5+ opções necessárias:
   - **Opção A (Interface Brainstorming):** Mostrar as 5 geradas + 1 híbrida criada depois
   - **Opção B (Strategic approaches):** Dividir em 2 etapas sequenciais, cada uma com 3-4 opções
3. Se multi-select: perguntar primeiro "Quais domínios?" depois "Quais abordagens?"

---

## 3. Footer de fases não atualizado — Hipótese D

**Código encontrado:**
- `extensions/cali-product-workflow/ui.ts:129-137` — `notifyPhase()` atualiza via TUI
- `extensions/cali-product-workflow/index.ts:112` — `updateFooter(ctx, wd)` chamado em hooks

**O que deveria acontecer:**
1. Usuário chama `/skill:cali-product-workflow`
2. Hook `onUserMessage` detecta e cria workflow com `currentPhase: 0`
3. Hook `updateFooter()` é chamado para mostrar `Triage (1/11)`
4. Quando fase avança, `notifyPhase()` mostra notificação

**Hipótese para falha:**

| # | Hipótese | evidência | Verificação |
|---|----------|-----------|-------------|
| H1 | Extensão não carregou na sessão mobile | A skill foi chamada via `/skill`, não via hook | Verificar se extensão está ativa |
| H2 | Hook não executou updateFooter | Apenas skill carregou, extensão não | O TUI pode estar em modo "skill only" |
| H3 | Session mode diferente | worktree-checkouts é um ambiente isolado | Verificar se hooks funcionam em worktrees |
| H4 | Goal system interferiu | pi-goal-state pode ter sobrescrito workflow state | Verificar ordem de eventos |

**Verificação necessária:**
```bash
# Verificar se extensão carrega em worktree
cd /Users/cali/Library/Application\ Support/Muxy/worktree-checkouts/52A56F1F-DB92-452E-AB09-D94772CD03E5/mobile-adaptative
pi --version
# Tentar iniciar workflow e verificar footer
```

**Melhoria potencial:**
Adicionar no hook de mensagem um check: se `pi-goal-state` existe E workflow está ativo, sincronizar ambos os estados (goal vs workflow phases).

---

## 4. Resumo — Melhorias reais (não cosméticas)

| # | Melhoria | Justificativa | Arquivo a alterar |
|---|----------|---------------|-------------------|
| 1 | **Verificar limite de options antes de chamar ask** | Evitar validation failed e refazer pergunta | `phases/ask-patterns.md` |
| 2 | **Fallback para chat quando tool não suporta** | Manter fluxo quando tool falha | `skills/cali-product-workflow/SKILL.md` |
| 3 | **Dividir perguntas >4 em etapas** | Interface Brainstorming com 5+1 híbrido | `phases/ask-patterns.md` |
| 4 | **Sincronizar goal state + workflow phase** | Evitar estados inconsistentes entre systems | `extensions/cali-product-workflow/index.ts` |
| 5 | **Resumir subagent failure e continuar de onde parou** | Não avançar fase quando subagent falha | `skills/cali-product-workflow/phases/execution.md` |
| 6 | **Confirmar Plannotator gate antes de prosseguir** | Evitar bypass de gate visual | `references/cli-tools/plannotator.md` |

---

## 5. Comportamento esperado vs real

| Fase | Esperado | Real | Problema |
|------|----------|------|----------|
| 0-triage | Auto-detectado | ✅ OK | — |
| 1-setup | Auto-iniciado | ✅ OK | — |
| 2-shape | Subagent cali-shape-up | ⚠️ Falhou (402) | Não tentou re-skill |
| 3-strategy | Pergunta com 5 opções | ❌ Validation failed | Tool limit 4 vs skill 5 |
| 4-critique | Plannotator --gate | ⚠️ Timeout | Não aguardou confirmação |
| 5-scope | Plan批准 | ⚠️ Pulou gate | Bypass implícito |
| 6-interface | (opcional) | ❌ Não chamado | Skipped |
| 7-int-gate | Plannotator --gate | ⚠️ Timeout | Pulou ou bypassou |
| 8-selection | ask_user_question | ✅ OK | — |
| 9-tech-planning | Especificação técnica | ✅ OK | — |
| 10-execution | Sisyphus goal | ✅ OK | — |
| Footer fases | Mostrar N/11 | ❌ Não mostrado | Hook/extensão não funcionou |

---

*Gerado em 2026-05-22*