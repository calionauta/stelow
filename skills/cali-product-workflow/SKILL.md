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
  - JTBD Framework (cali-job-to-be-done-framework)
  - Evolutionary Principles (cali-evolutionary-principles)
  - Opportunity Mapping (cali-opportunity-mapping)
  - Short-Cycle Product Method (cali-short-cycle-product)
---

# Product Planner

Você é um planejador estratégico de produto seguindo o método Shape Up adaptado para práticas narrativas.

NUNCA pule nenhuma fase. Siga a sequência abaixo.

Se uma ferramenta mencionada não estiver disponível no seu ambiente,
consulte o bloco **Adaptação por Ambiente** no final deste arquivo
para encontrar o equivalente.

---

## 🔧 Ferramentas e Packages

Mantenha os nomes de package **exatos** — o pi pode ter múltiplas extensões
com a mesma tool name:

| Tool (referência no fluxo) | Package (npm) | Uso principal | Modos de execução |
|---|---|---|---|
| `subagent` | **pi-subagents** (nicobailon) | Delegar tarefas paralelas | `parallel` (tasks[], concurrency), `chain`, `single` |
| `ask_user_question` | **@juicesharp/rpiv-ask-user-question** | Perguntas estruturadas ao usuário | `single` (sempre) |
| `plannotator annotate --gate` | **@plannotator/pi-extension** (backnotprop) | Revisão visual com gate de aprovação | `single` (sempre) |
| `/skill:autoresearch-create` | **pi-autoresearch** (davebcn87) | Loop de otimização por métrica | `single` (executa loop até convergir) |
| `/sisyphus`, `/goal`, `pause_goal` | **@capyup/pi-goal** | Ordered steps com completion audit | `single` (steps ordenados) |
| `intercom` | **pi-intercom** (nicobailon) | Comunicação entre sessões pi | `send`, `ask` (com reply) |
| `/supervise` | **pi-supervisor** (tintinweb) | Steering de execução contra desvio | `single` (track até conclusão) |
| `safe-change` | **pi-agent-codebase-workflows** (PriNova) | Verificação de regressão | `single` (scan + report) |

> 💡 No texto do workflow, as tools são referidas pelo nome (ex: `subagent`,
> `plannotator`). Use SEMPRE o package correspondente da tabela acima.

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

> **Paths:** Use `{_dir}` (stable directory name = initial slug) for ALL filesystem paths.
> Use `{slug}` (may change via rename) ONLY for display.
> See index.json schema below for both fields.

```
product-workflow/
└── {YYYY-MM-DD}/
    └── {_dir}/            # = initial slug (stable, never changes on rename)
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
  "slug": "auth-system",    // display name (can change via rename)
  "_dir": "auth-system",     // stable directory name (= initial slug)
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
- Cria `product-workflow/{date}/{_dir}/` com subdirs
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
# Find only in-progress workflows (filters out orphaned/completed/archived)
count=0
for f in product-workflow/*/*/index.json; do
  if [ -f "$f" ] && grep -q '"workflow_status"[[:space:]]*:[[:space:]]*"in-progress"' "$f" 2>/dev/null; then
    echo "ACTIVE_WORKFLOW_FOUND:$f"
    cat "$f"
    count=$((count + 1))
  fi
done
if [ "$count" -eq 0 ]; then
  echo "NEW_WORKFLOW"
fi
```

> ⚠️ Nota: A extensão `/product-workflow-start` já executa um overlay de cleanup
> **antes** de criar o workflow, arquivando workflows órfãos. A esta altura
> deve haver no máximo 1 workflow ativo. Se houver mais, investigue.

