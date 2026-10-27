# Prompt 5: Job Actors — twelve verdicts

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-dos-atores-envolvidos

**When to use:** to find every role around a job — who benefits, who performs, who
pays, who decides, who is exposed. Run after the job is defined.

**Variables:** `{{Job}}`, optional `{{Segment}}`, `{{Depth}}`.

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Job: {{Job}}
Segment: {{Segment}}

The twelve roles are slots that must be ANSWERED, not populated. Every role gets
one verdict. A role the job cannot have is `Not applicable` with a reason, never
a fabricated actor.

## Roles

- **Beneficiary** — who benefits from the job, whether or not they perform it.
- **Performer** — who performs the core action when the beneficiary cannot or does
  not. Never a solution, device or technology.
- **Provider** — who enables the performer.
- **Indirect Beneficiary** — who else benefits from the same result.
- **Threatened** — who (people, living beings, systems) can be harmed when the job
  is done well.
- **Assistant** — who assists at the moment of execution.
- **Decision Maker** — who authorizes the job to be done.
- **Purchaser** — who decides the form of payment and contracting.
- **Buyer** — who makes the purchase in the specific context.
- **Supervisor** — who answers for the final result.
- **Influencer** — who pushes someone to perform the job or choose a solution.
- **Expert** — who knows the job deeply without executing it.

## Rules

1. All twelve roles appear, in order. Silent omission is not allowed.
2. `Input-derived` or `Inference — high confidence` requires a warrant: the
   fragment of the job, the segment or the user's material that entails the role.
   No warrant, no high confidence.
3. `Hypothesis — bet` has a ceiling of three per map, each with the cheapest check
   that would confirm or kill it.
4. Never a person. No first name, no invented tenure, no invented title, no emoji.
   A role class — "compras corporativas", not "Marina, gerente de compras".
5. A role that exists but is not distinct is `Mesmo ator que {role}`. Reserve
   `Not applicable` for a role the job genuinely cannot have.
6. `Not applicable` cites scope: say which part of the job leaves the role out. If
   the exclusion rests on an assumption, the status is `Hypothesis — bet`.
7. Beneficiary is a role class, never a segment. "Small accounting firms" is a
   segment; the beneficiary is "owners and partners of the firms".
8. If the job statement names an actor, decide whether it is the Beneficiary or the
   Performer, and say which.
9. Beneficiary and Performer market statement: `{role class} trying to {job, verb
   first} {context}`. No possessive pronouns, no redundancy between actor and job.

## Output

The header row is fixed and stays in English: it is schema, like the statuses.
Translate the content, never the headers.

| Role | Status | Actor | Market | Warrant |
|---|---|---|---|---|

## Closing
- Summary — with evidence: {n} · hipóteses: {n} · não aplicáveis: {n} · mesmo ator:
  {n} · abertos: {n}
- O papel que mais muda a decisão: {role} — {why}
- O papel que você suspeita existir e não conseguiu decidir: {role} — {what would
  settle it}
```

## Why a verdict table instead of twelve headings

Twelve headings with three actors each invites a cast. One line per role answers
the same question — does this role exist for this job — and makes the absence
visible instead of filling it. It also costs one line instead of five.

## Completeness contract

- All twelve roles, in order, each with a status.
- Every high-confidence or input-derived role carries a warrant containing the
  role's action.
- Every `Not applicable` carries a scope reason; every `Mesmo ator` names the role.
- At most three `Hypothesis — bet`, each with a check.
- Zero invented persons.

criteria:
  - id: table-shape
    kind: presence
    text: "The role table has the fixed columns: Role, Status, Actor, Market, Warrant"
  - id: role-count
    kind: count
    text: "All twelve roles present, in order, each with a status"
  - id: warrant-present
    kind: presence
    text: "Every populated role carries a fragment containing the role's action"
  - id: absence-reason
    kind: presence
    text: "Every Not applicable carries a scope reason; every Mesmo ator names the role"
  - id: no-persons
    kind: semantic
    text: "Actors are role classes in plural, never invented people, titles or emoji"
  - id: hypothesis-cap
    kind: count
    text: "At most three Hypothesis entries, each with a disconfirming check"

*Synthetic — not evidence:* a two-person internal reporting job populates
Beneficiary, Performer and Supervisor, marks `Threatened`, `Assistant`,
`Influencer` and `Expert` as `Not applicable`, collapses `Buyer` into
`Mesmo ator que Purchaser`, and leaves `Decision Maker` as `Open`.
