---
name: cali-product-critique
description: >
  [Cali] Multi-dimensional product critique using audit checklists and frameworks.
  Accepts 3 input types: spec-product.md (plan), project codebase (code), or live site URL (site).
  Evaluates flows, states, affordances, accessibility, performance, AI slop, personas,
  emotional journey, and cognitive load — then generates a classified gap report.
  Part of cali-product-workflow but can be used standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: medium
---

# Product Critique

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

This skill executes the Product Critique phase. It accepts **3 input types**:

| Input | Detects | Example |
|-------|---------|---------|
| **Plan** | `spec-product.md` or `spec-*.md` file path | `./.cali-product-workflow/2026-05-29/.../spec-product_v2.md` |
| **Codebase** | Directory containing source code | `/Users/me/my-project/` |
| **Site** | URL starting with `http://` or `https://` | `https://example.com/dashboard` |

Each input mode activates a different subset of the critique frameworks.

## How to Load

This skill is **bundled with cali-product-workflow** — there is no standalone `/skill:` command.

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone (Plan)
To run standalone on a plan, read `cali-product-critique/SKILL.md` and follow the instructions inline.

### Standalone (Codebase or Site)
Read this file, then jump to the relevant mode section below.

---

## 🔀 Input Router

Detect the input type before proceeding:

```
Input provided:
  ├── Is a file path ending in spec-*.md?
  │   └→ 📄 Mode: Plan Critique
  ├── Is a URL starting with http:// or https://?
  │   └→ 🌐 Mode: Site Critique
  └── Is a directory or non-spec file path?
      └→ 📁 Mode: Codebase Critique
```

---

## 📄 Mode: Plan Critique

Evaluates a shaped product plan (spec-product.md) against all checklists and frameworks.

### 1. Read reference files

Read the `references/` files to guide the process. Each reference has an `applies_to` tag
indicating which modes it activates for:

| File | Covers | Applies To |
|---|---|---|
| `references/plan-critique-context.md` | Role definition, when to use, workflow position | **Plan only** |
| `references/checklists.md` | Flow, state, affordance, data, system, feasibility checks | **Plan + Codebase** |
| `references/critique-frameworks.md` | Nielsen heuristics, emotional journey, cognitive load, personas, AI slop | **Plan + Site** |
| `references/audit-dimensions.md` | 5 audit dimensions (a11y, perf, theming, responsive, anti-patterns) | **Plan + Codebase + Site** |
| `references/auto-resolve-rules.md` | Rules for automatic gap resolution | **Plan only** |
| `references/output-format.md` | Critique report format | **All modes** |

### 2. Analysis via subagent

```typescript
subagent({
  agent: "reviewer",
  task: `Review using checklists from references/.
Mode: Plan
Input: spec-product.md
Use: plan-critique-context.md (role), checklists.md (primary), critique-frameworks.md (UX), audit-dimensions.md (technical).
Output: Executive Summary + Critical Questions (🚨) + Important (🤔) + Minor (🔎) + Strengths.
Do NOT resolve gaps — only identify and classify.
Format per output-format.md.
Save to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md`,
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md"
})
```

### 3. Gap Resolution

Ask mode: **Auto-resolve** or **Manual**.
- 🔎 is always automatic
- Auto-resolve: save `spec-product_{v}-pre-critique.md`, create `spec-product_{v+1}.md` with "Resolved Gaps" section
- Manual: ask each 🚨 and 🤔 individually

---

## 📁 Mode: Codebase Critique

Evaluates an existing project's source code for quality, architecture, and implementation gaps.

### 1. Read applicable references

| File | Covers | Why for codebase |
|---|---|---|
| `references/checklists.md` | Flow, state, affordance, data, system, feasibility | Code structure reflects real flows, states, data handling |
| `references/audit-dimensions.md` | Accessiblity, performance, theming, responsive, anti-patterns | Code-level assessment of these dimensions |
| `references/output-format.md` | Report format | Same format, adapted for codebase |

### 2. Codebase analysis

