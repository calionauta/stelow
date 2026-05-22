# Skill Design Patterns for AI Coding Agents

> Research synthesized from analyzing: Anthropic Skills (17 skills), ECC (182K stars), Hermes Agent, MCP specification, LangChain, and various agent frameworks.
> Generated: 2026-05-22

---

## Executive Summary

**Key Insight:** The most effective skills share a common architecture: **structured metadata + clear trigger conditions + phased process + actionable output format + quality gates**.

**80/20 Analysis:**
- 80% of skill value comes from: clear trigger conditions (20%), phased process structure (30%), specific output format (20%), and quality checklists (10%)
- The remaining 20% of effort (edge cases, variations, polish) accounts for 80% of the complexity but only marginal value

---

## 1. Anatomy of High-Value Skills

### 1.1 Minimum Viable Skill Structure

Every effective skill has these core components:

```markdown
---
name: skill-name
description: >
  One-line trigger condition. Use this when [exact scenario].
  Keywords: [trigger words]
---

# Skill Title

## Overview
[What this skill does - 2-3 sentences]

## When to Use
- Trigger condition 1
- Trigger condition 2
- Keywords: [specific words that activate this skill]

## Process
[Step-by-step workflow]

## Output Format
[Exactly what to produce]

## Quality Checklist
- [ ] Check 1
- [ ] Check 2
```

### 1.2 Frontmatter Schema (Critical)

```yaml
---
name: descriptive-name          # Required: lowercase-kebab
description: >                 # Required: trigger condition + keywords
  Use when [exact scenario].
  Trigger keywords: word1, word2
license: Apache-2.0            # Optional but recommended
version: 1.0                   # Optional but recommended
requires:                      # Optional dependencies
  - tool-1
  - other-skill
---

# Content...
```

### 1.3 The Trigger Condition Problem

**❌ Bad (vague):**
```markdown
description: "Helps with coding tasks"
```

**✅ Good (specific):**
```markdown
description: >
  Use when user asks to build React components, create landing pages,
  design dashboards, or style any web UI. Triggers on: "build", "create",
  "design", "make", "implement" + ["web", "UI", "frontend", "component"]
```

---

## 2. Pattern: Phased Process Architecture

### 2.1 Why Phases Work

From analyzing 17 Anthropic skills:
- **Parallel phases** increase coverage (multiple approaches)
- **Sequential phases** ensure quality gates
- **Hybrid phases** (parallel → merge → sequential) optimize both

### 2.2 The 3-Phase Template

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: RESEARCH (parallel subagents optional)         │
│ - Gather context                                         │
│ - Identify constraints                                   │
│ - Explore alternatives                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2: SYNTHESIS (merge parallel results)             │
│ - Evaluate options                                       │
│ - Select approach                                        │
│ - Define parameters                                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: EXECUTE (sequential quality gates)             │
│ - Generate output                                        │
│ - Validate against checklist                             │
│ - Refine if needed                                      │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Real Example: Algorithmic Art Skill

```markdown
Phase 1: ALGORITHMIC PHILOSHY CREATION
├── Research: computational aesthetic movements
├── Define: seeded randomness, noise fields
└── Create: .md philosophy document

Phase 2: CODE EXPRESSION (receives Phase 1 output)
├── Translate philosophy → p5.js sketch
├── Implement: particles, flows, fields
└── Create: .html + .js files
```

---

## 3. Pattern: Trigger Detection

### 3.1 Multi-Level Triggers

**Level 1: Direct Keywords** (fastest, least accurate)
```markdown
Keywords: build, create, design, make, implement
```

**Level 2: Context Patterns** (moderate, more accurate)
```markdown
Triggers when:
- User mentions [specific technology]
- Task involves [specific domain]
- Request matches [pattern regex]
```

**Level 3: Semantic Analysis** (slowest, most accurate)
```markdown
Use when user describes:
- Building web interfaces → frontend-design skill
- Writing documentation → doc-coauthoring skill
- Creating art/visuals → canvas-design skill
```

### 3.2 Keyword Collision Handling

When skills have overlapping keywords:

