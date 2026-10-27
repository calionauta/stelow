# Prompt 3: JTBD Discovery

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-jobs-to-be-done

**When to use:** when the user arrives with a solution, an action or an outcome
and needs the job behind it. The cheapest reframe in the skill.

**Variables:** `{{Variable}}` — the solution, action or outcome; `{{Depth}}`
(`quick` 6–10 contextual jobs, `standard` 10–15, `deep` 15–20).

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Variable: {{Variable}}
Depth: {{Depth}}

## 1. Classify

Is the variable an ACTION (a verb), an OUTCOME (something to reach) or a SOLUTION
(platform, technology, product, place)?

If it is a SOLUTION:
- Discover what a person wants to achieve WHEN USING it.
- If it names a specific product, rewrite to the type of solution.
- The solution stays as CONTEXT in every statement below.

## 2. Rules for every job

- Starts with an imperative verb; a complete sentence, not a bare verb.
- Functional: an action or a result — not a feeling, not a perception.
- No adjectives, no adverbs.
- No conjunctions ("and", "or").
- No specific solutions, unless the variable is a solution — then the solution
  appears as context in every statement.
- Common, stable language: how a typical person would describe trying to achieve
  this, not jargon, not a fad.

## 3. Rewritten jobs

Improve the wording while keeping the meaning. Same job, better said.

## 4. Contextual jobs

Jobs that happen IN THE SAME TIME AND PLACE because of the SAME SITUATIONAL
FACTORS, but are DISTINCT ACTIVITIES from the variable.

Five tests. A candidate stays only if it passes all five:

| # | Test | Question |
|---|---|---|
| F | Functionally distinct | Is it a different kind of action, not a sub-step of using the variable? |
| I | Independence | Can the variable's main purpose still be achieved without this job? |
| C | Cost of omission | Does ignoring this job prevent the variable's success? |
| E | Enabling | Is it enabled by the context or the attributes of the variable — not merely made more convenient by them? |
| O | Own need | Does it serve a need independent of the variable's core need? |

Examples for a cafeteria:

- **Not separate**: pay for food, choose a dish, find a seat after eating, throw
  away the tray. These are steps of eating there.
- **Separate**: socialise with friends, work remotely, wait for someone unrelated
  to eating, read a book.
- **Optimising, not separate**: buy an extra coffee. It improves the meal; it is
  not an independent purpose.
- **Independent purpose**: work remotely. The purpose is work, which the cafeteria
  enables without being the point.

## 5. Higher functional jobs

What the variable contributes to one level up.

## Output

## Rewritten JTBDs
- ...

## Contextual JTBDs

| # | Job | T | Status |
|---|---|---|---|
| 1 | ... | pass / F / I / C / E / O | ... |

`T` names the first test the candidate fails, or `pass`. Only `pass` enters the
list. The count is an outcome, not a quota: if the job does not support the depth
band, say which tests killed the rest.

## Higher functional JTBDs
- ...

## Closing
- O job que o usuário não tinha nomeado: {job} — {why}
- O que ainda é solução disfarçada de job: {candidate} — {why}
```

## Completeness contract

- Three sections: Rewritten, Contextual, Higher.
- Every contextual candidate carries a `T` result; only `pass` stays.
- No adjectives, adverbs or conjunctions in any job statement.
- The solution appears as context when the variable is a solution, and never as a
  product name.

criteria:
  - id: section-presence
    kind: count
    text: "Rewritten, Contextual and Higher sections present"
  - id: test-result
    kind: presence
    text: "Every contextual candidate carries a T result naming a test or pass"
  - id: contextual-count
    kind: count
    text: "Contextual jobs inside the depth band, with the failures accounted for"
  - id: rules-compliance
    kind: semantic
    text: "No adjectives, adverbs or conjunctions; the solution is context, not object"

*Synthetic — not evidence.*
