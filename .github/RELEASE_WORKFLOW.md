# Release Workflow Instructions

**This file contains instructions for LLMs handling releases in this project.**
**Read this before making any release-related actions.**

---

## Versioning Policy

- **Current version:** `0.1.0-alpha`
- **Versioning scheme:** Semantic Versioning (SemVer) with pre-release suffix
- **Do NOT bump to 1.0.0** until the owner explicitly decides to release v1.0.0
- **Pre-release tags:** `-alpha`, `-beta`, `-rc` (e.g., `0.2.0-alpha`)

---

## Release Workflow (Step by Step)

### When to Release

Release after merging to `main` when:
- Significant new features added
- Breaking changes introduced
- Bug fixes that users need
- Documentation updates
- Any change that warrants a release note

### Release Steps

**Step 1: Ensure tests pass**
```bash
npm run test
```

**Step 2: Merge to main (if not already)**
```bash
git checkout main
git merge --no-ff feature-branch
git push origin main
```

**Step 3: Create GitHub Release**
```bash
# Option A: Manual via GitHub CLI
gh release create v0.2.0-alpha \
  --title "v0.2.0-alpha: New Testing Skill" \
  --notes "## What's Changed

## New Features
- Add cali-product-testing-ai-code skill with 8 test scope types

## Bug Fixes
- Fix phase reference inconsistencies

## Documentation
- Update README with new skills
- Add AGENTS.md testing context

**Full Changelog:** https://github.com/renatocaliari/cali-product-workflow/compare/v0.1.0-alpha...v0.2.0-alpha"

# Option B: Use semantic-release (if configured)
npm run release
```

**Step 4: Publish to npm (if applicable)**
```bash
npm version 0.2.0-alpha
npm publish --access public --tag alpha
```

---

## Conventional Commits Format

Use this format for commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |
| `chore` | Maintenance tasks |

**Examples:**
```bash
git commit -m "feat(testing): add TDAD-style impact analysis"
git commit -m "fix(gate): correct phase reference from 6 to 5"
git commit -m "docs: update README with new skills count"
```

---

## Release Note Template

```markdown
## v{X.Y.Z}-{alpha|beta|rc.N}

### Breaking Changes
- (if any)

### New Features
- Feature A description
- Feature B description

### Bug Fixes
- Fix X description
- Fix Y description

### Documentation
- Update docs for Z

### Under the Hood
- Internal refactoring

---
**Full Changelog:** https://github.com/owner/repo/compare/v{prev}...v{current}
```

---

## GitHub Actions for Auto-Release (Optional)

To automate releases, add `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        
      - name: Generate changelog
        uses: requarks/changelog-action@v1
        id: changelog
        
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          prerelease: ${{ contains(matrix.version, 'alpha') || contains(matrix.version, 'beta') }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Version Bump Rules

| Change | Bump |
|--------|------|
| Add new feature | Minor (`0.2.0` → `0.3.0`) |
| Bug fix | Patch (`0.2.0` → `0.2.1`) |
| Breaking change | Major (`0.2.0` → `1.0.0`) |
| Pre-release | Add `-alpha.N` or `-beta.N` |

**Do NOT bump to 1.0.0 until owner confirms.**

---

## Quick Reference for LLMs

When asked to release, do this sequence:

```bash
# 1. Tests first
npm run test

# 2. Commit changes (if any)
git add -A && git commit -m "<type>(<scope>): <description>"

# 3. Merge to main
git checkout main && git merge --no-ff <branch> && git push

# 4. Create release
gh release create v0.X.Y-alpha --title "v0.X.Y-alpha: <summary>" --notes "<changelog>"

# 5. Push tags
git push origin v0.X.Y-alpha
```

---

## Remember

1. **Keep alpha/beta** — never auto-bump to 1.0.0
2. **Always include changelog** — tell what changed
3. **Run tests before release** — never release broken code
4. **Use conventional commits** — makes changelog generation easier
5. **Create GitHub release** — not just npm publish