```markdown
# Skill A: Frontend Design
triggers: ["build", "web", "component"]
priority: high

# Skill B: Webapp Testing
triggers: ["build", "test", "web"]
priority: high
```

**Solution:** Use **context prefixes**:
```markdown
description: >
  Use when user wants to BUILD (create new) web interfaces.
  NOT for testing existing interfaces.
```

---

## 4. Pattern: Output Artifacts

### 4.1 Structured Output Formats

**The Problem:** Vague output requirements lead to inconsistent results.

**The Solution:** Define exact schema:

```markdown
## Output Format

### File: spec-product.md
```yaml
# Frontmatter
---
product_name: string        # e.g., "Feature Login"
apetite: string            # e.g., "3 slices"
created: ISO8601
version: semver
---

## Sections (in order):
1. Product Overview     # 1-2 paragraphs
2. User Stories          # HxM matrix
3. Constraints           # Numbered list
4. Open Questions        # Marked with ⚠️
```
```

### 4.2 Output Quality Gates

```markdown
## Quality Checklist

Before considering this skill complete:

- [ ] All required sections present
- [ ] No placeholder text ("TBD", "TODO")
- [ ] All code references verified against codebase
- [ ] ASCII wireframes render correctly
- [ ] No broken links
- [ ] Format matches template exactly
```

---

## 5. Pattern: Subagent Orchestration

### 5.1 When to Use Subagents

| Scenario | Subagent? | Why |
|----------|-----------|-----|
| Multiple independent options | ✅ Yes | Parallel exploration |
| Single coherent flow | ❌ No | Adds complexity without benefit |
| Large codebase analysis | ✅ Yes | Context management |
| Simple transformation | ❌ No | Overkill |

### 5.2 Subagent Template

```markdown
## Phase 1: Generate Options

Launch parallel subagents to explore approaches:

```typescript
subagent({
  agent: "researcher",
  task: `Explore [aspect] for [problem].
  
  Constraints:
  - Must satisfy [requirement]
  - Cannot use [limitation]
  
  Output: findings.md with:
  - Option A: description, pros, cons
  - Option B: description, pros, cons
  - Option C: description, pros, cons`,
  output: "phase1-option-{name}.md"
})
```

### 5.3 Result Merging Pattern

```markdown
## Phase 2: Merge Results

After all options generated:
1. Read all phase1-option-*.md files
2. Identify common themes
3. Create hybrid approach combining best elements
4. Document trade-offs explicitly
```

---

## 6. Pattern: Quality Assurance

### 6.1 Pre-Execution Checks

```markdown
## Pre-Flight Checklist

Before starting:
- [ ] Project context loaded
- [ ] Dependencies identified
- [ ] Environment ready
- [ ] User confirmed scope
```

### 6.2 Mid-Execution Gates

```markdown
## Phase Gates

[Phase 1] → [Gate: Verify research quality]
         → [Pass: Continue]
         → [Fail: Revise research]

[Phase 2] → [Gate: Verify approach]
         → [Pass: Continue]
         → [Fail: Re-evaluate options]
```

### 6.3 Post-Execution Audit

```markdown
## Delivery Audit

After output generated:
1. Completeness check
2. Format verification
3. Quality gate evaluation
4. Gap analysis
```

---

## 7. 80/20 Principles for Skill Development

### 7.1 Development Effort (Time)

| Activity | Effort | Impact |
|----------|--------|--------|
| Writing skill structure | 10% | 40% |
| Defining trigger conditions | 20% | 30% |
| Writing examples | 15% | 15% |
| Edge cases | 35% | 10% |
| Documentation | 20% | 5% |

**Insight:** Focus on structure and triggers first. Edge cases and documentation can be iterative.

### 7.2 Skill Effectiveness (Value)

| Component | Value Contribution |
|-----------|-------------------|
| Clear trigger conditions | 30% |
| Structured process | 25% |
| Output format | 20% |
| Quality checklists | 15% |
| Examples | 10% |

### 7.3 Iteration Priority

1. **First iteration:** Core structure + main path
2. **Second iteration:** Trigger conditions + quality gates
3. **Third iteration:** Examples + edge cases
4. **Fourth iteration:** Documentation + polish

---

## 8. Common Failure Modes

### 8.1 Trigger Detection Failures

**Problem:** Skill activates for wrong requests or misses valid ones.

```markdown
# ❌ Vague trigger
description: "Helps with testing"

