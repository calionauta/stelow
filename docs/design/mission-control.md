# Mission Control — Proposta de Shaping (Shape Up)

**Data:** 2026-07-16
**Status:** Proposta — appetite e decisões **resolvidos** no doc companion `host-adapter-multica.md` (MC = UI plugin; Host Adapter/Multica = substrate HITL).
**Autor:** shaping conduzido pelo agente (stelow)
**Stack alvo (provisório):** `gogogo-fullstack-template` (Go + PocketBase + Templ + Datastar)

> **Regra de idioma:** este documento de proposta é em PT-BR para discussão. Todo
> artefato de implementação (código, rotas, schemas, comandos, comentários, UI text
> renderizado) será em EN, conforme convenção do projeto e o precedente de
> `docs/design/stelow-board-herdr.md`.
>
> **Evolução (2026-07-16):** a arquitetura evoluiu. O **substrate human-in-the-loop**
> (roteamento por estágio, gates/asks, park-and-resume) é agora a camada **Host Adapter**
> com o **Multica** como primeiro host — ver `docs/design/host-adapter-multica.md`
> (decisões resolvidas: pause/resume já existe no stelow; nome Host Adapter +
> `DecisionGateway`; timeout = escalar; 1 issue por `requestDecision`; resume via
> `assignee auto-trigger`). Este doc (`mission-control.md`) descreve o **Mission Control
> como UI plugin** dessa camada: o board web + a UI de decisão (gate/ask) rica, que
> escreve de volta no host. Onde este doc diz "Mission Control roteia / trava / escreve
> receipt", leia como "Mission Control renderiza; o Host Adapter (Multica) roteia,
> trava e escreve o receipt".

---

## 1. Appetite

**Um ciclo pequeno (2 semanas) para um v1 focado.** Não é um produto novo —
é a "cara e o switchboard" do stelow para pessoas não-técnicas.

Se estourar o appetite, corta-se por **OUT** (Seção 7), não por qualidade. O
núcleo indivisível é: **(a) board web legível + (b) ingest de eventos + (c)
roteamento de revisor por estágio + (d) UI de decisão (gate/ask) + (e) webhooks
de saída com retry.** Tirar qualquer um destes quebra a Dor nº 2 (ver abaixo).

---

## 2. O problema (duas dores, uma superfície)

### Dor nº 1 — Cegueira e dependência do terminal
O stelow já produz um dashboard de facto: o painel **Muxy** (`integrations/muxy/stelow`)
e o board **Herdr** (`integrations/herdr/stelow`) lêem `stelow.json` + artefatos e
mostram workflows × macro-estágio (Shape/Build/Verify/Done), scopes, tasks e
artefatos. Mas ambos são **read-only e presos ao host** (Muxy webview / Herdr TUI).
PM, UX e Tech Lead não conseguem *ver nem agir* sem abrir o terminal do Pi.

### Dor nº 2 — O mesmo "dono" para todas as etapas
Nem sempre a mesma pessoa pode responder, decidir ou autorizar cada estágio.
Hoje o orquestrador trava (`ask_user_question` / `plannotator --gate`) esperando
quem estiver na frente do terminal. A PM deveria avaliar o Shape Up; o UX, a
alternativa final de interface; o Tech Lead, os escopos técnicos. E esses papéis
variam por grupo de trabalho. Não há como *empurrar* uma pendência para a pessoa
certa, nem como levar o stelow para a ferramenta que o time já usa (Slack/Linear/Notion).

**Mission Control** resolve as duas: um app web *sempre ligado*, independente do
terminal, que (1) expõe o board, (2) recebe eventos de qualquer sistema por URL,
(3) roteia cada gate/pergunta para o revisor certo do estágio, (4) dispara webhooks
configuráveis para as ferramentas do time, e (5) responde de volta ao stelow.

---

## 3. Princípio de shaping (reaproveitar, não reinventar)

- **Fonte de dados = a que já existe.** `stelow.json` (tracking global) +
  `.stelow/{date}/{hash}/index.json`, `checklist.md`, `specs/`, `interfaces/`,
  `plans/`, `critiques/`, `approvals/`. É exatamente o que Muxy/Herdr consomem.
  Não criar schema novo de workflow.