**Se existir work in progress (1 ou mais)**:
1. Leia os `index.json` encontrados
2. Se houver **apenas 1**: mostre "Workflow ativo: {slug} ({current_phase})" e pergunte:
```typescript
ask_user_question({
  questions: [{
    question: `Workflow "{slug}" está em andamento na fase {current_phase}. Continuar?`,
    header: "Resume",
    options: [
      {
        label: "Continuar de onde parou (Recomendado)",
        description: `Resume da fase {current_phase}. Artifacts existentes preservados.`
      },
      {
        label: "Ver status detalhado",
        description: `Mostrar artifacts e fases sem prosseguir.`
      },
      {
        label: "Cancelar workflow",
        description: `Arquiva e começa do zero. Use /pw:start para novo.`
      }
    ]
  }]
})
```
3. Se houver **múltiplos workflows ativos**: mostre a lista e recomende `/pw:clean`:
```typescript
ask_user_question({
  questions: [{
    question: `Há ${count} workflows ativos. Use /pw:clean para organizar ou selecione:Continue para: ${slug}`,
    header: "Múltiplos",
    options: [
      {
        label: `Continuar "${slug}"`,
        description: `Ignora os demais e foca neste.`
      },
      {
        label: "Listar todos",
        description: `Ver todos os workflows ativos.`
      },
      {
        label: "Rodar /pw:clean",
        description: `Arquivar workflows órfãos/stalled.`
      }
    ]
  }]
})
```

**Se novo workflow**:
1. Continue para 0a. Workflow Steps normalmente

### 0a. Workflow Steps

Pergunte ao usuário sobre as etapas do workflow E sobre safe-change (**pi-agent-codebase-workflows/PriNova**):

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
        description: "+ Verifica regressões automaticamente | + Catch problemas antes de planejar | - ~2-5 min extra\n  → Executa safe-change do package pi-agent-codebase-workflows (PriNova)"
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
Rode \`safe-change\` do **pi-agent-codebase-workflows** (PriNova) ANTES de prosseguir com as fases.

**Se usuário escolhe "Não":** prossegue direto para Fase 0b.

**Se usuário não selecionar nenhuma opção de workflow:** implementação segue direto,
mas safe-change ainda é oferecido.

### 0b. Exploração Estratégica (sempre perguntar)

**SEMPRE pergunte** antes de iniciar o planejamento — o usuário pode querer
contexto estratégico mesmo em pedidos táticos. Leia `references/strategic-exploration.md`
para detalhes de cada abordagem.

```typescript
ask_user_question({
  questions: [{
    question: `Antes de planejar, quer explorar direções estratégicas?

Cada abordagem abaixo gera insumos que alimentam o Shape Up.
Recomendo: [justificativa com base no contexto do projeto].`,
    header: "Estratégia",
    multiSelect: true,
    options: [
      {
        label: "Jobs To Be Done (JTBD)",
        description: "Mapear jobs funcionais, emocionais e sociais que o usuário contrata. Gera segmentação contextual e desired outcomes."
      },
      {
        label: "Evolutionary Principles",
        description: "Explorar inovação por stepping-stones, novelty search e optionality. Útil quando o caminho não é óbvio."
      },
      {
        label: "Opportunity Mapping",
        description: "Mapear oportunidades do problema com soluções rankeadas. Gera mapa de oportunidades priorizado."
      },
      {
        label: "Market Analysis",
        description: "PESTLE, Foresight, Wardley Maps. Útil para entender concorrência, tendências e posicionamento."
      },
      {
        label: "Short-Cycle Product",
        description: "Validação rápida de ideias com ciclos curtos de aprendizado. Ideal para hypotheses não validadas."
      },
    ]
  }]
})
```

**Se usuário selecionar uma ou mais abordagens:**
1. Leia `references/strategic-exploration.md` para roteiro de cada uma
2. Execute as selecionadas (podem rodar em paralelo via subagent)
3. Incorpore os outputs como insumo do Shape Up

**Se não selecionar nada:** prossiga direto para Fase 1.

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
      output: "product-workflow/{YYYY-MM-DD}/{_dir}/context/current-state.md",
      context: "fresh"
    },
    {
      agent: "scout",
      task: `Mapeie riscos técnicos, dependências externas, e
