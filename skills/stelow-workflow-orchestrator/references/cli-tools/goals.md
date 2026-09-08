# Acceptance contracts

> scope → delegate call + verifiable contract (`criteria`, `evidence`,
> `verify`, `stopRules`).
>
> **Acceptance-native:** when the harness's delegate tool supports the
> contract, pass it directly — the child self-corrects in the same context.
> **Fallback:** harnesses without it use parent-controlled re-delegation
> (implement → verify → fix → repeat) with the same contract data.

---

## Core Concept: scopes become acceptance contracts

Every scope type becomes a delegate call with an acceptance contract.
No separate extensions needed — the contract travels with the delegation,
whether the harness enforces it natively or the parent loops over it.

| Scope Type | How it is delegated |
|------------|----------------------|
| `feature` | delegate worker + iteration loop (see scope-executor Step 3) |
| `spike` | delegate recon + research (see subagents.md) |
| `optimization` | delegate + acceptance with **benchmark verify** commands (see Optimization Goals below) |
| `test-*` | delegate + acceptance with testing/security gates |

---

## Subagent with acceptance (acceptance-native harnesses)

Pass an acceptance contract directly to the harness's delegate tool
(shape varies — see `subagents.md` for the capability tiers):

```typescript
subagent({
  agent: "worker",
  task: "Implement X from the approved scope",
  acceptance: {
    criteria: [
      { id: "SC-1", must: "Feature X works", severity: "required" },
      { id: "SC-2", must: "Tests pass", severity: "required" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run"],
    verify: [
      { id: "V-1", command: "go test ./..." }
    ]
  }
})
```

This replaces the need for external goal packages.

---

## Delegation without native acceptance (parent-controlled loop)

When the harness delegate tool takes no acceptance contract, the parent runs
the loop itself: delegate → verify commands → re-delegate with feedback until
criteria pass or max iterations exhaust. Same contract data, more turns.

---

## Optimization Goals

**Optimization scopes are contracts with benchmark `verify` commands.**
The same delegate + acceptance pattern handles optimization — no separate
experiment loop needed.

### How it works

```
1. Baseline → subagent runs benchmark via acceptance verify
2. Mutate → subagent tries an improvement
3. Measure → acceptance verify runs benchmark again
4. Compare → parent agent decides keep/revert based on metric
5. Repeat → if target not met, launch next iteration with updated context
```

### Pattern

```typescript
subagent({
  agent: "worker",
  task: "Optimize function F for speed. Current baseline: 200µs.",
  acceptance: {
    criteria: [
      { id: "OPT-1", must: "Function F performance improves measurably", severity: "required" },
      { id: "OPT-2", must: "Tests still pass", severity: "required" }
    ],
    evidence: ["changed-files", "commands-run", "validation-output"],
    verify: [
      { id: "benchmark", command: "go test -bench=. -benchtime=100x ./pkg/" },
      { id: "tests", command: "go test ./..." }
    ],
    stopRules: ["Do not change public API signatures"]
  }
})
```

### Iteration loop in the parent agent

The parent orchestrator runs the iteration loop:

```typescript
// Iteration 1: try an improvement
const result = subagent({
  agent: "worker",
  task: `Optimize ${metric}. Baseline: ${baseline}. Try: pool goroutines.`,
  acceptance: { ... }  // with benchmark verify
})

// Compare metric from result output
if (result.metric < baseline) {
  // KEEP — commit accepted
} else {
  // REVERT — discard the change
}

// If target not met, iterate with context memory
subagent({
  agent: "worker",
  task: `Optimize ${metric}. Previous attempt did not meet target. Try: different approach.`,
  acceptance: { ... }
})
```

### Self-contained optimization agent

The pattern above can be packaged as a project agent (`optimizer`) that runs the
full try → measure → compare loop autonomously. It accepts the objective,
metric command, and stopping condition as task parameters.

---

## When to Use

| Stage | Purpose |
|-------|---------|
| Execution stage | Scoped implementation per scope |
| Verification stage | Run full test suite, code review, UI/browser testing |
| Execution Critique stage | Verify implementation, gap analysis |
| After Tech Planning | Each scope becomes a goal |

---

## Scope Types

| Type | Description | Executor |
|------|-------------|----------|
| `feature` | New functionality | worker + iteration loop (see scope-executor Step 3) |
| `optimization` | Measurable metric improvement | subagent + acceptance (benchmark verify + iteration loop) |
| `spike` | Research/prototype | subagent + acceptance |
| `test-unit` | Unit tests with coverage/risk gates | subagent + acceptance + testing gates |
| `test-integration` | Integration tests with real dependencies | subagent + acceptance + testing gates |
| `test-security` | SAST and security gates | subagent + acceptance + testing gates |
| `test-behavior` | Behavioral testing for agent workflows | subagent + acceptance + testing gates |

---

## Pattern for feature goals

Feature scopes use the **iteration loop** (see `stelow-workflow-scope-executor` Step 3), not a direct subagent call.
The iteration loop wraps the subagent in implement → verify → review → quality → repeat cycles.

```typescript
// The iteration loop handles this automatically.
// Do NOT call subagent directly for feature scopes.
// See scope-executor Step 3 for the full pattern.
```

## Pattern for spike goals

```typescript
subagent({
  agent: "worker",
  task: `Scope: spike-login
Objective: Evaluate auth strategies
DoD: Recommendation doc with pros/cons`,
  acceptance: {
    criteria: [
      { id: "SC-1", must: "At least 2 strategies evaluated", severity: "required" }
    ],
    evidence: ["changed-files", "commands-run", "residual-risks"],
    verify: [{ id: "tests", command: "go test ./..." }]
  }
})
```

### Test Scope Goals (test-* scopes)

```typescript
subagent({
  agent: "worker",
  task: `Scope: test-unit-login
Objective: Generate unit tests for critical paths
DoD: critical-path tests cover happy path and negative cases`,
  acceptance: {
    criteria: [
      { id: "TG-1", must: "Critical-path tests cover happy path and negative cases", severity: "required" },
      { id: "TG-2", must: "Security findings == 0 on critical paths", severity: "required" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run", "validation-output"],
    verify: [
      { id: "tests", command: "npm test" },
      { id: "security", command: "gosec ./..." }
    ]
  }
})
```

---

## Testing Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Critical Path Tests | missing required tests | 🔴 BLOCK |
| Security | > 0 critical | 🔴 BLOCK |
| Flaky Rate | > 5% | 🟡 WARN |

---

## Fallback (Other Harnesses)

If both subagent acceptance and goal system are unavailable:
- Use todo tool for progress tracking
- Create checkpoint files for resume
- Mark `[DONE:n]` in responses

**Abstraction:** "Goal with typed scopes and acceptance criteria"

---

## Related

- Execution stage (see `../../../stelow-workflow-orchestrator/stages/execution.md`)
- Verification stage (see `../../../stelow-workflow-orchestrator/stages/verification.md`)
- spec-tech scopes
- Testing strategy (see the `stelow-workflow-testing-ai-code` skill)
- Testing protocol (see the `stelow-workflow-testing-execution` skill)

