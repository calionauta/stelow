# Ask Patterns — Standardized Question Templates

> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools based on current stage.

> **Part of stelow** — Centralized patterns for structured user questions using `ask_user_question`.

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

### Opt-Out Confirms (preselected options)

For confirmations — scope maps, IN tables — prefer opt-out over opt-in:
every option starts checked (`selected: true`) and the human unchecks to
remove. Keeping all checked confirms; unchecking everything means "remove
all" (reshape territory), which is distinct from skipping (leaves unchanged).
Preselection composes only with `multiSelect: true`; single-select groups
refuse it. Option sources differ by moment (proposal IN/OUT items at shaping
time, mapped scopes with stable IDs at scope time) but the interaction is one
pattern. Chunk at 6 options per question (MAX_OPTIONS); never drop items to fit.

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

Used in the context stage for strategic approach selection.

> **Gate awareness:** Before applying this pattern, run `context:5` (appetite/mode gate). If `Lean` + `Auto`, skip the question entirely. If `Lean` + non-Auto, present this pattern with opt-in execution note (subagents not automatic). If `Core`/`Complete`, apply as-is.

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

## Pattern 2: Interface Selection (Interface Selection stage)

Used for the `interface-pick` question: the human chooses one direction
from the Interface Contrast receipt (`interfaces/contrast.json`).

> **Option source:** every option comes from a receipt option
> (`contrast.json` → `options[]`). `label` is the option `id` verbatim
> (an id over 60 chars refuses the pick — never truncate it);
> `description` names the primary value plus served/friction scope coverage
> by scope TITLE from the scope map (or states explicitly that no map
> exists) — never bare scope IDs; `preview` is ≤15 rows built
> only from receipt fields (decision question, primary value, related
> values, coverage, criteria) — never an invented wireframe; `artifact`
> is the readable rendering (`interfaces/interfaces.md`), already written.
> There is no recommendation field: authority lives with the decider, so a
> human pick and an agent auto-adopt read the same options. Anything else —
> a stop/shape/research route, an invalid receipt, a single existing
> interface — refuses with a named reason instead of a pick.

```typescript
ask_user_question({
  questions: [{
    question: `{decisionQuestion from contrast.json}`,
    header: "Interface",
    options: [
      {
        label: "{option id}",
        description: "{primaryValue}. Served: {scope titles}. Friction: {scope titles}.",
        preview: `{decisionQuestion}
{primaryValue}
Related: {relatedValues}
Serves {scope title} — {note}
Friction {scope title} — {note}
Judged by: {criteria}`,
        artifact: { path: ".stelow/{YYYY-MM-DD}/{dir}/interfaces/interfaces.md", display: "interfaces.md" }
      }
      // ... one option per receipt option (1-4, all valid)
    ]
  }]
})
```

### Pattern 2A: Breadth Proposal Selection (Explore track only)

