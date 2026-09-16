## Execution Critique

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools.

Delegates to standalone skill `stelow-workflow-execution-critique`:

1. Read the `stelow-workflow-execution-critique` skill for full instructions
2. Pass path to the most recent `spec-tech_v{N}.md` as input (find by glob:
   `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v*.md`, pick highest N)
3. Pass verification evidence when present:
   - test-suite output
   - code-review output
   - UI audit output from `stelow-workflow-ux-critique`
   - optional code-quality-review output at `.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md`
4. The skill runs all 11 criteria against the tech plan and implementation evidence

**Post-verification placement:** this stage runs after Verification and the
conditional Code Quality Review. If `code-quality-review.md` exists, the audit
must inspect its findings and convert unresolved P0/P1 gaps into the gap
registry or lessons learned.

**Audit Trail generation:** After the execution critique completes (all 11
criteria evaluated, gap registry classified, lessons saved), generate the
portable trail unconditionally:

```bash
scripts/stelow audit-trail build --strict
scripts/stelow audit-trail check --strict
```

The CLI owns the format and validates freshness against `state.md`, the
registered artifacts, and the repository snapshot (Git root, `HEAD`, the
tracked worktree diff except its own receipt, and the non-ignored untracked
manifest) — so the receipt covers the code as it stands, not just the last
commit. Ignored output is covered only when registered as an artifact. Do not hand-write
`audit-trail.md` or ask for permission to create it: it is the mandatory,
deterministic receipt of a completed audit.

Every durable output the audit produced must be registered in `state.md` first. The
CLI never digests its own output, so `audit-trail.md` itself stays out of the
manifest — but any *other* unregistered workflow file is invisible to the
receipt, and a host that completes through `--strict` will refuse until it is
registered. Registering it is the fix; do not reword the manifest.

**Standalone usage:** This skill can be invoked outside the workflow
by calling `stelow-workflow-execution-critique` with any path, URL, or no input.
Audit trail generation is skipped in standalone mode (no workflow directory).
