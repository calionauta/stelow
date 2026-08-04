# CI Enforcement Patterns

## Go Stack

### HTML in Go (fmt.Sprintf with HTML tags)
```bash
# BLOCKED by CI
grep -r 'fmt\.Sprintf.*<' .
# Must return empty

# Why: Go's html/template handles XSS escaping automatically.
# fmt.Sprintf bypasses this safety, creating XSS vulnerabilities.
# With Templ, this is less relevant (Templ handles escaping),
# but the grep serves as a safety net for legacy code.
```

### God Functions (>100 lines)
```yaml
# .golangci.yml
linters-settings:
  funlen:
    lines: 100
    statements: 50
```

### File Size (>500 lines)
```yaml
# .golangci.yml
linters-settings:
  cyclop:
    max-package-lines: 500
```

## Universal

### Unused Imports
```yaml
# Go
linters:
  - unused

# JavaScript/TypeScript
# ESLint: no-unused-vars
```

### Console.log in Production
```yaml
# ESLint
rules:
  no-console: error
```

### Secrets in Code
```yaml
# GitHub Action
- uses: trufflesecurity/trufflehog@main
  with:
    extra_args: --only-verified
```

### Indentation Depth
```yaml
# ESLint
rules:
  max-depth: error
  # max-depth: [error, 3]
```

## Pre-commit Hook

```bash
#!/bin/bash
# .pre-commit-config.yaml or manual hook

set -e

echo "🔍 Running coding standards checks..."

# 1. File size check
echo "Checking file sizes..."
MAX_LINES=400
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(go|js|ts|py)$'); do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    if [ "$lines" -gt "$MAX_LINES" ]; then
      echo "❌ $file has $lines lines (max $MAX_LINES)"
      exit 1
    fi
  fi
done

# 2. Function length check (Go)
echo "Checking function lengths..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.go$'); do
  if [ -f "$file" ]; then
    # Simple grep for func declarations followed by opening brace
    awk '/^func / { start=NR } /^\{/ { if(start) {brace_start=NR} } /^\}/ { if(start) { lines=NR-brace_start+1; if(lines > 100) print FILENAME ":" start ": function has " lines " lines (max 100)" } start=0 }' "$file"
  fi
done

# 3. fmt.Sprintf with HTML check (Go)
echo "Checking fmt.Sprintf with HTML..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.go$'); do
  if [ -f "$file" ]; then
    matches=$(grep -n 'fmt\.Sprintf.*<' "$file" || true)
    if [ -n "$matches" ]; then
      echo "❌ fmt.Sprintf with HTML tags found in $file:"
      echo "$matches"
      exit 1
    fi
  fi
done

# 4. Indentation depth check
echo "Checking indentation depth..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts)$'); do
  if [ -f "$file" ]; then
    # Check for 4+ levels of indentation (tabs or spaces)
    matches=$(grep -n '^\t\t\t\t\|^    \s*    \s*    \s*    ' "$file" || true)
    if [ -n "$matches" ]; then
      echo "⚠️ Deep indentation found in $file (4+ levels):"
      echo "$matches" | head -5
    fi
  fi
done

echo "✅ All checks passed!"
```

## GitHub Actions Workflow

```yaml
name: Coding Standards

on: [push, pull_request]

jobs:
  standards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check file sizes
        run: |
          find . -name "*.go" -o -name "*.js" -o -name "*.ts" | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt 400 ]; then
              echo "❌ $file has $lines lines (max 400)"
              exit 1
            fi
          done
      
      - name: Check fmt.Sprintf with HTML (Go)
        run: |
          if grep -r 'fmt\.Sprintf.*<' --include="*.go" .; then
            echo "❌ fmt.Sprintf with HTML tags found"
            exit 1
          fi
      
      - name: Run linters
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest
```

## Linter Configurations

### Go (.golangci.yml)
```yaml
linters:
  enable:
    - funlen
    - cyclop
    - unused
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused

linters-settings:
  funlen:
    lines: 100
    statements: 50
  cyclop:
    max-complexity: 10
    max-package-lines: 500
```

### JavaScript/TypeScript (.eslintrc.js)
```javascript
module.exports = {
  rules: {
    'max-depth': ['error', 3],
    'max-lines-per-function': ['error', 50],
    'max-lines': ['error', 400],
    'no-console': 'error',
    'no-unused-vars': 'error',
  },
};
```

### Python (pyproject.toml)
```toml
[tool.ruff]
line-length = 88

[tool.ruff.mccabe]
max-complexity = 10

[tool.ruff.per-file-ignores]
"__init__.py" = ["F401"]
```
