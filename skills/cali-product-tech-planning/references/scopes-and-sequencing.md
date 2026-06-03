---
source: cali-product-workflow (consolidated)
original_files: scope-types.md, sequence-principles.md
date: 2026-05-15
---

---

## Layer Decomposition (Phase B Enhancement)

Each scope should explicitly state the layer decomposition to reduce the gap between planning and implementation.

### [LAYERS]
```yaml
[LAYERS]
  domain:    { Domain description: lifecycle, state, invariants }
  data:      { Schema, tabelas, caches }
  api:       { Endpoints REST/gRPC, contratos }
  ui:        { Componentes, telas, fluxos }
````

### [INTEGRATION-POINTS]
```yaml
[INTEGRATION-POINTS]
  inbound:   { Middleware, guards, event handlers }
  outbound:  { Services externos, databases, queues }
````

### [CAN-DEPLOY-INDEPENDENTLY]
- `true`: Scope can be deployed independently without other scopes
- `false`: Depends on other scopes to function

### Complete Example
```yaml
[SCOPE-1] Authentication Foundation
[TYPE] feature
[MAX_ITERATIONS] 5
[LAYERS]
  domain:    Token lifecycle, session state, refresh mechanism
  data:      UserSession table, JWT claims schema, Redis cache
  api:       POST /auth/login, POST /auth/refresh, POST /auth/logout
  ui:        LoginForm, SessionIndicator, LogoutButton
[INTEGRATION-POINTS]
  inbound:   Middleware auth check, route guards
  outbound:  UserService, Redis session store
[CAN-DEPLOY-INDEPENDENTLY] true
```

---

# Tech Planning — Scope Types & Sequencing Principles

## Scope Types

Each scope must be typed:

| Type | Description | Executor | TDD Recommended? |
|------|-------------|----------|------------------|
| **`feature`** | Implement new functionality, UI, API endpoints, workflows | worker + iteration loop (see `[MAX_ITERATIONS]`) | Optional |
| **`optimization`** | Improve an existing measurable metric (perf, bundle, build time, test speed, Lighthouse score, memory, cost) | subagent + acceptance (benchmark verify) | No |
| **`spike`** | Research/prototype to reduce uncertainty | scout + researcher | No |
| **`test-unit`** | Unit tests for business logic with mutation validation | worker | **Yes — for critical paths** |
| **`test-integration`** | Integration tests with real dependencies (DB, APIs) | worker | No (test-after) |
| **`test-security`** | SAST, vulnerability scanning, security gates | worker | No (automated) |
| **`test-behavior`** | Behavioral testing for agent workflows | worker | No |

### TDD Guidance for AI-Aware Testing

Based on empirical research (AgentAssay 2026, MSR 2026, CodeRabbit 2025):

| Code Type | TDD Recommended? | Rationale |
|-----------|-----------------|-----------|
| Critical business logic | ✅ **Yes** | Isolated, deterministic — TDD provides design feedback |
| External APIs (integration) | ❌ No — test after | Over-mocking is anti-pattern for AI code |
| Security-sensitive | ❌ No — automated gates | 45% vulnerability rate requires continuous scanning |
| Agent workflows | ❌ No — behavioral | Non-deterministic — needs multiple runs, mutation testing |
| Standard features | ⚠️ **TDD optional** | Use test-after + mutation validation |

**Key insight from research:** TDD alone is **insufficient** for AI-generated code.
- AI code has 1.7x more bugs than human code
- AI misses corner cases (75% more logic errors)
- Same AI that generates code shouldn't also generate tests (circular validation)

**Best practice:** Use TDD for critical paths + mutation testing for everything else.

If a scope has both feature and optimization aspects, split it into two scopes or mark it as the dominant type and note the secondary concern in the description.

### Non-Functional Requirements per Scope

Each scope in spec-tech.md MUST include an `nfr:` section listing non-functional
requirements. This is required because LLMs tend to implement the happy path (80%)
and omit error handling, observability, security, and rollback unless explicitly
specified (Osmani 2026, GitClear 2025).

The Verification stage checks each NFR listed here.

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

---

## Iteration Budget (`[MAX_ITERATIONS]`)

**Optional.** Controls how many auto-iteration cycles a feature scope gets before escalating to human.

```
[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 5
```

| Setting | Behavior |
|---------|----------|
| Not specified | Default: 3 iterations |
| `1` | One-shot (no auto-iteration — equivalent to old behavior) |
| `3-5` | Standard range for complex features |
| `5+` | High-complexity features with many edge cases |

**How it works (see `cali-product-scope-executor`):**
Each iteration runs the full cycle: implement → verify (tests, lint, typecheck) → review (correctness + simplicity) → quality checks (UI or codebase audit). If any check fails, the error feeds into the next iteration. After max_iterations without success, the scope escalates to a human.

**When to increase from default (3):**
- High uncertainty in implementation approach
- Many integration points that can fail
- New tech stack or pattern being introduced

**When to decrease (1-2):**
- Trivial, well-understood change
- Low-risk, well-tested codebase area

---

## Executor Override (`[EXECUTOR]`)

**Optional.** When present, overrides the default routing by type.

```
[SCOPE-4]
[TYPE] feature
[EXECUTOR] optimization-goal
[METRIC] Average cyclomatic complexity < 10 (lower is better)
```

