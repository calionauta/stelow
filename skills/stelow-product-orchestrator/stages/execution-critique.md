## Execution Critique

> **Part of stelow** — See [`SKILL.md`](./SKILL.md) for stage sequence.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools.

Delegates to standalone skill `stelow-product-execution-critique`:

1. Read the `stelow-product-execution-critique` skill for full instructions
2. Pass path to the most recent `spec-tech_v{N}.md` as input (find by glob:
   `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v*.md`, pick highest N)
3. Pass verification evidence when present:
   - test-suite output
   - code-review output
   - UI audit output from `stelow-product-ux-critique`
   - optional code-quality-review output at `.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md`
4. The skill runs all 9 criteria against the tech plan and implementation evidence

**Post-verification placement:** this stage runs after Verification and the
conditional Code Quality Review. If `code-quality-review.md` exists, the audit
must inspect its findings and convert unresolved P0/P1 gaps into the gap
registry or lessons learned.

**Audit Trail generation:** After the execution critique completes (all 11 criteria evaluated, gap registry classified, lessons saved), ask the user whether to generate the audit trail:

```
ask_user_question({
  questions: [{
    question: "Generate an audit trail for this workflow?\nThis creates audit-trail.md — a complete lineage record linking all artifacts from origin to delivery.",
    header: "Audit Trail",
    options: [
      { label: "Yes, generate (Recommended)", description: "Creates audit-trail.md in the workflow directory with all 5 layers linked to artifacts." },
      { label: "Skip", description: "No audit trail generated. You can run /sw-audit later to generate it." }
    ]
  }]
})
```

**If Review Mode = Auto:** skip the question and generate automatically.

**If user chooses "Yes" (or Auto):**
1. Read `references/cli-tools/audit-trail-template.md` for the template
2. Fill placeholders from data already read during this stage (no extra file reads needed)
3. Write to `.stelow/{YYYY-MM-DD}/{_dir}/audit-trail.md`
4. The audit-trail.md path is stored in `stelow.json#workflows[].artifacts` (or .stelow/{date}/{dir}/ is the filesystem convention)
5. Confirm to user: `"📄 Audit trail generated: audit-trail.md"`

**Standalone usage:** This skill can be invoked outside the workflow
by calling `stelow-product-execution-critique` with any path, URL, or no input.
Audit trail generation is skipped in standalone mode (no workflow directory).
