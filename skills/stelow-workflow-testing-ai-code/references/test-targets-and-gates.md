### Step 4: Generate Quality-Specific Test Targets

> Canonical guard reference: `guard-contract.md` (5 questions, ritual, anti-patterns, gates).
> This file keeps only quality-specific breadth tables (Steps 4–5) and the mutation-fit rationale (Step 6).
> Do not copy anti-patterns or gates here — link to `guard-contract.md`.

From research: coverage alone is insufficient. A test suite can execute every line but still miss behavioral bugs, security gaps, and non-deterministic agent failures. Quality selects breadth; risk selects which paths inside that breadth are mandatory. A legacy `appetite:` line maps to `production` for every legacy value.

| Quality | Path Type | Testing Depth |
|-----------|-----------|-------------|
| `production` | Critical path | E2E/behavior (full) + unit + integration + security gates |
| `production` | Standard features | E2E/behavior (key variations) + unit tests + integration for external seams |
| `production` | Complex flows | E2E/behavior for multi-step UI or agent workflows |
| `experimental` | Critical path | E2E/behavior (1 happy path) + smoke + unit for the one negative case |
| `experimental` | Standard/experimental | E2E/behavior (1 happy path); no broad integration suite. Never ship as-is. |

### Step 5: Define Test Scope Types

For each IN scope in the spec-product, add corresponding test scopes. Quality controls breadth:

**Production:**

| Code Type | Test Type | When to Use | Fail-observed? |
|----------|-----------|-------------|------|
| User-facing flows | `test-behavior` | Full E2E coverage + edge cases | No — browser/e2e |
| Complex UI/user flows | `test-behavior` | Forms, modals, multi-step flows | Browser/e2e |
| Agent workflows | `test-behavior` | Multi-step agents | Multi-run validation |
| Business logic | `test-unit` | Full edge mapping | Yes — guards from planned cases, critical paths |
| External APIs | `test-integration` | All external seams | No — test-after with contract checks |
| Security-sensitive | `test-security` | Auth, payment, data, permissions | Automated SAST + targeted tests |

**Experimental (probes only, never ship as-is):**

| Code Type | Test Type | When to Use | Fail-observed? |
|----------|-----------|-------------|------|
| User-facing flows | `test-behavior` | 1 E2E test for happy path | No — browser/e2e |
| Critical business logic | `test-unit` | Happy path + one negative case | Yes — planned cases, deterministic logic |
| External APIs | `test-integration` | Only if external seam is in scope | No — test-after |
| Security-sensitive | `test-security` | Only if auth/payment/data is in scope | Automated SAST |

**Brownfield/Hybrid (existing code):**

| Code Type | Test Type | When to Use | Context |
|----------|-----------|-------------|---------|
| Protect existing | `test-regression` | Detect regressions | Brownfield/Hybrid |
| Document behavior | `test-characterization` | Golden tests | Brownfield |
| Replay past tasks | `test-simulation` | Verify consistency | Brownfield |
| Impact analysis | `test-impact` | TDAD-style | Brownfield |

**Anti-patterns:** canonical list in `guard-contract.md` — do not copy here.

### Step 6: Evaluate Mutation Testing Fit

Mutation testing evaluates whether a test suite would **notice a regression** — not just whether it executed a line. Research shows LLM-generated tests cluster around the same blind spots as the code they test (Test Homogenization Trap, AgentPatterns 2026). Mutation forces tests to prove they'd catch a defect.

**Scope caveat (2026 replication findings):** mutation and coverage signals work in *regression* settings — code-under-test reasonably assumed bug-free, catching future breakage. When the code-under-test may already be buggy (including same-turn AI code+tests), they stop being reliable indicators. Same-turn tests therefore need independent authorship (fresh agent or human oracle review, cf. TDFlow: human-written tests 94.3% vs self-generated 68%, EACL 2026), not higher mutation targets.

**Decision flow (cheapest verdict first — adequacy is not the goal):**

1. **Hand-mutation per critical invariant** (free, immediate) — invert or remove the guarded behavior; the test MUST FAIL. A test that stays green on broken code is rejected — this is the hard gate, not an advisory check. Stop here when every critical invariant is covered.
2. **Extreme mutation** (pseudo-tested methods) once the suite is mature and CI budget exists — minutes instead of hours, and findings map directly to weak tests. This is the ceiling for most projects: beyond it, cost exceeds signal.

Sequence per scope: FAIL-OBSERVED-FREEZE-PASS — write the guard from the planned case and observe it FAIL, record the observed FAIL, freeze the guard text, then implement to PASSING. Never edit the frozen guard to make it pass.

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

**Mutation anti-patterns:** canonical list in `guard-contract.md` — do not copy here.

### Step 7: Create CI/CD Gates

Canonical table in `guard-contract.md` — do not copy here.

---

