# Supervision — Scope Execution Steering

> Checkpoint supervision using headless CLI verification.
> Falls back to harness-native supervision where available (more granular).

---

## Concept

Supervision checks whether the LLM is still executing the scope correctly
against the Definition of Done (DoD) and acceptance criteria. It is NOT
real-time monitoring — it's a **checkpoint-based verification** that runs
between tool call batches or at milestone boundaries.

Two approaches:

| Approach | Coverage | Portability | Latency |
|----------|----------|-------------|---------|
| **Headless CLI checkpoint** (any harness) | Discrete — checks at N tool call intervals | ✅ All harnesses | ~5-15s per check |
| **Harness-native supervision** (where available) | Continuous — inspects every response | ❌ Harness-specific | ~0s (in-loop) |

**Recommendation:** Use headless CLI checkpoint by default. Use harness-native
supervision for long, complex scopes where continuous monitoring matters.

---

## Approach 1: Headless CLI Checkpoint (any harness)

After every N tool calls (recommended: 5-10 for feature scopes, 3-5 for spikes),
run the harness non-interactively with a verification prompt:

```bash
# Pattern (adapt per harness — use its documented non-interactive mode):
#   <agent-cli> --print/-p "$prompt"

<agent-cli> --print "
Read the current scope state in .stelow/<date>/<hash>/plans/scopes/.
Compare against the DoD and acceptance criteria.

Return JSON only:
{
  \"on_track\": true|false,
  \"gaps\": [\"gap description\", ...],
  \"recommendation\": \"continue\" | \"revert_and_redo\" | \"needs_human\"
}
"
```

### Per-harness command

| Harness | Headless command | Structured output |
|-----|-----------------|-------------------|
| Any coding-agent CLI | `<agent-cli> --print/-p "$prompt"` | Flag-supported JSON or prompt-instructed |
| Universal fallback | Agent's own headless mode, if exposed | Prompt-instructed (ask for JSON) |

### Decision matrix

| Result | Action |
|--------|--------|
| `on_track: true` | Continue execution |
| `on_track: false`, gaps are small | Re-center: add instruction to fix gaps, continue |
| `on_track: false`, gaps are large | Revert scope changes (git), re-execute from last checkpoint |
| `needs_human: true` | Pause execution, flag to user |

---

## Approach 2: harness-native supervision (where available)

Some harnesses ship continuous, real-time response inspection — every LLM
response is checked against the outcome before the next tool call runs.
Consult the harness's own docs for the exact tool/command; the stelow-side
contract is identical (DoD + acceptance criteria in, on-track/gaps/needs-human
out).

---

## When to Use

| Stage | Purpose |
|-------|---------|
| Execution | Steering during execution |

---

## Appetite-Based Activation

The supervisor is not always necessary. Appetite (declared by human in setup)
determines whether and how aggressively to supervise:

| Appetite | Supervisor | Sensitivity | Rationale |
|----------|-----------|-------------|-----------|
| `Lean` | **Activate** | `low` | Even small scopes can drift over multiple turns. Low sensitivity catches clear deviations without false-positive noise. |
| `Core` | **Activate** | `medium` | Standard feature scope. Medium sensitivity balances steering vs autonomy. |
| `Complete` | **Activate** | `high` | High-risk, multi-scope work. High sensitivity ensures drift is caught early. |

### Approach by appetite

| Appetite | Recommended approach | Frequency |
|----------|---------------------|-----------|
| `Lean` | Headless CLI checkpoint | Every 10 tool calls |
| `Core` | Headless checkpoint or harness-native supervision | Every 5-7 tool calls |
| `Complete` | Harness-native supervision or checkpoint | Every 3 tool calls |

### Skip conditions

| Appetite | Review Mode | Supervisor decision |
|----------|-------------|-------------------|
| `Lean` | any | **Skip** unless explicitly requested |
| `Core` | `Auto` / `Product Spec Gate` | **Skip** unless risk is high |
| `Core` | `Product Spec + Interface Gates` / above | Run when risk is high |
| `Complete` | `Auto` / `Product Spec Gate` | **Run** if code changed |
| `Complete` | `Product Spec + Interface Gates` / above | **Mandatory** |

---

## Activation Rules

**⚠️ IMPORTANT:** Never activate before the Execution stage.
Supervision re-submits visual review, causing loops.

Activate ONLY when STARTING each scope in Execution.

Respect the Appetite-Based Activation table above for sensitivity and skip decisions.

---

## Scope Type Recommendations

| Scope Type | Recommended approach | Why |
|-----------|---------------------|-----|
| `feature` | Headless checkpoint (every 5-7 calls) | Discrete verification is sufficient |
| `optimization` | Headless checkpoint (every 3 calls) | Metrics verify success automatically |
| `spike` | Headless checkpoint (at end) | Investigative — only need final validation |
| `test-*` | None — tests pass/fail speaks for itself | Binary outcome, no drift possible |
| High-risk feature | Harness-native supervision or checkpoint every 3 calls | Continuous monitoring catches subtle drift |

---

## Implementation notes

The calling code (skill/stage) constructs the verification prompt with scope
context, DoD, and expected output format, then runs it through the harness's
non-interactive command. No harness-specific adapter code ships in this repo.
