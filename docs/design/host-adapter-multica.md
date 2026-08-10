# Host Adapter — Camada de Integração de Hosts (Multica-first)

**Data:** 2026-07-16
**Status:** Shaping (v1 Multica) — decisões de arquitetura RESOLVIDAS (ver Seção 10); evoluível para outros hosts
**Autor:** shaping conduzido pelo agente (stelow)
**Precedente:** `docs/design/mission-control.md` (Mission Control vira **plugin de UI** desta camada, não o sistema HITL)

> **Regra de idioma:** documento de proposta em PT-BR para discussão; código, rotas,
> schemas, comandos e UI text em EN (convenção do projeto + precedente `stelow-board-herdr.md`).

---

## 1. Appetite

**Um ciclo pequeno (2 semanas) para o `MulticaAdapter` + a `DecisionGateway`.**
Recorte de risco: a interface é host-agnostic; o Multica é o primeiro adapter real
(usa o CLI `multica`, zero nova infra). Outros hosts (Slack/Linear/Notion) são
fases seguintes, já cobertas pela interface.

---

## 2. Por que esta camada existe

O `mission-control.md` descobriu que **o Multica já é a camada human-in-the-loop**:
issues + comments (decisão), statuses (`blocked`/`in_review`/`done`) com efeito no
server (park-and-resume nativo), mentions (roteamento ao papel certo + notificação),
sub-issues + `--stage` (fases Shape/Build/Verify/Done), metadata `decision`,
attachments. Há até `requestApproval` + card Allow/Always/Deny (exec-approval,
fail-closed) provando o padrão de escolha estruturada.

Em vez de reconstruir tudo no Mission Control, criamos uma **camada de adaptação de
hosts** que traduz os primitivos do stelow (`ask`, `plannotator --gate`) para o host
escolhido. O Multica é o primeiro adapter — e o de referência, pois mapeia 1:1.

> **Nome (decisão):** **Host Adapter** atrás de uma **`DecisionGateway`**.
> - Consistência c/ o codebase: o stelow já usa "Adapter" (`BaseAdapter`,
>   `CLIAdapter`, `PiAdapter`, `ui-factory` em `extensions/stelow/adapters/`).
> - Linhagem EIP: Host Adapter = padrão **Channel Adapter** (Hohpe/Woolf);
>   a `DecisionGateway` é o **Messaging Gateway** que encapsula o acesso ao host.
> - Mercado (iPaaS) chama de "Connector" (Zapier/Make/n8n) ou "App"/"Integration"
>   (Slack/Linear) — termos de produto, não de código. "Adapter" é mais preciso
>   p/ camada de código; "Wrapper/Proxy" são mecânicas de impl, não o nome do papel.

---

## 3. Princípios

- **Host-agnostic no core, específico no adapter.** `DecisionGateway` não sabe de
  Multica; só conhece `DecisionRequest` / `DecisionResult`. Cada host = 1 adapter.
- **Contrato do stelow é sagrado.** `ask_user_question` e `plannotator --gate` definem
  o que a gateway deve transportar (Seção 4). O adapter traduz, não inventa.
- **Nunca pula o gate.** Regra do stelow (`plannotator.md`): falha degrada pra
  manual review, mas continua bloqueando. O adapter herda isso.
- **MC é UI plugin.** Quando o host não faz escolha estruturada ou anotação
  ponto-a-ponto nativamente, o Mission Control (web) renderiza e escreve de volta.
  Para o Multica v1, isso fica fora — fazemos aprovar/rejeitar + feedback free-text.
- **Verificado no codebase (2026-07-16):** o stelow JÁ suporta o que o
  adapter precisa — (a) **pause/resume** de workflow (`/sw-pause` → status
  `paused`; `/sw-resume`; `checkResumeDrift`; auto-discovery de workflow
  `in-progress` no próximo run — `extensions/stelow/commands.ts`); (b) **seam
  de Adapter** host-agnostic (`BaseAdapter`/`CLIAdapter`/`UIAdapter`, com
  `select(options)` = o seam do `ask`) — `extensions/stelow/adapters/`. Então
  o `MulticaAdapter` PLAZA no seam existente; não é rearquitetura.

---

## 4. Interfaces (host-agnostic)

