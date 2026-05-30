# Plano de Implementação: Transparência + Delivery Audit Unificado

**Data:** 2026-05-30
**Propósito:** Implementar mitigações para limitações conhecidas de IA + criar skill de delivery audit standalone robusta.

## ⚠️ REGRA DE IDIOMA

> **This plan document is in Portuguese for discussion. ALL implementation artifacts**
> **(code, SKILL.md instructions, stage files, CLI commands, comments, README) will be
> in ENGLISH.** Every instruction inside ` ``` ` blocks and every file created/modified
> will use English exclusively. Portuguese only in this document and in user-facing
> UI text (per project convention: UI/UX text is exempt).

## ⚠️ REGRA DE PRECISÃO CIRÚRGICA

> **Every existing line in every file must be preserved untouched.** Only add new
> content at the specified insertion points. Never remove, rephrase, or restructure
> existing content. Each edit targets a specific location (before/after an anchor) and
> inserts only the new planned content.

---

## 📋 Escopo Geral

| # | Tarefa | Arquivos | Prioridade |
|---|--------|----------|------------|
| 1 | Criar `cali-product-delivery-audit` skill standalone unificada | `skills/cali-product-delivery-audit/SKILL.md` | 🔴 Alta |
| 2 | Thin wrapper `delivery-audit.md` → chama a skill | `skills/cali-product-workflow/stages/delivery-audit.md` | 🔴 Alta |
| 3 | Atualizar Stage 14 no orchestrator | `skills/cali-product-workflow/SKILL.md` | 🔴 Alta |
| 4 | Instruções anti-context-rot no orchestrator | `skills/cali-product-workflow/SKILL.md` | 🟡 Média |
| 5 | Instrução fresh context no execution | `skills/cali-product-workflow/stages/execution.md` | 🟡 Média |
| 6 | Instrução anti-80% no verification | `skills/cali-product-workflow/stages/verification.md` | 🟡 Média |
| 7 | NFR checklist no tech planning | `skills/cali-product-tech-planning/references/scopes-and-sequencing.md` | 🟡 Média |
| 8 | Model provenance tracking | `skills/cali-product-shape-up/SKILL.md` + `stages/gate.md` | 🟢 Baixa |
| 9 | Plannotator description corrigida | `references/cli-tools/plannotator.md` (opcional) | 🟢 Baixa |
| 10 | README: seção de transparência radical | `README.md` | 🔴 Alta |
| 11 | Deprecar `cali-post-execution-check` | `~/.agents/skills/cali-post-execution-check/SKILL.md` | 🟡 Média |
| 12 | Instalar nova skill no setup.sh | `setup.sh` + `install.sh` | 🟡 Média |
| 13 | Commit + push + release | — | 🔴 Alta |

> **⚠️ All code, SKILL.md content, CLI commands, and stage instructions below will be
> implemented in ENGLISH.** The Portuguese descriptions here are for planning only.

---

## 🔴 Tarefa 1: Skill Delivery Audit Unificada

### File: `skills/cali-product-delivery-audit/SKILL.md`

**Concept:** A single skill with ALL evaluation criteria. The input determines the source of truth, not which criteria run.

### Skill structure:

```
┌─────────────────────────────────────────────┐
│ 🔍 Input Detection                          │
│                                              │
│ Path received:                               │
│   ├── spec-tech*.md?                         │
│   │   └→ Source of truth = plan scopes       │
│   │      Compares implementation vs plan     │
│   ├── spec-product*.md?                      │
│   │   └→ Source of truth = product spec     │
│   │      Checks implementation meets spec    │
│   ├── directory or URL?                      │
│   │   └→ Source of truth = context          │
│   │      Uses sem diff + git + session       │
│   └── NOTHING (pure standalone)?             │
│       └→ Source of truth = auto-context     │
│          Discovers: git diff, sem diff,      │
│          files touched in session            │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ 📋 FIXED CRITERIA (always runs all)         │
│                                              │
│ 1. Scope/Plan Completeness                   │
│    • If spec-tech: does each scope exist?    │
│    • If not: infer from what changed         │
│                                              │
│ 2. Implementation Quality                    │
│    • Syntax errors? Missing imports?         │
│    • Broken references?                      │
│    • Anti-patterns? (secrets, god funcs)     │
│                                              │
│ 3. Invisible 20% Check                       │
│    • Error handling (retry, backoff, fallback)│
│    • Observability (logging, tracing)        │
│    • Security (auth, sanitization, rate-limit)│
│    • Input validation (null, empty, bounds)  │
│                                              │
│ 4. Edge Cases                                │
│    • Null/empty inputs                       │
│    • Network/file failure                    │
│    • Permission denied                       │
│    • Concurrency (race, deadlock)            │
│    • Boundary conditions                     │
│                                              │
│ 5. Doc & Test Update Check                   │
│    • README, AGENTS.md, CHANGELOG?           │
│    • Unit/integration tests for new code?    │
│    • Test quality (mutation score ideal)     │
│                                              │
│ 6. Gap Registry                              │
│    • Missing features                        │
│    • Partial scope                           │
│    • New scope (scope creep)                 │
│    • Quality issues                          │
│    • Documentation debt                      │
│                                              │
│ 7. Lessons Learned                           │
│    • What went well                          │
│    • What could improve                      │
│    • Issues to watch                         │
│                                              │
│ 8. Decision Matrix                           │
│    • All OK → ✅ Close                       │
│    • Minor gaps → 📝 Document + close        │
│    • Major gaps → ⚠️ Create follow-up        │
│    • Critical → 🚨 Human review required     │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ 📤 Output                                    │
│ delivery-audit.md (same format always)       │
└─────────────────────────────────────────────┘
```

### Source of truth by mode:

| Input | How criteria are evaluated |
|-------|---------------------------|
| `spec-tech*.md` | Reads plan scopes. For each scope: verify implemented, tested, documented. Uses `sem diff` to check touched entities. |
| `spec-product*.md` | Reads IN scope + DoD. Verifies implementation against acceptance criteria. |
| Directory/URL | Uses `sem diff` (changed entities), `git diff`, structural analysis, session files. Evaluates EVERYTHING it can detect. |
| Nothing (standalone) | Auto-detect: `sem diff HEAD~1`, `git diff`, session file list. If nothing found, ask: "What changed?" |

### `sem diff` integration:

```
sem diff HEAD~1  → entities modified in last commit
sem diff         → working tree changes (if any)
sem entities     → list project entities (understand structure)
sem stats        → diff statistics (LOC, entities)
```

Each modified entity becomes an "inferred scope" in the gap registry.

### Output (always):

```markdown
# Delivery Audit Report

