# Prompt 7: Functional Needs — Desired Outcomes & Success Criteria

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-de-necessidades

**When to use:** To discover functional success criteria (desired outcomes) when executing the job.
Run AFTER Prompt 6 (Situational Variables) for richer, more specific results.

**Variables to fill in:**
- `[include here the market definition of the segment, if determined, otherwise the main functional job to be done]`
- `{Job Step provided by the user, otherwise consider the Job to be done as a whole}`
- `{Role provided by the user, otherwise consider the beneficiary of the Job}`
- `[all info of the segment chosen by the user]` — if available
- `[include here the list of factors and variables discovered in the previous step]` — output of Prompt 6

---

## Prompt Completo

```
Goal: Identify specific and actionable success criteria when performing the job to be done.

Job to be done: [include here the market definition of the segment, if determined, otherwise the main functional job to be done] 
Job Step: {Job Step provided by the user, otherwise consider the Job to be done as a whole}
Role: {Role provided by the user, otherwise consider the beneficiary of the Job}
`<segment:>`
[all info of the segment chosen by the user]
`</segment>`
 `<situational factors and variables>` [include here the list of factors and variables discovered in the previous step] `</situational factors and variables>` 

# Process to follow:    

    - Imagine yourself as the person in the Role (using the first person singular) performing the {job step} (if provided) to succeed in {job to be done} taking into account the interconnection of diverse and specific situational factors and variables.    

    - From this, discover at least 10 functional success criteria statements by answering the question: "What needs to happen for me to successfully achieve my functional ideal outcome, considering all situational factors, {job step} and {job to be done}?". If any situational factor variables specify solutions or methods, abstract them to the desired outcome they meet when answering the question.    

    - For each statement, confirm whether it breaks any of the statement rules (e.g. Did it use an adverb or an adjective? Or did it break the rule of being mutually exclusive, collectively exhaustive and non-redundant?). If a rule is violated, improve or discard the statement. Show this step process.    

    - Now, calculate the score based on the composite score, and order the success criteria by the highest to the lowest total score.  
    - Show the template output.  
+   - Finally, after the entire detailed output, create a summary table with two columns: "Success Criterion" and "Alternative". List all the generated criteria and their respective alternatives in this table. 



    # Statement Rules:    

    - Ensure that success criteria always start with "Ensure" or "Avoid", whichever is most appropriate. Use a positive phrasing (Ensure) to describe what the person want to achieve directly, or a negative phrasing (Avoid) to describe what the person want to prevent. Focus on distinct aspects of the experience and add specific context. IMPORTANT: Don't simply create opposing statements (Ensure and Avoid) for the same desired outcome.   

    - Ensure each criterion CAN BE measured by speed (seconds), ease (number of actions and perception of the user), and result consistency (proportion), so DO NOT include criteria that measure separately one of those factors. Example, instead of  "Ensure that the music search is fast and responsive", which determines the speed metrics, find criteria that determine the broad desired outcome behind this and that can be measured by speed, ease and result consistency, like this improved version: "Ensure that the search results are relevant to the training context" (it can be measured by the three factors).    

    - Ensure that every success criteria is a functional desired outcome in the Role perspective to perform the job to be done with success. 

- Success criteria should be solution agnostic. NEVER specify solutions, devices, platforms, products, brands, technologies, or methods in the success criteria statements, unless explicitly mentioned in the Job to be done statement OR market of the segment. Focus exclusively on the success criteria, without prescribing how this should be done or possible solutions.  

    - Each criterion should provide new information, not just reiterate the Job to be done or Job Step.    

    - Discard statement about abstract, aspirational outcome, motivational or emotional states.  

    - DO NOT use conjunctions ("and", "or", etc.).    

    - DO NOT use adjectives and adverbs. Avoid ambiguity. Use nouns and verbs. Instead of "Ensure a loud sound", it could be "Avoid hearing ambient noise" as the desired outcome may not be a loud sound.    

    - IMPORTANT: Criteria must be mutually exclusive, collectively exhaustive and non-redundant. Avoid any redundancy among them. To evaluate, you must consider that each criterion could be satisfied absolutely and perfectly. 

    - The result should following the template of the output.    



    # Examples of Correct vs Incorrect statements:    

    - [correct] "Ensure uninterrupted music control despite the user's condition (sweaty or shaky hands, hoarseness, etc)": it starts with a correct verb, it can be measured by speed, ease and result consistency and does not use adverb/adjetive.    

    - [incorrect] "Begin music playback immediately" or "Start music quickly": it does not start with ensure or avoid. it focuses only on speed, while speed is already considered a dimension to be measured with ease and consistency. It uses adverb/adjetive.    



    # Composite Score for Prioritization:    

    Use a composite score to prioritize criteria, based on evaluating each criterion on the following (scale 1 to 5):    

    *   **Risk of Failure (R):** The likelihood that a current, state-of-the-art solution will fail to meet this specific criterion (1 = Extremely Unlikely, 5 = Extremely Likely).    

    *   **Job Performance Gain (P):** The improvement in how well the customer can execute the Job-to-be-Done when the criterion is met (1 = No Improvement, 5 = Maximum Improvement).    

    *   **Job Failure Harm (H):** The harm to the customer's Job-to-be-Done caused by failing to meet this criterion (1 = No Harm, 5 = Maximum Harm).    

    *   **Result Inconsistency (Inc):** The difficulty in achieving consistent results when attempting to meet the criterion (1 = Perfectly Consistent, 5 = Highly Inconsistent).    

    *   **Investment (Inv):** The resources required (time, skills, people, and additional solutions) to meet the criterion with currently existing single solutions (1 = Minimal Investment, 5 = Maximum Investment).    



    ## FORMULA    

    Composite Score = (R + P + H) * (Inc + Inv)    



    `<Template of the output>`    

    ## Top 10:    

    #### {#Current Criteria/#Total Criteria, e.g.: 1/10} {Success criteria statement}:    

    - Alternative: {rewrite the success criteria in an alternative way following all the rules, starting with other imperative verbs instead of starting with "Ensure" or "Avoid"}    

    - Justification: {"Why is this still considered a functional ideal for my role, rather than a solved criteria? And why isn't it easily solved these days?}    

    - Score: {explain how it impacts each factor of the composition score}    

    - Metrics: {multiple metrics with detailed count, proportion or average metrics with detailed explanation of how to measure the success. Include metrics measuring speed to resolve, ease to resolve, and result consistency in resolving the criteria}    

    - Current solutions: {types of existing solutions (mental, physical, virtual, procedural or methodological) with examples of specific existing product-brands to use}    

## Summary of Success Criteria

| Success Criterion | Alternative |
| :--- | :--- |
| {Criterion 1} | {Alternative 1} |
| {Criterion 2} | {Alternative 2} |
| ... | ... |
    `</Template of the output>`
```
