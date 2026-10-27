# Evidence policy — the one rule that governs all eleven prompts

Every item the skill emits carries a `Status`. The status is not decoration: it
decides what the item may claim.

## The six statuses

| Status | Means | Required companion |
|---|---|---|
| `Input-derived` | present in material the user supplied | quote (direct) or faithful paraphrase (no quote marks) |
| `Research-derived` | a public source says it | source + date |
| `Inference — high confidence` | entailed by the job statement or the segment | **warrant**: the clause it follows from |
| `Hypothesis — bet` | plausible, unvalidated | the cheapest check that would kill it |
| `Not applicable` | the slot cannot exist for this job | one-line reason |
| `Mesmo ator que {role}` | the role exists, but is not a distinct group | the role it collapses into |
| `Open` | cannot be decided now | the input that would decide it |

Sub-status for quotes only, when the user supplied interviews: `direct quote`,
`paraphrase`, `synthesis`. A simulated voice is never a quote from a person.

## The warrant test

An item is `Inference — high confidence` **only if you can quote the fragment of
the job statement or the segment that entails it.**

- Job: "aprovar despesas de reembolso até sexta". → the `Decision Maker` is
  entailed: someone approves. Warrant: "aprovar".
- Job: "registrar despesas próprias". → the `Purchaser` is **not** entailed.
  There is no purchase in the job. It is `Open` or `Not applicable`, never a
  named buyer.

If you cannot quote a fragment, the item is a hypothesis or absent. There is no
third option.

### The verb test (added after round 1)

A quote that merely *coexists* with the item is not a warrant. When the item is a
step or a job, the quoted fragment must contain the action.

- Quote: "não sei onde aprova". Step: "envio a despesa para aprovação". The quote
  entails that an approval exists. It does not entail that the analyst sends
  anything. → `Hypothesis — bet`.
- Quote: "os analistas lançam as despesas". Step: "recebo as despesas com os
  comprovantes". The quote entails entering expenses, not receiving them with
  receipts. → `Hypothesis — bet`.
- Quote: "o relatório não fecha". Step: "corrijo lançamentos que não fecham". The
  quote entails a reconciliation failure, not a correction step. →
  `Hypothesis — bet`.

**Self-check:** read the warrant and the item together. If the same warrant would
support a different item equally well, it is context, not a warrant.

Never write free-text provenance ("vem do que você falou") without a status. A
source is a status plus a fragment, or it does not exist.

## What the statuses forbid

- Never present a `Hypothesis — bet` in the grammar of a finding ("the buyer is",
  "users need"). Write "candidate: ... — bet, check: ...".
- Never let a count imply evidence. Ten segments with no status read as ten
  findings; ten segments with six `Hypothesis` read as what they are.
- Never put a number in a score without a `Basis`. See below.
- Never leave a required slot out. Answering `Not applicable` is answering.

## What a bet must look like

A bet is not a hedge. When the material is absent, the skill does not go quiet:
it produces the **most plausible version given the context**, concretely, with
the assumption that would break it.

Four requirements:

1. **Plausible for this context.** It follows from the job, the segment, the
   actor and the two facts the user gave. A bet that could belong to any company
   is not a bet, it is a template.
2. **Concrete.** Who, when, what they do or say. "O analista descobre a aprovação
   no grupo de WhatsApp do escritório" is a bet. "A comunicação é informal" is
   not.
3. **One disconfirming check.** The cheapest thing that would show it is wrong.
4. **Defensible.** If you would not say it to the user's face, delete it. If you
   would, write it without hedging.

### Simulated quotes

A simulated quote is allowed, and must be **specific enough to be useful**:

- first person, short, in the register of the role;
- about one concrete moment, not about a category;
- marked `Hypothesis — bet` or `Simulated hypothesis — not participant data`.

A simulated quote is **one plausible case, never a sample**. It may not be
counted, averaged, or presented as something "users say". The check travels with
it: "would this person actually say this? what would they say instead?"

Bad: `"Eu me sinto perdido no processo."`
Good: `"Eu lanço e fico esperando. Quando ninguém aprova até sexta, eu fecho
assim mesmo."` — `Hypothesis — bet`, check: ask one analyst what happens on the
Friday nobody approved.

## Hypothesis mode

When the user has no interview, no notes, no data, the run proceeds, but the
output opens with:

```
> Hypothesis mode — no interview, no supplied evidence. Everything below is a
> candidate, not a finding.
```

Every item is `Hypothesis — bet` with a check. The absence of evidence is stated
once, at the top, and then respected item by item.

## Disposition, for divergent prompts

Prompts 1, 3 and 8 generate more candidates than they keep. The discarded ones
are part of the record:

| candidate | disposition | why |
|---|---|---|
| ... | kept / merged into X / dropped | one line |

A count is a process artifact. A disposition table is what stops it from reading
as a claim.

## Basis, for scores

Prompts 7 and 8 rank criteria with a composite score. Every score carries a
`Basis`:

- `evidência` — the rating follows from supplied material;
- `pesquisa` — the rating follows from a cited source;
- `inferência` — the rating is model judgment.

`inferência` is legitimate and must be labeled. The composite is a ranking
heuristic over judgment. It orders work. It does not estimate demand, and it is
never presented as a measurement.

## Synthetic examples

Any worked example inside a reference is marked `Synthetic — not evidence`. An
example is a shape, not a finding, and it may not be reused as one.
