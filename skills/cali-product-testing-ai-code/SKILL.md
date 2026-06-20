---
name: cali-product-testing-ai-code
description: >
  [Cali] AI-aware testing strategy skill for software products.
  Generates AI-aware testing plans, security gates, and risk-based coverage targets.
  Activated automatically when product_type is "software" or "hybrid".
  Based on empirical research: AgentAssay (2026), MSR 2026, Veracode 2025, CodeRabbit 2025,
  LLM4TDD (2023), TDD-with-AI-Agents (2026).
metadata:
  frequency: monthly
  category: code
  context-cost: medium
---

# AI-Aware Testing Strategy

> **Based on empirical research:**
> - AgentAssay (2026): Non-deterministic agent testing framework
> - MSR 2026: Over-mocking anti-patterns in AI-generated tests
> - Veracode 2025: 45% of AI code contains vulnerabilities
> - CodeRabbit 2025: AI code has 1.7x more bugs than human code
> - CoderEval (2023): 43.1% of AI code is less robust

## Activation

- **Trigger:** `product_type: software` or `product_type: hybrid` in spec-product.md frontmatter
- **Phase:** Phase 11 (Tech Planning)
- **Prerequisite:** approved spec-product.md with scope defined

### Product Context (Greenfield vs Brownfield)

**Before generating testing strategy, determine the product context:**

| Context | Description | Testing Approach |
|---------|-------------|-----------------|
| **Greenfield** | New product, no existing code | TDD-first, risk-based coverage targets, clean slate |
| **Brownfield** | Existing product with features | TDD for critical paths, test-after for existing code, regression focus |
| **Hybrid** | Adding features to existing product | Separate new from existing, protect invariants |

**Based on context from setup or spec-product.md:**
- `greenfield`: Full TDD recommendation, risk-based coverage targets
- `brownfield`: TDD for critical paths only, test-after + regression for existing code
- `hybrid`: Add `test-regression` scopes for existing functionality

## Input

From Tech Planning context:
- `spec-product.md` (frontmatter with product_type)
- `spec-tech.md` (scopes to add test-* types)
- Tech stack detection

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

### Step 2: Classify Scope Risk

Based on spec-tech.md scopes:

| Risk Level | Examples | Testing Depth |
|------------|----------|----------------|
| **Critical** | Payment, auth, data persistence, security | High coverage + negative cases + security gates |
| **Standard** | CRUD, UI, API endpoints | Core paths + obvious edge cases |
| **Experimental** | Prototypes, new features | Smoke tests + regression hooks |

### Step 3: Generate Risk-Based Test Targets

From research: coverage alone is insufficient. A test suite can execute every line but still miss behavioral bugs, security gaps, and non-deterministic agent failures.

| Path Type | Testing Depth |
|-----------|-------------|
| Critical paths | Branch coverage, negative cases, security gates, and deterministic regression checks |
| Standard features | Core happy path, obvious edge cases, and integration seams |
| Experimental | Smoke tests, acceptance checks, and regression hooks for future hardening |

### Step 4: Define Test Scope Types

For each IN scope in spec-product.md, add corresponding test scopes.

**Greenfield (new code):**