### Rule: when to override `[EXECUTOR]` for optimization

Add when ALL conditions are true:

1. ✅ The scope HAS a measurable metric (latency, bundle size, complexity, coverage, build time, etc.)
2. ✅ You can create an automated benchmark that produces `METRIC name=value`
3. ✅ The work modifies EXISTING code (doesn't create new functionality)

**⚠️ IMPORTANT: Routing via subagent**

Optimization goals NEVER run in the main agent. The routing is:

```
optimization scope → cali-product-scope-executor → subagent → **optimization goal** (see `references/cli-tools/goals.md` → Optimization Goals)
```

The cali-product-scope-executor delegates to a subagent with an acceptance contract that includes benchmark verify commands.
Never run optimization loops directly in the main agent — this creates infinite context.

**Keep default routing (no `[EXECUTOR]`) when:**

1. ❌ The scope creates something NEW (feature, screen, flow)
2. ❌ The result is binary (works/doesn't work)
3. ❌ Involves UI/UX that needs human judgment

### Examples

| Scope | Measurable? | Benchmark? | Existing code? | `[EXECUTOR]`? |
|---|---|---|---|---|
| Refactor payment module | ✅ Complexity | ✅ `lint --complexity` | ✅ Yes | ✅ optimization-goal |
| Implement login screen | ❌ Binary | ❌ | ❌ New | ❌ Worker |
| Optimize search query | ✅ P95 latency | ✅ Load test | ✅ Yes | ✅ optimization-goal |
| Create new dashboard | ❌ Visual quality | ❌ | ❌ New | ❌ Worker |
| Fix auth bug | ❌ Binary | ❌ | ✅ Yes | ❌ Worker |

---

## Scope Detail Template

**Tasks template (markdown table):**

| # | Task | Components | Risk | Done Criterion | Order Rationale |
|---|------|-----------|------|---------------|-----------------|
| 1.1 | Task name | api-user, db-schema | LOW/HIGH (1-5) | Done criterion | P0: External mock |
| 1.2 | Task name | ui-auth | HIGH (4) | Done criterion | P3: High-risk first |

**Task fields:**
- **#**: hierarchical ID (`scope.task`, e.g., `3.2`)
- **Task**: Short action description
- **Components**: Key technical areas involved (e.g., `api-user`, `db-schema`, `ui-login`)
- **Risk**: LOW/HIGH or numeric 1-5 scale
- **Done Criterion**: Completion standard
- **Order Rationale** (REQUIRED): Which Principle (0-6) justifies this position. E.g., `P3: Risk score 4`, `P0: External dependency`, `P5: Nice-to-have`. If inferred (not in original input), mark with `[suggested]`.

---

## Sequencing Principles (Principles 0-6)

These principles guide the ordering of tasks within each scope. Apply them in sequence when building the detailed task breakdown.

### Principle 0: External Interface Mocks
Create mocks for external interfaces first. This allows development to proceed without waiting for external dependencies.

### Principle 1: Internal API Mocks
Create internal API mocks to enable parallel development of UI and backend components.

### Principle 2: Key Enablers
Identify and implement key enablers—foundational components that unlock multiple downstream tasks.

### Principle 3: High-Risk Mitigation
**Task-level equivalent of "riskiest-first" scope strategy.**
Identify and address high-risk technical tasks early. Introduce `[spike]` tasks before implementation when uncertainty is fundamental.

**Risk Scoring (1-5 scale):**
| Score | Complexity | Novelty | Legacy Risk | Action |
|-------|------------|---------|------------|--------|
| 1 | Simple, well-understood | No new tech | No legacy touch | Standard sequencing |
| 2 | Moderate | Some new patterns | Minor touch | Monitor |
| 3 | Complex | New tech, some uncertainty | Moderate coupling | Front-load if needed |
| 4 | Very complex | Novel tech/stack | Legacy with refactoring | **Priority — front-load** |
| 5 | Extremely complex | Research-grade | Fragile legacy | **Critical — spike first** |

**Rules:**
- Scopes/tasks with risk >= 4 should be front-loaded (riskiest-first)
- Score >= 5 requires `[spike]` BEFORE implementation

### Principle 3.1: Minimal Implementation for Unblocking
When a high-risk scope/task depends on a lower-risk dependency not yet ready:
- **DO NOT wait** for the full dependency to be complete
- Implement only the **minimum contract / functional placeholder** needed to unblock
- Place this minimum implementation immediately before the dependent task
- The remaining dependency will be sequenced later

**Example:** `"auth: minimal mock for payment validation" → unlocks "payment: core logic spike"`

### Principle 4: Smart Unblocking for Cross-Scope Risks
Position tasks that unblock risks in subsequent scopes strategically.

### Principle 5: Incremental Functionality
Position "nice-to-have" tasks toward the end of the sequence. Do not suggest new nice-to-have tasks.

### Principle 6: Dependencies and Clear Naming
Order remaining tasks based on their dependencies. Ensure task names are clear and descriptive.

---

## Scope Sequencing Rules

1. The first scope should typically establish core domain foundations, enabling architecture, and workflow backbone.
2. Scopes should optimize for vertical coherence, deployment safety, operational independence, and incremental validation.

Apply the sequencing principles (see above, Principles 0-6) for detailed task ordering within each scope.