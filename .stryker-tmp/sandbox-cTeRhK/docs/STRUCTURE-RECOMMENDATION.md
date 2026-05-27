# Estrutura Recomendada para cali-product-workflow

**Versão:** 2.3  
**Data:** 2026-05-26  
**Status:** Refinamento de nomenclatura — "stages" unificado, state/ movido para .cali-product-workflow/  
**Mudanças desde v2.2:** Terminologia unificada: tudo é "stages" (diretório, headers, código, YAML). state/ movido para .cali-product-workflow/ (separação runtime vs instruções). Nomes reais de skills no diagrama. `stage-guard.ts` → `stages-guard.ts`.

---

## Contexto

Após análise com benchmarking de GitAgent, DotAgents, Statewright e Phaselock, e double-check cross-CLI, a estrutura foi refinada para:

1. **Markdown como camada universal** — todo LLM lê, todo CLI funciona
2. **Código TypeScript como camada Pi-only** — enforcement real via hooks
3. **stages.yaml complementa, não substitui** — metadados ao lado de comportamento
4. **Skills flat** — padrão universal de descoberta (SKILL.md por diretório)
5. **State persistence** — necessário para stages-guard saber onde está
6. **Terminologia unificada** — "stages" em tudo (diretório, headers, código, YAML)

---

## Princípio Fundamental: Duas Camadas

```
┌─────────────────────────────────────────────────────┐
│ CAMADA UNIVERSAL (markdown)                         │
│ Todo LLM lê → Claude, Codex, OpenCode, Pi          │
│                                                     │
│  RULES.md        → Hard constraints                │
│  stages/*.md     → Comportamento por stage          │
│  stages.yaml     → Metadados (referência)           │
│  references/     → Tool reference pattern           │
│  SKILL.md        → Entry point do workflow          │
└─────────────────────────────────────────────────────┘
                         │
                         │ Pi adicionalmente:
                         ▼
┌─────────────────────────────────────────────────────┐
│ CAMADA PI (TypeScript)                              │
│ Só Pi executa → enforcement real via hooks          │
│                                                     │
│  stages-guard.ts → Lê stages.yaml                  │
│                  → Bloqueia blocked_tools            │
│                  → via PreToolUse hook              │
└─────────────────────────────────────────────────────┘
```

**Por que duas camadas?**

Claude Code, Codex e OpenCode **não têm** hooks nativos de PreToolUse como Pi. O enforcement deles é comportamental — o LLM lê RULES.md + stages.yaml e decide obedecer. Só Pi consegue interceptar `tool_call` e bloquear antes da execução.

Portanto:
- **Markdown** = camada universal (funciona em todos)
- **TypeScript hooks** = camada Pi (enforcement real)

---

## Estrutura Final

```
cali-product-workflow/
│
├── AGENTS.md                          # Documentação do projeto (cross-CLI)
├── RULES.md                           # 🆕 Hard constraints (cross-CLI)
│
├── .cali-product-workflow/            # Artefatos de runtime (já existe)
│   └── state/                         # 🆕 Persistência de estado (runtime, não instruções)
│       └── current-stage.json         #   Stage atual + histórico
│
├── skills/                            # Flat — descoberta universal por SKILL.md
│   ├── cali-product-workflow/         # Orchestrator skill
│   │   ├── SKILL.md                   # Entry point do workflow
│   │   ├── stages.yaml                # 🆕 Metadados de stage (complementa stages/)
│   │   ├── stages/                    # Comportamento (fonte primária, manual)
│   │   │   ├── triage.md
│   │   │   ├── setup.md
│   │   │   └── ...
│   │   └── references/                # Mantido — tool reference pattern
│   │       └── cli-tools/
│   │           ├── subagents.md
│   │           ├── goals.md
│   │           ├── plannotator.md
│   │           └── ...
│   │
│   ├── cali-product-shape-up/         # Flat skill (nome real)
│   ├── cali-product-plan-critique/    # Flat skill (nome real)
│   ├── cali-product-interface-brainstorm/  # Flat skill (nome real)
│   ├── cali-product-tech-planning/    # Flat skill (nome real)
│   ├── cali-product-job-to-be-done/   # Flat skill (nome real)
│   ├── cali-product-pricing/          # Flat skill (nome real)
│   └── ... (demais skills)
│
├── extensions/                        # Pi-specific (mantido)
│   └── cali-product-workflow/
│       └── adapters/
│           ├── stages-guard.ts        # 🆕 Enforcement via hooks
│           ├── stages-loader.ts       # 🆕 Carrega stages.yaml
│           └── state-manager.ts       # 🆕 Gerencia current-stage.json
│
├── cli-agents/                        # Markdown commands cross-CLI (mantido)
│   ├── COMMANDS.md
│   ├── pi/
│   ├── claude/commands/
│   ├── opencode/commands/
│   └── codex/commands/
│
└── types/                             # Pi/build only
    └── stages.ts                      # 🆕 Interface do schema YAML
```

