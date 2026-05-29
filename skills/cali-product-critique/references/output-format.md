# Output Structure

> Applies to all modes (plan, codebase, site). Field notes: plan mode uses `[flow]`, `[state]` topics;
> codebase mode uses `[data]`, `[system]`, `[feasibility]`; site mode uses `[interaction]`.
> Nature tags `(product/business)`, `(ux/ui)`, `(technical)` apply to all modes.

Generate the following sections in order, using the exact format described.

## 1. 🎯 Executive Summary

2-3 sentences summarizing the overall clarity state of the proposal and the main area of risk or ambiguity discovered.

## 2. 🚨 Critical Questions (Blocking)

Questions that **prevent fundamental understanding** or represent **high implementation risk**. Must be resolved before implementation begins.

Format for each question:
- `[specific question]?[topic](nature)`

Topics: `[flow]`, `[interaction]`, `[data]`, `[state]`, `[system]`, `[feasibility]`
Natures: `(product/business)`, `(ux/ui)`, `(technical)`

Example:
- How does the system behave when the payment provider returns a 503?`[state](technical)`
- What does the empty dashboard look like for a first-time user?`[state](ux/ui)`

## 3. 🤔 Important Questions (Refinement)

Questions **essential for a good user experience and coherent flow**, but not blocking.

Same format as Critical Questions.

## 4. 🔎 Minor Clarifications

Lower-impact questions about polish, edge variants, or optimizations.

Same format as Critical Questions.

## 5. ✅ Strengths

2-4 bullet points highlighting what is particularly clear and well-defined in the proposal. This is important — it prevents the critique from feeling purely negative.
