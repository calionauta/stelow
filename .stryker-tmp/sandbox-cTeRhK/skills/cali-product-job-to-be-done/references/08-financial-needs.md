# Prompt 8: Financial Needs Discovery

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-de-necessidades-financeiras

**When to use:** To discover financial success criteria for solution acquisition related to the job.
Focuses on the perspective of the financial decision maker — whoever approves the solution purchase.

**Variables to fill in:**
- `[include here the market definition of the segment, if chosen by the user, or job to be done mapped]`
- `[all info of the segment chosen by the user]` — if available

---

## Prompt Completo

```
Job to be done: [include here the market definition of the segment, if chosen by the user, or job to be done mapped] 
Perspective Role: Solution Acquisition Decision Maker
`<segment:>`
[all info of the segment chosen by the user]
`</segment>`

# Process to follow:

- Explore all possible solutions that could help the beneficiary complete {Job to be done}

- Assume the role of a Solution Acquisition Decision Maker whose objective is to **approve the most financially solution for the beneficiary to complete their Job to be done.** Evaluate each potential solution by considering only the financial implications **for the beneficiary when acquiring and using the solution.**.
- From this, discover at least 30 success criteria statements by answering the question: "What needs to happen to successfully achieve my financial ideal outcome?". Ensure to follow all Statement Rules.
- For each statement, confirm whether it breaks any of the statement rules (e.g. Did it use an adverb or an adjective? Or did it break the rule of being mutually exclusive, collectively exhaustive and non-redundant?). If a rule is violated, improve or discard the statement. Show this step process. 
- Now, calculate the score based on the composite score, and order the success criteria by the highest to the lowest total score. Filter for a maximum of top 20 success criteria.


# Statement Rules:

- Ensure that success criteria always start with "Minimize the cost of" from the perspective of the Financial Decision-Maker who is paying for the solution for the beneficiary.
- Ensure that every success criteria is a desired financial outcome for the Financial Decision-Maker evaluating solution purchase.
- IMPORTANT: Each criterion should be specific to a solution, Objectively Measurable and Actionable.
- DO NOT use conjunctions ("and", "or", etc.").
- Always avoid adjectives and adverbs. Avoid ambiguity. Use nouns and verbs.
- Criteria must be mutually exclusive, collectively exhaustive and non-redundant. Avoid any redundancy among them.
- The result should be a bulleted list of several success criteria.



# Composite Score for Prioritization:

Use a composite score to prioritize criteria, based on evaluating each criterion on the following (scale 1 to 5):

*  **Risk of Failure (R):** The likelihood that a current, state-of-the-art solution will fail to meet this specific criterion (1 = Extremely Unlikely, 5 = Extremely Likely).

*  **Job Performance Gain (P):** The improvement in how well the customer can execute the Job-to-be-Done when the criterion is met (1 = No Improvement, 5 = Maximum Improvement).

*  **Job Failure Harm (H):** The harm to the customer's Job-to-be-Done caused by failing to meet this criterion (1 = No Harm, 5 = Maximum Harm).

*  **Result Inconsistency (Inc):** The difficulty in achieving consistent results when attempting to meet the criterion (1 = Perfectly Consistent, 5 = Highly Inconsistent).

*  **Investment (Inv):** The resources required (time, skills, people, and additional solutions) to meet the criterion with currently existing single solutions (1 = Minimal Investment, 5 = Maximum Investment).



## FORMULA

Composite Score = (R + P + H) * (Inc + Inv)



`<Template of the output>`

## 30 Raw Success Criteria

- {Success criteria statement}



## Top 20:

#### {#Current Criteria/#Total Criteria, e.g.: 1/20} {Success criteria statement}:

- Alternative: {rewrite the success criteria in an alternative way following all the rules, except starting with "Ensure" or "Avoid", but starting with verb in the imperative}

- Justification: {"Why is this still considered an financial ideal for my role, rather than a solved criteria? And why isn't it easily solved these days?}

- Score: {explain how it impacts each factor of the composition score}

- Metrics: {multiple metrics with detailed count, proportion or average metrics with detailed explanation of how to measure}

- Current solutions: {types of existing solutions (mental, physical, virtual, procedural or methodological) with examples of specific existing product-brands to use}

`</Template of the output>`
```
