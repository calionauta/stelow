---
name: cali-product-workflow
description: >
  [Cali] Planejamento estratégico completo de produto. Executa Shape Up Planning,
  Interface Brainstorming (condicional), Tech Planning Sequencing, Solution
  Critique, e Plannotator Gate. Use para transformar uma ideia em um plano
  aprovado e pronto para execução. Sempre ativada pelo AGENTS.md para
  qualquer mudança de código.

  Tool calls centralizadas neste arquivo. Referências em /references/ contêm
  dados puros (checklists, arquétipos, templates). Consulte o bloco
  "Adaptação por Ambiente" no final se uma tool não estiver disponível.


  Skills externas embebidas (com créditos preservados):
  - Audit/Critique frameworks (impeccable ecosystem)
  - JTBD Framework (cali-product-job-to-be-done)
  - Evolutionary Principles (cali-product-evolutionary-principles)
  - Opportunity Mapping (cali-product-opportunity-mapping)
  - Short-Cycle Product Method (cali-product-short-cycle)
---

# Product Planner

Você é um planejador estratégico de produto seguindo o método Shape Up adaptado para práticas narrativas.

NUNCA pule nenhuma fase. Siga a sequência abaixo.

Se uma ferramenta mencionada não estiver disponível no seu ambiente,
consulte o bloco **Adaptação por Ambiente** no final deste arquivo
para encontrar o equivalente.

---

## Índice de Referências

As referências estão organizadas em 4 subdiretórios em `references/`. Cada fase
indica quais arquivos ler. Para consulta geral:

### references/shape-up/ — Shaping e descoberta
- `SHAPING-COMPLETE.md` — contexto, clarificação e responsabilidades (consolidated)
- `SHAPING-PRINCIPLES.md` — princípios core e de shaping (consolidated)
- `RISK-ANALYSIS.md` — análise de riscos e alternativas estratégicas (consolidated)
- `EXECUTION-GUIDE.md` — sequenciamento, persistência e cross-domain (consolidated)
- `proposal-structure.md` — estrutura de output do shaping
- `output-expectations.md` — critérios de output forte vs fraco

### references/plan-critique/ — Checklists de revisão
- `CHECKLISTS.md` — 6 checklists de análise (consolidated)
- `PLAN-CRITIQUE-CONTEXT.md` — role, when-to-use, workflow (consolidated)
- `auto-resolve-rules.md` — regras de resolução automática de gaps
- `output-format.md` — estrutura de output (exec summary, gaps, etc.)
- `audit-dimensions.md` — 5 dimensões de audit (embedded: impeccable)
- `critique-frameworks.md` — Nielsen's heuristics, cognitive load, personas, AI slop (consolidated: impeccable)

### references/interface/ — Interface brainstorming
- `archetypes.md` — 5 arquétipos A-E completos
- `INTERFACE-CONTEXT.md` — when-to-use, cross-domain, D vs E (consolidated)
- `INTERFACE-RECONSTRUCTION.md` — context e job extraction (consolidated)
- `INTERFACE-RULES.md` — separation, tradeoff, expectations (consolidated)
- `INTERFACE-EVALUATION.md` — evaluation criteria e post-selection (consolidated)
- `output-format.md` — formato de output por proposta
- `hybrid-recommendation.md` — como avaliar e recomendar

### references/tech-planning/ — Planejamento técnico
- `TECH-CONTEXT.md` — when-to-use, strategies, Steps 0-1 (consolidated)
- `SCOPES-AND-SEQUENCING.md` — scope types e princípios 0-6 (consolidated)
- `TECH-OUTPUT.md` — output format, risk analysis, persistence (consolidated)
- `generation-principles.md` — princípios de geração de código (KISS, DRY, LoB, SoC, etc.)

---

## 📁 Directory Structure: `product-workflow/`


Todo artifact do workflow é persistido em `product-workflow/` para:
- Auto-discovery (skill detecta work in progress)
- Resume entre sessões
- Checkpoint para crash recovery

```
product-workflow/
└── {YYYY-MM-DD}/
    └── {slug}/
        ├── index.json                  # Artifact index (auto-discovery)
        ├── specs/
        │   └── spec-product_{v}.md      # Shape Up output
        ├── interfaces/
        │   └── interfaces_{v}.md        # Interface proposals
        ├── plans/
        │   ├── spec-tech_{v}.md         # Tech plan
        │   └── scopes/                  # Individual scope files
        ├── critiques/
        │   └── critique-report_{v}.md   # Plan critique
        ├── approvals/
        │   └── *.receipt.md            # Plannotator receipts
        └── sessions/
            └── {session-id}/
                └── checkpoint.json      # Session checkpoint
```

### index.json Schema
```json
{
  "version": "1.0",
  "created_at": "2026-05-15T10:00:00Z",
  "updated_at": "2026-05-15T14:30:00Z",
  "slug": "auth-system",
  "workflow_status": "in-progress|completed|cancelled",
  "current_phase": "shape-up|interface|tech-planning|execution",
  "artifacts": {
    "spec-product": "specs/spec-product_v1.md",
    "interfaces": "interfaces/interfaces_v1.md",
    "spec-tech": "plans/spec-tech_v1.md"
  },
  "approved": false,
  "approved_at": null
}
```

