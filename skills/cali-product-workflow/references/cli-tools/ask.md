# Tool: ask_user_question

> Structured user questions for PI using ask_user_question.

---

## Specific Command (PI)

```typescript
ask_user_question({
  questions: [{
    question: "...",
    header: "...",
    options: [...],
    multiSelect: boolean
  }]
})
```

| Info | Value |
|------|-------|
| Package | @juicesharp/rpiv-ask-user-question (juicesharp) |
| Patterns | See `phases/ask-patterns.md` |

---

## Tool Capabilities

| Capability | Description |
|------------|-------------|
| Options | 2-6 options per question |
| Preview | Markdown/ASCII rendered side-by-side |
| multiSelect | Allow multiple selections |
| Notes | Press 'n' on option to attach notes |

---

## Preview Limits

| Mode | Max rows |
|------|----------|
| Side-by-side | 20 rows |
| Stacked | 15 rows |

---

## Patterns Reference

**Use patterns from `phases/ask-patterns.md`:**

| Pattern | Phase | Purpose |
|---------|-------|---------|
| Pattern 1 | Phase 2a | Strategic exploration selection |
| Pattern 2 | Phase 9 | Interface proposal selection |
| Pattern 3 | Phase 6 | Scope adjustment (add/remove) |
| Pattern 4 | General | Simple confirmation |
| Pattern 5 | Phase 1b | Stage selection |
57:ef6| Pattern 5 | Phase 1b | Stage selection |
d05|
e8c| Pattern 6 | Orchestrator | Workflow interruption (mid-workflow new request) |

---

## Multi-Select Rule

When `multiSelect: true`:
- **DO NOT** include "None", "Skip", "All" as options
- User can select **nothing** to mean "none"
- Selecting **everything** is allowed
- Selections are explicit — no need for "select all"

---

## Schema

```typescript
interface Option {
  label: string;       // 1-5 words, max 60 chars
  description: string; // explains trade-offs
  preview?: string;    // markdown/ASCII for visual
}

interface Question {
  question: string;    // ends with "?"
  header: string;     // max 20 chars
  options: Option[];   // 2-6 options
  multiSelect?: boolean;
}
```

---

## Reserved Labels

These are auto-added and must NOT be in options:
- `"Other"` / `"Type something."`
- `"Chat about this"`
- `"Next →"`

---

## Fallback (Other Harnesses)

If `ask_user_question` is not available:
- List options as numbered markdown
- User responds with number
- Process response as selection

**Fallback example:**
```markdown
## Options

1. Option A — description
2. Option B — description

Respond with the number of your choice:
> 1
```

**Abstraction:** "Structured question with options and user response"