Analyze the project at the given path:

**Step 1 — Discover structure:**
```bash
# Quick structural overview
find {INPUT_PATH} -maxdepth 3 -type f | head -100
```

**Step 2 — Run checklists against codebase:**
```typescript
subagent({
  agent: "reviewer",
  task: `Critique this codebase using checklists from references/.
Mode: Codebase
Input path: {INPUT_PATH}

Use:
- checklists.md: Flows (data flow, call chains), States (loading/empty/error/edge handling), Affordances (hover/focus/disabled states), Data (schemas, validation, null handling), System (API contracts, timeouts, retry, fallback), Feasibility (architecture, dependency complexity)
- audit-dimensions.md: Accessibility (ARIA, semantic HTML, keyboard nav), Performance (bundle size, re-renders), Theming (design tokens), Responsive (CSS, touch targets), Anti-Patterns (AI-generated slop in code)

Output: Executive Summary + Critical Gaps (🚨) + Important (🤔) + Minor (🔎) + Strengths

Format per output-format.md.
Save to critique-report.md`,
  output: "{OUTPUT}/codebase-critique-report.md"
})
```

**Step 3 — Gap resolution:** Same as Plan mode, but gaps are resolved in the codebase
directly (fix code issues) or documented as tech debt.

---

## 🌐 Mode: Site Critique

Evaluates a live website or web application for UX, accessibility, performance, and AI slop.

### 1. Read applicable references

| File | Covers | Why for site |
|---|---|---|
| `references/critique-frameworks.md` | Nielsen heuristics, emotional journey, cognitive load, personas | Directly testable on a live site |
| `references/audit-dimensions.md` | Accessibility, performance, theming, responsive, anti-patterns | Auditable via browser + devtools |
| `references/output-format.md` | Report format | Same format, adapted for site |

### 2. Site analysis

**Step 1 — Open and explore:**
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

**Step 2 — Walk through with each persona:**
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
// Repeat key flows: login, primary action, error state, empty state
```

**Step 3 — Run audit against frameworks:**
```typescript
subagent({
  agent: "reviewer",
  task: `Critique this live site using references/.
Mode: Site
URL: {URL}
Browser snapshots available.

Use:
- critique-frameworks.md: Nielsen 10 heuristics (apply each to real UI), Emotional Journey (Peak-End, anxiety points), Cognitive Load (8-item checklist), 5 Personas (walk through each: Alex, Jordan, Sam, Morgan/a11y, Taylor/mobile), AI Slop Detection (check rendered UI against tells)
- audit-dimensions.md: Accessibility (check contrast, ARIA, keyboard nav, alt text from browser), Performance (estimated from experience), Theming (dark mode, consistency), Responsive (check mobile view), Anti-Patterns (verify AI slop tells on rendered page)

Output: Executive Summary + Critical Issues (🚨) + Important (🤔) + Minor (🔎) + Strengths
For each issue, include: what was seen, what framework flagged it, severity.

Format per output-format.md.
Save to site-critique-report.md`,
  output: "{OUTPUT}/site-critique-report.md"
})
```

**Step 4 — Gap resolution:** Recommend fixes per issue found. Critical issues
should be actionable (e.g., "Add ARIA label to search input" rather than "Improve accessibility").

---

## Output

| Mode | Output Path |
|------|-------------|
| **Plan** | `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md` |
| **Codebase** | `{INPUT}/.cali-product-critique/codebase-critique-report.md` |
| **Site** | `.cali-product-critique/site-critique-report.md` (in cwd) |

### File structure for codebase/site modes
```
.cali-product-critique/
  critique-report.md          ← main report
  snapshots/                  ← browser snapshots (site mode only)
```

---

## Related Skills

- **cali-product-shape-up**: Produces the spec-product.md that feeds plan mode
- **cali-product-tech-planning**: Executes after critique approval (plan mode)
- **cali-product-testing-execution**: Post-implementation testing (complements codebase mode)
- **cali-product-workflow**: Coordinates this skill with other phases

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/cli-tools/`