| Code Type | Test Type | When to Use | TDD? | Section |
|----------|-----------|-------------|------|---------|
| Business logic | `test-unit` | Core functionality | **Yes — critical paths** | [test-unit](#test-unit-core-functionality-greenfield) |
| External APIs | `test-integration` | DB, APIs, queues | No — test-after | [test-integration](#test-integration-external-apis-greenfield) |
| Security-sensitive | `test-security` | Auth, payment, data | No — automated | [test-security](#test-security-security-sensitive-code-greenfield) |
| Agent workflows | `test-behavior` | Multi-step agents | No — multi-run | [test-behavior](#test-behavior-agent-workflows-greenfield) |

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

### Step 6: Create CI/CD Gates

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

## TDD Guidance (Research-Based)

**Empirical findings on TDD with AI agents:**

| Research | Key Finding |
|----------|-------------|
| LLM4TDD (2023) | Including test cases alongside problem statements **enhances code generation** and **increases success rate** on benchmarks like MBPP and HumanEval |
| TDD-with-AI-Agents (2026) | TDD reduces bugs by **40-80%** compared to test-after for AI workflows |
| AgentPatterns.ai | Tests as specifications constrain AI behavior — "the test is a contract the agent cannot fake" |
| QASkills (2026) | Without TDD, AI agents write tests that validate their own broken logic |

### When to Use TDD (Based on Research)

| Code Type | TDD Recommended? | Rationale |
|-----------|-----------------|-----------|
| **Critical business logic** | ✅ **Yes — recommended** | TDD provides design feedback, validates understanding, and constrains AI output |
| **Security-sensitive** | ⚠️ **TDD + automated gates** | Write tests first, then run SAST continuously (45% vulnerability rate) |
| **External APIs** | ❌ No — test-after | Over-mocking is anti-pattern; use real dependencies |
| **Agent workflows** | ❌ No — behavioral testing | Non-deterministic — needs multi-run validation |
| **Standard features** | ⚠️ **Optional** | Use TDD for clarity; risk-based tests for standard paths |

### Brownfield Testing (Existing Products)

**When evolving an existing product (research-based):**

| Aspect | Strategy | Rationale |
|--------|----------|----------|
| **Existing tests** | Adapt, don't replace | High coverage = regression focus; Low coverage = characterization tests |
| **New features** | TDD for critical, test-after for standard | Protect existing, innovate safely |
| **Existing invariants** | Regression + simulation/replay testing | AI agents can break invariants without detection |
| **Technical debt** | Risk-aware testing targets | Higher depth for risky areas |

---

### test-regression: Protect Existing Functionality

**Purpose:** Run existing test suite to detect regressions when AI modifies code.

**When to use:** Any scope that touches existing code in brownfield/hybrid context.

**Steps:**
```bash
# 1. Identify affected tests before changes
find . -path ./node_modules -prune -o \n  -name "*.test.*" -print -o \n  -name "*.spec.*" -print | xargs rg -l "module_name" > affected_tests.txt

# 2. Run baseline (before changes)
npm test -- --testPathPattern="$(cat affected_tests.txt | tr '\n' '|')" > baseline_results.json

# 3. After scope changes, rerun same tests
npm test -- --testPathPattern="$(cat affected_tests.txt | tr '\n' '|')" > post_change_results.json

# 4. Compare: any new failures = regression
diff baseline_results.json post_change_results.json
```

**CI/CD Gate:**
```yaml
regression:
  condition: "baseline_failures != post_change_failures"
  action: BLOCK
  rationale: "6.08% regression rate in vanilla agent runs (TDAD paper)"
```

---

### test-characterization: Document Existing Behavior

**Purpose:** Create golden tests that capture current behavior before AI changes.

**When to use:** Before modifying complex existing modules (no or few tests).

**Steps:**
```bash
# 1. Identify target module
TARGET_MODULE="src/auth/session.ts"

# 2. Generate characterization tests (capture existing behavior)
# Use AI to generate tests that pass with current implementation
npx vitest create test --filter "$TARGET_MODULE" --type characterization

# 3. Run and confirm all pass (baseline)
npm test -- --grep "$TARGET_MODULE"

# 4. Only then proceed with changes
# These tests become the regression guard
```

**Output:** `*.characterization.test.ts` files that document current behavior.

**Key principle:** Tests should PASS initially — they document what the code currently does, not what it should do.

---

### test-simulation: Replay Past Tasks

**Purpose:** Replay successful agent tasks from history to verify consistent behavior.

**When to use:** After AI completes similar tasks — verify it behaves the same way.

**Steps:**
```bash
# 1. Record task execution (from git history or logs)
task_id="fix-login-2026-05-15"
echo "Task: $task_id" > simulation_input.txt
cat commit_message.txt >> simulation_input.txt
cat changed_files.txt >> simulation_input.txt

# 2. Replay with different agent configuration
# Compare output to original successful run
agent --config "$AGENT_CONFIG" --replay simulation_input.txt > replay_output.txt

# 3. Diff against expected (original successful output)
diff expected_output.txt replay_output.txt

# 4. If diff > threshold → behavioral regression
```

**Tool integration:** AgentPatterns.ai recommends replay testing for agent verification.

**CI/CD Gate:**
```yaml
simulation:
  condition: "diff > tolerance_threshold"
  action: WARN
  rationale: "Behavioral drift from baseline"
```

---

### test-impact: TDAD-Style Impact Analysis

**Purpose:** Graph-based analysis to identify which tests to run before AI commits.


**When to use:** Before ANY scope execution in brownfield/hybrid context.


**Steps:**
```bash
# 1. Build code-to-test dependency graph
# Python example with pytest:
pytest --co -q | awk '{print $1}' | while read test; do
  deps=$(rg -o "import.*from.*['\"]\([^'\"]*\)['\"]\|require\(['\"]\([^'\"]*\)['\"]\)" "$test" | cut -d: -f2 | sort -u)
  echo "$test: $deps"
done > code_test_graph.json

# 2. For proposed change, query affected tests
TARGET_FILES="src/auth/ src/payment/"
cat code_test_graph.json | jq -r '.[] | select(.code_files | split(",") | inside($target)) | .test_file' \
  --arg target "$TARGET_FILES"

# 3. Run impact subset before changes (baseline)
npm test -- --testPathPattern="affected_tests" > impact_baseline.txt

# 4. After scope changes, run same tests
# Any new failures → scope not complete until fixed
```

**Alternative (simpler) using madge:**
```bash
# Generate dependency graph
npx madge --image dependencies.svg --format dot .

# Find tests affecting modified modules
npx madge --inverse src/payment/
```

**CI/CD Gate:**
```yaml
impact:
  condition: "new_failures_in_impact_set > 0"
  action: BLOCK
  rationale: "TDAD reduced regressions by 70%"
```

---

### Additional test scopes for Brownfield:

### Greenfield Testing (New Products)

**When building a new product:**

| Aspect | Strategy | Rationale |
|--------|----------|----------|
| **TDD adoption** | Full recommended | No legacy constraints, clean architecture |
| **Mutation targets** | Aggressive (70/50/30%) | Establish quality culture from day one |
| **Coverage** | Define target upfront | 80% baseline, higher for critical |
| **Technical debt** | None yet | Focus on clean patterns, not remediation |

### Hybrid (Feature Addition)

**When adding features to existing product:**

| Aspect | Strategy | Rationale |
|--------|----------|----------|
| **New code** | TDD for critical, test-after for standard | Same as greenfield |
| **Existing code** | Regression + protection | Same as brownfield |
| **Integration points** | Extra verification | Ensure new doesn't break old |
| **Agent behavior** | Behavioral + regression | Non-deterministic risk |

**Anti-patterns for Brownfield/Hybrid:**
- ❌ AI refactoring without test protection
- ❌ AI modifying existing code without characterization tests
- ❌ Over-mocking existing integrations
- ❌ Ignoring technical debt in scope planning

### TDD Cycle for AI Agents

```
1. RED: Write failing test (human or AI with explicit constraints)
2. GREEN: AI implements only enough to pass test
3. REFACTOR: Clean up with tests still passing

Key difference from human TDD:
- AI must see failing test BEFORE implementation
- Tests must be written independently of implementation
- Human validates test quality via critical-path coverage and negative cases
```

---

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
generated_by: cali-testing-ai-code
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

- **cali-product-tech-planning**: Produces scopes to test
- **cali-product-scope-executor**: Executes test scopes
- **cali-product-plan-critique**: Can review testing strategy