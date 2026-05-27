# Prompt 6: Situational Variables Discovery

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-de-variaveis

**When to use:** To discover the situational factors and variables that influence job execution.
Feeds directly into Prompt 7 (Functional Needs). Run this before discovering desired outcomes.

**Variables to fill in:**
- `{fill in here}`: The Job To Be Done to be analyzed

---

## Prompt Completo

```
{{Job To Be Done}}: {fill in here}

Discover situational factors that significantly influence the performance of the above Job.

* Where (Physical Environment): Tangible and immediate characteristics of the space (location, environmental conditions, available resources).
* With Whom & Local Culture (Social Environment): Presence and influence of other people and culture at the time (presence/absence, type of interaction, immediate social norms).
* When (Time): Temporal dimension of the situation (specific moment, period of time, cyclical rhythms).
* Why (Greater Purpose): The fundamental reason behind the execution of the job, the ultimate goal.
* How (Internal State with Integrated Experience):
    * Personal History: Values, beliefs, past experiences and ingrained habits.
    * Perception of the Situation: Assessment of the situation.
    * Emotional State: Emotions and feelings present.
    * Physiological and Cognitive State: Physical and cognitive conditions.
    * Experience: Knowledge, skills and experiences directly related to the Job in question.
    * Strategies and Planning: Actions and strategies adopted to achieve the purpose.

Rules:
Iterate over each category above and explore the MAXIMUM number of situational factors that strongly impact the outcome of the Job.
For each situational factor explore the MAXIMUM possible variables that influence the outcome of the Job, and examples.
If the Job is about someone performing something for someone else, consider the perspectives of both.
Factors must be specific and detailed. Avoid abstractions, adjectives and adverbs.
Factors must be mutually exclusive, collectively EXHAUSTIVE and non-redundant.

Template for result (replacing the placeholder {} by the content):
## Category: {Category}
### Situational factor: {Situational factor}: {description}
- {place the variable name}: {justification and specific examples}
```
