# Prompt 3: JTBD Discovery

**Source:** https://calirenato82.substack.com/p/prompt-ia-descoberta-de-jobs-to-be-done

**When to use:** To discover and reframe Jobs To Be Done from a solution, action, or outcome.
Useful when the user has a product/solution idea and wants to understand the underlying jobs.

**Variables to fill in:**
- `[if the user has already chosen a segment, fill in with the market of the segment, otherwise fill in with the job to be done or solution filled in by the user]`

---

## Prompt Completo

```
{{Variable}} (action, outcome, or solution): [if the user has already chosen a segment, fill in with the market of the segment, otherwise fill in with the job to be done or solution filled in by the user].

Process to follow:
 Identify if {Variable} is an ACTION (verb), OUTCOME (something to achieve) or a SOLUTION (platform, technology, product or place).
If {Variable} is a SOLUTION: Discover what a person wants to achieve WHEN USING this solution in the Jobs To Be Done (JTBDs) statements. If the solution is a name of a specific product, rewrite to the type of solution instead of the name of solution. Use the solution as the context in the statements of the discovered Jobs.

 General RULES for JTBDs:
  * Start with imperative verbs. Complete sentences, not just verbs.
  * Functional Jobs (functional action or outcome). Not emotional (feel) or social (be perceived).
  * NO adjectives or adverbs.
  * NO conjunctions ("and", "or", etc.).
  * NO specific solutions, unless {Variable} is a solution or has a solution. In that case, be EXPLICIT writing the solution as context in ALL Job to be done in the result. If it's a specific product name, use the *type* of that solution instead of the product name.
  * **Use Common and Stable Language:** When formulating JTBDs, especially Rewritten JTBDs, prioritize using language that is **commonly understood by the target audience** for this type of job. Consider how people **naturally describe their needs and goals** in this situation. Seek phrases that are **stable and comprehensible over time**, avoiding jargon, fads, or overly technical terms, unless they are intrinsic to the audience and type of solution. Strive for a balance between being specific to the solution's context and using widely accessible language. Ask yourself: "How would a typical person describe trying to achieve this?". If there are multiple options, consider which is the most frequently used, least ambiguous, and most enduring.
  * **Explicitly include {Variable} (solution) context in all JTBDs (Rewritten, Contextual, Higher).**

Specific Rules for Contextual Jobs:
They are common JTBDs **IN THE SAME TIME AND PLACE** due to **SAME SITUATIONAL FACTORS**, but **DISTINCT ACTIVITIES** from {Variable}.
For each Contextual Job, question (with {Variable} broken down into potential Jobs):
1. Does eliminating or ignoring this Job prevent the success of ({Variable}) Jobs? (If no, discard)
2. **Functionally Distinct Activity:** Is this activity fundamentally different in purpose and nature from the core function of {Variable}? It should not be a mere sub-step, stage, or an obvious and immediate consequence of using {Variable}. The contextual activity should be a different type of action happening in the same context as {Variable}, but not simply part of the process of using {Variable} for its main purpose.

   * **Examples of NOT Separate Activities (for Cafeteria):**
      * Pay for food at the cafeteria.
      * Choose a dish from the cafeteria menu.
      * Look for a place to sit AFTER already having cafeteria food.
      * Dispose of lunch waste AFTER eating at the cafeteria.

   * **Examples of SEPARATE Activities (Potential Contextual Jobs for Cafeteria):**
      * Socialize with friends in the cafeteria.
      * Work remotely from the cafeteria.
      * Wait for someone in the cafeteria (unrelated to eating at the cafeteria).
      * Read a book in the cafeteria (unrelated to the dining experience).

3. **Functional Independence:** Can the primary function of {Variable} be achieved even if this Contextual Job is *not* performed in the same context? (Even if it's less convenient or ideal?) (If no, discard)
4. **Independent Need:** Does this Contextual Job fulfill a need that is functionally independent from the core need addressed by {Variable}, even though both occur in the same situational context? (If no, discard)
5. **Enabled by Context and Attributes, Not Just Optimizing {Variable}**: Is this contextual activity **distinct** and **significantly enabled or facilitated** by the **context** of {Variable} (environment, location, situation) **OR** by the **inherent attributes** of {Variable} (features, services)? This enabling should be more than just a coincidental location. The attributes or context should contribute **significantly to the execution of the Contextual Activity itself**, and not just make the **use of {Variable} better or more efficient**. Crucially, the Contextual Activity must serve a **functionally independent purpose** from the main purpose of {Variable}. It should not be just an activity that **optimizes**, **improves**, or is a **natural extension** of the core functionality of {Variable}.

   * **Examples to illustrate "Optimizing {Variable}" vs. "Functionally Independent Purpose" (for Cafeteria):**

      * **Optimizing {Variable} (NOT a Contextual Job):** "Purchase an additional coffee at the cafeteria." (This optimizes the experience of using the cafeteria for a meal, complements the meal, but is not a functionally independent purpose. The purpose is still centered on eating/drinking at the cafeteria).

      * **Functionally Independent Purpose (Contextual Job):** "Work remotely from the cafeteria." (The main purpose is "to work," which is functionally independent of "eating." The cafeteria offers a location and environment that *facilitates* remote work, but the work is not to *optimize* the experience of eating at the cafeteria.)


PROCESS:
1. List Rewritten Improved JTBDs, improving wording and phrasing while maintaining meaning and **including {Variable} context.**
2. List 20 Contextual JTBDs, ensuring they meet the 'Specific Rules' and 'Distinctness Checklist'. **Remember to include {Variable} context in each JTBD.**
3. List Higher functional JTBDs, identifying jobs that {Variable} enables and contributes to at a higher functional level, and **considering/including {Variable} context.**

 <TEMPLATE FOR the result>
## Rewritten JTBDs
-
## Contextual JTBDs
-
## Higher functional JTBDs
-
 </TEMPLATE FOR the result>
```