---

## Comparação: v2.1 (rejeitado) vs v2.2 (refinado) vs v2.3 (nomenclatura)

| Aspecto | v2.1 (rejeitado) | v2.2 (refinado) | v2.3 (nomenclatura) |
|---------|-----------------|-----------------|---------------------|
| Camada enforcement | Universal (stage-guard.ts para todos) | Duas camadas (markdown + Pi-only) | Mantido |
| stages/ | Gerado de YAML | Manual, complementado por YAML | Renomeado de phases/ → stages/ |
| Skills | Aninhadas (orchestrator/subskills/) | Flat | Mantido, nomes reais no diagrama |
| adapters/ | Na raiz | Em extensions/ (Pi-only) | Mantido |
| runtime/ | Novo diretório | Não existe | Mantido |
| AGENTS.md | Entry point do workflow | Documentação do projeto | Mantido |
| State persistence | Ausente | state/current-stage.json | Movido para .cali-product-workflow/state/ |
| references/ | Eliminado | Mantido | Mantido |
| Terminologia | "phases" + "stages" misturados | "phases" + "stages" misturados | **Unificado: "stages" em tudo** |

---

## Componentes Detalhados

---

### 1. `RULES.md` (Root)

**Arquivo:** `RULES.md` (criar na raiz)

**Por quê:** Hard constraints em markdown puro. Todo LLM lê. Cross-CLI universal.

```markdown
# cali-product-workflow Rules

## Hard Constraints (NEVER violate)

1. **NEVER skip stages** — Always follow stages/ sequence
2. **NEVER skip Gate approval** — Visual review via Plannotator is mandatory
3. **NEVER activate supervisor during planning** — Only during execution
4. **NEVER call tools directly from skills** — Use tool references in references/cli-tools/

## Safety Boundaries

- Never execute code before Gate approval
- Never modify production without explicit user confirmation
- Never ignore mutation testing failures

## Tool Restrictions Per Stage

See `skills/cali-product-workflow/stages.yaml` for current tool restrictions.

| Stage | Blocked Tools |
|-------|---------------|
| triage | edit, write, bash, subagent, agent_browser |
| setup | bash, write, agent_browser |
| selection | bash, write, agent_browser |
| shape | bash, agent_browser |
| gate | edit, write, bash, subagent, agent_browser |
| execution | (none - all allowed, supervisor active) |
| audit | bash |

## Enforcement

- **All CLIs:** This file + stages.yaml define behavioral constraints
- **Pi only:** `extensions/cali-product-workflow/adapters/stages-guard.ts` enforces programmatically
```

---

### 2. `stages.yaml` (Metadados — complementa, não substitui)

**Arquivo:** `skills/cali-product-workflow/stages.yaml` (criar)

**Por quê:** Source of truth para metadados estruturados (tools, transições, supervisor). Complementa o conteúdo comportamental em `stages/*.md`. **Não** substitui stages/ — os stages têm processos, padrões de pergunta, regras de chaining que não cabem em YAML.