- **UI do board = padrão Muxy, portado para web.** Macro-estágios, scopes
  (pending/in-progress/completed/escalated/failed), tasks, artefatos por diretório.
  Já está desenhado e testado no `integrations/muxy/stelow/src/panel/data.js`.
- **stelow continua o cérebro.** O extension do Pi continua orquestrando. Mission
  Control é o rosto + o switchboard. Mudança mínima no extension.
- **Sem novo protocolo para respostas.** A decisão volta ao stelow via o **Host
  Adapter** (v1: issue do Multica atribuída ao agente stelow → `assignee
  auto-trigger` retoma o workflow; o adapter escreve o receipt `.plannotator/...`).
  Não exigimos que o Pi exponha URL roteável. Detalhes em `host-adapter-multica.md`.

---

## 4. Solução (esboço grosseiro)

```
┌──────────────────────────────────────────────────────────────────┐
│  stelow (Pi extension) — cérebro                                  │
│   escreve stelow.json + artefatos  ──┐                            │
│   em gate/ask: POST /api/v1/events   │                            │
│   lê respostas em:                   │                            │
│   .stelow/mission-control/answers/<id>.json ←────────┐           │
└───────────────────────────────────────┼──────────────┼──────────┘
                                         │              │
                                         ▼              │
┌──────────────────────────────────────────────────────────────────┐
│  MISSION CONTROL  (Go + PocketBase + Templ + Datastar, 1 binário) │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Board view │  │ Ingest API │  │ Reviewer   │  │ Webhook     │  │
│  │ (SSE)      │  │ POST /events│ │ Router     │  │ Dispatcher  │  │
│  └────────────┘  └────────────┘  │ stage→role │  │ (goqite +   │  │
│  ┌────────────┐  ┌────────────┐  └────────────┘  │  retry-go)  │  │
│  │ Gate/Ask   │  │ Auth       │  ┌────────────┐  └──────┬──────┘  │
│  │ Decision UI│  │ PocketBase │  │ Workgroup  │         │            │
│  └────────────┘  └────────────┘  │ config YAML│         ▼            │
│                                  └────────────┘  Slack/Linear/Notion │
└──────────────────────────────────────────────────────────────────┘
         lê stelow.json (poll mtime) · renderiza artefatos
```

### 4.1 Board view (leitura)
Mesma leitura de `stelow.json` + artefatos que o painel Muxy (macro-estágios,
scopes, tasks, contagem de artefatos por diretório). Render via **Templ + Datastar
(SSE)** — reativo sem framework JS, cliente ~12 KiB, sem build step. Updates em
tempo real via **PocketBase realtime** (`/api/realtime`) ou polling por `mtime`
(assinatura de tamanho+modtime, igual ao board Herdr de 2s). Mission Control **nunca
escreve** `stelow.json` — só lê. Única escrita no `.stelow/` é o receipt de resposta.

### 4.2 Ingest (a "URL que escuta input")
`POST /api/v1/events` aceita eventos de qualquer sistema (extension do Pi ou
ferramenta externa) com schema versionado (Seção 5). É o ponto de entrada para
"integrar em qualquer ferramenta que as pessoas já usam."

### 4.3 Reviewer Router (a dor nº 2)
Cada workgroup declara um mapa **estágio → papel** (YAML, Seção 6). Quando um
evento `gate` ou `question` chega, Mission Control:
1. resolve o revisor pelo estágio (`shape`→PM, `interface`→UX, `planning`→Tech Lead…),
2. notifica a pessoa (in-app + webhook para o canal do grupo),
3. trava a pendência até a resposta, e
4. escreve o receipt em `.stelow/mission-control/answers/<eventId>.json`,
   que o extension do Pi lê no próximo turno.

Não é um motor RBAC geral — é só um mapa stage→pessoa por workgroup. KISS.

### 4.4 Gate/Ask Decision UI (a "cara amigável p/ não-técnicos")
- **Gate:** renderiza o artefato markdown (viewer estilo Plannotator `annotate`)
  e expõe botões *Approve / Annotate / Dismiss*. Ao decidir, escreve o receipt
  `.plannotator/approvals/{_dir}/gate-approved.md` (mesmo contrato do
  `plannotator --gate`) — assim o extension reconhece como aprovação normal.