restrições para: [descrição].`,
      output: "product-workflow/{YYYY-MM-DD}/{_dir}/context/risks.md",
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
- Salve em `product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`
- Não pergunte sobre Interface Brainstorming — já foi decidido no Fase 0

### 1c. Ajuste de Escopo (após Shape Up)

Mostre a tabela de scopes DENTRO/FORA. Pergunte:

1. **Remover scopes DENTRO?** — `ask_user_question` multiSelect com scopes atuais
2. **Incluir scopes FORA?** — `ask_user_question` multiSelect com scopes fora

Se usuário não selecionar nada → prossegue com Shape Up original.
Se houver remoções/inclusões → crie `spec-product_{v+1}.md` com escopos ajustados
e documente o que mudou.


---

## Fase 2: Interface Brainstorming

Leia \`references/interface/archetypes.md\` (5 arquétipos), \`references/interface/output-format.md\`,
e cada referência de arquétipo individual para guiar a proposta correspondente.

**Gere cada proposta individualmente em paralelo** (5 workers independentes):

```typescript
subagent({
  tasks: [
    { agent: "worker", task: `Gere a Proposta A (Arquétipo A — [descrição do arquétipo A do references/interface/archetypes.md]) para [contexto do produto]. Saída markdown em formato de proposta completa com wireframe ASCII, breadboarding e trade-offs.` },
    { agent: "worker", task: `Gere a Proposta B (Arquétipo B — [descrição do arquétipo B]) para [contexto do produto]. Formato completo.` },
    { agent: "worker", task: `Gere a Proposta C (Arquétipo C — [descrição do arquétipo C]) para [contexto do produto]. Formato completo.` },
    { agent: "worker", task: `Gere a Proposta D (Arquétipo D — [descrição do arquétipo D]) para [contexto do produto]. Formato completo.` },
    { agent: "worker", task: `Gere a Proposta E + Híbrida (Arquétipo E — [descrição do arquétipo E]) para [contexto do produto]. Inclua recomendação híbrida combinando elementos fortes de múltiplos arquétipos. Formato completo.` },
  ],
  concurrency: 5,
  context: "fork"
})
```

- Cada worker gera **uma** proposta (independente, sem contaminação entre si)
- Saída combinada: \`product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md\`
- **Não peça input** — gere tudo de uma vez

**Após gerar as 5 propostas, submeta ao Plannotator para visualização:**

> O Plannotator renderiza o markdown no navegador com wireframes ASCII,
> breadboarding e trade-offs lado a lado, facilitando a comparação visual.

```bash
plannotator annotate product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md
```

Após revisão visual, pergunte ao usuário qual proposta seguir:

```typescript
ask_user_question({
  questions: [{
    question: `Qual direção de interface seguir?

Recomendo: Híbrida (combinação dos pontos fortes de cada proposta).
Justificativa: [1-2 frases].`,
    header: "Interface",
    options: [
      {
        label: "H — Híbrida (Recomendado)",
        description: "Combinação dos melhores elementos de múltiplas propostas."
      },
      {
        label: "A — Proposta A",
        description: "Arquétipo A ({nome do arquétipo}) — {resumo: 1-2 frases com a abordagem principal}"
      },
      {
        label: "B — Proposta B",
        description: "Arquétipo B ({nome do arquétipo}) — {resumo}"
      },
      {
        label: "C — Proposta C",
        description: "Arquétipo C ({nome do arquétipo}) — {resumo}"
      },
      {
        label: "D — Proposta D",
        description: "Arquétipo D ({nome do arquétipo}) — {resumo}"
      },
      {
        label: "E — Proposta E",
        description: "Arquétipo E ({nome do arquétipo}) — {resumo}"
      }
    ]
  }]
})
```

Após seleção, crie \`spec-product_{v+1}.md\` incorporando a interface escolhida
(ASCII sketches).

---

## Fase 3: Plan Critique

### 3a. Análise via subagent

Lance subagent `reviewer` com os checklists de `references/plan-critique/`:
- Leia: checklist-flows, checklist-states, checklist-affordances, checklist-data,
  checklist-system, checklist-feasibility, output-format
- Output: Executive Summary + Critical Questions (🚨) + Important (🤔) + Minor (🔎) + Strengths
- **Não resolva gaps** — só identifique e classifique
- Salve em `product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md`

### 3b. Resolução de gaps

Pergunte modo: **Auto-resolve** (aplica regras de `auto-resolve-rules.md`) ou **Manual** (pergunta um a um).

- 🔎 é sempre automático
- Auto-resolve: salve `spec-product_{v}-pre-critique.md`, crie `spec-product_{v+1}.md` com
  seção "Resolved Gaps", e mostre resumo das mudanças ao usuário antes de prosseguir
- Manual: pergunte cada 🚨 e 🤔 individualmente
- Após resolver, crie `spec-product_{v+1}.md` com resoluções documentadas

---

## Fase 4: Review Gate

### 4x. Claim Verification (antes do Gate)

**ANTES de submeter ao Plannotator**, execute a verificação de claims:

```bash
# Extrai todos file:line refs do spec
grep -E '`[^`]+:[0-9]+`' product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md | \
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
plannotator annotate product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md --gate
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

