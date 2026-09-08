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
| **Coverage/risk targets** | Appetite-specific: Lean critical path only; Core main logic + external seams; Complete full edge mapping + security | Establish quality baseline from day one |
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

