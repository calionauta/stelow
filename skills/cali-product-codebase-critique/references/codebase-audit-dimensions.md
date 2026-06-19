---
source: cali-product-codebase-critique
author: stelow
date: 2026-05-30
---

# Codebase Audit Dimensions

7 dimensions for evaluating codebase structure and quality.
Use for codebases without visual UI components.

---

## 1. Architecture (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **Module Structure** | Clear package/module boundaries? Single responsibility per module? |
| 2 | **Dependency Direction** | Dependencies flow inward or outward? No circular imports? |
| 3 | **Coupling** | High cohesion within modules, loose coupling between them? |
| 4 | **Abstraction Layers** | Clear separation (handler → service → repository)? |
| 5 | **Entry Points** | Well-defined public APIs per package? Internal vs exported clear? |

---

## 2. Data Flow (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **Call Chains** | Request/event flows are traceable end-to-end |
| 2 | **State Management** | Global state minimized? Local state preferred? |
| 3 | **Event Propagation** | Events/messages flow in one direction? No propagation loops? |
| 4 | **Side Effects** | Side effects isolated and explicit? |
| 5 | **Immutability** | Mutable state minimized? No surprise mutations? |

---

## 3. System Contracts (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **API Definitions** | Interfaces/contracts are explicit and typed |
| 2 | **Error Handling** | Errors are typed, not generic? Errors wrapped with context? |
| 3 | **Logging** | Structured logging? Correlation IDs? Appropriate log levels? |
| 4 | **Timeouts** | External calls have explicit timeouts? No unbounded waits? |
| 5 | **Retry Logic** | Appropriate retry with backoff? No infinite retries? |

---

## 4. Performance (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **Bundle Size** | No unnecessary imports, tree-shaking friendly |
| 2 | **Re-renders** | Unnecessary re-render triggers? Memoization in place? |
| 3 | **Lazy Loading** | Heavy dependencies loaded lazily? Code splitting? |
| 4 | **Data Fetching** | Proper caching? Deduplication of requests? |
| 5 | **Query Efficiency** | N+1 queries? Missing indexes? Batch queries where appropriate |

---

## 5. Theming (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **Design Tokens** | Colors, spacing, typography use CSS variables / tokens, not hardcoded |
| 2 | **Dark Mode** | Dark mode supported or planned? Token-based inversion? |
| 3 | **High Contrast** | High contrast mode considered? Token overrides available? |
| 4 | **Semantic Colors** | Color names are semantic (--color-primary), not literal (--color-blue) |

---

## 6. Responsive (Score 0-4)

| # | Item | What to Check |
|---|------|--------------|
| 1 | **Breakpoint Strategy** | Clear breakpoint strategy? Mobile-first? |
| 2 | **Media Queries** | Media queries used consistently? No magic number breakpoints? |
| 3 | **Container Queries** | Container queries used where appropriate? (vs viewport) |
| 4 | **Flexible Layouts** | Flex/grid used instead of fixed widths? |
| 5 | **Text Scaling** | Relative units (rem/em) not px for text? |

---

## 7. AI Slop in Code (Score 0-4)

| # | Tell | What to Check |
|---|------|--------------|
| 1 | **Over-generated boilerplate** | Repeated patterns that could be a loop or function |
| 2 | **Dead code** | Unused functions, imports, variables |
| 3 | **Deeply nested conditionals** | >3 levels of nesting suggests missing abstraction |
| 4 | **Identical blocks >15 lines** | Repeated code that should be a shared function |
| 5 | **Unnecessary abstraction** | One-liner functions, over-parameterization, factory-of-factories |
| 6 | **Generic naming** | `data`, `info`, `result`, `item` everywhere |
| 7 | **Over-commented code** | Comments that repeat what the code says, not why |
| 8 | **Copied test patterns** | Tests that are copy-pasted with only value changes |

**Verdict by tell count:**
- 0-1 tells: Clean — intentional, well-structured code
- 2-3 tells: Some slop — worth a cleanup pass
- 4+ tells: Heavy AI over-generation — restructure recommended

---

## Severity Definitions

| Severity | Definition | When to Fix |
|----------|------------|-------------|
| **P0 — Blocking** | Security risk, data loss, production crash | Before any release |
| **P1 — Major** | Performance regression, maintainability debt | Before public release |
| **P2 — Minor** | Code quality, dead code, naming | Next release cycle |
| **P3 — Polish** | Nice-to-have, no real impact | If time permits |

## Rating Bands (total across all 7 dimensions)

| Score | Band |
|-------|------|
| 25-28 | Excellent |
| 18-24 | Good |
| 10-17 | Acceptable |
| 5-9 | Poor |
| 0-4 | Critical |
