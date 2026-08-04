# Context Efficiency Strategies

> Tool-agnostic strategies for reducing token consumption in AI agent workflows.

## Quick Summary

Token efficiency comes from **structure, not magic**. Organize prompts for cache reuse, batch parallel operations, and skip unnecessary tool calls. Each strategy below works on any CLI with any model.

---

## Strategy 1: Cache-Friendly Prompt Layout

LLM providers (Anthropic, OpenAI, Google) cache repeated prompt prefixes. Every time you re-read the same SKILL.md or reference file within a session, you pay 90% less if the prefix is byte-identical.

**Rules:**
- **Stable content first**: tool definitions, safety rules, immutable instructions
- **Variable content last**: stage-specific instructions, user context, dates
- **Never mix**: a cache boundary comment (e.g., `<!-- CACHE BOUNDARY -->`) separates the two

If you see the same file being re-read within a session, check whether its layout follows this pattern. If not, the LLM is paying full price every time.

---

## Strategy 2: Output Truncation

Instead of reading entire files, read only what you need:

| Basic tool | Efficient alternative | Savings |
|---|---|---|
| `read path/to/file` | `read path/to/file offset=0 limit=50` | 90-99% |
| `bash cat file` | `bash head -50 file` | 90-99% |
| `bash grep -r "pattern"` | `bash grep -rl "pattern"` (names only) | 95%+ |

Use `offset/limit` for large files. Use `wc -l` first to know the size. Read the head (structure) and tail (recent changes), skip the middle.

---

## Strategy 3: Batch Multi-Tool Calls

Instead of N sequential tool calls, batch them when the tool supports it:

| Scenario | Instead of | Do this | Savings |
|---|---|---|---|
| Multiple cymbal lookups | `cymbal show A` → `cymbal show B` → `cymbal show C` | `cymbal show A B C` | ~60% (1 tool call vs 3) |
| Multiple file reads | `read a.ts` → `read b.ts` → `read c.ts` | `read a.ts` then combine findings across them | ~40% (fewer roundtrips) |
| Multiple agent_browser queries | 3 separate `get text` calls | Batch `[["get","text","@e1"],["get","text","@e2"]]` | ~50% |
| Multiple subagents | Sequential agent calls | `parallel: [{agent:a, task:x}, {agent:b, task:y}]` | ~50% (concurrent) |

**General rule:** If a tool accepts multiple targets, use them. The tool definition overhead (schema, description, parameter types) is identical whether you pass 1 target or 5.

---

## Strategy 4: Structured Output

When a stage produces checklist-style output (audit, critique, verification), use JSON mode instead of prose:

```
❌ Prose (verbose):
  "The audit found 3 gaps. Gap 1 is about missing error handling in the auth module.
  This is classified as ESCALATED because it requires a new scope..."
  
✅ JSON (structured):
  {"gaps":[{"type":"ESCALATED","area":"auth","description":"Missing error handling"}]}
```

Savings: 200-500 tokens per stage output. Multiply by 15 stages = 3-7K tokens per workflow.

Check if your harness supports `response_format: { "type": "json_object" }`. If yes, use it for:
- Triage output (list of items with types)
- Selection ranking (items with scores)
- Critique findings (severity-classified gaps)
- Gap resolution (decision matrix)
- Verification results (pass/fail per check)

---

## Strategy 5: Stage-Specific Tool Blocking

Why call tools you won't use? Each stage has restricted tools defined in `stages.yaml`. The LLM should check these before calling any tool:

- **Gate stages** (`gate`, `int-gate`): read-only (block edit/write/bash)
- **Selection stage** (`selection`): ask + read only (no modifications)
- **Shape stage** (`shape`): write allowed, but no execution tools
- **Execution stage** (`execution`): full tool access

Stage-specific blocking reduces failed/corrected tool calls by ~10-20%.

---

## Strategy 6: Self-Limiting Web Fetches

When fetching web/live documentation:

```
❌ Unbounded: Fetch the entire page → 50KB+ in context
✅ Limited: Fetch with timestamp or section selector → 2-5KB
```

For `agent_browser`, use `snapshot -i` (interactive, limited) instead of full page screenshots. Use `get text` on specific elements.

---

## Summary

| Strategy | Savings | Effort | When to use |
|---|---|---|---|
| Cache-friendly layout | 50-90% on SKILL.md | Low | Every file read multiple times per session |
| Output truncation | 90-99% on reads | Low | Large files, when you only need structure |
| Batch multi-tool calls | 40-60% on tool calls | Low | Multi-symbol lookups, multi-file checks |
| Structured output | 200-500 tokens/checklist | Medium | Audit, critique, verification stages |
| Stage-specific tool blocking | 10-20% on tool errors | Low | Built into stages.yaml — just follow it |
| Self-limiting web fetches | 60-90% on web content | Low | Documentation fetching |
