# Audit Trail Template

> **Part of stelow** — Used by the Audit stage to generate `audit-trail.md`.
> This template defines the standardized format for the full lineage record.

## Purpose

The audit trail is a single-file record of the entire workflow — from origin
to delivery. It answers "why does this exist, what was decided, what was
committed, what actually happened, and how was it validated?"

## Generation

After the execution critique completes, ask the user:

```
ask_user_question({
  questions: [{
    question: "Generate an audit trail for this workflow?\nThis creates audit-trail.md — a complete lineage record linking all artifacts.",
    header: "Audit Trail",
    options: [
      { label: "Yes, generate (Recommended)", description: "Creates audit-trail.md in the workflow directory with all 5 layers linked to artifacts." },
      { label: "Skip", description: "No audit trail generated. You can run /sw-audit later to generate it." }
    ]
  }]
})
```

If the user chooses "Yes" (or Review Mode = Auto), generate the file.

## File Location

```
.stelow/{YYYY-MM-DD}/{_dir}/audit-trail.md
```

## Template

Follow this structure exactly. Fill in `{placeholders}` from the data
read during the execution critique stage. Every section must include
artifact links using relative paths from the workflow directory.

```markdown
# Audit Trail: {workflow-name}

**Generated:** {ISO-8601 timestamp}
**Appetite:** {Lean|Core|Complete}
**Review Mode:** {Auto|Product Spec Gate|...|+ Code Diff}
**Intent:** {new-product|feature|bugfix|refactor|investigate}

---

## 1. Origin — "Why does this exist?"

- **Intent:** {intent}
  → [specs/spec-product_v{N}.md]({relative_path_to_spec_product})
- **Appetite:** {appetite} (declared by human)
  → [specs/spec-product_v{N}.md]({relative_path}) `appetite: {value}`
- **Review Mode:** {review_mode}
  → [stelow.json]({relative_path_to_stelow}) `workflows[].config.review_mode` (canonical source of truth)
- **Domains detected:** {domains}
  → [specs/spec-product_v{N}.md]({relative_path}) `domains_detected: {value}`
- **Lessons injected:** {N} patterns from previous cycles
  → [lessons-learned/]({relative_path_to_lessons_dir})

## 2. Design — "What was decided and why?"

- **IN:** {comma-separated IN items}
  → [specs/spec-product_v{N}.md]({relative_path}) `## IN`
- **OUT:** {comma-separated OUT items}
  → [specs/spec-product_v{N}.md]({relative_path}) `## OUT`
- **Appetite fit:** {fits|cuts_needed|reshape}
  → [specs/spec-product_v{N}.md]({relative_path}) `appetite_fit: {value}`
- **Interface selected:** {proposal letter and name}
  → [interfaces/interfaces_v{N}.md]({relative_path_to_interfaces})
- **Trade-offs:** {1-2 sentence rationale for interface selection}
  → [interfaces/interfaces_v{N}.md]({relative_path}) rationale section
- **Critique resolved:** {N} gaps → {N} FIXED, {N} DOCUMENTED, {N} ESCALATED
  → [critiques/critique-report.md]({relative_path_to_critique})
- **Model provenance:** spec={model}, critique={model}, interfaces={model}
  → [specs/spec-product_v{N}.md]({relative_path}) frontmatter

## 3. Planning — "What was committed?"

- **Scopes:** {N} typed scopes ({list types})
  → [plans/spec-tech_v{N}.md]({relative_path_to_spec_tech})
- **Gates fired:**
{For each gate that fired:}
  - ✅ {gate-name} ({review_mode_level}) — approved via plannotator, {timestamp}
    → [.plannotator/approvals/{hash}/gate-approved.md]({relative_path})
{For gates skipped:}
  - 🚫 {gate-name} (skipped — review_mode does not include {level})