```typescript
// O que o stelow pede ao travar numa interação humana
interface DecisionRequest {
  kind: "question" | "gate";
  workflow: string;
  stage: string;                       // shape | interface | planning | ...
  route_to: { role: string };         // resolvido p/ identidade do host via workgroup
  // question:
  questions?: Question[];             // == ask_user_question
  // gate:
  artifact_path?: string;             // == plannotator --gate filePath
  sla_minutes?: number;               // opcional; default do workgroup
}

interface Question {                  // == schema de ask.md
  header: string;                     // <=20 chars
  question: string;                   // termina com "?"
  options: Option[];                  // 2-6
  multiSelect?: boolean;
}
interface Option {
  label: string;                     // 1-5 palavras, <=60
  description: string;
  preview?: string;                   // markdown/ASCII
}

// O que o adapter devolve ao stelow
interface DecisionResult {
  kind: "question" | "gate";
  decision: "approved" | "annotated" | "dismissed" | "answered" | "expired" | "error";
  selections?: string[];             // labels escolhidos (question)
  feedback?: string;                 // anotação (gate: annotated)
  raw?: string;                      // texto cru do humano
  answered_by: string;               // identidade verificada do host
  answered_at: string;               // ISO
  external_ref: string;              // id da issue/comment no host (audit)
}
```

```typescript
interface DecisionGateway {
  requestDecision(req: DecisionRequest): Promise<DecisionResult>;
}
interface BaseHostAdapter implements DecisionGateway {
  // helpers compartilhados: resolver role->identidade, idempotência, timeout
}
class MulticaAdapter extends BaseHostAdapter { /* CLI multica */ }
// class SlackAdapter extends BaseHostAdapter { /* futuro */ }
```

O stelow resolve o adapter por workgroup (`host: multica | slack | ...`) e chama
`gateway.requestDecision(req)` no lugar de `ask_user_question` / `plannotator --gate`
quando o workgroup usa host externo.

---

## 5. MulticaAdapter — investigação ponto a ponto

### 5.1 Pergunta (`ask`) → Multica
1. Resolve `route_to.role` → `member` uuid (workgroup: `stage→member` ou `role→member`).
2. `multica issue create --title "Q: <header>" --description-file <md> --status in_review
   --assignee <member> --parent <workflow-issue> --stage <N> [--attachment <preview>]`
   - O `<md>` renderiza a pergunta + opções **numeradas** (respeitando reserved labels
     `Other`/`Type something.`/`Chat about this`/`Next →` e 2-6 opções).
3. Aguarda resposta (push via mention ou poll — 5.3).
4. Parser: "1" → `selections:["label1"]`; "1,3" (multiSelect) → `["label1","label3"]`;
   free text → `decision:"answered"`, `raw` preservado.

### 5.2 Gate (`plannotator --gate`) → Multica
1. `multica issue create --title "Gate: <artifact>" --description-file <contexto do gate>
   --status in_review --assignee <member> --parent <workflow-issue> --stage <N>
   --attachment <artifact.md>`  ← **anexa** o markdown (revisor não precisa do repo).
2. Humano decide via comment + status:
   - **Approve** → status `done` + comment "approved" → `DecisionResult{decision:"approved"}`
     → adapter escreve `.plannotator/approvals/{_dir}/gate-approved.md` + frontmatter
     (`approved:true`, `approved_at`, `approved_via: multica-adapter`). Arquivo congelado.
   - **Annotate** → comment com feedback livre → `DecisionResult{decision:"annotated",
     feedback}` → adapter cria receipt `manual-review-needed` e trata feedback como
     anotação para revisão (anotação ponto-a-ponto NÃO é nativa no Multica — 5.7).
   - **Dismiss** → status `cancelled` + comment → `DecisionResult{decision:"dismissed"}`
     → stelow decide (re-shape ou parar).
3. **Trust:** comment de `author_type=member` já é fonte confiável hoje (gates do
   Multica confiam em comment direto de member). Não depende da issue #3572.

### 5.3 Resposta do humano → volta ao stelow  **[decisão: assignee auto-trigger]**
- **Push (escolhido):** a issue de decisão é **atribuída ao agente stelow**
  (`--assignee <stelow-agent>`). O Multica tem *automatic on-comment trigger* para
  o assignee (confirmado em `multica-mentioning`: `@all` *suprime* esse gatilho →
  ele existe). Logo: o humano (member) **responde normalmente** → o assignee
  (stelow) é auto-reativado → novo run → stelow auto-descobre o workflow
  `in-progress`/`paused` e retoma. **Zero fardo p/ o humano** (não precisa
  @mentionar) e **zero polling**.
- **Fallbacks:** (a) instruir `@mention @stelow` na issue (cinto-e-suspensórios);
  (b) stelow faz poll de `multica issue comment list <id>` se o gatilho não
  disparar. Ambos documentados; primário = assignee auto-trigger.

### 5.4 Identidade / trust
- v1: revisores são **membros do workspace** (member uuid). `author_type=member`
  autentica a decisão. Revisor externo (não-member) exigiria #3572 (registro de
  aprovação externa) — fora do v1.

