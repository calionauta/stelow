# Ask Patterns — Standardized Question Templates

> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools based on current stage.

> **Part of cali-product-workflow** — Centralized patterns for structured user questions using `ask_user_question`.

---

## Overview

All user-facing questions in the workflow should use these patterns for consistency.
The orchestrator and phases reference this file; skills do NOT mention ask patterns directly.

### Multi-Select Rule

When using `multiSelect: true`:
- **DO NOT** include "None", "Skip", "All", or similar meta-options
- The user can select **nothing** to mean "none"
- The user can select **all** to mean "all"
- Selections are explicit — no need for a "select all" button

### Tool Capabilities

`ask_user_question` supports:
- **2-6 options** per question (MAX_OPTIONS = 6)
- **preview** field — Markdown/ASCII rendered in side-by-side pane
- **multiSelect** — multiple selections allowed
- **Notes** — press `n` on previewed option to attach notes
- **Terminal scroll** — overflow indicated with ↑/↓/↕

Preview limits:
- Side-by-side: max 20 rows
- Stacked: max 15 rows

---

## Pattern 1: Strategic Exploration (Stage 2: Context)

Used in `stages/context.md` for strategic approach selection.

```typescript
ask_user_question({
  questions: [{
    question: `Before planning, would you like to explore strategic directions?
Each approach below generates inputs that feed into Shape Up.
Recommendation: [justification based on project context].`,
    header: "Strategy",
    multiSelect: true,
    options: [
      {
        label: "Jobs To Be Done (JTBD)",
        description: "Map functional, emotional and social jobs the user hires for. Generates contextual segmentation and desired outcomes."
      },
      {
        label: "Evolutionary Principles",
        description: "Explore innovation via stepping-stones, novelty search and optionality. Useful when the path is not obvious."
      },
      {
        label: "Opportunity Mapping",
        description: "Map problem opportunities with ranked solutions. Generates a prioritized opportunity map."
      },
      {
        label: "Market Analysis",
        description: "PESTLE, Foresight, Wardley Maps. Useful for understanding competition, trends and positioning."
      },
      {
        label: "Product Discovery",
        description: "Quick idea validation with short learning cycles. Ideal for unvalidated hypotheses."
      }
    ]
  }]
})

> **Note:** When using `multiSelect: true`, do NOT include "None" or "Skip" options — the user can simply select nothing to proceed without strategic exploration.
```

---

## Pattern 2: Interface Proposal Selection (Stage 9: Interface Selection)

Used in `cali-product-interface-brainstorm` for visual proposal comparison.

> **Preview format:** Extract the first ASCII wireframe from each proposal's output.
> Markdown rendering supports ASCII art, headers, lists, and code blocks.

```typescript
ask_user_question({
  questions: [{
    question: `Which interface direction to follow?