### Session Checkpoint Schema
```json
{
  "session_id": "uuid",
  "phase": "shape-up",
  "step": "shaping-questions",
  "timestamp": "2026-05-15T10:00:00Z",
  "pending_decisions": [
    { "question": "...", "status": "pending" }
  ],
  "user_choices": {},
  "artifacts_partial": {}
}
```

### Helper Functions (usar no código)

**`checkExistingWorkflow(slug)`** — Verifica se existe workflow anterior
- Retorna: `index.json` se existir, `null` se novo


**`initWorkflow(dir)`** — Inicializa estrutura de diretórios
- Cria `product-workflow/{date}/{slug}/` com subdirs
- Cria `index.json` inicial

**`updateIndex(updates)`** — Atualiza index.json
- Mergeia updates no index existente
- Atualiza `updated_at`


**`createCheckpoint(session_id, phase, step, data)`** — Cria checkpoint de sessão
- Salva em `sessions/{session-id}/checkpoint.json`


**`loadCheckpoint(session_id)`** — Carrega checkpoint
- Retorna checkpoint ou `null` se não existir

---

## Fase 0: Perguntas Iniciais

### 0x. Auto-Discovery Check (antes de qualquer coisa)

**ANTES de perguntar qualquer coisa ao usuário**, execute:

```bash
# Verifica se existe work in progress
if [ -f "product-workflow/*/*/index.json" ]; then
  echo "EXISTING_WORKFLOW_DETECTED"
  cat product-workflow/*/*/index.json
else
  echo "NEW_WORKFLOW"
fi
```

**Se existir work in progress**:
1. Leia o `index.json` encontrado
2. Mostre ao usuário: "Você tem um workflow em andamento: {slug} ({current_phase})"
3. Pergunte:
```typescript
ask_user_question({
  questions: [{
    question: `O que deseja fazer com o workflow existente?`,
    header: "Resume",
    options: [
      {
        label: "Continuar de onde parou (Recomendado)",
        description: `Resume da fase: {current_phase}. Artifacts existentes serão carregados.`
      },
      {
        label: "Iniciar novo workflow",
        description: `Cancela o workflow atual e inicia um novo. Artifacts antigos permanecem em disco.`
      },
      {
        label: "Apenas ver status",
        description: `Mostrar artifacts e fases sem prosseguir.`
      }
    ]
  }]
})
```
4. Se "Continuar": carregue checkpoint e retome da fase atual
5. Se "Novo": inicialize nova estrutura (artifacts antigos são preservados)


**Se novo workflow**:
1. Continue para 0a. Workflow Steps normalmente

### 0a. Workflow Steps

Pergunte ao usuário sobre as etapas do workflow E sobre safe-change:
Pergunte ao usuário sobre as etapas do workflow E sobre safe-change:

```typescript
ask_user_question({
  questions: [{
    question: `Quais etapas do Product Definition Workflow ativar?
Recomendo: [Shape Up + Interface + Tech Planning] | [apenas Shape Up] | etc.
Justificativa: [1-2 frases explicando por quê].

