## 📋 Examples

### Example 1: Workflow mode (spec-tech.md path)

**Input:** "@.stelow/teste/plans/spec-tech_v1.md — audit implementation"

**Output:**
```markdown
# Execution Critique Report

**Mode:** workflow
**Source:** spec-tech_v1.md (12 scopes: 8 feature, 2 optimization, 2 test-*)

## Summary
| Items evaluated | 12 |
| Items complete | 10 |
| Items partial | 2 |
| Gaps identified | 3 |

### 1. Scope Completeness
| Scope | Status | Notes |
|-------|--------|-------|
| S1: Auth middleware | ✅ | |
| S2: Login page | ✅ | |
| S3: Rate limiter | ⚠️ | Missing tests |

### Decision
⚠️ Follow-up: S3 needs integration tests before next cycle
```

### Example 2: Standalone mode (no input)

**Input:** "Check my work" (in a Git repo, after implementing a feature)

**Output:**
```markdown
# Execution Critique Report
**Mode:** standalone
**Source:** sem diff + git diff (5 entities changed)

## Summary
| Items evaluated | 5 |
| Items complete | 5 |
| Gaps identified | 1 |

### Gap: No tests for auth.go (new file)
| Gap Type: missing-tests | Impact: medium | Resolution: Add unit tests |

### Decision
📝 Document gap, close cycle. Add tests in next PR.
```

---