```yaml
# stages.yaml — Metadados de stage
# Complementa stages/*.md (comportamento), NÃO substitui
# Source of truth para: tools por stage, transições, supervisor, gates

stages:
  - name: triage
    order: 10
    description: Initial assessment. Determine if this is a valid request.
    
    # Policy (runtime enforcement via stages-guard.ts no Pi)
    blocked_tools: [edit, write, bash, subagent, agent_browser]
    allowed_tools: [ask, read, grep, ls]
    
    # Cognition (LLM guidance via SKILL.md)
    preferred_tools: [ask]
    primary_actions: [ask]
    
    # Transitions (graph, not linear)
    transitions:
      next: [setup]
      accept: [setup]
      reject: []

  - name: setup
    order: 20
    description: Setup context. Explore codebase, gather requirements.
    
    blocked_tools: [bash, write, agent_browser]
    allowed_tools: [ask, read, grep, ls, subagent]
    preferred_tools: [read, grep]
    primary_actions: [read, grep]
    
    transitions:
      next: [selection]
      accept: [selection]
      reject: [triage]

  - name: selection
    order: 30
    description: Select approach. Choose workflow variant and sub-skills.
    
    blocked_tools: [bash, write, agent_browser]
    allowed_tools: [ask, read, grep, ls, subagent]
    preferred_tools: [ask, read]
    
    transitions:
      next: [shape]
      accept: [shape]
      reject: [triage]

  - name: shape
    order: 40
    description: |
      Shape stage. Define appetite, hill chart, rabbit holes.
      Load /skill:cali-product-shape-up.
    
    blocked_tools: [bash, agent_browser]
    allowed_tools: [ask, read, grep, ls, write, subagent]
    preferred_tools: [read, write]
    primary_actions: [read, write]
    
    transitions:
      next: [gate]
      rework: [shape]
      accept: [gate]
      reject: [selection]

  - name: gate
    order: 60
    description: |
      Gate review. Visual approval via Plannotator required.
      This is a BLOCKING gate — no execution until approved.
    
    blocked_tools: [edit, write, bash, subagent, agent_browser]
    allowed_tools: [read, ls, grep, ask]
    preferred_tools: [read]
    primary_actions: [read]
    
    requires_approval: true
    approval_tool: plannotator
    
    transitions:
      next: [execution]
      accept: [execution]
      reject: [shape]

  - name: execution
    order: 120
    description: Implementation. Execute planned scopes.
    
    blocked_tools: []
    allowed_tools: [edit, write, bash, read, grep, ls, subagent, ask, agent_browser]
    preferred_tools: [edit, write, bash]
    primary_actions: [edit, write, bash]
    
    supervisor: true
    
    transitions:
      next: [audit]
      accept: [audit]
      rework: [shape]

  - name: audit
    order: 200
    description: Final audit. Verify all requirements met.
    
    blocked_tools: [bash]
    allowed_tools: [ask, read, grep, ls, write]
    preferred_tools: [read, grep]
    
    transitions:
      next: []
      accept: []
      reject: [execution]
```

---

### 3. `current-stage.json` (State Persistence)

**Arquivo:** `.cali-product-workflow/state/current-stage.json` (criar)

**Por quê:** **Crítico.** Sem state persistence, o stages-guard não sabe em que stage está e não pode bloquear ferramentas. O orchestrator SKILL.md instrui o LLM a atualizar este arquivo ao transitar stages.

**Localização:** `.cali-product-workflow/state/` — fora de `skills/`. Skills são instruções imutáveis versionadas; state é runtime mutável. Manter separados evita poluir o diretório de skills com dados de sessão.

```json
{
  "current_stage": "triage",
  "previous_stage": null,
  "transitioned_at": "2026-05-26T10:00:00Z",
  "history": [
    {
      "stage": "triage",
      "entered_at": "2026-05-26T10:00:00Z",
      "exited_at": null
    }
  ],
  "gates_passed": [],
  "supervisor_active": false
}
```

**Como usar:**
- `state-manager.ts` (Pi) lê/escreve este arquivo
- `SKILL.md` (orchestrator) instrui o LLM a atualizar ao transitar
- Claude/Codex/OpenCode: LLM lê o arquivo para saber stage atual (comportamental)

---

### 4. `extensions/cali-product-workflow/adapters/stages-guard.ts` (Pi Only)

**Arquivo:** `extensions/cali-product-workflow/adapters/stages-guard.ts` (criar)

**Por quê:** Enforcement real via PreToolUse hooks do Pi. Só Pi executa código em hooks — outros CLIs dependem de markdown comportamental.

**Dependência:** Requer `yaml` package para parse. Instalar com `npm install yaml`.

