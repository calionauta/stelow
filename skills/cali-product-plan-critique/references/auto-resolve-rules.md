---
applies_to: [plan]
---

# Auto-Resolve Rules

These rules apply when gaps are **auto-resolved** (🔎 Minor always;
🤔 Important and 🚨 Critical only in `Auto`/`Light` modes).
When the mode requires user input on a gap, these rules still inform
the AI's **recommendation** shown to the user.

## Resolution Rules

For every gap being auto-resolved:

1. Apply the **best practice resolution** directly using your expertise
   as senior strategist — don't invent new requirements, resolve the
   ambiguity with the most reasonable default.
2. For 🔎 Minor items, resolve automatically (always applies).
3. Update the plan document with all resolutions in place.
4. Add a section at the bottom titled **"Resolved Gaps (Product Critique)"**
   listing each gap found and how it was resolved.

## Recommendation Rules (for mode=gaps presented to user)

When a gap is presented to the user for decision (🤔/🚨 in
Moderate/Full modes):

1. The AI **recommends** the best practice resolution (same logic as above)
2. Mark the recommended option with "(Recommended)" label
3. Provide one alternative per plausible trade-off so the user has a real
   choice — not just "accept or reject"
4. If genuinely unknown, the first option is "Let AI decide" with
   description "AI fills reasonable default" — still marked as (Recommended)

## Constraint

Auto-resolve does NOT mean making up requirements. It means filling
reasonable defaults for ambiguous items. If the resolution is genuinely
unknown or requires product decision, note it in the audit section and
let the review gate catch it.
