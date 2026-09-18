# Prompt 9: Emotional & Social Jobs Discovery

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-jobs-emocionais

**When to use:** To discover emotional jobs (how the person wants to feel/avoid feeling) and
social jobs (how they want to be perceived/avoid being perceived) related to the functional job.

**Variables to fill in:**
- `[include here the market definition of the segment, if chosen by the user, or job to be done mapped]`
- `[segment chosen by the user]` — segment information, if available

## Research Guardrail

Do not use web research to assert what people feel, fear, value, or want others
to think of them. Research may surface language for candidate emotional or
social Jobs, but it cannot establish their prevalence, intensity, or cause.
Return research-led statements as hypotheses for interview validation, and
append the required [Research-led Draft Bets](../SKILL.md#hypothesis-and-bet-discipline)
section only when research contributed.

---

## Prompt Completo

```
Goal: Discover the emotional and social jobs related to a job to be done.
Job to be done: [include here the market definition of the segment, if chosen by the user, or job to be done mapped] 
<segment: all info>
[segment chosen by the user]
</segment>
Emotional Jobs:
- Express how the job performer would like to feel or avoid feeling in a context.
- Focus on the person themselves.

Social Jobs:
- Express how the job performer would like to be perceived or avoid being perceived in a context.
- Express how the job performer would like to connect or avoid connecting with other people in a context.
- Express how the job performer would like to belong or not belong to a group in a context.
- Focus on relationships or the perception of other people.

Statement rules for all statements: 
- Use a positive phrasing to describe what the person want to achieve directly, or a negative phrasing (almost always starting with 'Avoid') to describe what the person want to prevent.
- Focus on distinct aspects of the experience and add specific context. But DO NOT create opposing statements for the same desired outcome (e.g. DO NOT use both, 'Be strong' and 'Avoid being weak'). Choose the phrasing that best captures the specific nuance.
- Start the statements with imperative verbs. A statement is never just the verb, but rather a sentence.
- DO NOT use conjunctions ("and", "or", etc.).

Process:
- Consider the segments presented at the top.
- List as many as possible Emotional Jobs and 20 Social Jobs.
- Filter the list to keep only the most relevant ones that don't break the rules above.

### Template for the output
### Emotional Jobs: 
  - {bullet points}
### Social Jobs:
  - {bullet points}

Completeness contract (the host validates these counts — never submit fewer):
- Both sections present: Emotional Jobs and Social Jobs.
- At least 5 Emotional Jobs and at least 5 Social Jobs, each a full statement following the statement rules (no opposing pairs for the same outcome).
```
