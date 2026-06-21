# Structured Output — Alternatives & Plan

**Goal:** Reduce token waste from unstructured markdown output. Each stage currently outputs prose that must be re-parsed downstream. Structured data is cheaper to produce and unambiguous to consume.

## Alternatives

### A — JSON mode per stage (response_format: json_object)

Add `output_schema` to `stages.yaml` for checklist stages. LLM outputs pure JSON.

| Pro | Con |
|---|---|
| Max token savings (~200-500/output) | Requires harness support for `json_object` |
| Deterministic parsing | Not all CLIs support it (OpenCode? Codex?) |
| Clean data for downstream stages | Schema must be maintained per stage |

**Verdict:** Over-engineered for current needs. Harness dependency is a risk.

**Token saved:** ~300-500 per checklist output (audit, critique, verification)

### B — Frontmatter + prose hybrid (Recommended)

Structured metadata in YAML frontmatter, narrative in markdown body. Already used by `spec-product.md` (`appetite:`, `approved:` in frontmatter).

```
---
gaps:
  - type: ESCALATED
    area: auth
    description: Missing error handling
  - type: FIXED
    area: tests
    description: Added unit tests
---
## Narrative notes
Additional context about the audit...
```

| Pro | Con |
|---|---|
| ✅ Works on ALL CLIs — zero harness dependency | Modest savings vs pure JSON |
| ✅ Backward compatible — existing parsers ignore frontmatter | Slightly more complex than pure markdown |
| ✅ Already partially implemented (spec-product frontmatter) | |
| ✅ Easy to add incrementally, stage by stage | |
| ✅ LLMs are good at YAML frontmatter | |

**Verdict:** KISS, DRY, highest compatibility. Do this.

**Token saved:** ~100-200 per output (frontmatter replaces first paragraph of narrative)

### C — Constrained markdown templates

Each stage gets a strict template (headings + bullet lists). LLM fills the blanks.

```
## Gaps
- [ESCALATED] auth: Missing error handling
- [FIXED] tests: Added unit tests
```

| Pro | Con |
|---|---|
| Works on all CLIs | More verbose than JSON frontmatter |
| Simple to document | Template must be maintained per stage |
| | Less savings than frontmatter approach |

**Verdict:** Inferior to B. Frontmatter is cleaner.

### D — Status quo (no structured output)

Keep unstructured markdown.

**Verdict:** Misses opportunity, but valid as deferral.

## Plan: Frontmatter-first (B)

### Which stages benefit most

| Stage | Current output | Frontmatter fields | Token saved |
|---|---|---|---|
| critique | 5-paragraph narrative | `severity`, `area`, `recommendation` per gap | ~200-300 |
| audit | Gap registry prose | `type`, `area`, `resolution` per gap | ~200-400 |
| verification | Narrative report | `pass`/`fail` per check, coverage % | ~200-300 |
| triage | Item list as prose | `items[]` with `type`, `priority` | ~100-200 |
| selection | Ranked list as prose | `rankings[]` with `score` | ~100 |

### Total expected savings: ~800-1500 tokens per workflow

### Implementation

1. Add frontmatter schema to the stage instruction in each stage's `.md` file
2. Update sub-skill instructions to output frontmatter
3. Update downstream readers to read from frontmatter (they already ignore it)
4. Done incrementally, one stage at a time

### Effort: Low (4-8 hours for all stages)
### Priority: P2 (lower than cache boundary, model routing)
