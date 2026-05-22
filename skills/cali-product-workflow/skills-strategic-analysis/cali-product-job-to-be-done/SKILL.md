---
name: cali-product-jtbd
version: 1.0.0
description: >
  [Cali] Jobs To Be Done (JTBD) framework for understanding why customers "hire"
  products to do jobs in their lives. Covers interview techniques, progress-making,
  and job isolation.

  Trigger keywords: JTBD, jobs to be done, interview technique, customer motivation,
  progress-making, functional job, emotional job, social job

  NOT for: feature prioritization (use cali-shape-up instead)
---

# Jobs To Be Done

> Based on: "Competing Against Luck" (Christensen, Hall, Dillon, Duncan), "Jobs to Be Done" (Alan Klement), "When Coffee and Kale Compete" (Alan Klement).

## Goal

Understand the **job** customers are trying to get done — not what they say they want, but what progress they're trying to make in their lives.

## Domain Context

**A job is not a product or feature. A job is the progress a person is trying to make in a particular circumstance.**

Key themes:
- **Job to Be Done** — The underlying progress the customer wants to make
- **Progress-Making** — What "getting unstuck" means for the customer
- **Functional + Emotional + Social** — The multi-dimensional nature of jobs
- **Circumstance** — The context in which the job arises

## The JTBD Framework

### What is a Job?

```
When [situation], I want to [motivation], so I can [expected outcome].
```

**Example:**
```
When I'm managing a team of 10+ people, I want to understand who's working on what,
so I can delegate effectively and not be a bottleneck.
```

### Job Dimensions

**1. Functional Job:**
- The task or outcome the customer is trying to accomplish
- "I want to send a message to 100 people quickly"

**2. Emotional Job:**
- How the customer wants to feel or avoid feeling
- "I want to feel organized and in control"

**3. Social Job:**
- How the customer wants to be perceived by others
- "I want to be seen as responsive and professional"

**4. Causation (Trigger):**
- The specific moment or situation that triggers the need
- "When a deadline is approaching and I haven't communicated status"

### The 4 Forces

When considering hiring a solution (product):

**Push Forces (situations that push toward change):**
- Dissatisfaction with current solution
- New problem arises
- Existing solution causes new problems

**Pull Forces (attraction to new solution):**
- New solution has appealing attributes
- New solution solves the problem better
- New solution enables something new

**Anxiety Forces (fear of change):**
- What could go wrong with the new solution?
- What habits/relationships would be disrupted?
- What would I have to give up?

**Habits of the Present (resistance to change):**
- Current solution works well enough
- Switching costs are high
- No urgent trigger

## Interview Techniques

### Good JTBD Interviews

**Principle:** Focus on the story of *trying to make progress* — not opinions about features.

**Interview Questions:**

1. **Opening:** "Tell me about a recent time when you [job situation]..."
   - Gets concrete, recent story
   - Avoids hypotheticals

2. **Timeline:** "Walk me through what happened from the moment you realized you needed to [job]..."
   - Maps the full journey
   - Identifies triggers and obstacles

3. **Struggle:** "What was the hardest part about [trying to do the job]?"
   - Reveals pain points
   - Identifies push forces

4. **Consideration:** "What did you try to do about it?" / "Who else did you consider?"
   - Reveals the competition
   - Shows what "good enough" means

5. **Hire/Fire:** "What made you decide to [hire this solution]?" / "What would have caused you not to hire it?"
   - Identifies the key attributes
   - Reveals the trade-offs made

### Bad Interview Questions (to avoid)

❌ "What features would you like?"
❌ "How often do you use X feature?"
❌ "On a scale of 1-10, how important is X?"
❌ "Would you pay for X feature?"
❌ "What problems do you have with our product?"

### Interview Structure

```
1. Background (2 min)
   - Role, company/context
   - Establish credibility

2. Story (10-15 min)
   - Recent job situation
   - Full timeline from trigger to resolution

3. Deep Dive (10 min)
   - Struggles, considerations, trade-offs
   - What almost prevented the "hire"

4. Wrap-up (5 min)
   - Anything else that comes to mind?
   - Who else should I talk to?
```

## Job Isolation

### The 5 Whys (applied to JTBD)

When a customer says they want X, ask "why does that matter?" repeatedly:

```
Customer: "I want to export my data to CSV."

Why? "So I can analyze it in Excel."
Why? "So I can find patterns in my usage."
Why? "So I can understand where I'm wasting time."
Why? "So I can be more productive and prove ROI to my manager."
Why? "So I can justify the subscription cost and keep my job."

→ Job: Be seen as a valuable, productive team member
```

### Functional + Emotional Decomposition

**Functional:** The task to be accomplished
**Emotional:** How the customer wants to feel (or avoid feeling)

```
Functional: Send a status update to my team
Emotional: Be seen as organized, responsive, and on top of things

Functional: Review candidate applications
Emotional: Feel confident I'm making the right hire, avoid missing top talent

Functional: Close deals in the pipeline
Emotional: Feel like a successful salesperson, avoid disappointing the team
```

## Output Format

This domain skill contributes to:
- **spec-product.md** — Jobs section (functional, emotional, social)
- **User stories** — Jobs-based story mapping
- **Shape Up** — Jobs-to-be-done for hill charts

JTBD artifacts typically include:
- **Job statement** — "When [circumstance], I want to [motivation], so I can [expected outcome]"
- **Forces analysis** — Push/Pull/Anxiety/Habit
- **Job hierarchy** — Primary vs. secondary jobs
- **Jobs map** — Related jobs and job chains

## Gotchas

1. **Jobs are not features** — "I want to export to CSV" is not a job — it's a solution
2. **Interview stories, not surveys** — Real stories reveal more than ratings
3. **Circumstance matters** — The same person has different jobs in different contexts
4. **Emotion is real** — Functional jobs always have emotional dimensions

## Related Skills

- **cali-product-workflow**: Orchestrates product planning
- **cali-shape-up**: Uses JTBD for hill charts and scope
- **cali-product-discovery**: Discovery phase uses JTBD interviews

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`