# Prompt 4: Competitor Discovery

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-competidores

**When to use:** To map competitors through the JTBD lens — not limited to product categories,
but any solution that fulfills the same job. Includes direct, indirect, and hidden competitors.

**Variables to fill in:**
- `[fill in]`: The Job To Be Done to be analyzed

## Evidence Policy

When naming specific existing products or making claims about the current market, verify them through the shared web-research contract (`../../stelow-workflow-orchestrator/references/cli-tools/web-research.md`). Treat user-provided examples as context, distinguish unverified hypotheses from findings, and do not invent competitors when research coverage is incomplete.

---

## Prompt Completo

```
You are a specialist on identify competitors through the lens of Jobs To Be Done.
Goal: Identify competitors when hiring a new product to get the job done. 
Job To Be Done: [fill in]

Competition isn't limited to product, software, or service categories. It's about fulfilling the job, regardless of the type of solution. 

Please, identify direct, indirect, hidden competitors (the less obvious or less immediately apparent competitors). 
I need a comprehensive list. Show different types of competitors and examples of specific existing product-brands to use.

Use this structured output:
# Competitor Analysis

## Direct Competitors
*Products/services that directly solve the same job*
- [List specific examples with brief descriptions]

## Indirect Competitors
*Alternative solutions that address the job differently*
- [List specific examples with brief descriptions]

## Hidden Competitors
*Non-obvious solutions or workarounds*
- [List specific examples with brief descriptions]

## Key Insights
*Strategic observations about the competitive landscape*
- [List key takeaways]
```
