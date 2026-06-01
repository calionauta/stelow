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

## Pattern 1: Strategic Exploration (Context stage)

Used in `stages/context.md` for strategic approach selection.

> **Gate awareness:** Before applying this pattern, run `context:5` (appetite/mode gate). If `PoC` + `Auto`, skip the question entirely. If `PoC` + non-Auto, present this pattern with opt-in execution note (subagents not automatic). If `Focused`/`Comprehensive`, apply as-is.

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
        label: "Multi-Method Market Analysis",
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

## Pattern 2: Interface Proposal Selection (Interface Selection stage)

Used in `cali-product-interface-alternatives` for visual proposal comparison.

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

## Pattern 3: Scope Adjustment (Scope Adjustment stage)

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

## Pattern 5: Stage Selection (Setup stage)

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
          description: "Understand problem, expose assumptions, map risks, define IN/OUT scope. Generates spec-product.md. → Automatically activates Product Critique + Review Gate."
        },
        {
          label: "Interface Alternatives",
          description: "Explore 5 interface directions with ASCII wireframes, breadboarding and trade-offs. → Automatically activates Product Critique + Review Gate."
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
## Pattern 6: Workflow Interruption

Used by the orchestrator when user introduces new work mid-workflow.

> **Trigger:** User asks for something different or substantially changes the current request.
> **Do not auto-abandon** an active workflow without confirmation.

```typescript
ask_user_question({
  questions: [{
    question: `You have an active workflow: "{workflow-name}" ({stage}).
What would you like to do?`,
    header: "Workflow",
    options: [
      {
        label: "Continue current",
        description: "Finish the current workflow first, then address the new request."
      },
      {
        label: "Switch to new",
        description: "Archive current and start a new workflow with: {new-request-preview}"
      },
      {
        label: "Merge into current",
        description: "Expand the current workflow to include: {new-request-preview}"
      }
    ]
  }]
})
```

> **After user selection:**
> - **Continue current**: return to workflow, note new request for later
> - **Switch to new**: archive current workflow, start fresh with new request
> - **Merge into current**: adjust scope/plan to incorporate new request
>
> **Note:** If workflow is near completion (near Execution stage), recommend "Continue current" as default.

/// END PATTERN 6

---
## Pattern 7: Appetite Declaration

Used by `setup:15` when the human declares the depth of scope to prepare.

> **Trigger:** Before stage selection, after inbox/lessons/context pre-load.

```typescript
ask_user_question({
  questions: [{
    question: `How deep should the plan be?
This sets the appetite — how much scope the LLM should prepare.
Appetite is declared first, then the mode of interaction is chosen.`,
    header: "Appetite",
    options: [
      {
        label: "PoC",
        description: "Quick validation — 1 minimal feature, ~1 page spec, 1-2 scopes. No edge cases."
      },
      {
        label: "Focused (Recommended)",
        description: "One feature product, main Job To Be Done — ~3 page spec, 3-5 scopes, obvious edge cases."
      },
      {
        label: "Comprehensive",
        description: "Multi-feature product — ~8+ page spec, 8-15 scopes, full edge case mapping, 3-5 alternatives compared."
      }
    ]
  }]
})

```

**Checkboxes (cross-cutting concerns):**

```typescript
ask_user_question({
  questions: [{
    question: `Which capabilities does this need?`,
    header: "Capabilities",
    multiSelect: true,
    options: [
      {
        label: "Authentication",
        description: "Login, session management, RBAC/permissions"
      },
      {
        label: "Database",
        description: "Storage, schema design, migrations, queries"
      },
      {
        label: "Payment",
        description: "Checkout flow, subscriptions, refunds, invoices"
      }
    ]
  }]
})

```

**How appetite shapes the output:**

| Level | Spec size | Scopes | Alternatives | Edge cases | Each checkbox adds |
|-------|-----------|--------|-------------|------------|-------------------|
| PoC | ~1 page | 1-2 | 1 direct | Not documented | +1 scope each |
| Focused | ~3 pages | 3-5 | 1-2 | Only obvious ones | +2-3 scopes each |
| Comprehensive | ~8+ pages | 8-15 | 3-5 compared | Fully mapped | +3-5 scopes each |

**Storage:** Save to `index.json` as `config.appetite`, save checkboxes as `config.{auth,database,payment}`, and inject into `spec-product.md` frontmatter as `appetite: {chosen}`.

> **Key rule:** Appetite is FIXED for the cycle. The LLM cannot extend it. If scope doesn't fit, the LLM splits — the human decides whether to accept the split or extend appetite in a NEW cycle.

---

## Pattern 8: Interaction Mode

Used by `setup:15` after appetite is declared. Defines how much the workflow interacts with the human.

> **Trigger:** After appetite + capabilities selection, before stage selection.

```typescript
ask_user_question({
  questions: [{
    question: `How much interaction do you want during the workflow?
This sets the mode — which gates, questions, and approvals are active.
Mode is orthogonal to appetite: appetite defines depth, mode defines feedback.`,
    header: "Mode",
    options: [
      {
        label: "Auto",
        description: "No gates, no questions, no Plannotator. LLM makes the best guess and recommendation on its own."
      },
      {
        label: "Light",
        description: "Product approval only: one Plannotator gate before tech planning. Interface = LLM recommendation. No IN/OUT confirmation. User can annotate in the planning gate if wanted."
      },
      {
        label: "Moderate",
        description: "Product + UX approval: Light + user chooses between generated interface alternatives."
      },
      {
        label: "Full Product",
        description: "Full flow: all gates, questions, and details. Except tech planning approval and technical questions — those use Auto."
      },
      {
        label: "Full Product + Tech",
        description: "Everything including tech: all gates, all questions, all details, plus tech planning approval and technical questions."
      }
    ]
  }]
})

```

**Mode effect matrix:**

| Mode | Plannotator Gates | User Questions | Interface | IN/OUT Confirmation | Tech Approval |
|------|------------------|---------------|-----------|---------------------|---------------|
| Auto | None | None | LLM recommends | LLM decides | Auto |
| Light | 1 (pre-tech) | None (final confirm only) | LLM recommends | LLM decides | Gate only |
| Moderate | 1 (pre-tech) | Interface selection | User chooses | LLM decides | Gate only |
| Full Product | Gate + Int-Gate | All except technical | User chooses | User confirms | Auto |
| Full Product + Tech | Gate + Int-Gate | All including technical | User chooses | User confirms | Gate + tech Qs |

**Storage:** Save to `index.json` as `config.mode`.

> **Note:** Mode does NOT affect supervisor, parallelization, or which skills run. All stages run for all modes — only gates and questions change.

/// END PATTERN 8

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