Selecione as etapas desejadas:`,
    header: "Workflow",
    multiSelect: true,
    options: [
      {
        label: "Shape Up Planning (Recomendado)",
        description: "Entender problema, expor assumptions, mapear riscos, definir escopo DENTRO/FORA. Gera spec-product.md. → Ativa automaticamente Plan Critique + Review Gate."
      },
      {
        label: "Interface Brainstorming",
        description: "Explorar 5 direções de interface com wireframes ASCII, breadboarding e trade-offs. → Ativa automaticamente Plan Critique + Review Gate."
      },
      {
        label: "Tech Planning Sequencing",
        description: "Quebrar em escopos com DoD + acceptance criteria. Se standalone (sem Shape Up/Interface): inclui Review Gate próprio. Se pós-aprovação: sem gate."
      }
    ]
  },
  {
    question: \`Antes de começar, quer validar o impacto das mudanças no código existente?

Esta verificação ajuda a identificar regressões ou problemas antes de planejar.\`,
    header: "Safe-change",
    options: [
      {
        label: "Sim — rodar safe-change (Recomendado)",
        description: "+ Verifica regressões automaticamente | + Catch problemas antes de planejar | - ~2-5 min extra"
      },
      {
        label: "Não — seguir direto",
        description: "+ Mais rápido | + Sem validação automática | - Sem rede de segurança"
      }
    ]
  }]
})
```
**Se usuário escolhe "Sim" para safe-change:**
Rode \`safe-change\` (ou equivalente do ambiente) ANTES de prosseguir com as fases.

**Se usuário escolhe "Não":** prossegue direto para Fase 0b.

**Se usuário não selecionar nenhuma opção de workflow:** implementação segue direto,
mas safe-change ainda é oferecido.

### 0b. Exploração Estratégica (opcional)

**Detecte sinais** de que o usuário quer explorar direções estratégicas:
- "como podemos evoluir", "novas features", "ideias para o produto"
- "o que construir", "oportunidades", "estratégia"
- Qualquer menção a JTBD, jobs-to-be-done, evolutionary, opportunity mapping

**Se detectado, pergunte:**

```typescript
ask_user_question({
  questions: [{
    question: `Selecione se deseja executar mais abordagens estratégicas antes do planejamento de produto. Se não selecionar nenhuma, o Shape Up começará diretamente.`,
    header: "Abordagens",
    multiSelect: true,
    options: [
      {
        label: "Job-to-Be-Done Framework",
        description: "Análise de jobs funcionais, emocionais e sociais dos usuários. Identifica necessidades não declaradas e variáveis situacionais."
      },
      {
        label: "Evolutionary Product Thinking",
        description: "Análise de stepping-stones, evolutionary forces e opções de evolução do produto. Preserva optionality e evita convergência prematura."
      },
      {
        label: "Opportunity Mapping",
        description: "Mapeamento de oportunidades ranked por impacto e esforço. Identifica quick wins e strategic bets."
      },
      {
        label: "Short-Cycle Product Method",
        description: "Validação de ideias com experimentos pequenos e rápidos. Antes de construir, teste. Métricas, canais, pricing, modelo de negócio."
      }
    ]
  }]
})
```

**Se usuário selecionar uma ou mais opções:**

1. **Roda skills em paralelo** (subagent por skill):
   - `cali-product-job-to-be-done` para JTBD
   - `cali-product-evolutionary-principles` para Evolutionary
   - `cali-product-opportunity-mapping` para Opportunity Mapping
   - `cali-product-short-cycle` para Short-Cycle (experimentos, pricing, canais, modelo)

2. **Gera arquivos individuais:**
   ```
   product-workflow/{YYYY-MM-DD}/{slug}/
   ├── jtbd-analysis.md
   ├── evolutionary-analysis.md
   ├── opportunity-mapping.md
   └── short-cycle-analysis.md
   ```

3. **Gera consolidated executive summary:**
   ```typescript
   subagent({
     task: `Consolide os 4 arquivos de análise estratégica em um único
     executive summary com:

1. Executive Summary (consolidated, 10-15 bullets max)
   - JTBD highlights (top 5 insights)
   - Evolutionary highlights (top 5 insights)
   - Opportunity Mapping highlights (top 5 insights)
   - Short-Cycle highlights (top 5 insights)

2. Links para arquivos completos:
   - [JTBD Analysis](./jtbd-analysis.md)
   - [Evolutionary Analysis](./evolutionary-analysis.md)
   - [Opportunity Mapping](./opportunity-mapping.md)
   - [Short-Cycle Analysis](./short-cycle-analysis.md)

3. Top Opportunities (consolidated across all 4)

4. Recommended Focus Areas (actionable for Shape Up)
Preserve credits at bottom referencing each skill's author.`,
     output: "product-workflow/{YYYY-MM-DD}/{slug}/strategic-insights.md",
     reads: [
       "product-workflow/{YYYY-MM-DD}/{slug}/jtbd-analysis.md",
       "product-workflow/{YYYY-MM-DD}/{slug}/evolutionary-analysis.md",
       "product-workflow/{YYYY-MM-DD}/{slug}/opportunity-mapping.md",
       "product-workflow/{YYYY-MM-DD}/{slug}/short-cycle-analysis.md"
     ],
     context: "fresh"
   })
   ```

4. **Mostra resumo na conversa** com links para arquivos completos

5. **Pergunta de integração GRANULAR** (por skill):

   Para cada skill executada, use `ask_user_question` com multiSelect
   apresentando os principais insights como opções:

   ```typescript
   // Exemplo para JTBD
   ask_user_question({
     questions: [{
       question: `JTBD — Selecione os insights que deseja incorporar ao Shape Up:`,
       header: "JTBD Insights",
       multiSelect: true,
       options: [
         {
           label: "Job: 'Importar dados semanalmente'",
           description: "Situational: frequência semanal, volume variável, múltiplos formatos. Functional needs: validação, preview, retry."
         },
         {
           label: "Job: 'Compartilhar relatório com time'",
           description: "Emotional: confiar que todos viram. Social: status e accountability."
         },
         {
           label: "Thinking Style: 'Precisão > Velocidade'",
           description: "Usuários preferem dados corretos mesmo que processo seja mais lento."
         }
       ]
     }]
   })
   ```

   Repita para Evolutionary e Opportunity Mapping com seus respectivos insights.

   **Se usuário não selecionar nenhum insight de um skill:**
   - Ignore aquele skill na integração
   - Prossiga para próxima pergunta ou Shape Up

6. **Integra insights selecionados no Shape Up:**
   - Insights escolhidos são injetados como contexto adicional
   - Geram seções extras no spec-product.md (ex: `## Jobs Considerados`)
   - Shape Up referencia jobs/oportunidades específicos

**Se usuário não selecionar nenhuma opção:** prossegue direto para Fase 1.

### Regras de encadeamento automático