Used in `stelow-workflow-interface-alternatives` for visual proposal
comparison on the Explore track or standalone. Never on the Build track:
there the `interface` stage runs Interface Contrast and the pick follows
Pattern 2 above.

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
- {bullet point}`,
        artifact: { path: ".stelow/{YYYY-MM-DD}/{dir}/interfaces/proposal-a.md", display: "proposal-a.md" }
      },
      {
        label: "B — Proposal B",
        description: "Archetype B ({name}) — {summary}",
        preview: `{first ASCII wireframe from Proposal B}`,
        artifact: { path: ".stelow/{YYYY-MM-DD}/{dir}/interfaces/proposal-b.md", display: "proposal-b.md" }
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

Used after Gate approval to confirm the mapped scopes — **only when
review mode requires IN/OUT confirmation** (`Product Spec + Interface +
Scopes` and above). In `Auto` and lower modes the LLM adjusts scope itself
(see `../references/human-gates.md`) and never parks waiting.

> **Note:** No visual review re-run after this — the ask tool already confirms selections.

Opt-out form: every mapped scope is one preselected option. Keeping all
checked confirms the map; unchecking removes. Unchecking everything means
"remove all" (reshape territory) — distinct from skipping, which leaves the
map unchanged.

> **Address the human by outcome, never by scope ID.** Labels carry the
> scope's outcome (what the person gets); the stable ID lives only in the
> `scope-map.json` artifact and the decision receipt, where the worker —
> never the person — reads it back to record the pick. A label like
> "A5 — checkout" forces the person to decode worker vocabulary; the host
> also maps known IDs to titles at render time, but the question should not
> need the safety net.

```typescript
ask_user_question({
  questions: [
    {
      question: "Which of these scopes stay IN?",
      header: "Keep IN",
      multiSelect: true,
      options: [
        {
          label: "{outcome}",
          description: "{IN items + key dependencies}",
          selected: true,
          preview: "{outcome, IN/OUT, dependencies — ≤15 rows}",
          artifact: { path: ".stelow/{YYYY-MM-DD}/{dir}/scope-map.json", display: "scope-map.json" },
        },
        // ... one option per mapped scope, ALL preselected
      ]
    },
    // Only when OUT items exist:
    {
      question: "Add any of these back to IN?",
      header: "Add IN",
      multiSelect: true,
      options: [
        { label: "{out-item}", description: "{why it was left out}" }
        // ... OUT items, NONE preselected (opt-in)
      ]
    }
  ]
})
```

Chunking rule: at most 6 options per question. With 7–9 mapped scopes,
split into batched groups of ≤6 in ONE call (e.g. "Which of these scopes
stay IN? (1/2)"), all preselected. Never silently drop scopes to fit.

**If user removes items:** update spec + emit a scope-map challenge when a
boundary or dependency meaning changes (never rewrite the approved map in
place).
**If user adds items:** create new spec version (requires awareness but no extra Gate)
**If user selects nothing on the keep question:** reshape — an empty map is not a map.
**If user skips:** proceed unchanged.

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

Used in the setup stage for workflow stage selection and safe-change.

> **Note:** This pattern is only shown for Product Spec + Interface Gates and above.
> Auto/Product Spec Gate modes auto-define stages.

> **Batching rule:** ask independent questions in ONE `ask_user_question`
> call (repeat question blocks, as below) — the user answers them together
> instead of being pinged one by one. Ask dependent questions (Q2 needs
> Q1's answer) one at a time. Exception: Appetite (Pattern 7) and Review
> Mode (Pattern 8) stay separate calls — that split is deliberate decision
> sequencing, not data dependency.

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
          description: "Explore appetite-scaled interface directions with ASCII wireframes, breadboarding and trade-offs. → Automatically activates Product Critique + Review Gate."
        },
        {
          label: "Tech Planning Sequencing",
          description: "Break into scopes with DoD + acceptance criteria. If standalone (no Shape Up/Interface): includes own Review Gate. If post-approval: no gate."
        }
      ]
    },
    {
      question: "Before starting, would you like to run tests to check for regressions?",
      header: "Tests",
      options: [
        {
          label: "Yes — run tests (Recommended)",
          description: "Runs test suite to check for regressions before planning changes. ~2-5 min."
        },
        {
          label: "No — proceed directly",
          description: "Faster start, no automatic validation."
        }
      ]
    }
  ]
})
```

**If user chooses "Yes" for tests:** Run `npm test` if repo has `package.json`, or appropriate test command.

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
## Pattern 7: Run Knobs Declaration

Used by `setup:15` when the human declares quality, supervisor, and exploration breadth.

> **Trigger:** Before stage selection, after inbox/lessons/session knowledge injection.
> **⚠️ This is a SEPARATE question from Pattern 8 (Review Mode).** Never combine them into one `ask_user_question` call.

```typescript
ask_user_question({
  questions: [
    {
      question: `Which rigor for verification?
Production checks everything the same way every time. Experimental runs lighter, and only for probes that will not ship as-is.`,
      header: "Quality",
      options: [
        {
          label: "Production (Recommended)",
          description: "Full paths, edge cases, parallel reviewers, full test layers including security where applicable, full critique depth."
        },
        {
          label: "Experimental",
          description: "Reduced paths and checks for probes and idea evolution. Never ship as-is without upgrading to Production."
        }
      ]
    },
    {
      question: `How closely should the supervisor watch execution?`,
      header: "Supervisor",
      options: [
        {
          label: "High (Recommended)",
          description: "Tight checkpoints, frequent progress checks during execution."
        },
        {
          label: "Medium",
          description: "Standard checkpoints during execution."
        },
        {
          label: "Low",
          description: "Minimal checkpoints. Only for trivial, easily reversible work."
        }
      ]
    },
    {
      question: `How many directions should divergence compare?
A hybrid synthesis is produced whenever more than one direction exists.
Review Mode will be asked separately in the next step.`,
      header: "Explore",
      options: [
        {
          label: "2 + hybrid",
          description: "Two most-differentiated directions plus a hybrid synthesis."
        },
        {
          label: "3 + hybrid (Recommended)",
          description: "Three directions plus a hybrid synthesis."
        },
        {
          label: "4 + hybrid",
          description: "Four directions plus a hybrid synthesis."
        },
        {
          label: "5 + hybrid",
          description: "Five directions plus a hybrid synthesis. Heaviest preparation."
        },
        {
          label: "1 single",
          description: "One direct direction, no hybrid. Trivial changes only, by explicit choice."
        }
      ]
    }
  ]
})
```

