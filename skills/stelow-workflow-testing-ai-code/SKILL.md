---
name: stelow-workflow-testing-ai-code
description: >
  [stelow] AI-aware testing strategy skill for software products.
  Generates AI-aware testing plans, security gates, and risk-based coverage targets.
  Activated automatically when product_type is "software" or "hybrid"; usable standalone.
  Based on empirical research: AgentAssay (2026), MSR 2026, Veracode 2025, CodeRabbit 2025,
  LLM4TDD (2023), TDD-with-AI-Agents (2026).
metadata:
  frequency: monthly
  category: workflow
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

# AI-Aware Testing Strategy

> **Based on empirical research:**
> - AgentAssay (2026): Non-deterministic agent testing framework
> - MSR 2026: Over-mocking anti-patterns in AI-generated tests
> - Veracode 2025: 45% of AI code contains vulnerabilities
> - CodeRabbit 2025: AI code has 1.7x more bugs than human code
> - CoderEval (2023): 43.1% of AI code is less robust

**Standalone awareness:** when inside stelow, triggered automatically by `product_type` in spec-product.md frontmatter. When standalone, invoke directly with a spec-product.md path. Appetite defaults to Core if not found — documented in output. All test-breadth tables and quality baselines work identically in both modes.

## Activation

- **Trigger:** `product_type: software` or `product_type: hybrid` in spec-product.md frontmatter
- **Phase:** Phase 11 (Tech Planning)
- **Prerequisite:** approved spec-product.md with scope defined

### Step 2: Read Appetite and Product Context

Read `appetite` from `spec-product.md` before generating test scopes. **When running standalone, appetite defaults to `Core`** if not found in frontmatter — the skill documents this assumption in the output.

Appetite controls **test breadth**, not quality baseline.

| Appetite | Test breadth |
|----------|-------------|
| `Lean` | Behavior/E2E (1 happy path) + smoke tests + critical-path unit tests. Add integration only when an external seam is in scope. |
| `Core` | Behavior/E2E (happy path + variations) + unit tests for main logic + integration tests for DB/API/external seams. |
| `Complete` | Behavior/E2E (full coverage + edge cases) + unit + integration + security tests/scans. |

**Quality baseline applies to every appetite:** build/test/lint/typecheck always run when available, and a11y checks run whenever UI files exist. Appetite changes exploration breadth, not whether quality gates exist.

Then determine the product context:

**Before generating testing strategy, determine the product context:**

| Context | Description | Testing Approach |
|---------|-------------|-----------------|
| **Greenfield** | New product, no existing code | TDD-first, appetite-specific coverage targets, clean slate |
| **Brownfield** | Existing product with features | TDD for critical paths, test-after for existing code, regression focus |
| **Hybrid** | Adding features to existing product | Separate new from existing, protect invariants |

**Based on context from setup or spec-product.md:**
- `greenfield`: TDD recommendation, appetite-specific coverage targets
- `brownfield`: TDD for critical paths only, test-after + regression for existing code
- `hybrid`: Add `test-regression` scopes for existing functionality

## Input Detection (Standalone Mode)

When called **outside the workflow** with no pre-existing spec-product.md:

```
Input:
  ├── User provided a spec-product*.md path?
  │   └→ Read product_type, appetite, scope from frontmatter
  ├── User provided a description of the project?
  │   └→ Extract: language, product type, risk level
  └── No structured input?
      └→ Default: product_type=software, appetite=Core, context=brownfield
```

**Graceful degradation:** The skill works standalone. If `product_type` or `appetite` cannot be determined from frontmatter, sensible defaults are used (`product_type=software`, `appetite=Core`, `context=brownfield`). Every step documents its assumptions and flags them in the output.

## Input

From Tech Planning context (or standalone):
- `spec-product.md` (frontmatter with product_type, appetite)
- `spec-tech.md` (scopes to add test-* types, if available)
- Tech stack detection from project files

## Output

| Artifact | Path |
|----------|------|
| `testing-strategy.md` | `.stelow/{date}/{_dir}/plans/` |

---

## Process

### Step 1: Detect Tech Stack

Auto-detect testing frameworks from project files:

