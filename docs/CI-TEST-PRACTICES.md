# CI/Pre-Commit Best Practices for This Project

**Why this file exists:**
Tests broke in CI because they used hardcoded paths. This file documents best practices to prevent future breakage.

---

## Problem: Hardcoded Paths Break CI

### ❌ Wrong: Hardcoded absolute paths
```typescript
const PROJECT_ROOT = '/Users/cali/Development/cali-product-workflow';
```

**Why it fails:** GitHub CI clones to `/home/runner/work/` — completely different path.

### ✅ Correct: Dynamic paths from test file location
```typescript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/integration
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root
```

**Why it works:** Resolves relative to test file, works anywhere.

---

## Best Practices for Tests

### 1. Always use dynamic PROJECT_ROOT

```typescript
// In every test file that accesses project files:
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
```

### 2. Use relative paths, not absolute

```typescript
// ❌ Wrong
const path = '/Users/cali/Development/cali-product-workflow/skills/...';

// ✅ Correct
const path = join(PROJECT_ROOT, 'skills/...');
```

### 3. Test paths before committing

```bash
# Always run tests locally before pushing
npm run test

# Especially after:
# - Adding new test files
# - Changing PROJECT_ROOT logic
# - Adding new test directories
```

### 4. Pre-commit hook

This project has a pre-commit hook in `.git/hooks/`. Ensure it runs:
```bash
# Install (if not already)
npm run test  # Hook runs this automatically on commit
```

---

## File Structure Rules

### Test files location

```
tests/
├── artifacts/          → PROJECT_ROOT = ../../../
├── golden/             → PROJECT_ROOT = ../../../
├── integration/        → PROJECT_ROOT = ../../../
├── skills/              → PROJECT_ROOT = ../../../
└── unit/               → PROJECT_ROOT = ../../..
```

Each subdirectory is 2 levels deep from project root (`../..`).

### For deeply nested test files

If you add tests in a deeper structure:
```
tests/something/nested/deep/test.ts
```
Use `join(__testDir, '..', '..', '..', '..', '..')` (5 levels up).

---

## CI Verification Checklist

Before pushing, verify:

- [ ] `npm run test` passes locally
- [ ] No hardcoded `/Users/` paths in tests
- [ ] No hardcoded `/home/` paths in tests
- [ ] Tests use `import.meta.url` for path resolution
- [ ] New test files follow the same pattern

---

## GitHub Actions Configuration

The CI workflow (`.github/workflows/ci.yml`) runs:

```yaml
- name: Run tests
  run: npm run test
```

This means **tests MUST pass locally before push**. CI won't merge broken tests.

---

## Quick Test Pattern

Copy this to every new test file:

```typescript
/**
 * [Test Description]
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dynamic PROJECT_ROOT for CI/local compatibility
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename);
const PROJECT_ROOT = join(__testDir, '..', '..');
```

---

## Common Mistakes to Avoid

1. **Don't copy hardcoded paths from error messages**
   - Error shows local path: use dynamic resolution instead

2. **Don't hardcode CI paths**
   - `/home/runner/work/...` is GitHub-specific

3. **Don't assume test location**
   - Tests may run from any directory
   - Always use `import.meta.url`

4. **Don't hardcode username**
   - `/Users/cali/` won't work for other developers or CI

---

## Reference

- [Node.js __dirname equivalent](https://nodejs.org/api/esm.html#importmetaurl)
- [Vitest configuration for path resolution](https://vitest.dev/config/)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)