```typescript
// extensions/cali-product-workflow/adapters/stages-guard.ts
// Pi-only enforcement via PreToolUse hooks
// Lê stages.yaml e current-stage.json para bloquear ferramentas

import { parse as parseYAML } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ── Tipos (espelha types/stages.ts) ──────────────────────────────

export interface Stage {
  name: string;
  order: number;
  description: string;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  transitions: Record<string, string[]>;
  requires_approval?: boolean;
  approval_tool?: string;
  supervisor?: boolean;
}

export interface StagesConfig {
  stages: Stage[];
}

export interface StageState {
  current_stage: string;
  previous_stage: string | null;
  transitioned_at: string;
  history: Array<{
    stage: string;
    entered_at: string;
    exited_at: string | null;
  }>;
  gates_passed: string[];
  supervisor_active: boolean;
}

export interface StagesGuardResult {
  allowed: boolean;
  reason?: string;
  allowedTools?: string[];
}

// ── Loader ───────────────────────────────────────────────────────

export function loadStages(configPath: string): StagesConfig {
  const content = readFileSync(configPath, 'utf-8');
  return parseYAML(content) as StagesConfig;
}

export function loadState(statePath: string): StageState {
  if (!existsSync(statePath)) {
    // Fallback seguro: assume triage
    return {
      current_stage: 'triage',
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      gates_passed: [],
      supervisor_active: false
    };
  }
  return JSON.parse(readFileSync(statePath, 'utf-8'));
}

// ── Guard ────────────────────────────────────────────────────────

export function createStagesGuard(
  stages: StagesConfig,
  state: StageState,
  onBlocked?: (tool: string, stage: string, allowed: string[]) => void
) {
  // Cache para lookup rápido
  const stageMap = new Map<string, Stage>();
  for (const s of stages.stages) {
    stageMap.set(s.name, s);
  }

  return function checkTool(toolName: string): StagesGuardResult {
    const stageName = state.current_stage;
    const stage = stageMap.get(stageName);

    if (!stage) {
      // Stage não encontrado — permitir (fallback seguro)
      return { allowed: true };
    }

    // POLICY CHECK: blocked_tools
    if (stage.blocked_tools.includes(toolName)) {
      const reason = `Tool '${toolName}' is blocked in '${stageName}' stage`;
      onBlocked?.(toolName, stageName, stage.allowed_tools);

      return {
        allowed: false,
        reason,
        allowedTools: stage.allowed_tools
      };
    }

    // VERIFICATION CHECK: allowed_tools
    if (stage.allowed_tools.length > 0 && !stage.allowed_tools.includes(toolName)) {
      // Tool não está na lista de permitidas, mas não está blocked
      // Log warning mas permite (opt-in model — só bloqueia o que está em blocked_tools)
      console.warn(
        `[Stages Guard] Tool '${toolName}' not in allowed list for stage '${stageName}'`
      );
    }

    return { allowed: true };
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createStagesGuardFromPaths(
  stagesPath: string,
  statePath: string,
  onBlocked?: (tool: string, stage: string, allowed: string[]) => void
) {
  const stages = loadStages(stagesPath);
  const state = loadState(statePath);
  return createStagesGuard(stages, state, onBlocked);
}
```

---

### 5. `extensions/cali-product-workflow/adapters/state-manager.ts` (Pi Only)

**Arquivo:** `extensions/cali-product-workflow/adapters/state-manager.ts` (criar)

**Por quê:** Gerencia transições de estado. O orchestrator SKILL.md instrui o LLM a chamar `transition("shape")` ao avançar stages.

```typescript
// extensions/cali-product-workflow/adapters/state-manager.ts
// Gerencia current-stage.json — transições e histórico

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { StageState, StagesConfig } from './stages-guard';

export function loadState(path: string): StageState {
  if (!existsSync(path)) {
    return {
      current_stage: 'triage',
      previous_stage: null,
      transitioned_at: new Date().toISOString(),
      history: [],
      gates_passed: [],
      supervisor_active: false
    };
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function saveState(path: string, state: StageState): void {
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8');
}

export function transition(
  statePath: string,
  toStage: string,
  stages: StagesConfig,
  transitionType: string = 'next'
): StageState {
  const state = loadState(statePath);
  const stage = stages.stages.find(s => s.name === toStage);

  // Atualizar histórico
  const now = new Date().toISOString();
  if (state.history.length > 0) {
    const last = state.history[state.history.length - 1];
    if (last && !last.exited_at) {
      last.exited_at = now;
    }
  }

  // Registrar novo stage
  state.history.push({
    stage: toStage,
    entered_at: now,
    exited_at: null
  });

  state.previous_stage = state.current_stage;
  state.current_stage = toStage;
  state.transitioned_at = now;

  // Ativar supervisor se o stage requer
  state.supervisor_active = stage?.supervisor ?? false;

  saveState(statePath, state);
  return state;
}

export function getCurrentStage(statePath: string): string {
  return loadState(statePath).current_stage;
}
```

---

### 6. `types/stages.ts` (Pi/build only)

