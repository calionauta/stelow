# Prompt 5: Job Actors — All Actors Involved in the Job and Market

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-dos-atores-envolvidos

**When to use:** To identify all actors involved in a Job To Be Done: beneficiaries,
performers, providers, decision makers, buyers, influencers, experts, and more.

**Variables to fill in:**
- `[include here the market definition of the segment, if chosen by the user, or job to be done mapped]`

---

## Prompt Completo

```
## Discover the actors involved in the Job To Be Done
{{Job to be done}}: [include here the market definition of the segment, if chosen by the user, or job to be done mapped] 

### Roles

*   **Beneficiary:**
    *   Group of people who directly benefit from the Job To Be Done.
    *   "Hires" a product or service to perform the Job, but doesn't necessarily perform it themselves.
    *   Must be plural.
    *   The job to be done must describe what the beneficiary wants to achieve, not what the performer does.
    *   The performer's role is to enable the beneficiary to achieve that desired outcome.
    *   Be as specific as possible but don't assume a restricted group that could exclude other possible groups.
    *   **List up to 3 beneficiaries, if they exist, and there may be only 1.**

*   **Performer:**
    *   Group of people (important: not solutions, devices or technologies) who perform the core action of the Job to be Done, especially when the Beneficiary cannot do it.
    *   The Job to be Done statement of the Performer must be identical to the Beneficiary's, with the addition of the context like 'for the benefit of [Beneficiary]' when the groups are distinct.
    *   Remember: the name can't be related to solutions, devices or technologies.
    *   The focus should be on the core action that satisfies the Beneficiary's need.
    *   **List up to 3 performers, if they exist, and there may be only 1.**

*   **Provider:**
    *   Group of people who provide, help, or enable the performer to perform the Job.
    *   Must be plural.
    *   List the top 3 if more than one provider exists.
    *   The Job to be done must describe what the provider does.
    *   The provider role is to enable the performer to achieve that desired outcome.
    *   Be as specific as possible but don't assume a restricted group that could exclude other possible groups.

*   **Indirect Beneficiary:**
    *   Group of people who indirectly benefit from the job in addition to the performer and the direct beneficiary, or who could benefit from the same result of the job as the beneficiary themselves.
    *   Indicate the 3 main indirect beneficiaries, different from the direct beneficiary.

*   **Threatened:**
    *   Group of people, living beings, or systems that may end up suffering negative consequences when this job is done.
    *   Consider different contexts and circumstances.
    *   Give a quick explanation of the reasons.
    *   Give the top 3.

*   **Assistant:**
    *   Group of people who assist the performer at the time of executing the Job.
    *   For example: in surgery, the nurse assists the doctor who performs the surgery.
    *   Give the top 3.

*   **Decision Maker:**
    *   Group of people who decide and allow the job to be done.
    *   Give the top 3.

*   **Purchaser:**
    *   Group of people who decide on the form of payment and contracting of a solution to carry out the job.
    *   Give the top 3.

*   **Buyer:**
    *   Group of people who make the purchase of the solution to carry out the job in the specific/individual context.
    *   Give the top 3.

*   **Supervisor:**
    *   Who supervises and is responsible for the final result of the job.
    *   Give more than one.

*   **Influencer:**
    *   Who usually influences someone to perform the job or to choose a solution to perform the job.
    *   Give the top 3.

*   **Expert:**
    *   Group of people who have deep knowledge about the performance of the job, without necessarily executing it directly.
    *   Give the top 3.

### Rules

*   If Job To Be Done describes the actor of the Job To Be Done, find out if it is the beneficiary or the performer.
*   To understand the differentiation between performer and beneficiary: in the case of a job to be done "arrive at a destination on time", the beneficiary is the passenger and the performer is the driver.
*    The names of beneficiaries and performers should be specific in relation to the Job To Be Done, but comprehensive enough to represent all possible groups that benefit from or perform the Job.
    *   For example, if the Job To Be Done was "access written information", a bad actor name that would break the rules would be "Librarians" because it would be a specific group, excluding other possible ones. A good name would be "Readers" as it would cover several groups and is directly related to the job to be done. If you don't find a name for the actor, use "People".
*   If the job was "Manage finances together" and the name of the actor/group was "Family members with elderly people", then the market could be "[Family members] trying to [manage finances together] [with their elderly family member]".
*   The actor's name should be simple enough and work within the market definition: "{actor name} trying to {job to be done adapted to start with the verb in the infinitive} {comprehensive context related to the actor and job}. IMPORTANT: Evaluate the names using this formula!
*   Adapt the actor name or job to be done statement only when:
    *   **Avoid redundancy:** If there is redundancy between the Job to be Done, the context, or the actors' names, describe the actor's relationship with the job comprehensively, without any redundancy. First, try adapting the actor's name. If this does not resolve the redundancy satisfactorily (i.e., if the new actor name sounds artificial, adds implicit actions to the Job to Be Done, or makes it difficult to understand the market), then consider slightly adapting the Job to be Done, keeping its essence as much as possible. **Example:** If the Job to be Done is "Listen to music" and the initial actor name was "Music Listeners," the best approach would be to adapt the actor name to something more generic like "Music Enthusiasts." The market definition would then be: "Music Enthusiasts trying to listen to music."  **In cases like "Work remotely from a coffee shop", avoid actor names like "Professionals who work remotely". Prefer more generic names like "Professionals" or "Workers" that represent the group without redundancy. The market definition would then be: "Professionals trying to work remotely from a coffee shop." This preserves the original JTBD and offers a more concise and less redundant actor description.**
    *   **Contextualize for the market role:** Adapt the Job to be Done to reflect the specific role within the market definition. For example, if the job was "optimize the user flow" and the Beneficiary was "Users," then the Job to be Done should be adapted to suit them and also avoid redundancy, such as "Users trying to perform a flow in an optimized way."
    *   **Prioritize clarity and naturalness:** The market definition should be clear, concise, and sound natural. Avoid complex grammatical constructions or jargon.
*   Avoid mentioning specific solutions, methods or technologies, unless mentioned in the Job To Be Done.
*   Do not mention or refer to the names of the roles, e.g. Performers or Beneficiaries.
*   Avoid mentioning/using possessive pronouns in the market statement and job statement of the Beneficiary or Performer.
*   Do not mention solutions or methods that are not explicitly stated in the Job To Be Done statement.
*   Do not mention or refer to the names of the roles, e.g. Performers or Beneficiaries.
*   Avoid mentioning/using possessive pronouns in the market statement and job statement of the Beneficiary or Performer.

### Output Format

Follow this output format, replacing the placeholders [] and {}, and translating to the same language user used in the Jbo To Be Done statement:

## {Role}
### {a respectful emoji that represents the actor} {actor name in plural}
- {market definition of the actor: [actor name] + " trying to " + [job to be done: start with verb in the infinitive]}
```