**How the knobs shape the output:**

| Knob | What it changes | What it never changes |
|------|----------------|----------------------|
| Quality | Paths, edge cases, reviewer parallelism, test layers, critique depth | Whether verification runs — it always runs |
| Supervisor | Checkpoint cadence during execution | Whether supervision exists |
| Exploration | Direction count (interaction + architecture), hybrid synthesis | Decision ownership — a pick is always recorded |

**Cut policy:** breadth 1 keeps only the direct path. Breadth 2–3 keeps the main JTBD and obvious edge cases, cutting low-value variants. Breadth 4–5 cuts nothing unless impossible. Quality gates are not cut: build/test/lint/typecheck run at every setting, and a11y checks run whenever UI files exist. Production verifies every scope the same way regardless of breadth.

**Storage:** Save to `stelow.json` as `workflows[].config.quality`, `workflows[].config.supervisor`, `workflows[].config.exploration` (single source of truth), and inject into `spec-product.md` frontmatter as `quality:`, `supervisor:`, `exploration_count:`, `exploration_hybrid:`. Review Mode follows the same pattern (`workflows[].config.review_mode` + `review_mode:` in frontmatter). All are canonical subagent inputs — see `../references/cli-tools/subagents.md` (Input Files table). A legacy `appetite:` line is accepted and mapped once (Lean → production/high/2, Core → production/high/3, Complete → production/high/5), then rewritten to knobs.

> **Key rule:** Knobs are FIXED for the cycle. The LLM cannot widen them. If scope doesn't fit, the LLM splits — the human decides whether to accept the split or start a NEW cycle with different knobs.

### Guardrails for LLMs generating knob questions

When presenting knob options to the user:

1. **NEVER reference time or calendar duration** (days, weeks, months, sprints, etc.) in the question text, option labels, or descriptions. Knobs define **consideration breadth and verification rigor only**.
2. **NEVER say "Lean = 1 week" or similar time-based framing, and NEVER map the old appetite labels to time.** The original Shape Up used appetite as a calendar window (6 weeks); stelow caps breadth and rigor, not calendar duration. Wall-clock time is not predictable under LLM execution.
3. If the user asks "how long will this take?", respond: "Knobs control breadth and rigor, not duration. Execution time depends on scope complexity, not the knob labels."
4. If the user asks for the old Lean/Core/Complete labels, map them once through the legacy table above and continue with knobs.

---

## Pattern 8: Review Mode

Used by `setup:16` after appetite is declared. Defines which gates and approvals are active.

> **Trigger:** After appetite selection, before stage selection.
> **⚠️ This is a SEPARATE question from Pattern 7 (Appetite).** Always call it as its own `ask_user_question` call. Never combine it with the appetite question.

```typescript
ask_user_question({
  questions: [{
    question: `How much human review during the workflow?
Review Mode sets which gates, questions, and approvals are active.
It also controls gap resolution — who resolves gaps the Plan Critique finds.
Review Mode is orthogonal to appetite: appetite defines depth, review mode defines human oversight.`,
    header: "Review",
    options: [
      {
        label: "Auto",
        description: "No gates, no questions, no visual review. AI resolves all gaps without asking."
      },
      {
        label: "Product Spec Gate",
        description: "One visual review gate on the shaped product spec. AI resolves all gaps without asking. No IN/OUT confirmation."
      },
      {
        label: "Product Spec + Interface Gates",
        description: "Product spec gate + interface gate. User picks the UI direction. AI resolves trivial gaps, asks about moderate/critical."
      },
      {
        label: "Product Spec + Interface + Scopes",
        description: "All product gates including scope IN/OUT confirmation. AI resolves trivial gaps, asks about moderate/critical."
      },
      {
        label: "Product Spec + Interface + Tech Review",
        description: "All product gates + tech plan gate (visual review on spec-tech.md) + technical Q&A. Full pipeline oversight."
      },
      {
        label: "Product Spec + Interface + Tech Review + Code Diff",
        description: "All gates including code diff review via visual review. Maximum human oversight end-to-end."
      }
    ]
  }]
})

```

**Review Mode effect matrix:**