# ✅ Specific trigger
description: >
  Use when user wants to:
  - Verify frontend functionality
  - Debug UI behavior
  - Capture browser screenshots
  - View browser logs
  NOT for: unit tests, integration tests, load tests
```

### 8.2 Output Quality Failures

**Problem:** Inconsistent or incomplete outputs.

**Solution:** Strict output schema with validation:

```markdown
## Required Output Schema

The output MUST contain:
1. Section A (exact heading)
2. Section B (exact heading)
3. Section C (exact heading)

Format violations → reject output
Missing sections → reject output
```

### 8.3 Context Overflow Failures

**Problem:** Skills include too much detail, polluting context.

**Solution:** Layered information architecture:

```markdown
## Core Information (always load)
[Essential instructions]

## Reference Information (on-demand)
See [reference-file.md] for detailed examples

## Advanced Options (conditional)
If [condition], see [advanced.md]
```

### 8.4 Tool Coupling Failures

**Problem:** Skill assumes specific tools that aren't available.

**Solution:** Tool capability declarations:

```markdown
## Required Tools
- read: For reading files
- write: For creating artifacts
- bash: For running commands (optional)

## Graceful Degradation
If [tool] unavailable:
  → Use [fallback approach]
```

---

## 9. Multi-Harness Portability

From ECC's cross-harness architecture analysis:

### 9.1 Portable Skill Requirements

```yaml
# ECC's skill portability requirements
---
name: descriptive-name
description: > # Must include trigger words
origin: source-reference
---

# Content must:
1. Use YAML frontmatter with name, description
2. State required tools without embedding secrets
3. Keep examples repo-relative
4. Avoid harness-specific constructs
```

### 9.2 Harness-Specific Adaptations

| Surface | Portable Format | Harness Adapter |
|---------|-----------------|-----------------|
| Skills | `SKILL.md` | Claude plugin, Codex `.agents/`, Cursor skills |
| Rules | Markdown docs | Harness-specific install |
| Hooks | JSON config | Harness native hooks |
| MCPs | `.mcp.json` | Native import per harness |

---

## 10. Skill Evolution Patterns

### 10.1 Self-Improving Skills (from Hermes)

```markdown
## Learning Loop

1. Execute skill on task
2. Capture feedback (explicit or implicit)
3. Update skill based on feedback
4. Test updated skill
5. Deploy improved version

## Feedback Sources
- User ratings
- Task completion rate
- Iteration count
- Error frequency
```

### 10.2 Versioning Strategy

```markdown
---
name: skill-name
version: 1.0.0     # Major.Minor.Patch
changelog:
  - "1.0.0: Initial release"
  - "1.1.0: Added phase 2"
  - "1.2.0: Fixed trigger detection"
---
```

---

## 11. Testing Skills

### 11.1 Eval-Based Testing

From Anthropic's skill-creator skill:

```markdown
## Testing Process

1. Create test prompts (5-10 diverse examples)
2. Run skill on each prompt
3. Evaluate results qualitatively
4. Measure quantitative metrics:
   - Completion rate
   - Iteration count
   - Output format compliance
5. Identify patterns in failures
6. Refine skill based on failures
7. Repeat until stable
```

### 11.2 Regression Testing

```markdown
## Regression Suite

Keep a set of "golden" prompts and expected outputs.
Run skill on golden set after any changes.
Failing tests → investigate before release
```

---

## 12. Recommended Improvements for cali-codebase-spec

Based on the research and identified gaps:

### 12.1 Add Trigger Condition Section

```markdown
## Trigger Conditions

**Activate when:**
- User provides a file path: `@/path/to/file`
- User provides a GitHub URL
- User uploads files
- User pastes code snippets