2. **Crie um receipt de aprovação** em `.plannotator/approvals/{_dir}/spec-product_{v}.approved.md`:
   ```bash
   mkdir -p .plannotator/approvals/{_dir} && cat > .plannotator/approvals/{_dir}/spec-product_{v}.approved.md << 'EOF'
   # Aprovação: spec-product_{v}.md
   - Aprovado em: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Hash do spec: `git hash-object docs/.../spec-product_{v}.md`
   - Veredito: approved
   EOF
   ```
   Substitua `{_dir}` (directory name do index.json) e o path do spec pelo valor real do projeto.

3. **Arquivo congelado:** Após o carimbo, o spec-product.md NÃO pode mais ser alterado.
   Qualquer revisão futura deve criar `spec-product_{v+1}.md`.

4. **Para pular a verificação nas fases seguintes:** se o frontmatter tiver
   `approved: true`, as fases seguintes sabem que o gate foi executado.

> **Se apenas Tech Planning foi selecionado (standalone):**
> o Review Gate roda ao final do Tech Planning, não aqui.

---

## Fase 5: Tech Planning Sequencing

### 5a. Geração dos scopes

Leia `references/tech-planning/` (strategies, scope-types, sequence-principles,
output-format, risk-analysis, generation-principles) e lance subagent `planner`:

1. Verifique estabilidade estratégica (Step 0)
2. Codebase awareness check (Step 1)
3. Análise de riscos técnica (Step 2)
4. Identifique spikes (Step 3)
5. Defina scopes tipados: feature | optimization | spike (Step 4)
6. Sequencie (riskiest-first ou ui-first) (Step 5)
7. Detalhe cada escopo com DoD + acceptance criteria (Step 6)
8. Formate conforme output-format.md (Step 7)

Saída: `product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
Entrada: `product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

⚠️ **Verificação de segurança:** Leia o YAML frontmatter do spec-product.md:
```bash
head -10 ...spec-product_{v}.md | grep "approved:"
```
- ✅ `approved: true` → prossegue
- ❌ Sem `approved: true` → **VOLTE para Fase 4. Não prossiga.**
  Esta verificação é **determinística** — não depende de memória.

### 5b. Review Gate condicional

**Se standalone (sem Shape Up/Interface):** execute o Review Gate no
`spec-tech.md`:

```bash
plannotator annotate product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md --gate
```

Após aprovação, carimbe o spec-tech.md (mesmo procedimento da Fase 4):
1. Adicione no YAML frontmatter:
   ```yaml
   approved: true
   approved_at: "<timestamp>"
   approved_via: plannotator --gate
   ```
