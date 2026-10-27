# Prompt 10: Job Map Steps — chronological steps, phase tags

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-das-etapas-job

**When to use:** to map the steps a person actually takes to get the job done.
Run after the job and the actor are defined.

**Variables:**
- `{{Job}}`: the job statement
- `{{Actor}}`: the perspective
- `{{Depth}}`: `quick` (5–8 steps) | `standard` (8–14) | `deep` (14–20)
- `{{Map kind}}`: `core` | `consumption` (default `core`)
- `{{Start}}` / `{{End}}`: optional boundaries

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
## Job map
Job: {{Job}}
Actor: {{Actor}}
Depth: {{Depth}} — the step count comes from here, not from the phases
Map kind: {{Map kind}}
Boundaries: {{Start}} → {{End}} (optional)

## The distinction that governs this prompt

PHASES ARE TAGS. STEPS ARE THE MAP.

The six phases below label and audit coverage. They are not the structure of the
map, and they never set the step count. A phase may hold zero, one or many steps.

Phases:
1. Define and Plan — what must be known or decided before starting
2. Prepare and Execute — preparing inputs, then the core action
3. Evaluate and Adjust — checking during the work, and correcting
4. Conclude and Organize — finishing and putting things away
5. Document and Share — recording and handing off
6. Monitor subsequent effects — watching what happens after

## Steps

1. Write the chronological steps for THIS job and THIS actor, at the depth band.
2. Each step: verb-led name, one line of *what* (not *how*, not a tool), one
   phase tag.
3. Dense phases (usually Prepare and Execute) may hold several steps. Quiet
   phases may hold none.
4. After drafting, read only the steps. Do they cover the job without overlap?
   Is any phase's absence a real gap, or just a scope choice?
5. Respect the boundaries if given.

## Rules

- Steps are first person singular, verb first.
- No solution brand, no tool name, no technology in a step. A method word is
  allowed only when the job cannot be described without it — say why.
- No vague verbs: manage, facilitate, empower, enable, ensure, oversee.
- No conjunctions joining two actions into one step.
- A phase with zero steps is allowed. It requires one line of reason, not a
  filler step. `Document and Share` names a coverage area, not a method: the
  steps inside it still have to pass the no-tool rule.

## Output

### Boundary first

Before the table, state both ends of the map. A map without a start has no
trigger, and a trigger outside step 1 is the most common reason a step looks
missing.

```
## Boundaries
- Starts: <the event that makes the job begin> · <status>
- Ends: <the state that means the job is done> · <status>
```

Both ends carry a status on the same line, no exceptions. If either is unknown,
say `Open` and name what would settle it. Never leave
the line out: an unstated boundary reads as a stated one.

### Job line

`Job: <verb> + <object> + <contextual clarifier> · <status>` — the status sits on
the same line, always. One sentence, solution agnostic.

If the clarifier is unknown, write the sentence without it and mark it `Open` on
the same line. If you inferred the clarifier, say so: `· Hypothesis — bet`. An
inferred scope written without a status reads as a fact, and that is the exact
failure this line exists to prevent.

## The map

The header row is fixed and stays in English: it is schema, like the statuses.
Translate the content, never the headers.

| # | Step | Phase | Executor | Decider | Output | Failure mode | Status |
|---|-------|------|--------------|-------------|-------|---------------|--------|
| 1 | ... | ... | classe de papel | classe de papel, ou `—` | o que a etapa produz | como ela falha | `Input-derived` / `Hypothesis — bet` / ... |

- **Quem executa** é a classe de papel que faz a etapa. **Quem decide** é quem
  autoriza, aprova ou libera a etapa. Quando o papel não é conhecido, escreva
  `Open` — não deixe a coluna vazia, e não invente. A coluna `Quem decide` é o
  que permite apontar onde o aprovador desconhecido entra no fluxo.
- **Saída** é o artefato ou estado que a etapa entrega para a próxima. Sem saída,
  a etapa não terminou.
- **Modo de falha** é o que quebra nesta etapa, na linguagem de quem executa.
- **Status** usa os nomes de `00-evidence-policy.md`. O warrant, quando houver,
  vai entre parênteses no fim da linha.
- Proibido escrever proveniência em texto livre ("vem do que você falou"). Ou é
  status mais fragmento, ou é `Hypothesis — bet`.

### A última etapa é o estado final

