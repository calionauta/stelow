# Tool: Goal System

> **Strategy:** Every scope becomes a delegation with an acceptance contract.
> The child implements, self-corrects against the contract, and returns a result.
> The parent evaluates the final result.
> **Implementation varies by harness** — see patterns below.

---

## Core Concept: Acceptance Contract

An acceptance contract is a data structure that defines:
- **Criteria** — what must be true for the scope to be done
- **Verify** — commands that prove criteria are met
- **Evidence** — what the child should report back
- **StopRules** — constraints the child must not violate
- **SelfCorrectionBudget** — how many times the child can self-correct

This is harness-agnostic. Every delegation mechanism can express these fields.

| Scope Type | Contract shape |
|------------|---------------|
| `feature` | criteria from ACs + verify from plan + stopRules from type |
| `optimization` | criteria from metric target + verify from benchmark commands |
| `spike` | criteria from research question + evidence from findings |
| `test-*` | criteria from mutation/security gates + verify from test runners |

---

## Delegation Patterns by Harness

### Pattern A: Acceptance-native (child self-corrects)

**When:** Harness supports acceptance contracts on delegation calls.
**Advantage:** Child self-corrects in the SAME context (no context loss between iterations).
**Parent role:** Evaluate final acceptance report.

```
PARENT                          CHILD
──────                          ─────
1. Build contract
2. Delegate with contract ──────→ 3. Implement
                                4. Runtime reopens session
                                5. Child checks criteria, fixes gaps
                                6. Repeat up to budget
                                7. Return acceptance report
8. Evaluate report ←────────────
```

**Example (pi-subagents):**

```typescript
subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}

Acceptance Criteria:
- AC-1: {ac_1}
- AC-2: {ac_2}

Verify: {verifyCommands}
Stop rules: {stopRules}`,
  acceptance: {
    criteria: [
      { id: "AC-1", must: "{ac_1}", severity: "required" },
      { id: "AC-2", must: "{ac_2}", severity: "required" }
    ],
    verify: [
      { id: "V-1", command: "{verifyCmd1}" },
      { id: "V-2", command: "{verifyCmd2}" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run"],
    stopRules: ["{stopRule1}", "{stopRule2}"],
    maxFinalizationTurns: 3
  }
})
```

The runtime handles the self-correction loop. Parent gets the final report.

### Pattern B: Parent-controlled loop (re-delegate on failure)

**When:** Harness does NOT support acceptance natively.
**Advantage:** Works everywhere.
**Disadvantage:** Each iteration is a fresh context (child doesn't remember prior attempts). Feedback must be explicit in task description.

```
PARENT                          CHILD
──────                          ─────
1. Build contract
2. Delegate ────────────────────→ 3. Implement
                                4. Return result
5. Evaluate ←───────────────────
6. If failed: collect feedback
7. Re-delegate with feedback ───→ 8. Implement (new context)
                                9. Return result
10. Evaluate ←──────────────────
...up to max_iterations
```

**Example (opencode, claude-code, codex):**

```typescript
// Iteration 1
const result = subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}

Acceptance Criteria:
- AC-1: {ac_1}
- AC-2: {ac_2}

Verify commands: {verifyCommands}
Stop rules: {stopRules}`
})
// → Run verify commands → Evaluate

// Iteration 2 (if needed) — feedback in task
subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}

Acceptance Criteria:
- AC-1: {ac_1}
- AC-2: {ac_2}

Previous attempt failed:
{feedback_log}

Try a different approach. Do not repeat the same fix.`
})
```

### Pattern C: File-based handoff (generic fallback)

**When:** No subagent system available.
**Advantage:** Works with any tool that has file read/write.
**Disadvantage:** Manual, slow, no self-correction.

```
1. Write task to task.md
2. Execute directly (or via basic delegation)
3. Write result to result.md
4. Evaluate result.md
5. If failed: update task.md with feedback, repeat
```

---

## Building the Contract from Scope Definition

From spec-tech.md, extract:

| Contract Field | Source | How to build |
|----------------|--------|-------------|
| `criteria` | Acceptance Criteria + DoD | Each AC becomes one criterion. Mark critical ones `severity: required`. |
| `verify` | Verify commands section | Test runner + linter + type checker + scope-specific commands |
| `evidence` | Inferred from scope type | feature: `changed-files, tests-added`; test-*, `validation-output` |
| `stopRules` | Inferred from scope type | See table below |
| `selfCorrectionBudget` | `[MAX_ITERATIONS]` or default 3 | Max times child can self-correct |

**StopRules by scope type:**

| Scope Type | StopRules |
|------------|-----------|
| feature | Do not change public API signatures. Do not edit files outside scope. |
| optimization | Do not break existing tests. Do not change public API. |
| spike | Produce recommendation document. Do not edit production code. |
| test-* | Do not modify production code. Only add/modify test files. |

---

## Optimization Goals

Optimization scopes use the same contract with benchmark verify commands.

**Contract for optimization:**

```typescript
{
  criteria: [
    { id: "OPT-1", must: "Metric improves measurably", severity: "required" },
    { id: "OPT-2", must: "Existing tests still pass", severity: "required" }
  ],
  verify: [
    { id: "baseline", command: "{benchmarkCmd}" },
    { id: "tests", command: "{testCmd}" }
  ],
  stopRules: ["Do not change public API signatures"]
}
```

**Parent-controlled optimization loop:**

```
1. Run baseline benchmark
2. Delegate improvement to child
3. Run benchmark again
4. If metric improved → KEEP, commit
5. If not → REVERT, re-delegate with different approach
6. Repeat up to max_iterations or until target met
```

---

## Testing Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Critical Path Tests | missing required tests | 🔴 BLOCK — do not mark scope done |
| Security | > 0 critical | 🔴 BLOCK — escalate to human |
| Flaky Rate | > 5% | 🟡 WARN — note in scope report |

---

## When to Use

| Stage | Purpose |
|-------|---------|
| Execution stage | Each scope → one acceptance contract |
| Verification stage | Full test suite + review (no acceptance needed) |
| Execution Critique | Gap analysis → new scopes (see Gap-to-Scope) |

---

## Related

- Scope executor Step 3 (acceptance-based delegation)
- subagents.md (delegation patterns)
- Testing gates from cali-product-testing-ai-code