**Date:** 2026-05-30
**Mode:** [workflow | standalone]
**Source of truth:** [spec-tech_v3.md | sem diff + session context]
**Model used for audit:** {model_name}

## Summary

| Metric | Value |
|--------|-------|
| Items evaluated | N |
| Items complete | N |
| Items partial | N |
| Gaps identified | N |

## Evaluation

### 1. Scope/Plan Completeness
| Scope | Status | Notes |
|-------|--------|-------|

### 2. Implementation Quality
| Issue | Severity | File |
|-------|----------|------|

### 3. Invisible 20%
| Dimension | Status | Notes |
|-----------|--------|-------|
| Error handling | ✅/⚠️/❌ | |
| Observability | ✅/⚠️/❌ | |
| Security | ✅/⚠️/❌ | |
| Input validation | ✅/⚠️/❌ | |

### 4. Edge Cases
| Edge case | Status | Notes |
|-----------|--------|-------|

### 5. Doc & Tests
| Item | Status |
|------|--------|

### 6. Gap Registry
| Gap Type | Description | Impact | Resolution |
|----------|-------------|--------|------------|

### 7. Lessons Learned
- What went well:
- What could improve:

## Decision
[✅ Close | 📝 Document+Close | ⚠️ Follow-up | 🚨 Human Review]
```

---

## 🔴 Task 2: Thin Wrapper delivery-audit.md

### File: `skills/cali-product-workflow/stages/delivery-audit.md`

Replace all content with:

```markdown
## Delivery Audit

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools.

Delegates to standalone skill `cali-product-delivery-audit`:

1. Read `skills/cali-product-delivery-audit/SKILL.md` for full instructions
2. Pass path to the most recent `spec-tech_v{N}.md` as input (find by glob:
   `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v*.md`, pick highest N)
3. The skill runs all 8 criteria against the tech plan