- **Ask:** renderiza o schema de `ask_user_question` (`questions[]` com `options[]`,
  `multiSelect`, `preview`) como formulário web; a seleção volta como resposta.
- Ambos embutíveis via **iframe** em Notion/Linear/etc. (páginas responsivas +
  auth PocketBase).

### 4.5 Webhook Dispatcher (saída + "qualquer ferramenta")
Em cada `status_update`, `question`, `artifact_created`, `gate` **e** ao final
(`workflow_completed`), dispara os webhooks configurados do workgroup. Entrega via
**goqite + retry-go** (backoff com jitter) — sem Redis. Payload configurável
(resumo vs. corpo completo) para não vazar conteúdo de produto em canais errados.

---

## 5. Schema de ingest (concreto, v1)

`POST /api/v1/events` — `application/json`

```json
{
  "version": "1.0",
  "type": "status_update | question | artifact_created | gate | workflow_completed",
  "workflow": {
    "name": "auth-refactor",
    "status": "in-progress",
    "stage": "shape",
    "dirHash": "a1b2c3",
    "created": "2026-06-01T10:00:00Z"
  },
  "stage": "shape",
  "ts": "2026-07-16T12:00:00Z",
  "actor": "pi-extension | external-system",
  "payload": {
    "questions": [
      {
        "id": "q1",
        "header": "Interface",
        "question": "Qual alternativa de fluxo seguir?",
        "options": [
          { "label": "Wizard", "description": "Step-by-step", "preview": "..." }
        ],
        "multiSelect": false
      }
    ],
    "artifact_path": ".stelow/2026-07-16/a1b2c3/specs/spec-product_v1.md",
    "reply_to": "file://.stelow/mission-control/answers/evt_9f3.json",
    "artifact": { "dir": "specs", "file": "spec-product_v1.md" }
  }
}
```

Mission Control devolve `eventId` e armazena. Em `gate`/`question`, `reply_to`
indica onde escrever o receipt. Para sistemas externos que não têm filesystem
compartilhado, `reply_to` pode ser uma URL de callback (futuro — v1 foca no
caminho de arquivo compartilhado com o extension).

---

## 6. Modelo de revisor (KISS — YAML por workgroup)

```yaml
workgroups:
  - name: default
    reviewers:
      shape:     { role: pm,        notify: [slack:#product] }
      interface: { role: ux,        notify: [slack:#design] }
      planning:  { role: tech-lead, notify: [slack:#eng] }
      gate:      { role: pm,        notify: [slack:#product] }
    webhooks:
      - url: "https://hooks.slack.com/services/XXX"
        events: [status_update, gate, workflow_completed]
```

Usuários PocketBase carregam um campo `role` (`pm` / `ux` / `tech-lead` / …).
Mission Control casa estágio → `role` → usuário. Sem permissões granulares: se o
papel não estiver preenchido, a pendência escala para o owner do workgroup (fallback).

---

## 7. IN / OUT

### IN (v1)
- Board web: workflows × macro-estágio, scopes, tasks, artefatos (reuso do padrão Muxy).
- `POST /api/v1/events` com schema versionado.
- Webhook dispatcher com retry (goqite + retry-go) em `status_update`, `question`,
  `artifact_created`, `gate`, `workflow_completed`.
- Reviewer Router por estágio (YAML por workgroup) + notificação.
- Gate/Ask Decision UI (viewer estilo Plannotator + formulário ask) gravando receipt.
- Auth PocketBase (email/magic-link) para revisores não-técnicos.
- Embutível via iframe; páginas responsivas.
- Audit trail: quem aprovou/respondeu o quê e quando (PocketBase records).

### OUT (v1 — explicitamente)
- Mission Control **não** executa comandos do Pi (`/sw-next`, etc.). Isso continua
  no terminal. MC só superfície decisões e as devolve ao extension.
- Criação de workflows por ingest (v1 = só reportar/atualizar; criação fica no stelow).
- Apps mobile nativos (o template tem Wails, mas fora do v1).
- Multi-tenant / SaaS.
- Threads de comentário / anotações livres (apenas receipts estruturados).
- Resumos por IA das workflows (um `features/llm` existe no template, mas fora do v1).