### 5.5 Timeout / fail-closed  **[decisão: escalar]**
- `sla_minutes` sem decisão → **escalar** (mention fallback owner do workgroup ou
  reassign p/ outro member do papel), não auto-deny. Produto ≠ comando: auto-deny em
  gate de Shape Up é destrutivo. (Diferente do exec-approval, que auto-dena por
  segurança de comando.) **Escolha confirmada pelo cali** — mantemos escalar.

### 5.6 Escolha estruturada (única/múltipla/livre)
- Multica comments são free-text; **não há poll/radio nativo** (só o card de
  exec-approval, comando-específico). → **emular** via opções numeradas (igual ao
  fallback do `ask_user_question`). Escolha livre = free text direto. Render nativo
  fica pro Mission Control (futuro) ou se o Multica shipar UI de questão.

### 5.7 Anotação (anotar vs aprovar)
- **Aprovar / rejeitar:** nativo (status + member comment).
- **Anotar ponto-a-ponto:** NÃO nativo no Multica → v1 usa feedback free-text; o
  stelow/plannotator trata como anotação. Anotação visual (estilo plannotator) fica
  pro Mission Control (UI plugin) ou plannotator direto — fora do v1 do adapter.

### 5.8 Estrutura de issues  **[decisão: 1 issue por requestDecision]**
- **1 issue pai por workflow stelow** (espelho do "mission control board") +
  **1 child sub-issue por `requestDecision`** (gate OU ask), agrupados por `--stage`.
  - Um `ask` com **várias perguntas** (`questions[]`) = **1 issue só** (o schema
    do `ask_user_question` já permite múltiplas perguntas numa chamada). Não 1 issue
    por pergunta → ruído.
  - Um `gate` (artefato+revisor distintos) = **sempre sua própia issue**. Não agrupar
    vários gates numa issue → borra assignee/status/stage/audit por decisão.
- **Por que:** 1 notificação por interação de decisão, revisor responde num card só,
  preservando per-decision assignee/status/stage/audit → **mínimo ruído cognitivo**.
- Alternativa descartada: comentar no issue pai (perde assignee/status/stage por
  decisão).

### 5.9 Attachment vs link
- **Anexar** o markdown do artefato (self-contained; revisor não precisa de acesso ao
  repo). Link para `.stelow/` só como referência secundária.

---

## 6. Alternativas exploradas (e por que não)

| Tópico | Escolha | Rejeitada | Por quê |
|---|---|---|---|
| Estrutura | 1 issue por requestDecision (ask c/ N perguntas = 1 issue) | 1 issue por pergunta | mínimo ruído; preserve audit por decisão |
| Resume | assignee auto-trigger | só poll | humano só responde; zero @mention, zero poll |
| Escolha | emular numerada | poll UI nativo | Multica não tem; #3572 é futuro |
| Anotação | free-text v1 | ponto-a-ponto | não nativo; fica pro MC/plannotator |
| Timeout | escalar | auto-deny | produto ≠ comando |
| Artefato | anexar | só link path | revisor sem repo |
| HITL host | Multica (adapter) | reconstruir no MC | reuso; KISS |

---

## 7. IN / OUT

### IN (v1)
- `DecisionGateway` + `DecisionRequest`/`DecisionResult` (host-agnostic).
- `MulticaAdapter` (question + gate) via CLI `multica`.
- Roteamento `stage/role → member` por workgroup.
- Park-and-resume (ou sync-block fallback se o stelow não pausar — ver Dependencias).
- Resume por @mention + poll fallback; idempotência (1 Decision por issue).
- Mapeamento approve/reject/annotate → receipts do plannotator (`.plannotator/...`).
- Timeout → escalar; attachment do artefato; 1 issue pai + child por `--stage`.