A última etapa entrega o resultado do job, não a última correção. Se o job
termina com o período fechado, a etapa final é "período fechado e conferido";
corrigir é um laço que volta para conferir, não o fim da lista. Um mapa que
termina em "corrijo" modela o retrabalho como se fosse o objetivo.

### Métricas

Métrica por etapa não é o critério de sucesso do Prompt 7. Aqui é o sinal que
mostra se *esta* etapa funcionou.

Produza para as **3 etapas mais arriscadas** (`quick` e `standard`) ou para todas
(`deep`). Quatro tipos:

| Etapa | Métrica | Tipo | Como medir | Fonte | Status |
|---|---|---|---|---|---|
| ... | ... | Tempo / Erro / Esforço / Conclusão | ... | ticket, log, entrevista, `nenhuma` | ... |

- **Tempo** — quanto a etapa leva, e quanto leva para se recuperar quando falha.
- **Erro** — com que frequência a saída sai errada ou volta para correção.
- **Esforço** — quantas ações, pessoas ou handoffs a etapa exige.
- **Conclusão** — se a etapa termina: onde para, quem para, quanto tempo parada.

`Fonte` é obrigatória. `nenhuma` é resposta válida e rebaixa a métrica para
`Hypothesis — bet` com a checagem. Métrica sem fonte é aposta, não medida.

## Coverage

| Phase | Steps | Why this count |
|---|---|---|
| Define and Plan | 0 | {reason, or the step names} |
| ... | ... | ... |

- Onde uma falha apareceria primeiro: {phase} — {why}
- A fase mais arriscada para este job: {phase} — {why}
- Etapas que o ator faria e você não sabe se faz: {list} — {Status}
```

## Completeness contract

- Steps within the depth band, or an explicit user override.
- Every step carries exactly one phase tag from the six, one executor, one
  decider (or `Open`), one output, one failure mode and one status.
- The last step is the job's outcome state, not a correction.
- The coverage table lists all six phases, including the ones with zero steps.
- No filler: a zero-step phase has a reason, not an invented step.
- No vague verbs, no brand names in steps.

criteria:
  - id: boundaries
    kind: presence
    text: "Both ends stated with a status, or Open with what would settle it"
  - id: table-shape
    kind: presence
    text: "The step table has the fixed columns: Step, Phase, Executor, Decider, Output, Failure mode, Status"
  - id: depth-band
    kind: count
    text: "Step count inside the depth band, or an explicit override"
  - id: step-fields
    kind: presence
    text: "Every step carries phase, executor, decider, output, failure mode and status"
  - id: actor-step-link
    kind: presence
    text: "The decider column names a role class or Open; no unknown approver is left blank"
  - id: final-state
    kind: semantic
    text: "The last step is the job's completed outcome, with corrections modelled as a loop"
  - id: metrics
    kind: presence
    text: "The riskiest steps carry a metric with type, measurement and source"
  - id: phase-coverage
    kind: presence
    text: "All six phases appear in the coverage table, with zero-step phases justified"
  - id: no-filler
    kind: semantic
    text: "No step exists only to populate a phase; each step is an action the actor takes"
  - id: no-vague-verbs
    kind: semantic
    text: "No step opens with manage, facilitate, empower, enable, ensure or oversee"

## Worked example — synthetic, not evidence

Job: `qualificar um pacote de sensor de reposição para serviço de gás ácido`.
Actor: plant reliability engineer. Depth: `quick`, 7 steps.

| # | Step | Phase |
|---|---|---|
| 1 | Travar o envelope operacional e as obrigações de certificação | Define and Plan |
| 2 | Reunir normas aplicáveis e pacotes de certificado anteriores | Prepare and Execute |
| 3 | Montar a folha de restrições a partir do envelope e dos certificados | Prepare and Execute |
| 4 | Decidir o escopo go/no-go contra as regras do site e do seguro | Evaluate and Adjust |
| 5 | Especificar a configuração de reposição contra o envelope travado | Prepare and Execute |
| 6 | Resolver divergências entre a configuração ofertada e o envelope | Evaluate and Adjust |
| 7 | Fechar a aceitação com artefatos de rastreabilidade | Conclude and Organize |

`Document and Share` and `Monitor subsequent effects` hold **zero** steps here.
That is intentional, not an error: the job ends at acceptance, and handoff is
absorbed into step 7. The coverage table says so.

*Synthetic — not evidence.*
