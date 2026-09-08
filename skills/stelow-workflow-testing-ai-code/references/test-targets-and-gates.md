### Step 4: Generate Appetite-Specific Test Targets

From research: coverage alone is insufficient. A test suite can execute every line but still miss behavioral bugs, security gaps, and non-deterministic agent failures. Appetite selects breadth; risk selects which paths inside that breadth are mandatory.

| Appetite | Path Type | Testing Depth |
|-----------|-----------|-------------|
| `Lean` | Critical path | E2E/behavior (1 happy path) + smoke + unit for the one negative case |
| `Lean` | Standard/experimental | E2E/behavior (1 happy path); no broad integration suite |
| `Core` | Critical path | E2E/behavior + unit tests + negative cases + integration seams |
| `Core` | Standard features | E2E/behavior (key variations) + unit tests + integration for external seams |
| `Complete` | Critical path | E2E/behavior (full) + unit + integration + security gates |
| `Complete` | Complex flows | E2E/behavior for multi-step UI or agent workflows |

### Step 5: Define Test Scope Types

For each IN scope in spec-product.md, add corresponding test scopes. Appetite controls breadth:

**Lean:**

| Code Type | Test Type | When to Use | TDD? |
|----------|-----------|-------------|------|
| User-facing flows | `test-behavior` | 1 E2E test for happy path | No — browser/e2e |
| Critical business logic | `test-unit` | Happy path + one negative case | Yes for deterministic logic |
| External APIs | `test-integration` | Only if external seam is in Lean IN scope | No — test-after |
| Security-sensitive | `test-security` | Only if auth/payment/data is in Lean IN scope | Automated SAST |

**Core:**

| Code Type | Test Type | When to Use | TDD? |
|----------|-----------|-------------|------|
| User-facing flows | `test-behavior` | E2E for happy path + key variations | No — browser/e2e |
| Agent workflows | `test-behavior` | Multi-step agents | Multi-run validation |
| Business logic | `test-unit` | Main flows + obvious edge cases | Yes — critical paths |
| External APIs | `test-integration` | DB, APIs, queues | No — test-after |
| Security-sensitive | `test-security` | Auth, payment, data | Automated SAST |

**Complete:**

| Code Type | Test Type | When to Use | TDD? |
|----------|-----------|-------------|------|
| User-facing flows | `test-behavior` | Full E2E coverage + edge cases | No — browser/e2e |
| Complex UI/user flows | `test-behavior` | Forms, modals, multi-step flows | Browser/e2e |
| Agent workflows | `test-behavior` | Multi-step agents | Multi-run validation |
| Business logic | `test-unit` | Full edge mapping | Yes — critical paths |
| External APIs | `test-integration` | All external seams | No — test-after with contract checks |
| Security-sensitive | `test-security` | Auth, payment, data, permissions | Automated SAST + targeted tests |

**Brownfield/Hybrid (existing code):**

| Code Type | Test Type | When to Use | Context |
|----------|-----------|-------------|---------|
| Protect existing | `test-regression` | Detect regressions | Brownfield/Hybrid |
| Document behavior | `test-characterization` | Golden tests | Brownfield |
| Replay past tasks | `test-simulation` | Verify consistency | Brownfield |
| Impact analysis | `test-impact` | TDAD-style | Brownfield |

Based on MSR 2026 research (agents use mocks 36% vs 26% humans):

**Anti-patterns to flag:**
- ❌ Mock count > 3 per test
- ❌ Mocks for simple objects (use real objects instead)
- ❌ 100% coverage target (coverage ≠ test quality)
- ❌ Snapshot tests for non-UI components
- ❌ Single-run validation (agents are non-deterministic)
- ❌ Same AI for both code AND test generation (circular validation)

### Step 6: Evaluate Mutation Testing Fit

Mutation testing evaluates whether a test suite would **notice a regression** — not just whether it executed a line. Research shows LLM-generated tests cluster around the same blind spots as the code they test (Test Homogenization Trap, AgentPatterns 2026). Mutation forces tests to prove they'd catch a defect.

**Evaluate whether mutation testing adds value for this project:**

```bash
# Heuristic: mutation testing fit score (0-10)
SCORE=0

# +1 if language is compiled (Go, Rust, Java, TypeScript with strict config)
+2 if language is Go, Rust, or Java

# +1 if there are critical scopes (auth, payment, data persistence)
+2 if @critical scopes exist

# +2 if project has >5 scopes or appetite=Complete
+3 if appetite=Complete or scope count > 5

# -1 if appetite=Lean (prototype/validation)
-2 if appetite=Lean

# -1 if pure CRUD with no critical paths (no payment, auth, data persistence)
-2 if pure CRUD and no @critical scopes

# Score >= 5: recommend mutation testing
# Score 2-4: recommend only for specific critical modules
# Score < 2: skip (document why)
```

| Context | Mutation Testing Recommendation |
|---------|-------------------------------|
| **Production app with critical paths** (auth, payment, data) | ✅ Recommend: `[TYPE] test-mutation` with target 50%, scoped to critical modules, run nightly |
| **CRUD web app, REST API without sensitive paths** | 🟡 Optional: `[TYPE] test-mutation` with target 40%, only if existing test suite is mature |
| **Prototype, validation, appetite=Lean** | ❌ Skip — cost (CI minutes, equivalent-mutant triage) > regression risk |
| **Service/no-code product** | ❌ Skip — no code to test |
| **Skill/CLI/workflow package (e.g., stelow itself)** | ❌ Skip — integration + smoke tests sufficient for low regression risk |

If recommending, add to testing strategy:

```yaml
mutation_testing:
  recommended: true
  rationale: "Project has {critical_count} critical scopes in {language}; mutation testing
    validates test suite can detect regressions in business logic."
  scope: "critical modules only, not full suite"
  target: "50% starter"
  tool: "Stryker (JS/TS), mutmut (Python), PIT (Java), go-mutate (Go)"
  schedule: "nightly, not per-PR — mutation runs are too slow for gate gating without
    selective mutation (Zenseact 2023, Google 2021)"
```

**Validated loop** (AgentPatterns 2026, MUTGEN 2025):
```
1. Generate tests (AI)
2. Run mutation tool
3. Feed surviving mutants into prompt
4. Generate additional tests targeting survivors
5. Repeat (plateau ~4 iterations)
```

**Anti-patterns for mutation testing with AI code:**
- ❌ Same model that wrote code generates tests AND judges equivalent mutants (circular bias)
- ❌ Full-suite mutation as per-PR gate (hours of CI, Zenseact 2023)
- ❌ High targets on first pass (start at 50%, not 70%)
- ❌ No equivalent-mutant filter (>50% survival = noise, Facebook 2020)

### Step 7: Create CI/CD Gates

```yaml
GATES:
  critical_path_coverage:
    condition: "missing required tests"
    action: BLOCK
    rationale: "Critical paths need executable regression checks"
  
  security_findings:
    condition: "> 0 on critical paths"
    action: BLOCK
    rationale: "45% of AI code contains vulnerabilities (Veracode 2025)"
  
  flaky_rate:
    condition: "> 5%"
    action: WARN
    rationale: "Agents generate non-deterministic tests"
```

---