### Scope: {scope-name}
| Field | Value | Artifact |
|-------|-------|----------|
| Type | {feature|optimization|spike|test-*} | [spec-tech_v{N}.md]({relative_path}) `[TYPE]` |
| Dependencies | {scope-ids or "—"} | [spec-tech_v{N}.md]({relative_path}) `Dependencies:` |
| Target files | {glob patterns} | [spec-tech_v{N}.md]({relative_path}) `[TARGET_FILES]` |
| Max iterations | {N} | [spec-tech_v{N}.md]({relative_path}) `[MAX_ITERATIONS]` |
| Tasks planned | {N} | [spec-tech_v{N}.md]({relative_path}) Tasks table |

{Repeat the Scope table for each scope.}

## 4. Execution — "What actually happened?"

### Scope: {scope-name} {status-icon}
| Field | Value | Artifact |
|-------|-------|----------|
| Status | {completed|escalated|failed} | [stelow.json]({relative_path_to_stelow_json}) `wf.scopes[i].status` |
| Iterations | {actual}/{max} | [stelow.json]({relative_path}) `wf.scopes[i].iteration` |
| Actual files | {file list} | [stelow.json]({relative_path}) `wf.scopes[i].actualFiles` |
| Start SHA | {sha} | [stelow.json]({relative_path}) `wf.scopes[i].startSha` |
| Tasks planned | {N} done | [stelow.json]({relative_path}) `wf.scopes[i].tasks[]` |
| Tasks discovered | {N}{if > 0: ": {description} (trigger: {reason})"} | [stelow.json]({relative_path}) `wf.scopes[i].tasks[]` `source: 'discovered'` |
| Record | {files_count} files, {commands_count} commands, verified {✅|⚠️} | [stelow.json]({relative_path}) `wf.scopes[i].record` |
| Event log | {event sequence} | [events.jsonl]({relative_path_to_events}) |

{Repeat for each scope.}

### Overlap Report
| Class | Scopes | Details |
|-------|--------|---------|
{For each overlap class with data:}
| {undeclared|overlaps|stale locks} | {scope ids} | {details} |
| clean | {scope ids} | — |

## 5. Verification — "How was it validated?"

| Check | Result | Artifact |
|-------|--------|----------|
| Test suite | {✅ N/N pass|❌ failures} | — |
| Code review | {✅ N reviewers, N P0, N P1} | — |
| UI audit | {✅ static/live clean|⚠️ findings|N/A} | — |
| Code quality gate | {✅ lint+typecheck clean|⚠️ warnings} | [verification/code-quality-review.md]({relative_path}) |
| Invisible 20% | {✅ checks pass|⚠️ gaps found} | — |
| Execution critique | {N} FIXED, {N} DOCUMENTED, {N} ESCALATED | — |
```

## Format Rules

1. **Artifact links** use relative paths from the workflow directory root
   (e.g. `specs/spec-product_v1.md`, not `.stelow/2026-07-10/sw-abc123/specs/...`)
2. **YAML frontmatter** is NOT used in this file — the header is Markdown only
3. **Tables** use standard Markdown pipe syntax
4. **Placeholders** in `{braces}` are filled from data already read during
   the execution critique — no additional file reads needed
5. **Scope section** repeats for each scope in the workflow
6. **Status icons:** ✅ completed, ⬆️ escalated, ❌ failed, ○ pending

## grep Stability

The audit trail uses stable delimiters for programmatic extraction:

| Pattern | Regex | Extracts |
|---------|-------|----------|
| Workflow name | `^# Audit Trail: (.+)$` | Workflow identifier |
| Appetite | `^\*\*Appetite:\*\* (.+)$` | Appetite level |
| Review Mode | `^\*\*Review Mode:\*\* (.+)$` | Review mode |
| Scope header | `^### Scope: (.+)$` | Scope names |
| Scope status | `\| Status \| (.+) \|` | Scope status values |
| Gate fired | `^  - ✅ (.+)$` | Active gates |
| Gate skipped | `^  - 🚫 (.+)$` | Skipped gates |

These patterns are stable across versions. The `audit_version` field in
JSON output (when using `--format json`) tracks format changes.
