# Refinement Plan: setup.md, ask-patterns.md, and /pw-next bug

> Status: For review
> Author: Cali
> Created: 2026-06-03
> Updated: 2026-06-03 (added detailed root cause analysis of /pw-next phase miscount)

---

## Bug Root Cause: currentPhase starts at 0, but Setup is index 2

### The chain of errors

> *You saw: `/pw-next` → `ItemSelect (2/15)`, then `/pw-next` → `Setup (3/15)`. Expected: directly to Shape.*

**`start.ts:121`** cria o workflow com `currentPhase: 0`:
```typescript
currentPhase: 0,
phases: PHASE_NAMES.map((name, i) => ({
  status: i === 0 ? "in-progress" : "pending"  // Triage = in-progress
}))
```

**`start.ts:150`** salva no `index.json`:
```typescript
current_phase: "setup", current_phase_index: 0
//              ↑ nome certo           ↑ índice ERRADO
```

**`PHASE_NAMES`** em `types.ts:22`:
```typescript
["Triage", "ItemSelect", "Setup", "Context", "Shape", ...]  // 15 fases
//   ^0         ^1           ^2       ^3        ^4
```

**`commands.ts:554`** faz:
```typescript
const next = wf.currentPhase + 1;
```

### Fluxo real

| Ação | `currentPhase` | Display | O que deveria ser |
|------|----------------|---------|-------------------|
| `pw-start` (skill starts at Setup) | 0 | Triage (1/15) | Setup (3/15) |
| LLM says "proceed" → `/pw-next` | 0 + 1 = **1** | **ItemSelect (2/15)** | Shape (4/15) |
| `/pw-next` again | 1 + 1 = **2** | **Setup (3/15)** | Shape (4/15) |

### Por que 2/5 vs 3/15?

O denominador sempre é `PHASE_NAMES.length = 15` via `ui.ts`. O "2/5" pode ter vindo de etapas filtradas no footer ou da skill mostrando sub-estágios. O ponto é que **a numeração do extension diverge da percepção do usuário** porque a skill pula Triage+ItemSelect mas o contador não.

### Correção

Simples: o workflow deve ser inicializado no **índice 2** (Setup), não em 0:

```typescript
// start.ts:121
currentPhase: 2,  // ← muda de 0 para 2 (Setup)

// start.ts:126
status: i < 2 ? "completed" : i === 2 ? "in-progress" : "pending"
// Triage (0) e ItemSelect (1) = skipped. Setup (2) = in-progress.

// start.ts:150
current_phase_index: 2  // ← muda de 0 para 2
```

E em `cmdNext`, após Setup, pular automaticamente Context (3) se não foi solicitado contexto estratégico (guardado no `index.json`), indo direto pra Shape (4).

---

## 1. Remove External Context Pre-Load (setup:0.40)

**Impact analysis:**

| File | Change | Risk |
|------|--------|------|
| `skills/.../stages/setup.md` | Remove section `setup:0.40` entirely (~15 lines) | Low |
| `skills/.../stages/ask-patterns.md` | Pattern 7 trigger comment: remove "after context pre-load" or rephrase | Low |

**Rationale:** The `ask_user_question` TUI only returns the choice (yes/no/tell me). There's no `wait_for_user_input` tool — the LLM proceeds without the files. User can provide context naturally in chat or via `/pw-start @file.md`.

## 2. Keep Moderate mode — clarify its position between Light and Product

**No change needed.** Moderate = Light + user chooses interface. Product = Product + IN/OUT confirmation.

## 3. Remove Capabilities Question (auth/database/payment)

**Impact analysis:**

| File | Change | Risk |
|------|--------|------|
| `skills/.../stages/setup.md` | Remove Step 1 capabilities `ask_user_question` block (~12 lines) | Low |
| `skills/.../stages/setup.md` | Remove `{auth_bool}`, `{database_bool}`, `{payment_bool}` from Step 3 sed injection | Low |
| `skills/.../stages/ask-patterns.md` (Pattern 7) | Remove the "Checkboxes" `ask_user_question` block (~18 lines) | Low |
| `references/capabilities.md` | Keep — LLM can reference if needed, not tied to question | None |

**Rationale:** Nenhum stage downstream lê `config.auth`, `config.database`, `config.payment`.
É informação morta. LLM infere capacidades naturalmente do contexto do produto.

## 4. Stage Selection + Safe-change fixes

### 4a. Mode Light should auto-define stages, not ask

**Problem:** In Light mode → user chose minimal interaction → then got asked "Which stages?" (product decision = interaction).

**Fix:** Auto/Auto-Light skip Pattern 5 stage selection entirely. Derive from mode + appetite:

| Mode | Stage selection behavior |
|------|------------------------|
| Auto | Skip — Shape Up + Execution (auto-determined) |
| Light | Skip — Shape Up + Interface(LLM) + Gate + Planning + Execution |
| Moderate | Ask (default: Shape Up + Interface) |
| Product | Ask (default: Shape Up + Interface + Tech Planning) |
| Product + Tech | Ask (default: all stages) |

### 4b. Safe-change: auto-decide by mode, not ask

**Problem:** Non-tech users don't understand "safe-change". Even in Product mode, the concept is tech-jargon.

**Fix:** Safe-change should be **auto-decided** by mode, not asked:

| Mode | Safe-change behavior |
|------|---------------------|
| Auto | Skip — no check |
| Light | Auto-run `npm test` if repo has tests, skip otherwise |
| Moderate | Auto-run `npm test` if repo has tests, skip otherwise |
| Product | Ask user but default = skip (user can opt in) |
| Product + Tech | Auto-run `npm test` + safe-change (if available) |

### 4c. Fix `/pw-next` phase counter (ROOT CAUSE)

**The fix is in 3 places:**

1. **`start.ts:121`**: `currentPhase: 0` → `currentPhase: 2`
2. **`start.ts:126`**: `i === 0 ? "in-progress"` → `i < 2 ? "completed" : i === 2 ? "in-progress"`
3. **`start.ts:150`**: `current_phase_index: 0` → `current_phase_index: 2`

**Plus phase-skipping in `cmdNext`** (`commands.ts:554`): after Setup (index 2), skip Context (3) if no strategic context was requested. Go directly to Shape (4).

### 4d. Safe-change description clarity

**Problem:** "safe-change from pi-agent-codebase-workflows (PriNova)" is confusing tech-jargon.

**Fix:** "Run test suite to check for regressions before planning changes."

## 5. Path resolution: LLM can't find files

**Observed:** LLM tried to read `references/stages.yml` (wrong extension) and `references/workflow.md` (doesn't exist).

**Fix:** In `SKILL.md` line 285+, clarify the exact relative path to `stages.yaml`. Add a `references/README.md` listing actual files.

## Summary

| # | Change | Files affected | Priority |
|---|--------|----------------|----------|
| 4c | Fix `currentPhase` start at 2 (Setup) | `start.ts:121,126,150` | **Critical** |
| 4c | Phase-skip in cmdNext (Context → skip to Shape) | `commands.ts:554` | **Critical** |
| 4a | Auto/Light skip stage selection | `setup.md` (setup:20), `ask-patterns.md` (Pattern 5) | High |
| 4b | Safe-change auto-decide by mode | `setup.md`, `ask-patterns.md` (Pattern 5) | High |
| 1 | Remove External Context Pre-Load | `setup.md` | High |
| 3 | Remove Capabilities question | `setup.md`, `ask-patterns.md` | High |
| 5 | Path resolution fix | `SKILL.md`, `references/README.md` | Medium |
| 4d | Safe-change description | `ask-patterns.md` (Pattern 5) | Low |
