# Tool: codequality-review

> Ultra-strict code quality review for implemented code.
> Also known as: Thermo-Nuclear Review (`cursor/thermo-nuclear-code-quality-review`).

## Purpose

Use this as an optional ultra-strict maintainability gate after the normal
verification flow has passed. It validates implemented code against high quality
standards:

- abstraction quality: no leaky layers, unnecessary indirection, or accidental complexity
- file/function size: files over 1000 lines, functions over 150 lines, functions with more than 5 parameters
- cyclomatic complexity: complexity over 5
- naming and API design: vague names, null returns, mutation, implicit dependencies
- dead code detection: unused exports, TODOs, placeholders, unreachable branches

This tool is **not installed by default** and is **not a replacement** for:

- unit/integration tests
- lint/typecheck/static analysis
- fresh-context code review
- UI/UX accessibility audits
- execution critique

## Install

**Pi:**

```bash
pi install git:github.com/cursor/plugins
# Then use via skill reference
```

**Other CLIs (OpenCode, Claude Code, Codex):**

```bash
npx skills add cursor/plugins -a <cli> -g
# Example: npx skills add cursor/plugins -a opencode -g
```

## How to invoke

Use as a skill via:

```text
/skill:thermo-nuclear-code-quality-review
```

Run it only after verification passes and before final commit/merge.
When running inside stelow, save or copy the result to:

```text
.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md
```

## When to run

Run `thermo-nuclear-code-quality-review` only when all three conditions are true:

1. `product_type` is `software` or `hybrid`
2. the diff includes code changes
3. the appetite/review mode/risk matrix below says to run it

### Appetite + mode matrix

| Appetite | Review Mode | Decision |
|----------|------|----------|
| `Lean` | any | **Skip** unless the user explicitly requests it. |
| `Core` | `Auto` / `Only Product Spec` | **Skip** unless risk is high. |
| `Core` | `Product Spec + Interface Choice` / `All Above + Scopes In/Out` | Run when risk is high. |
| `Core` | `All Above + Tech Review` | Run when risk is high or the diff is meaningful. |
| `Complete` | `Auto` / `Only Product Spec` | **Run** if code changed. Resolve or document findings without asking. |
| `Complete` | `Product Spec + Interface Choice` | **Run** if code changed. Escalate P0/P1 gaps to the user. |
| `Complete` | `All Above + Scopes In/Out` | **Run** if code changed. P0/P1 gaps need fix or explicit human acceptance. |
| `Complete` | `All Above + Tech Review` | **Mandatory** for software/hybrid code changes. Blocking gate before merge. |

### High-risk trigger

Treat risk as high when any condition is true:

- auth, payments, permissions, data persistence, migrations, API contracts, queues/jobs, or security-sensitive paths changed
- new shared abstraction, framework integration, architecture boundary, or public contract changed
- diff touches `>= 5` files, `>= 200` LOC, or any file over `1000` lines
- function complexity, cyclomatic complexity, or maintainability risk is likely to exceed normal review capacity
- prior verification found correctness, performance, or security concerns that need deeper review

## Output

Expected output should include:

- files flagged for refactoring, especially files over 1000 lines
- functions flagged for extraction, especially functions over 150 lines, more than 5 parameters, or complexity over 5
- abstractions that do not reduce cognitive load
- vague naming or API design issues
- dead code, unused exports, TODO comments, placeholders
- severity classification: P0/P1/P2/P3 or equivalent

Save the report to the stelow verification path above so `cali-product-execution-critique` can consume it.

## Fallback (not installed)

If `thermo-nuclear-code-quality-review` is not installed:

- run the normal `code-quality-gate` checks from `skills/stelow-product-orchestrator/stages/verification.md`
- manually review files over 1000 lines
- check functions over 150 lines and complexity over 5
- look for leaky abstractions, dead code, vague API boundaries, and accidental complexity
- document the fallback in the verification notes

## Abstraction

Ultra-strict maintainability review for high-risk or Complete-appetite code changes.