**Standalone usage:** This skill can be invoked outside the workflow
by calling `cali-product-delivery-audit` with any path, URL, or no input.
```

---

## 🔴 Task 3: Update Stage 14 in Orchestrator

### File: `skills/cali-product-workflow/SKILL.md`

In Stage Index, change stage 14 from:
```
| 14 | **Delivery Audit** | Verify scope completion, gap analysis | After Verification |
```
To:
```
| 14 | **Delivery Audit** | Full delivery audit (scope, quality, NFRs, edges, docs) | After Verification |
```

In auto-chaining section, add:
```
**Delivery Audit** runs after Verification. Uses `skills/cali-product-delivery-audit/SKILL.md`
for all 8 evaluation criteria.
```

---

## 🟡 Task 4: Context Rot Mitigation Rules

### File: `skills/cali-product-workflow/SKILL.md`

Add BEFORE the Stage Index:

```markdown
## ⚠️ Context Rot Awareness

LLMs suffer from **context rot**: compliance with their own rules drops from
~73% (turn 5) to ~33% (turn 16) in long sessions (Gamage 2026).

**Rules to mitigate:**

1. **Fresh context between stages.** If this session has >15 turns or the LLM
   seems to be forgetting earlier decisions, start a NEW chat and pass the most
   recent artifact (`spec-product_v{N}.md` or `spec-tech_v{N}.md`) as initial
   context. The workflow continues from artifacts saved on disk.

2. **No patching in degraded context.** If execution failed or produced partial
   results, do NOT ask to "fix the rest" in the same turn. Create a new goal
   with fresh context pointing to the existing spec-tech.md.

3. **Read from disk, not memory.** Each critical stage (Execution, Verification,
   Delivery Audit) must re-read artifacts from disk, not trust conversation memory.

4. **Model provenance tracking.** Record which model generated each artifact in
   the YAML frontmatter. Artifacts from smaller models deserve extra review.
```

---

## 🟡 Task 5: Fresh Context Check in Execution

### File: `skills/cali-product-workflow/stages/execution.md`

Add at the top, BEFORE the "Git Worktree Check" section:

```markdown
### ⚠️ Context Rot Check (before executing)

**Reading spec-tech.md from disk.** The plan was generated in a previous session
or a potentially degraded context. Re-read `spec-tech.md` from the directory
to ensure you're working with the correct version, not conversation memory.

```bash
# Always read from disk
cat .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md
```

If the plan seems inconsistent with what you remember, **trust the file**,
not your memory.
```

---

## 🟡 Task 6: Invisible 20% Check in Verification

### File: `skills/cali-product-workflow/stages/verification.md`

Add AFTER the "Final Checklist" section:

```markdown
### 5.5 Invisible 20% Verification

For each file changed in the diff, check:

| Dimension | Check |
|-----------|-------|
| **Error handling** | Retry/backoff implemented? Fallback defined? |
| **Observability** | Structured logging? Correlation IDs? |
| **Security** | Auth consistent across all endpoints? Input sanitization? Rate limiting? |
| **Validation** | Null/empty/boundary handling? |
| **Rollback** | Rollback strategy documented? Migration has reversal? |

This exists because LLMs tend to implement the happy path (80%) and omit
the "invisible 20%" (Osmani 2026, GitClear 2025).
```

---

## 🟡 Task 7: NFR Checklist in Tech Planning

### File: `skills/cali-product-tech-planning/references/scopes-and-sequencing.md`

Add a section after the scope type definitions:

```markdown
### Non-Functional Requirements per Scope

Each scope in spec-tech.md MUST include an `nfr:` section listing:

```yaml
scopes:
  - name: "add-payment-endpoint"
    type: feature
    nfr:
      error_handling: "retry with exponential backoff (3 attempts)"
      observability: "structured logs with correlation ID"
      security: "auth middleware, rate limiting (100/min), input sanitization"
      rollback: "git revert + migration reversal script"
```

If a scope doesn't specify NFRs, the LLM will likely omit them (80% Problem).
The Verification stage will check each NFR listed here.
```

---

## 🟢 Task 8: Model Provenance Tracking

### File: `skills/cali-product-shape-up/SKILL.md`

In the spec-product.md output format, add to YAML frontmatter:
```yaml
generated_by: "{model_name}"
```

### File: `skills/cali-product-workflow/stages/gate.md`

Add inside the Review Gate section:
```markdown
### Model Provenance Check

