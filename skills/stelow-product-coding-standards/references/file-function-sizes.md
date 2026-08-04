# File and Function Size Limits

## Universal Defaults

| Metric | Limit | Warning | Block |
|---|---|---|---|
| Lines per function | 50 | 40 | 50 |
| Lines per file | 400 | 350 | 400 |
| Cyclomatic complexity | 10 | 8 | 10 |
| Indentation depth | 3 levels | 2 | 3 |

## Go + Datastar Stack (Overrides)

| Metric | Limit | Warning | Block |
|---|---|---|---|
| Lines per function | 100 | 80 | 100 |
| Lines per file | 500 | 400 | 500 |
| Functions per handler | 1 | — | 1 |

## Why These Limits?

### 50 Lines/Function (Universal)
- Average screen height: function visible without scrolling
- LLM context friendly: fits in a single read operation
- Cognitive load: human can hold entire function in working memory
- Testing: easier to write focused unit tests

### 100 Lines/Function (Go Override)
- Go error handling adds explicit `if err != nil` blocks
- Go convention favors longer but linear functions (no nested callbacks)
- Go functions are often boilerplate-heavy (struct initialization, error wrapping)
- Still must be readable top-to-bottom without scrolling back

### 400 Lines/File (Universal)
- Manageable for LLM context: fits in ~16K tokens
- grep-friendly: searches return focused results
- Module boundaries: natural splitting point
- Code review: reviewer can hold entire file in context

### 500 Lines/File (Go Override)
- Go files often contain related functions (e.g., all CRUD handlers)
- Go packages are organized by functionality, not by class
- Go convention: one file per concern within a package
- Still must be split before adding new code

## Enforcement Patterns

### Pre-commit Hook
```bash
#!/bin/bash
# Check function length
MAX_FUNC_LINES=50  # or 100 for Go
MAX_FILE_LINES=400 # # or 500 for Go

for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(go|js|ts|py)$'); do
  # Check file length
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_FILE_LINES" ]; then
    echo "❌ $file has $lines lines (max $MAX_FILE_LINES)"
    exit 1
  fi
done
```

### CI Check
```yaml
# GitHub Actions
- name: Check file sizes
  run: |
    find . -name "*.go" -exec sh -c '
      lines=$(wc -l < "$1")
      if [ "$lines" -gt 500 ]; then
        echo "❌ $1 has $lines lines (max 500)"
        exit 1
      fi
    ' _ {} \;
```

### Linter Configuration
```yaml
# .golangci.yml
linters-settings:
  funlen:
    lines: 100
    statements: 50
  cyclop:
    max-complexity: 10
    max-package-lines: 500
```

## When to Split

### Split a Function When:
- Exceeds 50 lines (Go: 100 lines)
- Has more than 3 levels of nesting
- Does more than one thing (violates Single Responsibility)
- Is harder to test than to write

### Split a File When:
- Exceeds 400 lines (Go: 500 lines)
- Contains unrelated functionality
- Has more than 10 imports
- Is harder to navigate than to split

### Extract a Module When:
- Multiple files share the same utility functions
- A pattern repeats in 3+ places
- The shared code has its own lifecycle (versioning, testing)