| Review Mode | visual review Gates | User Questions | Interface | IN/OUT Confirmation | Tech Plan Gate | Code Diff Gate | Gap Resolution |
|---|---|---|---|---|---|---|---|---|
| Auto | None | None | LLM decides | LLM decides | Skip | Skip | AI resolves all |
| Product Spec Gate | 1 (pre-tech) | None | LLM decides | LLM decides | Skip | Skip | AI resolves all |
| Product Spec + Interface Gates | 1 (pre-tech) + Int-Gate | Interface selection | User chooses | LLM decides | Skip | Skip | AI trivial. User moderate/critical |
| Product Spec + Interface + Scopes | 1 (pre-tech) + Int-Gate | Interface + scope | User chooses | User confirms | Skip | Skip | AI trivial. User moderate/critical |
| Product Spec + Interface + Tech Review | 1 (pre-tech) + Int-Gate + Plan-Gate | All including technical | User chooses | User confirms | Gate | Skip | AI trivial. User moderate/critical |
| Product Spec + Interface + Tech Review + Code Diff | 1 (pre-tech) + Int-Gate + Plan-Gate + Diff-Gate | All including technical | User chooses | User confirms | Gate | Gate | AI trivial. User moderate/critical |

**Gap Resolution semantics for Plan Critique:**

When the Plan Critique finds gaps via the 7 checklists, each gap is classified as 🚨 Critical, 🤔 Important, or 🔎 Minor. The review mode determines what happens:

- **Auto / Product Spec Gate:** All gaps regardless of severity are auto-resolved. The LLM fills reasonable defaults per `auto-resolve-rules.md`. No questions to the user.
- **Product Spec + Interface Gates:** Trivial (🔎) gaps are auto-resolved. Moderate (🤔) and Critical (🚨) gaps are presented to the user in a single batched question. Each option shows the AI's recommended resolution marked as "Recommended." User can accept or override per gap.
- **Product Spec + Interface + Scopes / Product Spec + Interface + Tech Review / Product Spec + Interface + Tech Review + Code Diff:** Trivial (🔎) gaps are auto-resolved. Moderate (🤔) are batched into one question. Critical (🚨) gaps are presented individually. The AI's recommended resolution is always the first option marked "(Recommended)."

**Storage:** Save to `stelow.json` as `workflows[].config.review_mode` (single source of truth).

> **Note:** Review Mode does NOT affect supervisor, parallelization, or which skills run. Those follow the run knobs (supervisor, quality, exploration). All stages run for all modes — only gates and questions change with Review Mode.

/// END PATTERN 8

## Usage Rules

1. **Read this file** before any `ask_user_question` call
2. **Use the appropriate pattern** for the context
3. **Adapt labels/summaries** to the specific situation
4. **Verify every factual premise by reading before asking.** Never assert
   what a file contains, which line does what, or what an ID refers to
   from memory: read the file, the scope map, or the receipt first, then
   ask. A question asked on a wrong premise (a "CI edit" that is actually a
   product-surface removal) costs the human a correction round the read
   would have prevented — and the correction must name what was wrong,
   what changed, and what the new evidence is.
5. **Never address the human by internal IDs** — scope IDs, stage slugs,
   file handles, `[Stelow boundary …]` markers. Use titles and outcomes in
   question text, labels, descriptions, and previews; IDs live in artifacts
   and receipts.
4. **Use preview** when visual comparison adds value
5. **Use artifact** when the human must review full details before picking
   (interface proposals, plan documents, generated reports): pass the
   workspace-relative path of the already-written file. `preview` is the
   inline glance (≤20 rows side-by-side, ≤15 stacked); `artifact` is the
   openable source of truth — they compose, never compete. A missing file
   degrades to the preview and never blocks the question.
6. **Batch independent questions** in one call (repeat question blocks);
   sequence dependent ones. Appetite (Pattern 7) and Review Mode
   (Pattern 8) always stay separate — deliberate sequencing, not dependency

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
  preview?: string;    // inline markdown/ASCII for visual comparison (≤20 rows side-by-side, ≤15 stacked)
  artifact?: {         // openable reference for full details (workspace-relative path, already written)
    path: string;      // e.g. ".stelow/2026-09-09/abc123/interfaces/proposal-a.md"
    display: string;   // short name shown on the open affordance
  };
  selected?: boolean;  // preselected (opt-out confirms only, requires multiSelect)
}

interface Question {
  question: string;    // full question, ends with "?"
  header: string;      // max 20 chars, chip/tag label
  options: Option[];   // 2-6 options
  multiSelect?: boolean; // allow multiple selections
}
```