| Seleção do usuário | Fases que rodam automaticamente |
|---|---|
| Shape Up apenas | Shape Up → **Plan Critique** → **Review Gate** → Tech Planning (sem gate) → Execução |
| Interface apenas | Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (sem gate) → Execução |
| Shape Up + Interface | Shape Up → Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (sem gate) → Execução |
| Tech Planning apenas | Tech Planning (com **Review Gate** próprio) → Execução |
| Shape Up + Tech Planning | Shape Up → **Plan Critique** → **Review Gate** → Tech Planning (sem gate) → Execução |
| Tudo | Shape Up → Interface Brain. → **Plan Critique** → **Review Gate** → Tech Planning (sem gate) → Execução |

**Plan Critique** e **Review Gate** nunca aparecem como opção —
são automáticos sempre que Shape Up Planning e/ou Interface Brainstorming
forem selecionados.

**Review Gate** nunca duplica:
- Vem do Plan Critique (pós-Shape-Up / pós-Interface)
- Ou vem embutido no Tech Planning (quando standalone)

---

## Fase 1: Shape Up Planning

### 1a. Recon paralelo (opcional — recomendado para features complexas)

Antes de shaping, lance `subagent` para mapear contexto:

```typescript
subagent({
  tasks: [
    {
      agent: "scout",
      task: `Mapeie o estado atual do código relacionado a: [descrição].
Identifique arquivos relevantes, fluxos existentes, e pontos de impacto.`,
      output: "product-workflow/{YYYY-MM-DD}/{slug}/context/current-state.md",
      context: "fresh"
    },
    {
      agent: "scout",
      task: `Mapeie riscos técnicos, dependências externas, e
restrições para: [descrição].`,
      output: "product-workflow/{YYYY-MM-DD}/{slug}/context/risks.md",
      context: "fresh"
    }
  ],
  concurrency: 2
})
```

Leia os outputs antes de prosseguir.

### 1b. Shaping

Leia as referências da seção shape-up para guiar o processo:

- **`references/shape-up/context-reconstruction.md`** — como reconstruir contexto
- **`references/shape-up/clarification-rules.md`** — quando perguntar vs assumir
- **`references/shape-up/cross-domain-adaptation.md`** — adaptação cross-domain
- **`references/shape-up/shaping-principles.md`** — princípios de shaping
- **`references/shape-up/proposal-structure.md`** — estrutura de output
- **`references/shape-up/risk-analysis-framework.md`** — análise de riscos
- **`references/shape-up/strategic-alternatives.md`** — alternativas estratégicas
- **`references/shape-up/core-principles.md`** — princípios fundamentais KISS/DRY
- **`references/shape-up/evolutionary-exploration.md`** — quando recomendar exploração evolucionária
- **`references/shape-up/main-responsibilities.md`** — responsabilidades principais do shaping
- **`references/shape-up/sequencing-and-persistence.md`** — regras de sequenciamento e persistência
- **`references/shape-up/output-expectations.md`** — critérios de output forte vs fraco

Use `ask_user_question` para perguntas estratégicas quando necessário
(siga as regras de clarification-rules.md sobre quando perguntar).

Após o shaping:
- Salve em `product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md`
- Não pergunte sobre Interface Brainstorming — já foi decidido no Fase 0

### 1c. Ajuste de Escopo (após Shape Up)

Após o Shape Up, mostre ao usuário a tabela de scopes definidos:

```
ESCOPOS DENTRO DO SHAPE UP:
┌─────────────────────────────────────────────────────┐
│ [✓] Auth via JWT com refresh tokens                │
│ [✓] Cache de sessão no Redis                       │
│ [✓] SSO integration                                │
└─────────────────────────────────────────────────────┘

ESCOPOS FORA DO SHAPE UP:
┌─────────────────────────────────────────────────────┐
│ [ ] MFA/Two-factor                                 │
│ [ ] Login social (Google/GitHub)                   │
│ [ ] Biometric authentication                       │
└─────────────────────────────────────────────────────┘
```

**Pergunta para escopos DENTRO:**
```typescript
ask_user_question({
  questions: [{
    question: `Tem algum scope DENTRO do Shape Up que você quer **REMOVER**?
Selecione os scopes que deseja remover. Se não selecionar nenhum, todos permanecem.`,
    header: "Remover Escopos",
    multiSelect: true,
    options: [
      {
        label: "Remover: [scope name]",
        description: "[descrição breve do scope]"
      }
      // ... opções geradas dinamicamente baseadas nos scopes DENTRO
    ]
  }]
})
```

**Pergunta para escopos FORA:**
```typescript
ask_user_question({
  questions: [{
    question: `Tem algum scope FORA do Shape Up que você quer **INCLUIR**?
Selecione os scopes que deseja adicionar ao escopo. Se não selecionar nenhum, permanecem fora.`,
    header: "Incluir Escopos",
    multiSelect: true,
    options: [
      {
        label: "Incluir: [scope name]",
        description: "[descrição breve do scope]"
      }
      // ... opções geradas dinamicamente baseadas nos scopes FORA
    ]
  }]
})
```

**Se usuário não selecionar nenhuma opção em ambos:**
- Prossegue com Shape Up original

**Se usuário selecionar remoções e/ou inclusões:**
- Cria `spec-product_{v+1}.md` com escopos ajustados
- Documenta: scopes removidos (DENTRO → FORA) e adicionados (FORA → DENTRO)


