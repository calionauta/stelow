---
name: cali-product-job-to-be-done
description: >
  [Cali] Complete set of specialized prompts for Jobs To Be Done (JTBD) analysis and discovery,
  based on the methodology by Cali (Renato Caliari). Use this skill whenever the user wants
  to perform any kind of JTBD analysis: contextual market segmentation, thinking styles
  (Indi Young), JTBD discovery, competitor mapping, job actors, situational variables,
  job map steps, functional needs (desired outcomes), financial needs, or emotional/social
  jobs. Contains 10 professional prompts ready to run with AI agents. Trigger whenever the
  user mentions: jobs to be done, JTBD, contextual segmentation, thinking styles, Indi Young,
  job map, job steps, desired outcomes, user needs, JTBD competitors, job actors, situational
  variables, emotional jobs, social jobs, or any combination of these terms.
---

# Jobs To Be Done — Complete Skill

This skill contains **10 specialized prompts** for conducting comprehensive Jobs To Be Done analyses.
Each prompt corresponds to a specific step or dimension of the JTBD methodology.

---

## Prompt Map — When to Use Each

| # | Prompt | When to use |
|---|--------|-------------|
| 1 | **Contextual Segmentation** | Create market segments based on situational factors (not demographics) |
| 2 | **Thinking Styles (Indi Young)** | Identify significantly different thinking patterns of a performer toward a purpose |
| 3 | **JTBD Discovery** | Discover and reframe Jobs from a solution, action, or outcome |
| 4 | **Competitor Discovery** | Map direct, indirect, and hidden competitors through the JTBD lens |
| 5 | **Job Actors** | Identify all actors involved in the job and market |
| 6 | **Situational Variables** | Discover factors and variables that impact job execution |
| 7 | **Functional Needs** | Discover functional success criteria (desired outcomes) |
| 8 | **Financial Needs** | Discover financial success criteria for solution acquisition |
| 9 | **Emotional & Social Jobs** | Discover emotional and social jobs related to the functional job |
| 10 | **Job Map Steps** | Map the stages and steps of the job to build a Job Map |

---

## Recommended Flow

For a complete JTBD analysis, follow this logical sequence:

```
1. Contextual Segmentation      → define the market
   ↓
2. Thinking Styles              → segment by cognition/behavior
   ↓
3. JTBD Discovery               → define the jobs
   ↓
4. Job Actors                   → identify who is involved
   ↓
5. Situational Variables        → understand the context
   ↓
6. Job Map Steps                → map the journey
   ↓
7. Functional Needs             → success criteria
   ↓
8. Financial Needs              → financial criteria
   ↓
9. Emotional & Social Jobs      → human dimension
   ↓
10. Competitor Discovery        → who else solves the job
```

---

## Interaction Tool Guidelines

**IMPORTANT**: When the user needs to choose between predefined options, ALWAYS use the `question` tool (if available) with enumerated format:
- Options with short `label` and `description`
- Examples: prompt selection (1-10), analysis type, next steps, etc.

When `question` tool is not available, use enumerated text in chat (A/B/C/D or 1/2/3).

---

## General Instructions for the Agent

- **Ask which prompt the user wants to run** (unless already clear from context):
  - Use `question` tool with options 1-10 for the 10 JTBD prompts
  - Always include option: "I want you to recommend based on context" (in the user's language)
  - Fallback: "Which JTBD analysis do you want to perform? (1-10, or 'recommend based on context')"
- **Fill in the variables** indicated by `[brackets]` or `{{braces}}` with the information provided by the user before executing the prompt.
- **Chain prompts sequentially** when the user wants a full analysis — the output of one prompt feeds into the next (e.g., Situational Variables → Functional Needs).
- **Language of output**: The prompts are written in English (instructions to the LLM), but results should be delivered in the language used by the user.
- Read the appropriate file from `references/` before executing a prompt.

---

## References

The 10 complete prompts are located in:
- `references/01-contextual-segmentation.md`
- `references/02-thinking-styles.md`
- `references/03-jtbd-discovery.md`
- `references/04-competitors.md`
- `references/05-job-actors.md`
- `references/06-situational-variables.md`
- `references/07-functional-needs.md`
- `references/08-financial-needs.md`
- `references/09-emotional-social-jobs.md`
- `references/10-job-map-steps.md`

Read the specific prompt file before executing it.

---

## Attribution

This skill and all its prompts were developed by **Cali (Renato Caliari)** 🇧🇷 — product strategist and JTBD practitioner from Brazil.

These prompts are the result of years of experimentation and refinement, documented and shared through:

- 📚 **E-book**: [Jobs To Be Done in Portuguese](https://calirenato82.substack.com/p/e-book-jobs-to-be-done-em-portugues) — comprehensive guide to JTBD methodology
- 🔗 **Resources**: [Recursos Principais](https://calirenato82.substack.com/p/recursos-principais) — collection of prompts, frameworks, and tools
- ✍️ **Substack**: Regular articles and experiments on JTBD, product strategy, and innovation

The prompts in this skill represent a curated, production-ready selection of the most effective JTBD analyses developed through extensive real-world application.