**Arquivo:** `types/stages.ts` (criar)

**Por quê:** Interface TypeScript compartilhada entre stages-guard.ts, state-manager.ts, e stages-loader.ts.

```typescript
// types/stages.ts
// Interfaces compartilhadas para o schema de stages.yaml

export interface StageTransitions {
  next?: string[];
  accept?: string[];
  reject?: string[];
  rework?: string[];
  [key: string]: string[] | undefined;
}

export interface Stage {
  name: string;
  order: number;
  description: string;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  transitions: StageTransitions;
  requires_approval?: boolean;
  approval_tool?: string;
  supervisor?: boolean;
}

export interface StagesConfig {
  stages: Stage[];
}

export interface StageHistoryEntry {
  stage: string;
  entered_at: string;
  exited_at: string | null;
}

export interface StageState {
  current_stage: string;
  previous_stage: string | null;
  transitioned_at: string;
  history: StageHistoryEntry[];
  gates_passed: string[];
  supervisor_active: boolean;
}
```

---

### 7. `skills/cali-product-workflow/SKILL.md` (Entry Point)

**Arquivo:** `skills/cali-product-workflow/SKILL.md` (atualizar existente)

**Por quê:** Entry point do workflow. O SKILL.md existente já referencia stages, tool references, e sub-skills. Precisa ser atualizado para referenciar stages.yaml, RULES.md, e o mecanismo de state.

**Adições necessárias ao SKILL.md existente:**

```markdown
## Stage State Management

The current workflow stage is tracked in `.cali-product-workflow/state/current-stage.json`.

When transitioning to a new stage:
1. Read `.cali-product-workflow/state/current-stage.json` to know current stage
2. Read `stages.yaml` to validate tools allowed in new stage
3. Update `.cali-product-workflow/state/current-stage.json` with `transition()` from state-manager
4. If the new stage has `supervisor: true`, activate supervisor
5. If the new stage has `requires_approval: true`, gate before proceeding

## Tool Restrictions

Before calling any tool, check:
1. `RULES.md` for hard constraints
2. `stages.yaml` for stage-specific `blocked_tools`
3. If using Pi: stages-guard enforces automatically
4. If using other CLI: you are responsible for self-enforcement

## Cross-CLI Notes

- **Pi:** stages-guard.ts enforces tool restrictions via PreToolUse hooks
- **Claude/Codex/OpenCode:** Read RULES.md + stages.yaml and self-enforce
```

---

## Decisões de Design (Por Quê)

### Decisão 1: Terminologia unificada — "stages"

**Problema que resolve:**
O SKILL.md usava "Phase Index", "Phase 0", "Phase 1". O diretório era `phases/`. O YAML usava `stages`. O código usava `stage-guard.ts`. Isso forçava o LLM a manter um mapa mental `fase = stage = step` desnecessário.

**Decisão (v2.3):** Padronizar tudo como **"stages"**.

| Antes (v2.2) | Depois (v2.3) |
|---|---|
| `phases/` (diretório) | `stages/` (diretório) |
| `## Phase 0: Inbox Triage` | `## Stage 0: Inbox Triage` |
| `## 📋 Phase Index` | `## 📋 Stage Index` |
| `stage-guard.ts` | `stages-guard.ts` |
| `phase-status.md` | `stage-status.md` |

**Rationale:** "Stage" é mais preciso que "phase" — implica sequência com estados de transição (active, paused, completed). "Phase" sugere agrupamento temporal mas não necessariamente sequencial. Como o YAML e a lógica de código já nasceram com "stage", era o markdown que divergia.

### Decisão 2: `state/` em `.cali-product-workflow/`, não em `skills/`

**Problema que resolve:**
Skills são instruções imutáveis versionadas via git. `current-stage.json` é estado de runtime mutável, específico de uma sessão. Misturar os dois polui o diretório de skills e cria falsa impressão de que o state é versionado.

**Solução:** `.cali-product-workflow/state/current-stage.json` — consistente com o padrão já existente de `.cali-product-workflow/` para artefatos de runtime (specs, plans, sessions).

### Decisão 3: Por que `stages.yaml` complementa, não substitui?

**Problema que resolve:**
`stages/*.md` contém comportamento rico: processos, padrões de pergunta, regras de chaining entre skills. YAML não captura isso — é só metadados estruturados.

**GitAgent confirma:** Eles mantêm `workflows/*.yaml` (structured) E `workflows/*.md` (narrative). Coexistem.

