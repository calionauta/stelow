# Strategic Exploration (Phase 2a)

⚠️ **Read this file only when the user shows interest in strategic exploration.**
Otherwise, proceed to the next phase (2b or 3).

---

## Detect Signals

Look for user mentions of:
- Strategic direction: "how to evolve", "new features", "opportunities", "strategy"
- Methods: JTBD, jobs-to-be-done, evolutionary, opportunity mapping, product-discovery
- Exploration: "what to build", "ideas for the product"

## Ask

```typescript
ask_user_question({
  questions: [{
    question: `Select extra strategic approaches before Shape Up.`,
    header: "Approaches",
    multiSelect: true,
    options: [
      {
        label: "Job-to-Be-Done Framework",
        description: "Analysis of functional, emotional and social jobs. Undeclared needs."
      },
      {
        label: "Evolutionary Product Thinking",
        description: "Stepping-stones, evolutionary forces, optionality, avoiding premature convergence."
      },
      {
        label: "Opportunity Mapping",
        description: "Opportunities ranked by impact and effort. Quick wins + strategic bets."
      },
      {
        label: "Product Discovery Method",
        description: "Validation with quick experiments. Metrics, channels, pricing, business model."
      },
      {
        label: "Multi-Method Market Analysis",
        description: "PESTLE, Wardley Maps, Delphi, Foresight — deep market analysis."
      }
    ]
  }]
})
```

## Execution

If user selects one or more:

1. Run each selected skill via parallel subagent (fresh context, ALL concurrently):
```typescript
subagent({
  tasks: selectedApproaches.map(approach => ({
    agent: "delegate",
    task: `Execute the analysis using the skill: ${approach.skill}
for the context: [project context]. Return markdown with complete analysis.`,
    output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/strategic/${approach.name}.md`,
    context: "fork"
  })),
  concurrency: selectedApproaches.length
})
```

2. Save individual files to `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/strategic/`
   - `<skill>-analysis.md`

3. Consolidate into `strategic-insights.md` via subagent with:
   - Executive summary (10-15 bullets)
   - Links to full analyses
   - Top opportunities consolidated
   - Recommended focus areas

4. Show summary in chat with file links

5. For each skill, ask granular integration:
```typescript
ask_user_question({
  questions: [{
    question: `{Skill} — Select insights to incorporate into Shape Up:`,
    header: "Insights",
    multiSelect: true,
    options: [
      // Generated dynamically based on actual analysis output
    ]
  }])
```
   - If no insights selected from a skill → skip that skill
   - Proceed to next or Shape Up

6. Integrate selected insights into Shape Up:
   - Inject as context
   - Add sections to spec-product.md (e.g. `## Considered Jobs`)

If user selects nothing → proceed to Phase 2b (Domain Libraries).
