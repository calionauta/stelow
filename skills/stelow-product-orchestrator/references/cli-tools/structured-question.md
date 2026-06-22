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
| Patterns | See `stages/ask-patterns.md` |

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

**Use patterns from `stages/ask-patterns.md`:**

| Pattern | Stage | Purpose |
|---------|-------|---------|
| Pattern 1 | Context | Strategic exploration selection |
| Pattern 2 | Interface Selection | Interface proposal selection |
| Pattern 3 | Scope Adjustment | Scope adjustment (add/remove) |
| Pattern 4 | General | Simple confirmation |
| Pattern 5 | Setup | Stage selection |
57:ef6| Pattern 5 | setup | Stage selection |
| Pattern 6 | Orchestrator | Workflow interruption (mid-workflow new request) |

### Product type (single-select)

```typescript
ask_user_question({
  questions: [{
    question: "What type of product is this?",
    header: "Product Type",
    options: [
      { label: "Software (codebase)", description: "Web app, mobile, CLI tool, library. Triggers AI-aware testing strategy." },
      { label: "Service (managed)", description: "Consulting, managed service, operations. No testing strategy." }
    ]
  }]
})
```

### Greenfield vs Brownfield (single-select)

```typescript
ask_user_question({
  questions: [{
    question: "Is this a new product or an evolution of an existing one?",
    header: "Context",
    options: [
      { label: "Greenfield — New product", description: "No existing code. Full TDD + risk-based coverage. No legacy constraints." },
      { label: "Brownfield — Existing product", description: "Adding features to existing codebase. Focus on regression + characterization tests." },
      { label: "Hybrid — Feature addition", description: "New features in existing product. Protect invariants, test new carefully." }
    ]
  }]
})
```

### Appetite / Mode (single-select)

```typescript
ask_user_question({
  questions: [{
    multiSelect: true,
    options: [
      // Only detected domains, e.g.:
      // { label: "Pricing", description: "Exchange base, consumption control, perception techniques" },
      // { label: "Promotions", description: "MAGIC framework, Loss Leader, Gift Card Sale" }
    ]
  }]
})
```

### Strategic approach selection (multi-select)

```typescript
ask_user_question({
  questions: [{
    question: "Select extra strategic approaches before Shape Up.",
    header: "Approaches",
    multiSelect: true,
    options: [
      // Generated dynamically based on signal detection
    ]
  }]
})
```

### Workflow resume (single-select)

```typescript
ask_user_question({
  questions: [{
    question: "Workflow already in progress. Resume last session?",
    header: "Workflow",
    options: [
      { label: "Yes — resume (Recommended)", description: "Continue from last completed stage." },
      { label: "View status only", description: "See what was done without resuming." },
      { label: "No — cancel workflow", description: "Close the existing workflow and start fresh." }
    ]
  }]
})
```

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