**Solução:** stages.yaml = metadados (tools, transições, supervisor). stages/*.md = comportamento (processos, perguntas, chaining).

### Decisão 4: Por que duas camadas (markdown + Pi-only)?

**Problema que resolve:**
Pi tem `PreToolUse` hooks nativos. Claude Code tem hooks.json limitado. Codex não tem hooks documentados. OpenCode tem plugin hooks mas são diferentes.

**Solução:**
- Markdown → todos CLIs leem (comportamental)
- TypeScript → Pi-only (enforcement real)

### Decisão 5: Por que skills flat?

**Problema que resolve:**
Pi descobre skills por SKILL.md em diretórios planos. Claude/Codex/OpenCode carregam por path. Nesting (`orchestrator/subskills/`) quebra descoberta universal.

**DotAgents + GitAgent confirmam:** Skills são flat em `skills/`.

**Solução:** `skills/cali-product-workflow/`, `skills/cali-product-shape-up/`, `skills/cali-product-plan-critique/` — todos no mesmo nível.

### Decisão 6: Por que `references/cli-tools/` mantido?

**Problema que resolve:**
Tool references são essenciais cross-CLI. Definem como cada CLI chama cada ferramenta (subagents, goals, plannotator). Sem eles, skills não sabem quais tools usar.

**Solução:** Mantido. Não era junk drawer — era pattern documentado em TOOL-REFERENCE-PATTERN.md.

### Decisão 7: Por que state persistence?

**Problema que resolve:**
Sem estado, o stages-guard não sabe em que stage está. O LLM pode estar em "execution" mas o state.json ainda diz "triage" → guard não bloqueia tools perigosas.

**Solução:** `.cali-product-workflow/state/current-stage.json` gerenciado pelo orchestrator SKILL.md. Stages-guard lê este arquivo para saber o stage atual.

### Decisão 8: Por que `AGENTS.md` como documentação, não entry point?

**Problema que resolve:**
AGENTS.md é documentação de projeto (lida por todos CLIs como contexto). SKILL.md é entry point do workflow (carregado como skill/instrução). Responsabilidades diferentes.

**Solução:** AGENTS.md = documentação cross-CLI. SKILL.md = entry point do workflow.

---

## Mapa de Migração (Atual → Proposto)

### Arquivos a Criar

| Arquivo | Descrição | Cross-CLI? |
|---------|-----------|------------|
| `RULES.md` | Hard constraints | ✅ Todos leem |
| `skills/cali-product-workflow/stages.yaml` | Metadados de stage | ✅ Todos leem (ref) |
| `.cali-product-workflow/state/current-stage.json` | Estado inicial | ✅ Todos leem |
| `extensions/cali-product-workflow/adapters/stages-guard.ts` | Enforcement Pi | ⚠️ Pi only |
| `extensions/cali-product-workflow/adapters/stages-loader.ts` | Carrega YAML Pi | ⚠️ Pi only |
| `extensions/cali-product-workflow/adapters/state-manager.ts` | Transições Pi | ⚠️ Pi only |
| `types/stages.ts` | Interface TypeScript | ⚠️ Pi/build only |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `skills/cali-product-workflow/SKILL.md` | Adicionar state management, stages.yaml, cross-CLI notes |
| `skills/cali-product-workflow/stages/*.md` | Renomear de phases/, headers "Stage N:", referenciar stages.yaml |
| `AGENTS.md` | Atualizar paths (phases/ → stages/) |
| `skills/cali-product-workflow/references/cli-tools/phase-status.md` | Renomear para stage-status.md, atualizar conteúdo |
| `skills/cali-product-workflow/references/cli-tools/` | Adicionar stage-capabilities.md, permissions.md |

### O que NÃO muda

| Diretório | Status |
|-----------|--------|
| `skills/` (flat) | Mantido — padrão universal |
| `extensions/cali-product-workflow/` | Mantido — Pi-only |
| `cli-agents/` | Mantido — commands cross-CLI |
| `references/cli-tools/` | Mantido — essencial |
| `stages/` (ex-phases/) | Mantido (renomeado) — fonte primária de comportamento |

---

## Checklist de Implementação

### Pré-implementação
- [ ] Backup do projeto (git commit)
- [ ] `npm install yaml` nos locais relevantes

### Fase 1: Documentação Cross-CLI
- [ ] Criar `RULES.md` na raiz
- [ ] Criar `skills/cali-product-workflow/stages.yaml`
- [ ] Criar `.cali-product-workflow/state/current-stage.json` (inicial = triage)
- [ ] Criar `types/stages.ts`
- [ ] Renomear `phases/` → `stages/` (diretório + headers internos)
- [ ] Renomear `phase-status.md` → `stage-status.md`

### Fase 2: Atualizar SKILL.md e AGENTS.md
- [ ] Adicionar seção "Stage State Management" ao SKILL.md
- [ ] Adicionar seção "Tool Restrictions" ao SKILL.md
- [ ] Adicionar seção "Cross-CLI Notes" ao SKILL.md
- [ ] Cada stage markdown referencia stages.yaml
- [ ] Atualizar AGENTS.md com novos paths (stages/, .cali-product-workflow/state/)

### Fase 3: Enforcement Pi
- [ ] Criar `extensions/.../adapters/stages-guard.ts`
- [ ] Criar `extensions/.../adapters/stages-loader.ts`
- [ ] Criar `extensions/.../adapters/state-manager.ts`
- [ ] Registrar stages-guard no PreToolUse hook do Pi
- [ ] Testar: bash em triage → bloqueado

### Fase 4: Validação
- [ ] Verificar que RULES.md é legível cross-CLI
- [ ] Verificar que stages.yaml complementa (não substitui) stages/
- [ ] Testar stages-guard com state atualizado
- [ ] Testar transição de estado via state-manager
- [ ] Verificar AGENTS.md reflete estrutura atual
- [ ] Verificar que todos os headers usam "Stage" (não "Phase")

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| LLM ignora RULES.md em Claude/Codex | Média | Médio | RULES.md é curto e direto; stages.yaml visível |
| State.json dessincronizado | Baixa | Alto | Orchestrator SKILL.md é responsável por manter |
| stages.yaml vs stages/*.md divergem | Baixa | Médio | stages.yaml é metadados simples; stages/ são fonte |
| yaml package ausente | Baixa | Baixo | Documentar `npm install yaml` como pré-requisito |
| Referências residuais a "phases" | Média | Baixo | Grep global após migração para garantir zero ocorrências |

---

## Referências

- [GitAgent Protocol](https://gitagent.sh/) — workflows/*.yaml + workflows/*.md coexistem
- [DotAgents Protocol](https://dotagentsprotocol.com/) — .agents/ convention, skills flat
- [Statewright](https://github.com/statewright/statewright) — Tool allowlists, suporta Pi/Claude/Codex/OpenCode
- [Phaselock](https://github.com/infinri/Phaselock) — Shell hooks, 80 regras

---

## Changelog

### v2.3 (2026-05-26)
- **UNIFICADO:** Terminologia — tudo é "stages" (diretório `stages/`, headers "Stage N:", código `stages-guard.ts`)
- **MOVIDO:** `state/` de `skills/cali-product-workflow/state/` para `.cali-product-workflow/state/` — separação runtime vs instruções
- **CORRIGIDO:** Nomes de skills no diagrama agora refletem diretórios reais (`cali-product-shape-up/`, não `cali-shape-up/`)
- **RENOMEADO:** `stage-guard.ts` → `stages-guard.ts` (consistência plural)
- **RENOMEADO:** `phase-status.md` → `stage-status.md`

### v2.2 (2026-05-26)
- **REFORMULADO:** Duas camadas — markdown universal + código Pi-only
- **CORRIGIDO:** stages.yaml complementa, não substitui stages/
- **CORRIGIDO:** Skills mantidas flat (padrão universal)
- **CORRIGIDO:** AGENTS.md como documentação, SKILL.md como entry point
- **CORRIGIDO:** adapters/ movido para extensions/ (Pi-only)
- **CORRIGIDO:** runtime/ removido (cada CLI já tem seu lugar)
- **ADICIONADO:** State persistence (state/current-stage.json)
- **ADICIONADO:** state-manager.ts para transições
- **CORRIGIDO:** parseYAML usa `yaml` package (não placeholder)
- **MANTIDO:** references/cli-tools/ (essencial cross-CLI)

### v2.1 (2026-05-25)
- Adicionado "Decisões de Design", guia passo a passo, mapa de migração, checklist e riscos

### v2.0 (2026-05-25)
- stages.yaml source of truth, transições como grafo, AGENTS.md na raiz, subskills/

### v1.0 (2026-05-25)
- Proposal inicial
