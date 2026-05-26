# Tool Reference Pattern

## Overview

Skills must NOT call tools directly with implementation details. Instead, they reference:
- `references/cli-tools/` — Tool documentation with command, schema, fallback
- `stages/ask-patterns.md` — Question templates (patterns)

## Why This Pattern

| Approach | Problem |
|----------|---------|
| Direct tool call in skill | Tool-specific, not portable across CLIs |
| Hardcoded schema in skill | Duplication, hard to maintain |
| **Reference pattern** | Single source of truth, CLI adapter handles fallbacks |

## Structure

```
cali-product-workflow/
├── references/
│   └── cli-tools/
│       ├── ask.md           # Tool: ask_user_question
│       ├── subagents.md     # Tool: subagent
│       ├── goals.md         # Tool: Goal System (ordered/flexible modes)
│       ├── plannotator.md   # Tool: plannotator
│       ├── phase-status.md  # Tool: /pw-*
│       ├── safe-change.md   # Tool: safe-change
│       ├── intercom.md      # Tool: intercom
│       ├── supervise.md     # Tool: start_supervision
│       └── context-mode.md  # Tool: ctx_* tools
└── stages/
    └── ask-patterns.md      # Pattern templates (Pattern 1-6)
```

## Rules

1. **Skill references tool, not calls it**
   ```markdown
   ✅ Use the ask tool (see `references/cli-tools/structured-question.md`)
   ❌ ask_user_question({...}) directly in skill
   ```

2. **Use patterns from ask-patterns.md**
   ```markdown
   ✅ Use Pattern 3 from `stages/ask-patterns.md`
   ❌ ask_user_question({...}) with hardcoded template
   ```

3. **Each tool doc has:**
   - Command syntax for each CLI
   - Schema (interface types)
   - Fallback behavior for unsupported CLIs
   - Cross-reference to relevant patterns

## Creating New Tool References

If a tool is needed but no reference exists:

1. **Create** `references/cli-tools/{tool-name}.md`
2. **Follow pattern:**
   ```markdown
   # Tool: {tool-name}

   ## Command

   ## Schema

   ## Fallback

   ## Patterns Reference
   ```
3. **Update** `stages/ask-patterns.md` if creating new patterns
4. **Add** to tool reference table in SKILL.md

## Example

**Wrong (in SKILL.md):**
```markdown
Use `ask_user_question` with 3 options...
```

**Correct (in SKILL.md):**
```markdown
Use the ask tool (see `references/cli-tools/ask.md`).
For question templates, use Pattern 4 from `stages/ask-patterns.md`.
```

**Correct (in sub-skill):**
```markdown
Use Pattern 2 from `stages/ask-patterns.md` for interface selection.
```