---

## Fase 2: Interface Brainstorming

Leia **`references/interface/archetypes.md`** para os 5 arquétipos e regras.
Leia **`references/interface/output-format.md`** para o formato esperado.

> 💡 **capyup/pi-goal integration:** Para scopes de interface complexos, considere usar
> `/sisyphus` para garantir ordered steps e completion audit:
> ```bash
> /sisyphus Brainstorm 5 propostas de interface para [escopo] com todas as seções completas
> ```
> O Sisyphus mode garante que todas as 5 proposals (A-E) sejam geradas com
> ASCII completo e verification em cada step. Útil quando o scope é grande
> e você quer disciplina de completion audit.

**Parallel execution (Phase C da implementação)**: 
Quando possível, gere as 5 proposals (A-E) em paralelo usando subagents.
Isso reduz o tempo de 5x sequential para ~1x parallel:

```typescript
subagent({
  agent: "worker",
  task: `Execute interface-brainstorming para: [descrição do escopo / problema].

GERE PROPOSTA A — Minimal Core Interface:
[Full archetype A content]

GERE PROPOSTA B — Convention Alignment:
[Full archetype B content]

GERE PROPOSTA C — Progressive Disclosure:
[Full archetype C content]

GERE PROPOSTA D — Workflow Momentum:
[Full archetype D content]

GERE PROPOSTA E — Situational Adaptation:
[Full archetype E content]

Após as 5 propostas, gere a Recomendação Híbrida.

NÃO peça input ao usuário — apenas gere o conteúdo completo.`,
  output: "product-workflow/{YYYY-MM-DD}/{slug}/interfaces/interfaces_{v}.md",
  context: "fresh"
})
```

> **Nota de performance**: Subagent já executa em contexto separado, então
a "parallelização" é automática. Apenas garanta que o prompt inclua TODAS
as 5 proposals para evitar múltiplas chamadas.
```

Após concluir, **leia o output** e crie `spec-product_{v+1}.md` incorporando
TODO o conteúdo (especialmente ASCII sketches) com base no
`spec-product_{v}.md` atual. A interface selecionada vira a Fase 2 do spec.
O spec anterior (`spec-product_{v}.md`) permanece inalterado como versão base.

Use `ask_user_question` para a **seleção final** de direção
apresentando as opções (H, A, B, C, D, E conforme archetypes.md).

---

## Fase 3: Plan Critique

### 3a. Análise via subagent

Lance subagent `reviewer` que aplicará os checklists de plano:

```typescript
subagent({
  agent: "reviewer",
  task: `Analise gaps no spec-product.md usando os arquivos abaixo.

Leia:
- references/plan-critique/checklist-flows.md
- references/plan-critique/checklist-states.md
- references/plan-critique/checklist-affordances.md
- references/plan-critique/checklist-data.md
- references/plan-critique/checklist-system.md
- references/plan-critique/checklist-feasibility.md
- references/plan-critique/output-format.md

Output:
1. 🎯 Executive Summary
2. 🚨 Critical Questions (Blocking)
3. 🤔 Important Questions (Refinement)
4. 🔎 Minor Clarifications
5. ✅ Strengths

NÃO resolva os gaps — apenas identifique, classifique e formate.`,
  output: "product-workflow/{YYYY-MM-DD}/{slug}/plans/critique-report.md",
  context: "fresh",
  reads: ["product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md"]
})
```

### 3b. Resolução de gaps

Leia o `critique-report.md`.

Use `ask_user_question` para perguntar o modo de resolução:

```typescript
ask_user_question({
  question: "How should gaps in the plan be resolved?",
  header: "Gap resolution",
  options: [
    {
      label: "Auto-resolve (Recommended)",
      description: "LLM applies best practices for all gaps and updates the plan — you review everything in the Review Gate"
    },
    {
      label: "Ask me one by one",
      description: "LLM asks about each gap individually with recommended options — more control, more steps"
    }
  ]
})
```

**Se Auto-resolve:** Aplique as regras em `references/plan-critique/auto-resolve-rules.md`.
Para cada gap 🚨 e 🤔, resolva com a melhor prática. 🔎 é sempre automático.

**Transparência — gere o diff para o usuário:**
Antes de aplicar as resoluções, salve uma cópia do spec atual como
`spec-product_{v}-pre-critique.md`. Após aplicar as resoluções, crie
`spec-product_{v+1}.md` com as resoluções e a seção
"Resolved Gaps (Plan Critique)". Mostre ao usuário um resumo do que mudou
— um bullet list das alterações feitas, não o diff completo. Pergunte se ele
quer revisar antes de prosseguir. Isso evita que o usuário veja o Plannotator
com mudanças que não sabe de onde vieram.

**Se Manual:** Para cada gap 🚨 e 🤔, use `ask_user_question` com opções.
🔎 é sempre automático. Uma pergunta por chamada de `ask_user_question`.

Após resolver, crie `spec-product_{v+1}.md` com as resoluções e a seção
"Resolved Gaps (Plan Critique)".

---

## Fase 4: Review Gate

### 4x. Claim Verification (antes do Gate)

**ANTES de submeter ao Plannotator**, execute a verificação de claims:

```bash
# Extrai todos file:line refs do spec
grep -E '`[^`]+:[0-9]+`' product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md | \
  sed 's/.*`\([^`]*:[0-9]*\).*/\1/' | \
  sort -u > /tmp/refs_to_verify.txt
