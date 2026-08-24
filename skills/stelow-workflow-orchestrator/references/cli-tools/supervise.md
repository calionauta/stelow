# Supervision — Scope Execution Steering

> CLI-agnostic checkpoint supervision using headless CLI verification.
> Falls back to Pi's `/supervise` tool when available (more granular).

---

## Concept

Supervision checks whether the LLM is still executing the scope correctly
against the Definition of Done (DoD) and acceptance criteria. It is NOT
real-time monitoring — it's a **checkpoint-based verification** that runs
between tool call batches or at milestone boundaries.

Two approaches:

| Approach | Coverage | Portability | Latency |
|----------|----------|-------------|---------|
| **Headless CLI checkpoint** (any CLI) | Discrete — checks at N tool call intervals | ✅ All harnesses | ~5-15s per check |
| **`/supervise`** (Pi only) | Continuous — inspects every response | ❌ Pi only | ~0s (in-loop) |

**Recommendation:** Use headless CLI checkpoint by default. Use `/supervise`
on Pi for long, complex scopes where continuous monitoring matters.

---

## Approach 1: Headless CLI Checkpoint (any harness)

After every N tool calls (recommended: 5-10 for feature scopes, 3-5 for spikes),
run the harness non-interactively with a verification prompt:

```bash
# Pattern (adapt per CLI):
#   pi: pi --print "..."

pi --print --output-format json "
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

### Per-CLI command

| CLI | Headless command | Structured output |
|-----|-----------------|-------------------|
| pi | `pi --print "$prompt"` | `--output-format json` or prompt-instructed |
| Claude Code | `claude -p "$prompt"` | `--output-format json` |
| Universal fallback | Agent's own headless mode, if exposed | Prompt-instructed (ask for JSON) |

### Decision matrix

| Result | Action |
|--------|--------|
| `on_track: true` | Continue execution |
| `on_track: false`, gaps are small | Re-center: add instruction to fix gaps, continue |
| `on_track: false`, gaps are large | Revert scope changes (git), re-execute from last checkpoint |
| `needs_human: true` | Pause execution, flag to user |

---

## Approach 2: `/supervise` (Pi only)

Available when `pi-supervisor` extension is installed. Provides continuous,
real-time response inspection — every LLM response is checked against the
outcome before the next tool call runs.

```bash
/supervise [outcome]
```

| Info | Value |
|------|-------|
| Package | pi-supervisor (tintinweb) |
| Command | `/supervise` |

---

## When to Use

| Phase | Purpose |
|-------|---------|
| Phase 12 (Execution) | Steering during execution |

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
| `Core` | Headless checkpoint or `/supervise` (Pi) | Every 5-7 tool calls |
| `Complete` | `/supervise` (Pi) or checkpoint | Every 3 tool calls |

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

**⚠️ IMPORTANT:** Never activate during Phases 3-11.
Supervisor re-submits visual review, causing loops.

Activate ONLY when STARTING each scope in Phase 12.

Respect the Appetite-Based Activation table above for sensitivity and skip decisions.

---

## Scope Type Recommendations

| Scope Type | Recommended approach | Why |
|-----------|---------------------|-----|
| `feature` | Headless checkpoint (every 5-7 calls) | Discrete verification is sufficient |
| `optimization` | Headless checkpoint (every 3 calls) | Metrics verify success automatically |
| `spike` | Headless checkpoint (at end) | Investigative — only need final validation |
| `test-*` | None — tests pass/fail speaks for itself | Binary outcome, no drift possible |
| High-risk feature | `/supervise` (if Pi) or checkpoint every 3 calls | Continuous monitoring catches subtle drift |

---

## Implementation notes

The adapter's `execHeadless(task)` method implements this pattern.
Each CLI adapter calls its own non-interactive command:

```typescript
// PiAdapter: execSync(\`pi --print \${JSON.stringify(task)}\`)
// ClaudeCodeAdapter: execSync(\`claude -p \${JSON.stringify(task)}\`)
// Historical: removed adapters used per-agent headless commands. The stelow
// extension ships PiAdapter + GenericAdapter only.
```

The verification prompt is constructed by the calling code (skill/stage)
and includes scope context, DoD, and expected output format.