| Language | Detection File | Unit Framework | Coverage Tool | Security Tool |
|----------|--------------|---------------|--------------|---------------|
| Python | `requirements.txt`, `pyproject.toml` | pytest | pytest-cov | Bandit |
| JavaScript/TypeScript | `package.json` | Vitest, Jest | c8 / V8 coverage | ESLint + SAST |
| Go | `go.mod` | testing | `go test -cover` | Gosec |
| Rust | `Cargo.toml` | cargo test | cargo-tarpaulin | cargo-audit |
| Java | `pom.xml`, `build.gradle` | JUnit | JaCoCo | SpotBugs |

### Step 3: Classify Scope Risk

Based on spec-tech.md scopes:

| Risk Level | Examples | Testing Depth |
|------------|----------|----------------|
| **Critical** | Payment, auth, data persistence, security | High coverage + negative cases + security gates |
| **Standard** | CRUD, UI, API endpoints | Core paths + obvious edge cases |
| **Experimental** | Prototypes, new features | Smoke tests + regression hooks |

### Step 4-7: Test targets, scope types, mutation fit, CI/CD gates

Generate appetite-specific targets, classify test scope types, score mutation
fit, and define CI gates. Full tables, heuristics and gate definitions:
`references/test-targets-and-gates.md`.

## TDD & Brownfield Guidance (Research-Based)

When to use TDD, regression/characterization/simulation patterns for existing
products. Full guidance: `references/tdd-and-brownfield.md`.

## Risk-Based Test Feedback Loop

Use this loop when tests miss important behavior or regressions appear after AI changes:

```
1. Identify the missed behavior or regression
2. Add a focused test that captures the invariant
3. Rerun the affected test suite
4. Feed the invariant back into future test scopes
```

**Test quality signals:**
- Critical-path coverage
- Negative-case coverage
- Security gate results
- Flaky-rate monitoring

---

## Output Format

### testing-strategy.md

```markdown
---
version: 1
product_type: software
generated_by: stelow-workflow-testing-ai-code
generated_at: {YYYY-MM-DD}
---

# Testing Strategy for {product_name}

## Tech Stack
- Language: {language}
- Unit: {framework}
- Coverage: {tool}
- Security: {tool}

## Coverage and Risk Targets
| Path Type | Required Evidence |
|-----------|-------------------|
| Critical | Branch coverage, negative cases, security gates |
| Standard | Core paths and obvious edge cases |
| Experimental | Smoke tests and regression hooks |

## Test Scopes
| Scope | Type | Required Evidence |
|-------|------|----------------|
| {feature-name} | test-unit | Critical path + negative cases |
| {feature-name} | test-integration | External seams covered |
| {feature-name} | test-security | SAST clean on critical paths |

## CI/CD Gates
- BLOCK: missing required critical-path tests
- BLOCK: security_findings > 0 on critical paths
- WARN: flaky_rate > 5%

## Anti-Patterns
- ❌ > 3 mocks per test
- ❌ Mocks for simple objects
- ❌ 100% coverage target
- ❌ Same AI for code AND tests
```

---

## Success Criteria

- [ ] testing-strategy.md generated
- [ ] test-* scopes added to spec-tech.md
- [ ] Coverage and risk targets calibrated per risk level
- [ ] CI/CD gates documented
- [ ] Anti-patterns checklist included

---

## Fallback

If tech stack detection fails:
- Python → pytest + pytest-cov + Bandit
- JavaScript/TypeScript → Vitest + c8/V8 coverage + ESLint
- Go → testing + `go test -cover` + Gosec
- Rust → cargo test + cargo-tarpaulin + cargo-audit

---

## Related Skills

- **stelow-workflow-tech-planning**: Produces scopes to test
- **stelow-workflow-scope-executor**: Executes test scopes
- **stelow-workflow-plan-critique**: Can review testing strategy

## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`references/host-levers.md` for the full marker protocol (SCOPE-9).

## Hand-off (workflow mode)

```
stage          : verification
description    : Verification. Run full test suite, code review, UI audit, browser testing.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : diff-gate
gate           : none
rework-on      : execution
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **verification** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Verification. Run full test suite, code review, UI audit, browser testing.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