Recommendation: Hybrid (combination of each proposal's strengths).
Justification: [1-2 sentences].`,
    header: "Interface",
    options: [
      {
        label: "A — Proposal A",
        description: "Archetype A ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal A}
        
### Key Characteristics
- {bullet point}
- {bullet point}`
      },
      {
        label: "B — Proposal B",
        description: "Archetype B ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal B}`
      },
      {
        label: "C — Proposal C",
        description: "Archetype C ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal C}`
      },
      {
        label: "D — Proposal D",
        description: "Archetype D ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal D}`
      },
      {
        label: "E — Proposal E",
        description: "Archetype E ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal E}`
      },
      {
        label: "H — Hybrid (Recommended)",
        description: "Combination of the best elements from multiple proposals.",
        preview: `{hybrid wireframe combining best elements}`
      }
    ]
  }]
})
```

### Preview Content Guidelines

When generating previews for interface proposals:

1. **ASCII Wireframe** (5-10 lines):
   ```
   ┌─────────────────────────────────────┐
   │ Header: {Page Title}               │
   ├─────────────────────────────────────┤
   │ [Nav] [Nav] [Nav] [User]           │
   ├───────────┬─────────────────────────┤
   │ Sidebar   │ Content Area            │
   │ - Item 1  │ ┌─────────────────────┐│
   │ - Item 2  │ │ Widget               ││
   │ - Item 3  │ └─────────────────────┘│
   └───────────┴─────────────────────────┘
   ```

2. **Key Characteristics** (3-5 bullet points):
   - What makes this approach unique
   - Primary interaction pattern
   - Key trade-offs

3. **Trade-off indicators** (optional):
   ```
   ✅ Strength: {what this does well}
   ⚠️ Risk: {what needs attention}
   ```

### Maximum Preview Height

- **Side-by-side mode:** 20 rows
- **Stacked mode:** 15 rows

Keep previews concise. If content exceeds limits, prioritize:
1. ASCII wireframe (essential)
2. Key characteristics (important)
3. Trade-offs (if space allows)

---

## Pattern 3: Scope Adjustment (Stage 7: Post-Gate)

Used after Gate approval to let user add/remove from IN/OUT.

> **Note:** No Plannotator re-run after this — the ask tool already confirms selections.

```typescript
ask_user_question({
  questions: [
    {
      question: "What should be REMOVED from IN scope?",
      header: "Remove IN",
      multiSelect: true,
      options: [
        { label: "{scope-1}", description: "{scope description}" },
        { label: "{scope-2}", description: "{scope description}" }
      ]
    },
    {
      question: "What should be ADDED to IN scope?",
      header: "Add to IN",
      multiSelect: true,
      options: [
        { label: "{out-scope-1}", description: "{description}" },
        { label: "{out-scope-2}", description: "{description}" }
      ]
    }
  ]
})
```

**If user removes items:** update spec
**If user adds items:** create new spec version (requires awareness but no extra Gate)
**If user selects nothing:** proceed unchanged

---

## Pattern 4: Simple Confirmation

Used for binary decisions with context.

```typescript
ask_user_question({
  questions: [{
    question: "{specific question with context?}",
    header: "{Header}",
    options: [
      {
        label: "{Option A}",
        description: "{what happens if chosen}"
      },
      {
        label: "{Option B}",
        description: "{what happens if chosen}"
      }
    ]
  }]
})
```

---

## Pattern 5: Stage Selection (Stage 1/2: Setup)

Used in `stages/setup.md` for workflow stage selection and safe-change.

> **Note:** This is the ONLY place with multiple questions in parallel.

```typescript
ask_user_question({
  questions: [
    {
      question: `Which Product Definition Workflow stages should be activated?
Recommendation: [Shape Up + Interface + Tech Planning] | [Shape Up only] | etc.
Justification: [1-2 sentences explaining why].

Select the desired stages:`,
      header: "Workflow",
      multiSelect: true,
      options: [
        {
          label: "Shape Up Planning (Recommended)",
          description: "Understand problem, expose assumptions, map risks, define IN/OUT scope. Generates spec-product.md. → Automatically activates Plan Critique + Review Gate."
        },
        {
          label: "Interface Brainstorming",
          description: "Explore 5 interface directions with ASCII wireframes, breadboarding and trade-offs. → Automatically activates Plan Critique + Review Gate."
        },
        {
          label: "Tech Planning Sequencing",
          description: "Break into scopes with DoD + acceptance criteria. If standalone (no Shape Up/Interface): includes own Review Gate. If post-approval: no gate."
        }
      ]
    },
    {
      question: "Before starting, would you like to validate the impact of changes on existing code?",
      header: "Safe-change",
      options: [
        {
          label: "Yes — run safe-change (Recommended)",
          description: "+ Checks regressions automatically | + Catches issues before planning | - ~2-5 min extra\n  → Executes safe-change from pi-agent-codebase-workflows (PriNova)"
        },
        {
          label: "No — proceed directly",
          description: "+ Faster | + No automatic validation | - No safety net"
        }
      ]
    }
  ]
})
```

**If user chooses "Yes" for safe-change:** Run `safe-change` BEFORE proceeding.

---
fd6|
d05|
2eb|## Pattern 6: Workflow Interruption
d05|
4c0|Used by the orchestrator when user introduces new work mid-workflow.
ce8|
6f9|> **Trigger:** User asks for something different or substantially changes the current request.
d05|
d0c|> **Do not auto-abandon** an active workflow without confirmation.
d05|
d6d|```typescript
b33|ask_user_question({
6ef|  questions: [{
44f|    question: `You have an active workflow: "{workflow-name}" ({stage}).
7e9|What would you like to do?`,
d1c|    header: "Workflow",
de4|    options: [
1fc|      {
54a|        label: "Continue current",
ea2|        description: "Finish the current workflow first, then address the new request."
2f6|      },
1fc|      {
56b|        label: "Switch to new",
a16|        description: "Archive current and start a new workflow with: {new-request-preview}"
2f6|      },
1fc|      {
63f|        label: "Merge into current",
aee|        description: "Expand the current workflow to include: {new-request-preview}"
18b|      }
0b5|    ]
717|  }]
417|})
d05|
fd6|
73c|> **After user selection:**
d05|
66f|- **Continue current**: return to workflow, note new request for later
38f|- **Switch to new**: archive current workflow, start fresh with new request
2b9|- **Merge into current**: adjust scope/plan to incorporate new request
d05|
2c1|> **Note:** If workflow is near completion (Execution stage), recommend "Continue current" as default.
ce8|
605|/// END PATTERN 6
d05|
85a|

## Usage Rules

1. **Read this file** before any `ask_user_question` call
2. **Use the appropriate pattern** for the context
3. **Adapt labels/summaries** to the specific situation
4. **Use preview** when visual comparison adds value
5. **Keep previews under 20 rows** (side-by-side) or 15 rows (stacked)

---

## Reserved Labels

The following labels are auto-added by the tool and must NOT be used in options:
- `"Other"` / `"Type something."`
- `"Chat about this"`
- `"Next →"`

---

## Schema Reference

```typescript
interface Option {
  label: string;       // 1-5 words, max 60 chars
  description: string; // explains choice/trade-offs
  preview?: string;    // markdown/ASCII for visual comparison
}

interface Question {
  question: string;    // full question, ends with "?"
  header: string;      // max 20 chars, chip/tag label
  options: Option[];   // 2-6 options
  multiSelect?: boolean; // allow multiple selections
}
```