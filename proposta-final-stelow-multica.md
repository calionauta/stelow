# Especificação Técnica & Plano de Integração: Workflow e Skills Stelow no Multica.ai

---

## 1. Visão Geral & Contexto Tecnológico

Este documento especifica a arquitetura e o plano de implementação para integrar a biblioteca de workflows e habilidades do **Stelow** na plataforma **Multica.ai**, padronizando os adaptadores de execução e estabelecendo a sincronização de estado e artefatos.

### 1.1 O Projeto Stelow (`github.com/calionauta/stelow`)
Stelow é uma solução de orquestração de desenvolvimento guiado por agentes baseada na metodologia **Shape Up**. Em vez de listas genéricas de tarefas, o Stelow divide o ciclo de desenvolvimento em escopos bem delimitados, validados por críticas adversariais e refinados em planos técnicos tipados.

Principais componentes da arquitetura do Stelow:
- **Ecossistema de 25 Skills:** Composto por 1 habilidade de orquestração e 24 habilidades especializadas distribuídas em categorias (produto, pesquisa, código e meta-habilidades).
- **Máquina de 17 Estágios Canônicos:** Estruturada na sequência `triage → select → setup → context → shape → critique → gate → scope → interface → int-gate → selection → planning → plan-gate → execution → verification → diff-gate → audit`.
- **Fonte Declarativa de Estágios (`stages.yaml`):** Definição canônica declarativa dos estágios e transições, interpretada pelo runtime via `loadStages()`.
- **Matriz de Controle em Dois Eixos:** Cada execução é regida pela combinação `Appetite (Lean / Core / Complete)` × `Review Mode (Auto / Product Spec Gate / +Interface Gates / +Tech Review / +Code Diff)`.
- **Arquitetura Multi-Host baseada em Adaptadores:** A abstração base `BaseAdapter` (`extensions/stelow/adapters/base.ts`) fornece os hooks de integração com hosts (`pi`, `fusion`, CLI genérica).
- **Modelo de Estado em Três Camadas:** Escopos (unidades de entrega), Tarefas (subitens com descobertas `note:`) e Registros (evidências de execução). O estado persistente vive em `stelow.json` e no diretório `.stelow/{date}/{dir}/`.

### 1.2 A Plataforma Multica.ai
Multica.ai é uma plataforma de gerenciamento de tarefas e execução de agentes autônomos.

