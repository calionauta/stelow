---
source: cali-product-planner (consolidated)
original_files: context-reconstruction.md, hidden-job-extraction.md
date: 2026-05-15
---

# Interface Brainstorming — Context Reconstruction & Job Extraction

## Context Reconstruction

Before generating proposals:

1. **Infer as much context as possible** from:
   - the current request
   - session history
   - previous brainstorming
   - referenced plans/specifications
   - implied workflows and constraints

2. **Reconstruct internally:**
   - problem statement
   - user goals
   - likely workflows
   - platform assumptions
   - interaction constraints
   - success criteria

3. **Extract the likely underlying job-to-be-done** instead of relying only on the explicitly requested interface structure.

**Do not blindly preserve:**
- existing UI metaphors
- requested layouts
- assumed workflows

Challenge assumptions when useful.

---

## Hidden Job Extraction

Do not accept the requested interface structure at face value.

**Infer:**
- the underlying job-to-be-done
- latent user motivations
- operational tensions
- likely misuse/friction points
- whether the requested UI metaphor is actually necessary

**The proposals should respond to the underlying need, not only the explicitly requested structure.**