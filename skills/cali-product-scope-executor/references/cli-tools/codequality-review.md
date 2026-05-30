# Tool: codequality-review

> Ultra-strict code quality review for implemented code.
> (Also known as: Thermo-Nuclear Review — cursor/thermo-nuclear-code-quality-review)

## Purpose

Validates that implemented code meets high quality standards:
- Abstraction quality — no leaky layers, unnecessary indirection
- File/function size — flags files >1000 lines, functions >150 lines, >5 params
- Cyclomatic complexity — flags complexity >5
- Code judo — seeks restructurations that simplify dramatically
- Naming standards — flags vague names, null returns, mutation, implicit deps
- Dead code detection — unused exports, TODOs, placeholders

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

## How to Invoke

Use as a skill via `/skill:thermo-nuclear-code-quality-review`

## When to Use

| Moment | Recommendation |
|--------|----------------|
| Gate final (before commit) | ✅ Always — validates all executed scopes |
| Per-scope (optional) | ✅ Ask user if scope meets criteria |

### Scope Complexity Assessment

After completing a scope, assess if codequality-review should run:

```markdown
Did this scope:
- Add >200 LOC total?
- Modify >2 files?
- Introduce new abstractions/helpers?
- Cross any file past 1000 lines?

If YES to any → run codequality-review
If NO to all → proceed (review at final gate)
```

## Output

Returns structured feedback:
- Files flagged for refactoring (>1000 lines)
- Functions flagged for extraction (>150 lines, >5 params, complexity >5)
- Abstractions that don't reduce cognitive load
- Vague naming or API design issues
- Dead code, unused exports, TODO comments

## Fallback (Not Installed)

If `codequality-review` (thermo-nuclear) is not available:
- Manually review for files >1000 lines
- Check functions for complexity >5
- Look for leaky abstractions and dead code
- Run `eslint --max-warnings=0` and `tsc --noEmit`

## Abstraction

"Ultra-strict maintainability review for code quality"