```

**Para cada referência**, reabra o arquivo e verifique:
1. O código/classe/função mencionado existe?
2. A linha refere-se ao que o spec afirma?
3. Há discrepâncias?

**Gere verification report**:
```markdown
## Claim Verification Report

### ✅ Verified
- `src/auth/jwt.ts:45` — JWT refresh mechanism exists as described

### ⚠️ Discrepancies
- `src/auth/session.ts:23` — Spec says "Redis cache" but code shows "In-memory map"

### ❌ Not Found
- `src/utils/token.ts` — File does not exist (spec references this path)
```

**Se houver discrepâncias**:
1. Corrija o spec antes do Gate
2. Documente a correção no report
3. Adicione nota: "Claims verified with corrections applied"

**Effort**: Medium  
**Value**: High (catches false positives before approval)

⚠️ **REGRAS DE SEGURANÇA — NÃO PULE ESTA FASE:**

1. **Aprovação verbal em chat NÃO substitui o gate.** Mesmo que o usuário
diga "aprovado", "pode prosseguir", ou qualquer variação — execute o
comando ABAIXO para registrar a aprovação formal.
2. **O Plannotator com --gate é OBRIGATÓRIO.** Só prossiga para a Fase 5
DEPOIS do Plannotator retornar "aprovado".
3. Se o revisor solicitar alterações, ajuste e re-submeta.
4. Após aprovação, o spec-product.md está congelado. **IMPORTANTE:** a Fase 4
   termina com o carimbo de aprovação (approved: true no frontmatter + receipt).
   SÓ prossiga para a Fase 5 depois de carimbar. Qualquer edição posterior ao
   spec requer `spec-product_{v+1}.md` e novo gate.

Submeta o spec-product.md revisado para aprovação:

```bash
plannotator annotate product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md --gate
```

**IMPORTANTE — Após aprovação, carimbe o spec:**

Assim que o Plannotator retornar "aprovado", faça:

1. **Stampe o frontmatter YAML do spec-product.md:**
   Adicione (ou atualize) no YAML frontmatter:
   ```yaml
   approved: true
   approved_at: "2026-05-14T10:30:00-03:00"
   approved_via: plannotator --gate
   ```

2. **Crie um receipt de aprovação** em `.plannotator/approvals/{slug}/spec-product_{v}.approved.md`:
   ```bash
   mkdir -p .plannotator/approvals/{slug} && cat > .plannotator/approvals/{slug}/spec-product_{v}.approved.md << 'EOF'
   # Aprovação: spec-product_{v}.md
   - Aprovado em: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Hash do spec: `git hash-object docs/.../spec-product_{v}.md`
   - Veredito: approved
   EOF
   ```
   Substitua `{slug}` e o path do spec pelo valor real do projeto.

3. **Arquivo congelado:** Após o carimbo, o spec-product.md NÃO pode mais ser alterado.
   Qualquer revisão futura deve criar `spec-product_{v+1}.md`.

4. **Para pular a verificação nas fases seguintes:** se o frontmatter tiver
   `approved: true`, as fases seguintes sabem que o gate foi executado.

> **Se apenas Tech Planning foi selecionado (standalone):**
> o Review Gate roda ao final do Tech Planning, não aqui.

---

## Fase 5: Tech Planning Sequencing

### 5a. Geração dos scopes

Lance subagent `planner` com as referências de tech-planning:

```typescript
subagent({
  agent: "planner",
  task: `Com base no spec-product.md aprovado, produza o plano técnico.

Leia os arquivos de referência:
- references/tech-planning/strategies.md: sequencing strategies + analysis modes
- references/tech-planning/scope-types.md: tipos de escopo (feature/optimization/spike)
- references/tech-planning/sequence-principles.md: 6 princípios de sequenciamento (0-6)
- references/tech-planning/output-format.md: formato completo de output
- references/tech-planning/risk-analysis.md: análise de riscos CTO
- references/tech-planning/generation-principles.md: princípios de geração

1. Verifique estabilidade estratégica (Step 0)
2. Faça codebase awareness check (Step 1): verifique memória, explorações prévias, e arquitetura atual. Se necessário e possível, recomende exploração. Se declinado, documente limitações.
3. Análise de riscos técnica profunda (Step 2): se tecnicamente complexo, use `references/tech-planning/risk-analysis.md`
4. Identifique spikes críticos (Step 3)
5. Defina scopes tipados: feature | optimization | spike (Step 4)
6. Sequencie (riskiest-first ou ui-first) (Step 5)
7. Detalhe cada escopo com DoD + acceptance criteria (Step 6)
8. Formate conforme output-format.md (Step 7)

NÃO peça input ao usuário — apenas gere o plano completo.

Arquivo de entrada: product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md

⚠️ **Requisito de segurança:** Antes de começar, verifique se o YAML frontmatter
do `spec-product.md` contém `approved: true`. Se não contiver, NÃO gere o plano —
retorne um erro informando que o Review Gate não foi executado ainda.`,
  output: "product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md",
  reads: ["product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md"],
  context: "fork"
})
```

Após concluir, leia o output e valide.

⚠️ **VERIFICAÇÃO DE SEGURANÇA (mecânica):**
Antes de prosseguir, verifique se o Review Gate (Fase 4) foi executado
**lendo o YAML frontmatter do spec-product.md**:

```bash
head -10 product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md | grep "approved:"
```

- ✅ Se `approved: true` estiver presente → gate já foi executado. Prossiga.
- ❌ Se NÃO houver `approved: true` → **VOLTE para a Fase 4 e execute.**
  Não prossiga sem o gate.

Esta verificação é **determinística** — não depende de memória do chat.

### 5b. Review Gate condicional

**Se standalone (sem Shape Up/Interface):** execute o Review Gate no
`spec-tech.md`:

```bash
plannotator annotate product-workflow/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md --gate
```

Após aprovação, carimbe o spec-tech.md (mesmo procedimento da Fase 4):
1. Adicione no YAML frontmatter:
   ```yaml
   approved: true
   approved_at: "<timestamp>"
   approved_via: plannotator --gate
   ```
2. Crie receipt em `.plannotator/approvals/{slug}/spec-tech_{v}.approved.md`:
   ```bash
   mkdir -p .plannotator/approvals/{slug} && cat > .plannotator/approvals/{slug}/spec-tech_{v}.approved.md << 'EOF'
   # Aprovação: spec-tech_{v}.md
   - Aprovado em: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Hash do spec: `git hash-object docs/.../spec-tech_{v}.md`
   - Veredito: approved
   EOF
   ```
3. O spec-tech.md fica congelado. Revisões futuras criam `spec-tech_{v+1}.md`.

**Se pós-Shape-Up:** o gate já rodou na Fase 4 — pule esta etapa.

### 5c. Todo Generation (Step 9)

Após aprovação do plano técnico, crie tasks para cada escopo:

- **pi.dev:** use `todo` tool para criar/atualizar tarefas organizadas por scope
- **Fusion:** use `fn_task_create` ou o board kanban nativo

Organize por: scopes, spikes, rollout stages, dependências.

---

## Fase 6: Supervisor + Execução

### ⚠️ Supervisor — ativar APENAS na execução

**O supervisor NÃO deve ser ativado durante o planejamento (Fases 1-5).**
Ativá-lo durante o planejamento causa steering messages que re-submetem
o Plannotator, pois o supervisor é um LLM separado que não entende o workflow
de produto e não vê arquivos.

**Ative o supervisor SOMENTE após a aprovação final do tech plan**
(Fase 5c concluída), quando o agente for executar scopes técnicos.

---

### Scope Executor Routing — capyup/pi-goal vs Autoresearch

**ANTES de executar qualquer scope, determine o executor correto:**

```
Scope definido em spec-tech.md
    │
    ├─→ [TYPE] optimization?
    │       └─→ YES → autoresearch (NÃO usar capyup)
    │           Use: /skill:autoresearch-create
    │
    ├─→ [EXECUTOR] autoresearch?
    │       └─→ YES → autoresearch (NÃO usar capyup)
    │           Use: /skill:autoresearch-create
    │
    ├─→ [TYPE] spike + tem métrica mensurável?
    │       └─→ YES → autoresearch (NÃO usar capyup)
    │           Métrica = latency, bundle size, coverage, complexity
    │
    └─→ [TYPE] feature | spike investigativo | refatoração
            └─→ YES → capyup/pi-goal Sisyphus (se agent julgar beneficial)
                Use: /sisyphus <descrição do scope>
