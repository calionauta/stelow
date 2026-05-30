## Delivery Audit

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools.

Delegates to standalone skill `cali-product-delivery-audit`:

1. Read `skills/cali-product-delivery-audit/SKILL.md` for full instructions
2. Pass path to the most recent `spec-tech_v{N}.md` as input (find by glob:
   `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v*.md`, pick highest N)
3. The skill runs all 8 criteria against the tech plan

**Standalone usage:** This skill can be invoked outside the workflow
by calling `cali-product-delivery-audit` with any path, URL, or no input.
