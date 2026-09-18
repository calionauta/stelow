# Prompt 2: Thinking Styles — Indi Young

**Source:** https://calionauta.substack.com/p/prompt-ia-thinking-styles-indi-young

**When to use:** To identify significantly different thinking styles of a performer when trying to
achieve a purpose. Useful for segmenting by behavior/cognition instead of demographics. Run after
Contextual Segmentation to enrich each segment with cognitive profiles.

**Variables to fill in:**
- `{{Purpose}}`: The goal or outcome the performer is trying to achieve
- `{{Performer}}`: The group of people trying to achieve that purpose

## Research Guardrail

Do not use web research to infer a performer's inner thoughts, emotions, or
personal rules. Research may surface candidate language or context, but every
thinking style remains a hypothesis to validate in interviews. Every **Voice
example** must carry a **Source & status** value from the main skill's
[Source and Status for Evidence](../SKILL.md#source-and-status-for-evidence)
rules. A simulated voice is illustrative, never a real quote or representative
of the group. When research contributed, append the required
[Research-led Draft Bets](../SKILL.md#hypothesis-and-bet-discipline) section
after the native output.

---

## Complete Prompt

```
{{Purpose}}:
{{Performer}}:

Identify *five* significantly different thinking styles of {{Performer}} when trying to {{Purpose}}, considering inner thoughts (inner thinking), emotional reactions, and personal rules (intentional or unintentional habits and customs) in the context of the purpose (constraints, challenges, opportunities, elements, people).

Thinking style: Pattern of behavior and cognition influenced by context and purpose, expressed through thoughts, emotions, and personal rules. Unlike archetypes, which are deeper and more stable patterns, thinking styles are contextual and mutable.

For each style, provide:

## Name: (Start with verb in infinitive. Short and objective phrase).

| Element | Description | Voice example | Source & status |
|---|---|---|---|
| Thought | Inner thoughts related to the purpose. | "I think that..." | [Choose: Input-derived — direct quote / Input-derived — paraphrase / Input-derived — synthesis / Simulated hypothesis — not participant data] |
| Emotion | Emotional reactions when trying to achieve the purpose. | "I feel..." | [Choose a status from the Source and Status for Evidence rules] |
| Personal Rule | Habits, customs, or principles that influence behavior in relation to the purpose. | "I always/never..." | [Choose a status from the Source and Status for Evidence rules] |

- Brief description (maximum 1 line).
- Context.
- How it differs from other styles and how the solution should be adapted.
- Top 3 Functional Jobs (actions/results).
- Top 2 Emotional Jobs (feelings/avoid feelings).
- Top 2 Social Jobs (perceptions/avoid perceptions).

Justify the choice of the five styles.

Example:

## Maintain Control:

| Element | Description | Voice example | Source & status |
|---|---|---|---|
| Thought | Focus on planning and organization to minimize unforeseen events. | "I need to have everything under control." | Simulated hypothesis — not participant data |
| Emotion | Anxiety in the face of unexpected situations. | "I get very nervous when things go off plan." | Simulated hypothesis — not participant data |
| Personal Rule | Follow routines and procedures to ensure efficiency. | "I always make a checklist before starting anything." | Simulated hypothesis — not participant data |

- Brief description: Seeks predictability and efficiency.
- Context: Work with tight deadlines.
- Differentiation/Solution Adaptation: Prioritize organization and planning tools.
- Functional Jobs: Plan tasks, monitor progress, optimize resources.
- Emotional Jobs: Feel secure, avoid frustration.
- Social Jobs: Be perceived as organized, avoid being seen as negligent.

Completeness contract (the host validates these counts — never submit fewer):
- Exactly 5 thinking styles, each under its own ## Name heading.
- Every style carries the 3-row Element table (Thought, Emotion, Personal Rule) with Voice example and Source & status, plus: 1-line description, Context, Differentiation/Solution Adaptation, Top 3 Functional Jobs, Top 2 Emotional Jobs, Top 2 Social Jobs.
- A closing justification of why these five styles were chosen.

Respond without introduction.
```
