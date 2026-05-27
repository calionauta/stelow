# Prompt 10: Job Map Steps Discovery

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-das-etapas-job

**When to use:** To map the stages and steps (Job Steps) that make up the Job Map — the complete
sequence of actions the customer needs to execute to complete the job. Use after defining the job and segment.

**Variables to fill in:**
- `[job to be done chosen by the user]`: The defined job to be done
- `[segment chosen by the user; if none chosen, consider all discovered]`: Segment (optional)
- `[actor chosen by the user]`: Perspective/actor to be considered (e.g., Beneficiary, Performer)

---

## Prompt Completo

```
Goal: Describe the steps to successfully perform a "Job To Be Done".

<Context>
Job To Be Done: [job to be done chosen by the user]
<segment: all info>
[segment chosen by the user; if none chosen, consider all discovered]
</segment>
Perspective: [actor chosen by the user]
</Context>

Glossary:
Stage: Phase of the process to perform the Job To Be Done.
Step: Specific action performed within each stage.

Instructions:
Imagine you are the {{Perspective}}. Describe the steps to perform the {{Job To Be Done}}, considering the {{Segment}} and the possible {{Themes}}.

For each stage below, list specific steps you need to take with a brief explanation next to it.
<Stages>
Define and Plan: What do you need to define and plan before you start?
Prepare and Execute: How do you prepare for the job? What do you need to do to achieve the main objective of the job? What can you document during the process?
Evaluate and Adjust: What do you need to evaluate and adjust during the process?
Conclude and Organize: What do you need to finalize and organize when finishing the job?
Document and Share: What do you need to document and share after completing the job?
Monitor subsequent effects: What effects do you need to monitor after completing the job?
</Stages>

`<Result format>`
# {Stage}
### {Job Step}: {brief description}
`</Result format>`

Rules:
- Each step should be a specific action of what the person is trying to accomplish in a faster, easier and more accurate way.
- Each step should be written in the first person singular and start with an infinitive verb.
- Next to the step name there should be a brief explanation, starting with the infinitive verb.
- Avoid generic and vague steps, such as the name of the stage itself.
- The steps MUST NECESSARILY be mutually exclusive, collectively exhaustive and non-redundant.
- Do not use conjunctions "AND" or "OR" to combine steps.
- Do not mention any specific solution or method that did not exist 10,000 years ago (e.g. "write", "bank accounts", "photos", "online", "WhatsApp", "spreadsheets", etc.) except if it is specified in the job to be done.
```
