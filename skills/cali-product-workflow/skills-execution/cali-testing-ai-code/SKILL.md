---
name: cali-testing-ai-code
description: >
  [Cali] AI-aware testing strategy skill for software products.
  Generates mutation-based testing plans, security gates, and coverage targets.
  Activated automatically when product_type is "software" or "hybrid".
  
  Trigger keywords: test strategy, mutation testing, test coverage, AI-aware testing,
  security gates, TDD guidance

  Based on empirical research: AgentAssay (2026), MSR 2026, Veracode 2025, CodeRabbit 2025,
  LLM4TDD (2023), TDD-with-AI-Agents (2026).
---

# AI-Aware Testing Strategy

> **Based on empirical research:**
> - AgentAssay (2026): Non-deterministic agent testing framework
> - MSR 2026: Over-mocking anti-patterns in AI-generated tests
> - Veracode 2025: 45% of AI code contains vulnerabilities
> - CodeRabbit 2025: AI code has 1.7x more bugs than human code
> - CoderEval (2023): 43.1% of AI code is less robust

## Goal

Generate an AI-aware testing strategy for software products, including:
- **Mutation-based testing plans** with coverage targets
- **Security gates** (SAST, dependency scanning)
- **TDD guidance** based on empirical research
- **Test-* scope types** for cali-tech-planning

## When to Use

Activate when:
- `product_type: software` or `product_type: hybrid` in spec-product.md frontmatter
- Phase 10 (Tech Planning) of cali-product-workflow
- User wants AI-aware testing strategy

**Do NOT activate for:**
- Non-software products (SaaS without code, services)
- Existing products with well-established test suites

## Activation

- **Trigger:** `product_type: software` or `product_type: hybrid` in spec-product.md frontmatter
- **Phase:** Phase 10 (Tech Planning)
- **Prerequisite:** approved spec-product.md with scope defined

### Product Context (Greenfield vs Brownfield)

**Before generating testing strategy, determine the product context:**

| Context | Description | Testing Approach |
|---------|-------------|-----------------|
| **Greenfield** | New product, no existing code | TDD-first, full mutation coverage, clean slate |
| **Brownfield** | Existing product with features | TDD for critical paths, test-after for existing code, regression focus |
| **Hybrid** | Adding features to existing product | Separate new from existing, protect invariants |

**Based on context from setup or spec-product.md:**
- `greenfield`: Full TDD recommendation, aggressive mutation targets (70/50/30%)
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
| `testing-strategy.md` | `.cali-product-workflow/{date}/{_dir}/plans/testing-strategy.md` |
| `test-*` scopes | Added to `spec-tech.md` |

## TDD Guidance for AI-Aware Testing

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

## Mutation Testing Guidance

### Mutation Targets by Context

| Context | High | Medium | Low |
|---------|------|--------|------|
| **Greenfield** | 70% | 50% | 30% |
| **Brownfield** | 50% | 30% | 20% |
| **Hybrid** | 60% | 40% | 25% |

### Coverage by Layer

| Layer | Greenfield | Brownfield | Hybrid |
|-------|------------|-------------|--------|
| Unit | 80% | 50% | 70% |
| Integration | 60% | 40% | 50% |
| E2E | 40% | 30% | 35% |

## Security Gates

For `test-security` scopes:

1. **SAST Scan** — Run on every PR
   - Tool: Semgrep, ESLint security
   - Gate: No HIGH/CRITICAL

2. **Dependency Scan** — Run on every dependency change
   - Tool: npm audit, Trivy, OSV
   - Gate: No known vulnerabilities

3. **Secrets Detection** — Run on every commit
   - Tool: gitrob, detect-secrets
   - Gate: No hardcoded secrets

## Output Format

This skill produces:
- **testing-strategy.md** — AI-aware testing strategy
- **test-* scopes** — Added to spec-tech.md

### testing-strategy.md Format

```markdown
# AI-Aware Testing Strategy

## Product Context
[greenfield | brownfield | hybrid]

## Testing Approach
[TDD-first | test-after | hybrid]

## Mutation Targets
| Layer | Target |
|-------|--------|
| Unit | 70% |
| Integration | 50% |
| E2E | 30% |

## Security Gates
| Gate | Tool | Frequency |
|------|------|-----------|
| SAST | Semgrep | Every PR |
| Dependency | npm audit | Every dep change |
| Secrets | detect-secrets | Every commit |

## Test Scopes (for spec-tech.md)
- [SCOPE-X]: test-unit — Unit tests with mutation
- [SCOPE-X+1]: test-integration — Integration tests
- [SCOPE-X+2]: test-security — Security gates
```

## Gotchas

1. **TDD limitations** — TDD alone is insufficient for AI-generated code
2. **Over-mocking** — Don't over-mock external APIs (anti-pattern for AI code)
3. **Same AI problem** — AI-generated code + AI-generated tests = circular validation
4. **Mutation targets** — Context-dependent (greenfield vs brownfield vs hybrid)
5. **Security gates** — Non-negotiable for software products

## Testing

### Trigger Tests
- "Generate test strategy" + software product → should trigger
- "Add testing to plan" + hybrid product → should trigger
- "Plan a marketing campaign" → should NOT trigger

### Output Tests
- testing-strategy.md contains mutation targets
- test-* scopes added to spec-tech.md
- Security gates documented
- TDD guidance specific to context

## Related Skills

- **cali-tech-planning**: Generates scopes that include test-* types
- **cali-product-scope-executor**: Executes test scopes with gates
- **cali-plan-critique**: Can review testing strategy

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`