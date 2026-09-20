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

For each IN scope in the spec-product, add corresponding test scopes. Appetite controls breadth:

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
- ❌ Presence tests — assertions that source text exists (grep/regex over code, string-presence checks). They pass on broken logic and break on refactors. Allowed only when they constrain topology, counts, or refusal shapes, with the caught regression named.
- ❌ Assertion Roulette — many assertions per test with no single behavior under test (AI tests show higher assertion density than human tests, MSR 2026). One behavior per test; a failure must name its cause.
- ❌ Unreasoned oracles — assertions that execute code without capturing faulty behavior. LLM faults that matter are missed because oracles don't assert the failure mode (Hamidi et al., Sep 2026). Every assertion must answer: "which wrong behavior would make this fail?"

### Step 6: Evaluate Mutation Testing Fit

Mutation testing evaluates whether a test suite would **notice a regression** — not just whether it executed a line. Research shows LLM-generated tests cluster around the same blind spots as the code they test (Test Homogenization Trap, AgentPatterns 2026). Mutation forces tests to prove they'd catch a defect.

**Scope caveat (2026 replication findings):** mutation and coverage signals work in *regression* settings — code-under-test reasonably assumed bug-free, catching future breakage. When the code-under-test may already be buggy (including same-turn AI code+tests), they stop being reliable indicators. Same-turn tests therefore need independent authorship (fresh agent or human oracle review, cf. TDFlow: human-written tests 94.3% vs self-generated 68%, EACL 2026), not higher mutation targets.

**Decision flow (cheapest verdict first — adequacy is not the goal):**

1. **Hand-mutation per critical invariant** (free, immediate) — invert or remove the guarded behavior; the test must fail. A test that stays green on broken code is rejected. Stop here when every critical invariant is covered.
2. **Extreme mutation** (pseudo-tested methods) once the suite is mature and CI budget exists — minutes instead of hours, and findings map directly to weak tests. This is the ceiling for most projects: beyond it, cost exceeds signal.

Full mutation tooling (Stryker, mutmut, PIT, go-mutate) is **not recommended by default**: it only marginally outperforms coverage on real faults while oracles remain the bottleneck (Hamidi et al., Sep 2026), triage costs ~4.6 min per mutant with ~33% unproductive (Just et al.), and adequacy is neither practical nor desirable. Consider it only for safety-critical or regulated code with an already-mature suite — nightly, scoped to the regulated modules, no score targets.

Rationale: fix the weak-test signal, then stop — don't chase scores.

**Validated loop** (AgentPatterns 2026, MUTGEN 2025) — works with any survivor source (hand-mutants, extreme survivors, or tool mutants where tooling is justified):
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
- ❌ Any score target as a goal — no minimum is owed (not 50%, not 70%); stop when the weak-test signal is exhausted
- ❌ No equivalent-mutant filter (>50% survival = noise, Facebook 2020)
- ❌ Chasing 100% mutation score (adequacy is not the goal — kill the weak-test signal, then stop)

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