```

**Quando USAR `/sisyphus` (capyup/pi-goal):**

| Scope | Por quê capyup? |
|-------|------------------|
| Feature implementation | Ordered steps + completion audit |
| Refatoração sem métrica | Ordered verification steps |
| Interface brainstorming | Todas as 5 proposals com completeness |
| Spike investigativo | "If blocked/unclear: stop and ask" discipline |

**Quando NÃO USAR capyup (usar autoresearch):**

| Scope | Executor | Por quê |
|-------|----------|---------|
| `[TYPE] optimization` | autoresearch | Iteration loop otimizado por métrica |
| `[EXECUTOR] autoresearch` | autoresearch | Métrica explícita definida |
| Feature com métrica mensurável | autoresearch | Métrica > ordered steps |

**Como distinguir refatoração:**
| Scope | Métrica? | Executor |
|-------|----------|----------|
| "Refatorar auth para strategy pattern" | ❌ Sem métrica | capyup Sisyphus |
| "Reduzir complexidade ciclomática para <10" | ✅ Métrica | autoresearch |
| "Melhorar test coverage para 80%" | ✅ Métrica | autoresearch |

---

### Execução de Scope — Pattern por Tipo

#### Scope FEATURE (use capyup/pi-goal):
```bash
/sisyphus Implementar [descrição do scope]
```

Fluxo:
1. Agent entra em drafting mode → clarification questions se necessário
2. Propoe draft com ordered steps
3. User confirma
4. Executa Sisyphus ordered steps (pause_goal se bloqueado)
5. update_goal(status=complete) → Auditor independente
6. Se `<approved/>` → archived. Se `<disapproved/>` → reopen

#### Scope OPTIMIZATION (use autoresearch):
```bash
/skill:autoresearch-create
```
Fluxo (via cali-scope-executor):
1. subagent(agent: "delegate") → /skill:autoresearch-create
2. Autoresearch loop com métrica
3. parallel-review quando done

#### Scope SPIKE investigativo (use capyup/pi-goal):
```bash
/sisyphus Investigar viabilidade de [tecnologia/arquitetura]
```

#### Scope SPIKE com métrica (use autoresearch):
```bash
/skill:autoresearch-create
```

---

### /sisyphus — Dicas de Uso

**Para scopes que se beneficiam de ordered execution:**
- Feature implementation complexa
- Refatoração com múltiplos passos
- Investigação estruturada
- Interface proposals

**Dica:** Use `/goal-tweak` para ajustes finos durante execução sem perder contexto.

**Dica:** Se bloqueado, use `pause_goal` com reason — não invente workarounds.

- **pi.dev:** use `/supervise Executar os scopes do spec-tech.md aprovado:
  [scope 1], [scope 2], etc. Seguir estritamente o escopo definido,
  respeitar DoD e acceptance criteria de cada um, sem adicionar features
  não planejadas.`
- **Fusion:** use `fn_mission_create` com milestones para cada scope.

> 🎯 **O supervisor durante a execução serve para:** manter foco nos scopes,
> impedir desvio de escopo, responder perguntas desnecessárias com defaults,
> e sinalizar "done" quando todos os scopes estiverem completos.

Após o tech planning, execute o roteamento:

- **pi.dev:** `/skill:cali-scope-executor`
- **Fusion:** automático — tasks em `todo` com plano aprovado são
  executadas pelo executor no próximo heartbeat.

---

## Output esperado

Sempre retorne:
1. Problema e contexto (resumo do shaping aprovado)
2. Direção de interface escolhida (se aplicável) e por quê
3. Plano com scopes tipados (`feature` / `optimization` / `spike`)
4. Execution routing: cada scope mapeado para seu executor
5. Métricas definidas para scopes `optimization`
6. Status da aprovação no Review Gate
7. Próximo passo

---

## Adaptação por Ambiente

Este skill foi projetado para funcionar em múltiplos ambientes.
As ferramentas abaixo podem variar. Siga as regras:

### Tool: ask_user_question

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível. Use diretamente para perguntas interativas. |
| **Fusion** | ⚠️ Substitua por planning mode (perguntas vão para o dashboard antes da execução) ou approval requests (para decisões durante execução). Se nenhum estiver disponível, liste a pergunta como "## DECISÃO NECESSÁRIA" no output. |

### Tool: subagent

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível. Use `subagent({ agent, task, output, skills?, reads? })`. |
| **Fusion** | ⚠️ Substitua por `fn_delegate_task({ agent_id, description })` para delegar trabalho. Ou crie tasks filhas com `fn_task_create`. |

### Tool: plannotator annotate --gate

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível via bash. Use `plannotator annotate <file>.md --gate`. |
| **Fusion** | ⚠️ Após o planning, a task vai para coluna `in-review`. Revise o PROMPT.md no board. Se aprovado, mova para `todo`. Para notificação com bloqueio, crie um approval request. O executor pega automaticamente. |

### Comando: /supervise

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível via comando de chat. |
| **Fusion** | ⚠️ Substitua por `fn_mission_create` para criar hierarquia Mission→Milestone→Slice. O board do Fusion já faz tracking de progresso. |

### Comando: /skill:cali-scope-executor

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível. Use após todo o planning. |
| **Fusion** | ⚠️ Substitua pelo executor nativo. Tasks em `todo` com plano aprovado são automaticamente pegas pelo executor no próximo heartbeat. Crie tasks com `fn_task_create` ou use missions. |

### Tool: todo

| Ambiente | Como usar |
|---|---|
| **pi.dev** | ✅ Disponível como `todo` tool. |
| **Fusion** | ⚠️ Substitua pelo board kanban nativo. Crie tasks com `fn_task_create`. Use o TodoStore para listas de verificação. |

### Ferramentas IDÊNTICAS (funcionam em ambos)

```
read  →  read      (ler arquivos)
bash  →  bash      (executar comandos)
write →  write     (escrever arquivos)
edit  →  edit      (editar arquivos)
grep  →  grep      (buscar em arquivos)
```

### Regra geral

1. **Tente a ferramenta padrão primeiro.** Se existir, use.
2. **Se falhar** (tool não encontrada, "command not found"), consulte a tabela acima para o equivalente no seu ambiente.
3. **Se não houver equivalente claro**, execute a intenção da melhor forma possível com as ferramentas disponíveis e documente qualquer adaptação feita.
4. **O conteúdo das referências em `references/` é neutro** — funciona em qualquer ambiente sem adaptação.
