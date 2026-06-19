---
applies_to: [plan]
---

# Auto-Resolve Rules

These rules apply in two contexts:

1. **Subagent recommendation generation** (all modes) — subagents CLASSIFY gaps
   and produce recommendations using these rules. They do NOT apply them.
2. **Parent auto-resolution** (Auto/Light modes) — parent applies
   recommendations directly.

## Resolution Rules (for auto-resolved gaps)

For every gap being auto-resolved:

1. Apply the **best practice resolution** using your expertise as senior
   strategist. Don't invent new requirements — resolve ambiguity with
   the most reasonable default.
2. For 🔎 Minor items, resolve automatically (always applies in all modes).
3. Update the plan document with all resolutions in place (inline edits
   to the relevant sections).
4. List each gap and how it was resolved in the
   **"🟢 Resolved Gaps (Product Critique)"** appendix.

## Recommendation Rules (for gaps presented to user)

When a gap is presented to the user for decision (top-N 🚨/🤔 in
Moderate/Full modes):

1. AI **recommends** the best practice resolution (same logic as above)
2. Option label format: `"Accept AI: {short resolution}"` with
   `"(Recommended)"` marker
3. If a genuine trade-off exists, an alternative option can be included
   (e.g., `"Alternative: {different approach}"`)
4. If genuinely unknown, label: `"Let AI decide"` with description
   `"AI fills reasonable default"` — still marked as (Recommended)
5. In spec's Gate section, render as `(a)` / `(b)` / `(c)` with
   AI recommendation underlined/bold

## Constraint

Auto-resolve does NOT mean making up requirements. It means filling
reasonable defaults for ambiguous items. If the resolution is genuinely
unknown or requires product decision, note it in the report and flag
it in the **"⚡ Gate Review — Critical Decisions"** section for the
human to decide during Gate.