### OUT (v1 — explícito)
- Adapters Slack / Linear / Notion.
- UI de questão/poll nativa no Multica (rastrear #3572).
- Anotação ponto-a-ponto no Multica (precisa MC/plannotator).
- Revisores não-members (precisa #3572).
- Render de escolha estruturada no Mission Control.
- Resumos por IA.

---

## 8. Dependências / rabbit holes

- **#1 — stelow pausa/resume?  VERIFICADO: SIM, JÁ SUPORTA.** `/sw-pause`
  (status `paused`), `/sw-resume`, `checkResumeDrift`, e auto-discovery de workflow
  `in-progress` no próximo run (`extensions/stelow/commands.ts`). **Não é blocker.**
  O adapter PLAZA no seam existente (`BaseAdapter`/`CLIAdapter`/`UIAdapter` em
  `extensions/stelow/adapters/`) — o `ask` já roteia por `select(options)`.
  **Adição pequena e bem delimitada** (não rearquitetura):
  1. `MulticaAdapter` implementa `CLIAdapter`/`UIAdapter` (rota `select()` → issue;
     gate → issue com artifact anexado).
  2. No gate/ask: escreve `pending_decision` em `tracking.json` (host/external_ref/
     kind/asked_at) e **mantém o workflow `in-progress`** (auto-discovery retoma no
     próximo run — igual ao caminho pós-crash) — OU usa `/sw-pause` + hook de
     resume que detecta `pending_decision`. (Preferência: manter `in-progress` +
     marker; reusa o auto-resume existente.)
  3. O re-trigger do Multica (assignee auto-trigger na resposta do member) roda o
     stelow → auto-discovery acha o workflow → hook de resume lê o `DecisionResult`
     (comment/status do Multica), escreve o receipt `.plannotator/...`, limpa o
     marker, e continua a fase.
- **Loop protection:** o hook de resume só age se houver `pending_decision`; não
  comenta na issue de decisão (só lê + escreve receipt) para não reativar o gatilho.
- **Concorrência:** adapter escreve `.plannotator/...` enquanto o extension pode
  escrever `.stelow/` → escrita isolada em caminhos de receipt; nunca o adapter
  escreve `stelow.json`.
- **Idempotência:** uma issue = uma decisão; ignorar comments repetidos do mesmo member.
- **Versão congelada:** gate aprova `vN`; mudou o arquivo → novo gate (plannotator
  congela).

---

## 9. Roadmap — outros hosts (já cobertos pela interface)

A `DecisionGateway` já abstrai `requestDecision`, então cada novo host é só 1 adapter:

- **SlackAdapter:** canal/DM + **interactive blocks (botões)** → escolha única/múltipla
  *nativa* (Slack tem botões! melhor que o free-text do Multica). Resposta via evento.
- **LinearAdapter:** Linear issue com state + reviewer; decisão = state change.
- **NotionAdapter:** página Notion + comment; decisão = comment/resolvido.

O Multica é o adapter de referência justamente porque mapeia 1:1 e o CLI já é a
superfície de integração — os outros vão revelar onde a interface precisa de
extensão (ex.: Slack exige `multiSelect` como botões; Notion exige resolver
identidade por email).

---

## 10. Decisões (RESOLVIDAS nesta iteração — 2026-07-16)

1. **Pause/resume:** VERIFICADO que o stelow JÁ suporta (`/sw-pause`, `/sw-resume`,
   drift check, auto-discovery). Adapter PLAZA no seam `CLIAdapter`/`UIAdapter`
   existente. Não é blocker — adição pequena (ver Seção 8 #1).
2. **Nome:** **Host Adapter** + **`DecisionGateway`** (consistência c/ codebase +
   linhagem EIP Channel Adapter; "Connector" é termo de mercado iPaaS). Ver Seção 2/3.
3. **Timeout:** **escalar** (confirmado pelo cali; não auto-deny — produto ≠ comando).
4. **Estrutura:** **1 issue por `requestDecision`** (ask c/ N perguntas = 1 issue;
   gate = issue própia). Mínimo ruído, audit por decisão. Ver Seção 5.8.
5. **Resume:** **assignee auto-trigger** — issue atribuída ao agente stelow; member
   responde → stelow reativado → resume nativo, sem @mention nem poll. Ver Seção 5.3.

---

## 11. Referências

- `docs/design/mission-control.md` — proposta original; MC rebaixado a UI plugin.
- `skills/stelow-adapter-cli/references/cli-tools/ask.md` — schema de
  `ask_user_question` (questions/options/multiSelect/preview, reserved labels).
- `skills/stelow-adapter-cli/references/cli-tools/plannotator.md` — contrato
  `plannotator --gate --json` (approved/annotated/dismissed) + receipts `.plannotator/...`.
- `.pi/skills/multica-working-on-issues/SKILL.md` — statuses com efeito no server,
  sub-issues + `--stage` (barreiras), metadata `decision`, attach, PR close-intent.
- `.pi/skills/multica-mentioning/SKILL.md` — `@member`/`@agent`/`@squad`; push via
  `@agent` enfileira run (resume nativo).
- `.pi/skills/multica-creating-agents/SKILL.md` / `multica-projects-and-resources/SKILL.md`.
- Multica exec-approval (`requestApproval`, card Allow/Always/Deny, fail-closed) —
  PRs #86/#3572 do repo `multica-ai/multica`. Issue #3572 (registro de aprovação
  externa) = feature desejada, não shippada.
- `architecture.md` — modelo de dados do stelow (phases/scopes/artifacts).
- `extensions/stelow/commands.ts` — `/sw-pause` (status `paused`), `/sw-resume`,
  `checkResumeDrift`, auto-discovery de workflow `in-progress` (caminho pós-crash).
- `extensions/stelow/adapters/` — `BaseAdapter`, `CLIAdapter`, `PiAdapter`,
  `ui-factory` (+ `select(options)` = seam do `ask`). O `MulticaAdapter` PLAZA aqui.