---

## 8. Rabbit holes / riscos

| Risco | Mitigação (KISS) |
|---|---|
| Concorrência: MC lê `stelow.json` enquanto o extension escreve | MC **só lê**; usa escrita atômica do extension (já existe). Poll por `mtime`+tamanho (igual Herdr). |
| MC escrevendo no `.stelow/` e competindo com o extension | Única escrita permitida: `mission-control/answers/<id>.json` e receipts de gate em `.plannotator/approvals/`. Caminhos isolados. |
| Vazamento de conteúdo de produto em webhooks | Payload configurável (summary vs full); default = summary + paths, não corpo. |
| Auth para não-técnicos sem IdP pesado | PocketBase auth nativo (email/senha ou magic-link). Zero-config. |
| Mapa stage→papel virar um motor RBAC | Fica YAML por workgroup, sem UI de permissão geral. Se crescer, refatora depois. |
| "Responder de qualquer ferramenta" vira builder de integrações | v1 = webhooks de *saída* (fan-out) + embed por iframe. Não construir conectores nativos por ferramenta. |

---

## 9. Decisões (resolvidas no companion `host-adapter-multica.md`)

As decisões de arquitetura que este doc deixava em aberto foram resolvidas na camada
**Host Adapter** (que é quem de fato roteia/trava/escreve receipt). Resumo:

1. **Instância:** um workspace Multica; 1 issue pai por workflow (board mirror) +
   child sub-issues por `--stage` — ver `host-adapter-multica.md` §5.8.
2. **Wiring:** `MulticaAdapter` via CLI `multica` (sem novo serviço); park-and-resume
   reusa `/sw-pause` + `/sw-resume` já existentes — ver §8 #1.
3. **Resposta ao stelow:** issue do Multica atribuída ao agente stelow → `assignee
   auto-trigger` retoma o workflow (sem file inbox, sem callback URL) — ver §5.3.
4. **Auth:** PocketBase (email/senha ou magic-link) no Mission Control; revisores no
   Multica são membros do workspace — ver §3 / §10.
5. **Nome:** Host Adapter + `DecisionGateway` (camada); Mission Control = UI plugin
   dessa camada — ver `host-adapter-multica.md` §2/§3.

---

## 10. Por que este stack encaixa (gogogo-fullstack-template)

| Necessidade do MC | Peça do template |
|---|---|
| Auth de revisores não-técnicos | **PocketBase** (SQLite, auth, admin `/_/`, sem config) |
| Push de updates sem polling | **PocketBase realtime** (`/api/realtime`) |
| Webhooks com retry, sem Redis | **goqite + retry-go** |
| Board reativo, sem build JS | **Templ + Datastar (SSE)**, cliente ~12 KiB |
| Independente do terminal, fácil de hospedar | **1 binário Go**, zero deps externas |
| Artefatos / file storage | **PocketBase file storage** |
| Audit trail | **PocketBase records** (por usuário) |

---

## 11. Referências

- `integrations/muxy/stelow/src/panel/data.js` — padrão de leitura de `stelow.json`
  (macro-estágios, scopes, tasks, artefatos). Reuso direto.
- `integrations/herdr/stelow/` — board TUI; convenção de poll por `mtime` (2s).
- `docs/design/stelow-board-herdr.md` — precedente de doc de design PT-BR neste repo.
- `skills/stelow-adapter-cli/references/cli-tools/plannotator.md` — contrato
  `plannotator --gate` (approved/annotated/dismissed) + receipt `.plannotator/approvals/`.
- `skills/stelow-adapter-cli/references/cli-tools/ask.md` — schema de
  `ask_user_question` (questions/options/multiSelect/preview) reusado na Decision UI.
- `extensions/stelow/modules/event-logger.ts` + `adapters/event-dispatcher.ts` —
  modelo de eventos append-only já existente; MC estende o dispatcher para fan-out.
- `gogogo-fullstack-template` (Go 1.26 + PocketBase + Templ + Datastar + goqite).
- `docs/design/host-adapter-multica.md` — **camada Host Adapter** (Multica-first):
  substrate HITL, decisões de arquitetura resolvidas. Mission Control é o UI plugin.
