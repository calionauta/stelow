# Prompt 1: Contextual Segmentation for Jobs To Be Done

**Source:** https://calirenato82.substack.com/p/prompt-ia-segmentacao-por-contexto

**When to use:** To identify market segments based on situational factors and contextual variables —
avoiding demographic segmentation. Recommended first step in a JTBD analysis.

**Variables to fill in:**
- `[fill in with the market definition]`: The market definition or job to be done being analyzed

---

## Prompt Completo

```
Goal: Identification of contextual segments.
Job to be done: [fill in with the market definition]

Process:
1. List 20 possible segments, briefly showing only the name, market definition and justification, without further data.
2. Filter or group into a maximum of 10 segments, ensuring that they are mutually exclusive, collectively exhaustive and non-redundant based on situational factors and variables. 
3. Prioritize (not filter) the segments of the step 2 using the prioritization criteria.
4. Display the final list following the rules below.

Rules:
- Define SIGNIFICANTLY different segments, interconnecting diverse and specific situational factors and variables, which most impact the outcome of the Job to be done. Avoid any demographic segments, unless this is critically necessary and there is no other way to segment. Example of demographic factors to avoid
    - Age, gender, income, education level, occupation, marital status, family size, geographic location, ethnicity, religion, company size, industry, annual revenue, number of employees, growth stage, business type, technology used, profession role, purchase volume, industry-specific needs.
- The segments must be mutually exclusive, collectively exhaustive and non-redundant.
- Use the criteria below for prioritizing segments (the higher, the better, except for "Frequency" and "Barrier to Entry"):

| Criterion | Description | Evaluation |
|-------------------|--------------------------------------------------------------------------------|------------|
| Impact | Level of impact of the context on the Job. | Low/Medium/High |
| Demand | Volume of people performing the Job in the context. | Low/Medium/High |
| Effort | Level of effort when performing the Job in the context. | Low/Medium/High |
| Purchasing Power | Financial capacity to acquire solutions related to the Job. | Low/Medium/High |
| Ease of Reach | Ease of finding/segmenting the group. | Low/Medium/High |
| Frequency | Frequency with which the Job is performed in the context. | Low/Medium/High |
| Barrier to Entry | Restrictions on the entry of new companies in the market. | Low/Medium/High |

Rules for each segment:
- Give each a representative name, easy for reference on a daily basis.
- Define the market for the specific segment following the model: "{group of people} trying to {job to be done adapted to start with the verb in the infinitive} {comprehensive context involved in the group of people}. Adapt the Job to be done and context, based on the name of the group, to describe in a super comprehensive way the relationship of the actor with the job and describe the market with this formula. Examples:
    - if the job was "Manage finances together" and the name of the group was "Family members with elderly people", then the market could be "[People] trying to [manage finances together] [with their elderly family member]".
    - if the name of the group was "People who care for elderly family members" a bad market statement would be "People who care for elderly family members trying to manage finances together" because two groups of people are before the verb "wanting", which should be separated one at the beginning and one in the job to be done. A better market statement would be "[People] trying to [manage finances together] [with their elderly family member]".
- They have SIGNIFICANTLY DIFFERENT needs that therefore demand totally different and customized solutions, even when performing the same Job to be done.
- Give a justification for the exclusivity in how you consider the group significantly different from the others listed.
- Highlight the top 3 significantly different desired outcomes (starting with verbs) + top 3 significantly different constraints compared to the other groups that have a major impact on the outcome of the Job to be done.


Template and fields for result:
## {Segment Name}
- Market:
- Justification:
- Situational factors: {key situational factors AND variables of the segment, noting how they may interact with each other}
- Desired Outcomes: 
    - 
    - 
    - 
- Constraints:
    - 
    - 
    -
```