Principais primitivas da plataforma Multica:
- **Issues (Tarefas):** Entidades principais do ciclo de trabalho. Possuem 7 status nativos: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`.
- **Metadados de Issue (`multica issue metadata`):** Armazenamento de chave-valor (KV) estruturado associado a cada issue.
- **Comentários e Anexos (`multica issue comment`):** Comunicação entre membros e agentes. Suporta anexos de arquivos físicos (`--attachment`).
- **Checkout de Repositório (`multica repo checkout`):** Clona/atualiza o repositório em um diretório persistente por workspace.
- **Autopilots (`multica autopilot`):** Agendadores e gatilhos de automação (cron ou webhook) que executam tarefas sem intervenção humana direta.

---

## 2. Arquitetura da Integração & Decisões de Design

### 2.1 Padronização e Inversão dos Adaptadores de Host
Para eliminar duplicidade e esclarecer as responsabilidades de execução, os adaptadores do Stelow são reestruturados sob uma hierarquia única:

1. **`stelow-adapter-cli` (Substitui o antigo `stelow-product-orchestrator`):**
   - Renomeação atômica e limpa do orquestrador principal.
   - Atua como o adaptador padrão para qualquer runtime de linha de comando (Pi CLI, OpenCode, Claude Code, Cursor, Aider ou shell genérico).
2. **`stelow-adapter-multica` (Novo Adaptador Nátivo):**
   - Adaptador dedicado para o ambiente Multica.ai (`extensions/stelow/adapters/multica/`).
   - Gerencia a ponte entre o runtime do Stelow e as primitivas da API/CLI do Multica (metadados KV, status de issue, anexos e encadeamento de comentários).
3. **Hierarquia de Classes:**
   `BaseAdapter` (`extensions/stelow/adapters/base.ts`) → `CLIAdapter` (`extensions/stelow/adapters/cli.ts`) / `MulticaAdapter` (`extensions/stelow/adapters/multica/index.ts`).

### 2.2 Fonte da Verdade do Estado & Projeção Unidirecional
- **Fonte Primária Autoritativa (Ateliê):** O estado detalhado do workflow (`stelow.json`, `specs/spec-product_v{N}.md`, `plans/spec-tech_v{N}.md`, `audit-trail.md`) é gravado e mantido no diretório do repositório (`multica repo checkout`).
- **Projeção em Metadados KV (`syncToHost()`):** A cada transição de estágio, o `MulticaAdapter` projeta assincronamente os dados essenciais para o Multica via metadados KV:
  - `workflow_id`: UUID único do workflow.
  - `current_stage`: Código do estágio canônico (ex: `shape`, `int-gate`, `execution`).
  - `appetite`: Nível de appetite (`Lean` | `Core` | `Complete`).
  - `review_mode`: Modo de revisão ativo.
  - `stelow_version`: Versão da release do Stelow.
  - `last_transition_at`: Timestamp ISO 8601 da última alteração.
  - `<gate>_approved_at`: Registros de aprovação de portões (`gate`, `int-gate`, `plan-gate`, `diff-gate`).
- **Reconciliação:** Em operações de leitura, o adaptador sempre lê `stelow.json` do sistema de arquivos como autoridade. Os metadados da issue servem como índice de consulta e visualização na interface da plataforma.

### 2.3 Gatilho Unificado e Modelo "1 Card = 1 Workflow"
- **Disparo:** O workflow é acionado na issue do Multica ao conter o comando/palavra-chave `stelow` ou `/sw-start` na descrição ou em comentário.
- **Escopo Isolado:** Cada issue do Multica gerencia exatamente 1 workflow ativo. Não há necessidade de comandos de alternância (`resume`/`list`) entre múltiplos workflows no mesmo card.

### 2.4 Entrega de Artefatos & Portões de Revisão (Gates)
- **Anexo Físico de Artefatos:** Todos os documentos gerados durante o fluxo (especificações de produto, planos técnicos, relatórios de crítica e o relatório de auditoria) são salvos no repositório local e anexados diretamente aos comentários do card da issue (`multica issue comment add --attachment <path>`).
- **Portões de Revisão (Gates):** Nos estágios de validação (`int-gate`, `plan-gate`, `diff-gate`), a execução é pausada, o status da issue no Multica muda para `in_review`, um comentário descritivo é gerado solicitando aprovação do usuário, e a confirmação é gravada em metadados KV.

### 2.5 Configuração Opt-in de Exploração Estratégica no Context
- Por padrão, o estágio `context` avança diretamente para o estágio `shape`, ignorando a pergunta interativa sobre a execução de habilidades estratégicas opcionais (JTBD, Business Models, Marketplace Playbook, etc.).
- A execução das análises estratégicas torna-se **opt-in**, ativada apenas se o metadado `metadata.strategic_exploration = true` estiver presente na issue.

---

## 3. Mapeamento de Estágios Stelow vs. Status Multica

O ciclo de vida da issue no Multica é sincronizado com os 17 estágios do Stelow. Enquanto `metadata.current_stage` mantém o indicador de estágio exato, o status nativo da issue reflete o estado macro da tarefa:

| Estágio Stelow (`metadata.current_stage`) | Status Nativo Multica | Descrição & Comportamento do Adaptador |
|---|---|---|
| `triage`, `select` | `todo` / `backlog` | Workflow aguardando início ou aceitação. |
| `setup`, `context`, `shape`, `critique`, `scope`, `interface`, `selection`, `planning`, `execution`, `verification` | `in_progress` | Workflow em processamento ativo pelo agente. O metadado `current_stage` indica o progresso exato. |
| `gate`, `int-gate`, `plan-gate`, `diff-gate` | `in_review` | **Portão Ativo:** A execução é interrompida aguardando revisão e aprovação do usuário via comentário. |
| `audit` (concluído) | `done` | Encerramento com sucesso. Relatório de auditoria final é anexado e o status muda para `done`. |
| Qualquer estágio interrompido por erro/bloqueio | `blocked` | Grava `metadata.blocked_reason` com o motivo da interrupção. |
| Chamada de `/sw-abort` | `cancelled` | Workflow cancelado. |

---

## 4. Plano de Execução em 5 Fases

### Fase 1: Discovery, Contrato & Refatoração Arquitetural (`stelow-adapter-cli`)
**Objetivo:** Refatorar o repositório Stelow para a nova estrutura de adaptadores.

- **Step 1.1 — Renomeação Atômica do Orquestrador:**
  - Renomear a pasta de skill de `skills/stelow-product-orchestrator/` para `skills/stelow-adapter-cli/`.
  - Atualizar atomicamente todas as referências em sub-skills, scripts e testes unitários.
  - Atualizar o `CHANGELOG.md` documentando a alteração de arquitetura na release v0.56.0.
- **Step 1.2 — Implementação da Classe `CLIAdapter`:**
  - Criar `extensions/stelow/adapters/cli.ts` herdando de `BaseAdapter`.
  - Configurar a cadeia de fallback no `state.ts` para que runtimes de linha de comando utilizem `stelow-adapter-cli`.
- **Step 1.3 — Preservação e Atualização do `stages.yaml`:**
  - Manter a definição declarativa dos estágios em YAML.
  - Refinar descrições dos estágios para otimizar o parsing por LLMs e validar contra o loader `loadStages()`.

### Fase 2: Implementação do Adaptador Nátivo `stelow-adapter-multica`
**Objetivo:** Criar o adaptador de comunicação com a plataforma Multica.

- **Step 2.1 — Definição de Tipos e Contratos de Metadados:**
  - Criar `extensions/stelow/adapters/multica/types.ts` com os esquemas de metadados KV e mapeamento de status.
- **Step 2.2 — Desenvolvimento da Classe `MulticaAdapter`:**
  - Criar `extensions/stelow/adapters/multica/index.ts` herdando de `BaseAdapter`.
  - Implementar o método `syncToHost()` executando chamadas de CLI (`multica issue metadata set`).
  - Implementar hook de alteração de status (`multica issue status`).
  - Implementar método de anexo de artefatos (`multica issue comment add --attachment <path>`).
- **Step 2.3 — Configuração de Sinais de Detecção de Ambiente:**
  - Atualizar `state.ts` adicionando detecção do ambiente Multica (presença do executável `multica` no PATH e variáveis de workspace).

### Fase 3: Ajustes de Skills, Convenção de Metadados & Importação no Workspace
**Objetivo:** Adequar as habilidades e realizar a carga completa no workspace Multica.

- **Step 3.1 — Refatoração do Estágio `context`:**
  - Alterar `skills/stelow-adapter-cli/SKILL.md` e `stages/context.md` para pular o prompt estratégico por padrão.
  - Adicionar checagem da variável/metadado `metadata.strategic_exploration`.
- **Step 3.2 — Documentação de Prompts do Adaptador:**
  - Incorporar ao prompt do `stelow-adapter-cli` e `stelow-adapter-multica` a matriz de mapeamento de estágios vs status.
- **Step 3.3 — Carga dos 25 Skills no Workspace Multica:**
  - Executar a importação via `multica skill import` para os 25 skills do Stelow, garantindo que todas as referências internas de arquivos sejam preservadas.

### Fase 4: Formatação de Artefatos, Comentários e Encadeamento de Audit-Trail
**Objetivo:** Garantir a visibilidade do progresso no card da issue.

- **Step 4.1 — Fluxo de Anexo Automático de Artefatos:**
  - Assegurar que após os estágios `shape`, `interface`, `planning` e `audit`, os arquivos Markdown gerados sejam anexados diretamente aos comentários da issue.
- **Step 4.2 — Estruturação do Audit-Trail em Comentários Encadeados:**
  - Adaptar a emissão do `audit-trail.md` em 5 comentários estruturados por camada (Origem, Design, Planejamento, Execução, Verificação), encadeados via `parent_id`.

### Fase 5: Validação End-to-End, Autopilots & Documentação Final
**Objetivo:** Homologar o fluxo completo em cenário real.

- **Step 5.1 — Execução de Teste End-to-End:**
  - Rodar workflows de teste (`Lean` e `Core`) em uma issue dedicada no Multica.
  - Validar a atualização de metadados, mudanças de status durante os portões e anexos nos comentários.
- **Step 5.2 — Especificação de Autopilot "Stelow Runner":**
  - Documentar a criação de um `multica autopilot` com `execution_mode: run_only` para varredura e avanço automático de workflows sob o Stelow.
- **Step 5.3 — Documentação Final de Release:**
  - Finalizar documentação técnica e guias de uso no repositório.

---

## 5. Estimativa de Esforço & Matriz de Habilidades

| Fase | Descrição resumida | Esforço Estimado | Habilidades Tocadas |
|---|---|---|---|
| **Fase 1** | Refatoração Arquitetural & Rename (`stelow-adapter-cli`) | 2 dias úteis | `stelow-product-coding-standards`, `stelow-product-tech-planning` |
| **Fase 2** | Implementação do Adaptador `stelow-adapter-multica` | 2-3 dias úteis | `stelow-product-scope-executor`, `stelow-product-testing-ai-code` |
| **Fase 3** | Ajustes no `context`, Convenção de Metadados & Import de 25 Skills | 1-2 dias úteis | `stelow-product-shape-up`, `stelow-product-plan-critique` |
| **Fase 4** | Anexo de Artefatos & Audit-Trail Encadeado | 2 dias úteis | `stelow-product-execution-critique`, `stelow-product-testing-execution` |
| **Fase 5** | Testes End-to-End, Especificação de Autopilot & Documentação | 1-2 dias úteis | `stelow-product-ux-critique`, `stelow-product-trust-building` |
| **TOTAL** | **Execução Completa** | **~8 a 10 dias úteis** | **18 das 25 habilidades do Stelow** |

---

## 6. Desmembramento em Issues de Execução

Após a aprovação desta especificação técnica, a execução será dividida nas seguintes issues filhas:

1. **Issue 1:** `Phase 1 — Discovery & Atomic Clean Rename (stelow-adapter-cli)`
2. **Issue 2:** `Phase 2 — MulticaAdapter Implementation in Stelow`
3. **Issue 3:** `Phase 3 & 4 — Metadata Convention, Skills Import & Card Attachments`
4. **Issue 4:** `Phase 5 — E2E Testing & Final Polish`
