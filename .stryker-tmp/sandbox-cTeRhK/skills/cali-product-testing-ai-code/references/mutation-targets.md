# Mutation Testing Targets Reference

Based on empirical research: AgentAssay (2026), CoderEval (2023), CodeRabbit (2025)

## Mutation Score Thresholds

| Risk Level | Target | Minimum | Examples |
|------------|--------|---------|----------|
| **Critical** | 70% | 60% | Payment, auth, data persistence, security |
| **Standard** | 50% | 40% | CRUD, UI, API endpoints, business logic |
| **Experimental** | 30% | 20% | Prototypes, new features, POC |

## Why Mutation Testing?

From research:
- **Coverage is insufficient**: 100% coverage with 4% mutation score = 96% bugs missed
- **AI code has 1.7x more bugs**: Traditional testing doesn't catch AI-specific failure modes
- **AI misses corner cases**: 75% more logic/correctness errors in AI PRs

## Mutation Operators for AI Code

### Traditional (Code Level)
| Operator | Example | Description |
|----------|---------|-------------|
| Comparison | `>` → `>=`, `<` → `<=` | Boundary conditions |
| Arithmetic | `+` → `-`, `*` → `/` | Math errors |
| Boolean | `true` → `false`, `&&` → `\|\|` | Logic errors |
| Return | early exit, null return | Exception paths |
| Assignment | `=` → `!=` | Comparison errors |

### AI-Specific (Context Level)
| Operator | Description |
|----------|-------------|
| Prompt perturbation | Change system prompt |
| Tool variation | Different tool parameters |
| Context window | Different context sizes |
| Model version | Test across model versions |

## Tools by Language

| Language | Tool | Command |
|----------|------|---------|
| JavaScript/TypeScript | Stryker | `npx stryker run` |
| Python | mutmut | `mutmut run` |
| Java | PIT | `mvn org.pitest:pitest-maven:mutationCoverage` |
| Go | go-mutate | `go-mutate` |
| Rust | muter | `cargo muter` |

## Mutation Testing Loop

```
1. Generate tests (AI)
2. Run mutation testing
3. Check surviving mutants
4. If mutation_score < target:
   - Feed surviving mutants to AI
   - Generate targeted tests
   - Rerun mutation testing
5. Repeat until target reached
```

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|--------------|
| Mutation Score | >= target per risk level | (Killed Mutants / Total Mutants) × 100 |
| Surviving Mutants | Decreasing trend | Count per iteration |
| Test Effectiveness | Increasing | Mutation score improvement |

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Mutation Testing
  run: |
    npx stryker run --reporters json
    mutation_score=$(cat report/mutation-score.json | jq '.score')
    if (( $(echo "$mutation_score < 0.7" | bc -l) )); then
      echo "BLOCK: Mutation score $mutation_score below 70%"
      exit 1
    fi
```

## Anti-Patterns

- ❌ **Over-mocking**: >3 mocks per test reduces mutation effectiveness
- ❌ **Coverage target**: 100% coverage ≠ good tests
- ❌ **Single-run**: AI agents are non-deterministic — run multiple times
- ❌ **Same AI for code AND tests**: Circular validation problem

## Key Statistics (Research)

| Finding | Source | Value |
|---------|--------|-------|
| AI code has more bugs | CodeRabbit 2025 | 1.7x |
| Logic errors increase | CodeRabbit 2025 | +75% |
| AI code vulnerable | Veracode 2025 | 45% |
| Critical vuln increase | ACM TOSEM | 2.5x |
| Bug rate with Copilot | Uplevel | +41% |