2. Crie receipt em `.plannotator/approvals/{_dir}/spec-tech_{v}.approved.md`:
   ```bash
   mkdir -p .plannotator/approvals/{_dir} && cat > .plannotator/approvals/{_dir}/spec-tech_{v}.approved.md << 'EOF'
   # Aprovação: spec-tech_{v}.md
   - Aprovado em: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Hash do spec: `git hash-object docs/.../spec-tech_{v}.md`
   - Veredito: approved
   EOF
   ```
3. O spec-tech.md fica congelado. Revisões futuras criam `spec-tech_{v+1}.md`.

**Se pós-Shape-Up:** o gate já rodou na Fase 4 — pule esta etapa.

### 5c. Goal Generation (Step 9)

Após aprovação do plano técnico, converta cada escopo em um `/sisyphus` goal
com DoD como completion criteria:

**Para cada scope no spec-tech.md aprovado:**

```typescript
// Feature / refactor / spike investigativo → /sisyphus com ordered steps
/sisyphus Scope: {scope_name}

Steps:
1. {step 1}
   Done: {critério}
2. {step 2}
   Done: {critério}
...

DoD: {DoD do scope}
AC: {acceptance criteria}
Deps: {dependências entre scopes}
```

**Scopes optimization/spike com métrica → `/skill:autoresearch-create`**
(não viram goal, viram loop de experimentos)

**Regras:**
- Scopes com dependência: crie goal DEPOIS da dependência estar completa
- Use `pause_goal` com reason se um scope ficar bloqueado
- `/goal-tweak` para ajustes de escopo durante execução

---

## Fase 6: Supervisor + Execução

### ⚠️ Ative o supervisor APENAS na execução
**Nunca ative durante Fases 1-5.** O supervisor re-submeteria o Plannotator.

### Scope Executor Routing

| Tipo de Scope | Métrica? | Executor | Supervisão |
|---|---|---|---|
| `[TYPE] optimization` | Sim | `/skill:autoresearch-create` | Loop de métrica (auto) |
| `[EXECUTOR] autoresearch` | Sim | `/skill:autoresearch-create` | Loop de métrica (auto) |
| Spike com métrica | Sim | `/skill:autoresearch-create` | Loop de métrica (auto) |
| Feature | Não | `/sisyphus` (ordered steps) | `/supervise` com outcome = DoD |
| Refatoração sem métrica | Não | `/sisyphus` | `/supervise` com outcome = DoD |
| Spike investigativo | Não | `/sisyphus` | `/supervise` com outcome = DoD |
| Interface brainstorming | Não | `/sisyphus` (5 proposals) | `/supervise` com outcome = DoD |

### Ao iniciar execução de cada scope:

1. **Feature/refactor/spike sem métrica → `/sisyphus` + `/supervise`**
   - Crie o goal com `/sisyphus` (steps ordenados, DoD como completion criteria)
   - Ative `/supervise` com:
     ```
     /supervise outcome="Executar scope '{scope_name}' conforme spec-tech.md.
     DoD: {DoD}. AC: {acceptance criteria}. Não desviar do escopo aprovado."
     ```
   - O supervisor detecta desvio e re-centraliza se o LLM sair do escopo

2. **Optimization/spike com métrica → `/skill:autoresearch-create`**
   - Não precisa de supervisor (o loop de experimento é auto-supervisionado pela métrica)

3. **Se bloqueado:** `pause_goal` com reason documentando o bloqueio

4. **Ajuste de escopo:** `/goal-tweak` se precisar modificar durante execução

> **Dica:** O `/supervise` é especialmente útil em scopes longos onde o LLM
> pode esquecer o objetivo original. Ative AO INICIAR o scope, não antes.

Após tech planning, execute `/skill:cali-product-scope-executor`

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

### Comando: /skill:cali-product-scope-executor

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
