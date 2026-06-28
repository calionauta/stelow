---
name: cali-product-coding-standards
description: >
  [Cali] Self-contained coding standards for product planning. Universal
  principles (KISS, DRY, LoB, SoC, Fail Fast, YAGNI, file/function size limits).
  Use when generating or reviewing code within any product planning context.
metadata:
  frequency: daily
  category: code
  context-cost: low
---

# Product Coding Standards

> **Self-contained.** This skill includes universal coding principles — no external prerequisite skills needed.

---

## Core Principles

### 1. KISS — Keep It Simple, Stupid
Prefer the boring solution. Clever code is a liability for both humans and LLMs.

- No function >50 lines (Go: 100 lines)
- No file >400 lines (Go: 500 lines)
- Cyclomatic complexity per function <10
- Max 3 indentation levels (use early returns / guard clauses)

### 2. DRY — Don't Repeat Yourself
Wait for the third repetition before abstracting. Premature DRY creates the wrong abstraction.

- Logic duplication → extract shared function
- Configuration duplication → centralize in constant/config
- Template duplication → create partial/component
- Duplication >5% of file is a warning sign

### 3. Convention over Configuration
Follow established conventions of the language/framework before introducing custom config.

- Sensible defaults, standardized names, predictable directory structure
- Explicit configuration only when deviating from convention
- Predictable patterns are a force multiplier for LLMs and developers

### 4. Progressive Disclosure
Simple by default, complexity behind toggles.

- Essentials first, advanced later
- Skills should structure content in 3 tiers: metadata → instructions → references
- Avoid overwhelming with options upfront

### 5. Polymorphism When Useful
Interfaces for extensibility only when it adds real value.

- Prefer concrete types over premature abstractions
- Don't create interfaces for a single implementation
- Add interfaces when you have 2+ concrete implementations

### 6. Locality of Behavior (LoB)
Behavior lives close to where it's used — in the template/view that owns it.

- Use the framework's native declarative attributes before custom JavaScript
- Inline JS only when framework doesn't offer native behavior
- Frontend is a dumb reactive terminal — minimum possible logic on the client

### 7. Separation of Concerns (SoC)
For backend code and multi-layer frameworks.

- Separate template, logic, data, and style in distinct layers
- Component/layer does one thing: handler shouldn't call database directly
- Business logic outside template: extract to services, repositories, helpers

### 8. Fail Fast
Validate at the boundary. Return errors immediately.

- Never silently swallow errors
- Never defer validation to a later layer
- Guard clauses at function entry
- Return meaningful error messages

### 9. YAGNI — You Aren't Gonna Need It
Don't build for future needs. Implement only what's needed now.

- No speculative features
- No "we might need this later" abstractions
- Refactor when the need actually arrives

---

## Tie-Breaker Rule

When LoB and SoC conflict:

| Context | Principle |
|---|---|---|
| Template/frontend layer (HTML with reactive attributes) | ✅ **LoB** — behavior in the template that uses it |
| Backend layer (handlers, services, repos) | ✅ **SoC** — separation into layers |
| Multi-layer frameworks (React, Vue, Svelte) | ✅ **SoC** — everything in separate layers |
| Mix LoB + SoC frameworks | ⚠️ LoB on frontend, SoC on backend |
| Unsure | **SoC** is the safe default |

---

## File and Function Size Limits

| Metric | Universal | Go Override |
|---|---|---|
| Lines per function | 50 | 100 |
| Lines per file | 400 | 500 |
| Cyclomatic complexity | 10 | 10 |
| Indentation depth | 3 levels | 3 levels |

**Why Go relaxes limits:** Typed language, explicit error handling adds lines, Go convention favors longer but linear functions.

See `references/file-function-sizes.md` for detailed limits by language, rationale, and enforcement patterns.
See `references/ci-enforcement.md` for CI patterns to enforce these standards.

---

## Output Structure

When applying these principles, produce code that:

1. **Follows the principle hierarchy** — KISS > DRY > Convention > Progressive Disclosure
2. **Uses the tie-breaker rule** — determines LoB vs SoC by context
3. **Respects size limits** — functions <50 lines, files <400 lines (Go: 100/500)
4. **Has clear boundaries** — each function does one thing, each file has one responsibility
5. **Fails fast** — validates at boundaries, returns errors immediately

## Expected Behavior

### Strong Output
- Code that follows all 9 principles naturally
- Functions under the size limit
- Clear separation between frontend (LoB) and backend (SoC)
- Error handling at boundaries
- No premature abstractions

### Weak Output
- Functions >50 lines (Go: >100 lines)
- Files >400 lines (Go: >500 lines)
- Business logic in templates
- `fmt.Sprintf` with HTML tags in Go
- Error swallowing (`if err != nil { return nil }`)
- Premature interfaces for single implementations
- Domain state in frontend instead of backend
- Hardcoded URLs instead of hypermedia discovery

---

## Relationship with Other Skills

| Skill | Relationship |
|---|---|
| `cali-product-tech-planning` | Uses these principles for tech plan generation |