Before submitting to Plannotator, show the user:

```
Spec generated by: Claude Opus 4.5
Critique generated by: Claude Opus 4.5
Interfaces generated by: Gemini 2.5 Flash
```

Artifacts from different models deserve proportional attention.
Plannotator's visual review catches flow and affordance issues, but
business logic and security require additional human review.

> 💡 **Plannotator lets you make point-by-point annotations and returns
> all feedback to the LLM** — use it to mark specific issues. But remember:
> the LLM receiving feedback may differ from the one that generated the
> artifact, and it also suffers from context rot.
```

Also update the Plannotator description in gate.md to acknowledge it's
interactive (point-by-point annotations + feedback loop), not just visual.

---

## 🟢 Task 9: Fix Plannotator Description

### File: `skills/cali-product-workflow/references/cli-tools/plannotator.md`

Add to Quick Summary:
```
> **Plannotator --gate** opens plans/code in a visual browser UI with point-by-point
> annotation support. Every annotation is returned as structured feedback to the LLM
> for revision. It is an interactive review gate, not just a passive display.
```

### File: `stages/gate.md`

Update the Review Gate section to recognize Plannotator's full capability:
```markdown
> 💡 Plannotator --gate is interactive: you annotate specific lines/paragraphs,
> the feedback is returned to the LLM for revision, and you approve or request
> changes. This catches flow, affordance, and clarity issues.
> **What it does NOT catch:** business logic correctness, security flaws, or
> edge cases in code — those need human code review.
```

---

## 🔴 Task 10: README — Radical Transparency Section

### File: `README.md`

Add a complete section (see session-knowledge document for full draft).
All section content will be in English.

---

## 🟡 Task 11: Deprecate cali-post-execution-check

### File: `~/.agents/skills/cali-post-execution-check/SKILL.md`

Add at the top:
```yaml
---
deprecated: true
replaced_by: cali-product-delivery-audit
---
```

---

## 🟡 Task 12: Install new skill

### File: `setup.sh`

Add:
```bash
# Delivery Audit skill
install_skill "cali-product-delivery-audit" "skills/cali-product-delivery-audit" "github:renatocaliari/cali-product-workflow"
```

### File: `install.sh`

Same addition.

---

## 📊 Matrix: Limitation → Mitigation → File

| Limitation | Mitigation | File(s) | Task |
|-----------|-----------|------------|--------|
| **Context Rot** | Fresh context check, no patching degraded, read from disk | orchestrator SKILL.md, execution.md | 4, 5 |
| **80% Problem** | NFR per scope, invisible 20% checklist in verification | scopes-and-sequencing.md, verification.md | 6, 7 |
| **Model Dependency** | Provenance tracking + gate disclosure | shape-up SKILL.md, gate.md | 8 |
| **Shallow Review Trap** | Gate scope definition + independent verification | gate.md, verification.md | 8, 6 |
| **Partial Implementation** | No patching in degraded context, gap registry | orchestrator SKILL.md | 4 |
| **Plan Staleness** | Read from disk before execution | execution.md | 5 |
| **No unified audit** | cali-product-delivery-audit skill | new skill + thin wrapper | 1, 2, 3 |
| **Post-exec redundant** | Deprecate + migrate to delivery-audit | post-exec check SKILL.md | 11 |

---

## 📐 Implementation Order

```
Phase 1: Foundation (Tasks 1-3)
  ├── Create skills/cali-product-delivery-audit/SKILL.md
  ├── Thin wrapper delivery-audit.md
  └── Update orchestrator stage 14

Phase 2: Mitigations (Tasks 4-8)
  ├── Context rot rules in orchestrator
  ├── Fresh context check in execution
  ├── Invisible 20% in verification
  ├── NFR checklist in tech planning
  └── Model provenance tracking

Phase 3: Documentation (Tasks 9-11)
  ├── README transparency section
  ├── Deprecate post-execution-check
  └── (Optional) Plannotator doc update

Phase 4: Distribution (Tasks 12-13)
  ├── setup.sh + install.sh update
  ├── Commit
  └── Release
```

---

> ⚠️ **This plan will be opened in Plannotator for visual review with annotations.**
> After approval, we will execute Phase 1 (create the skill) and then the remaining phases.