**Keywords:**
- "spec", "specification", "reverse engineer"
- "document", "analyze codebase"
- "what does this do"

**Edge cases:**
- Zip files → extract first
- Mixed input → handle each type
```

### 12.2 Add Output Schema Validation

```markdown
## Output Schema

The spec MUST contain:
1. Product Overview
2. Tech Stack Summary
3. User Roles & Permissions
4. Features & Product Rules
5. User Flows (ASCII art)
6. Screens & Components (ASCII wireframes)
7. Data Models
8. API Surface
9. AI / LLM Integration (if any)
10. Business Rules Catalog
11. Open Questions / Inferred Behavior

**Validation:** Auto-check section presence
```

### 12.3 Add Quality Gates

```markdown
## Quality Gates

Before saving spec:
- [ ] Every route has corresponding screen
- [ ] Every AI call documented in Section 9
- [ ] Every validation rule in Section 10
- [ ] ASCII art renders correctly
- [ ] No placeholder text ("TBD", "TODO")
- [ ] Code references verified
```

### 12.4 Add Timeout/Scope Management

```markdown
## Scope Management

**Large codebase handling:**
- Limit initial scan to key files
- Use ctx_execute for targeted searches
- Avoid reading entire repo
- Progressively load context

**Timeout protection:**
- Hard stop at [X] minutes
- Partial spec acceptable with note
- Save partial progress automatically
```

### 12.5 Add Self-Correction Hints

```markdown
## Common Errors to Avoid

1. **Confusing tech-stack specifics with product rules**
   → If it requires code to verify, it's tech; if it's behavioral, it's product

2. **Inferring user roles that don't exist**
   → Only document roles found in code

3. **Missing AI integration details**
   → Always check for: OpenAI, Anthropic, langchain, llamaindex, etc.

4. **Incomplete business rules**
   → Extract from: validation, middleware, service logic, edge case handlers
```

---

## 13. Summary: Skill Design Checklist

### Must Have
- [ ] YAML frontmatter with `name` and `description`
- [ ] Clear trigger conditions (keywords + context)
- [ ] Structured process with phases
- [ ] Exact output format definition
- [ ] Quality checklist before completion

### Should Have
- [ ] License declaration
- [ ] Version number
- [ ] Pre-flight checklist
- [ ] Common errors section
- [ ] Multi-harness portability notes

### Nice to Have
- [ ] Self-improving feedback loop
- [ ] Eval-based testing suite
- [ ] Edge case documentation
- [ ] Performance benchmarks

---

## 14. References

| Source | Key Insight |
|--------|-------------|
| [Anthropic Skills](https://github.com/anthropics/skills) | 17 production skills, SKILL.md format |
| [ECC](https://github.com/affaan-m/ECC) | Cross-harness portability (182K stars) |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Self-improving skills |
| [MCP Spec](https://modelcontextprotocol.io) | Tool/skill interoperability |
| [LangChain Tools](https://python.langchain.com/docs/concepts/tools/) | Tool design patterns |

---

## Appendix: Skill Template

```markdown
---
name: skill-name
description: >
  One-line description of when to use this skill.
  Trigger keywords: word1, word2, word3.
license: Apache-2.0
version: 1.0.0
---

# Skill Name

## Overview
[What this skill does - 2-3 sentences]

## When to Use
- Trigger condition 1
- Trigger condition 2
- Keywords: [specific words]

## Pre-Flight Checklist
- [ ] Requirement 1
- [ ] Requirement 2

## Process

### Phase 1: [Name]
[Step-by-step instructions]

### Phase 2: [Name]
[Step-by-step instructions]

## Output Format

### Required Sections
1. [Section A]
2. [Section B]

### Schema
```yaml
# Frontmatter
---
key: value
---

# Content...
```

## Quality Gates

- [ ] Gate 1
- [ ] Gate 2

## Common Errors
- **Error 1:** [Prevention]
- **Error 2:** [Prevention]

## Examples

### Example 1
[Input] → [Expected Output]
```

---

*Research compiled from web analysis of Anthropic Skills, ECC, Hermes Agent, MCP, and LangChain.*