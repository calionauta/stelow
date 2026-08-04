# Release Workflow Instructions

> **Canonical source:** `AGENTS.md` → **Versioning**. This file is a **supplementary operator-facing** companion for release agents — useful for the `gh release create --notes-file` invocation shape, the Conventional Commits table, and the Release Note template. **If this file and `AGENTS.md` disagree, `AGENTS.md` wins.** Always re-read `AGENTS.md#Versioning` before cutting a release.

**This file contains instructions for LLMs handling releases in this project.**
**Read this before making any release-related actions.**

---

## Versioning Policy

- **Scheme:** Semantic Versioning (`MAJOR.MINOR.PATCH`). No `-alpha`, `-beta`, or `-rc` pre-release suffix is in use.
- **Distribution:** Stelow ships **via Git/GitHub only** — annotated git tag + `gh release create`. There is **no `npm publish` step**; release agents must not run `npm publish`.
- **Single source of truth:** the current version is read from `package.json#version`. `npm run version:sync` propagates it to plugin files (`plugins/fusion-plugin-stelow/manifest.json`, `plugins/fusion-plugin-stelow/package.json`). Never guess the version.
- **Tag and GitHub Release are linked — never one without the other.** A git tag alone does not create a GitHub Release; the GitHub landing page shows only Releases, not tags.

---

## Release Workflow

Follow the canonical 9-step recipe in `AGENTS.md#Versioning` end-to-end:

1. **Tests pass.** Run `npm test` (or the targeted impacted suite) on the worktree before bumping anything. Do not cut a release with failing tests.
2. **Bump version.**
   ```bash
   npm version <major.minor.patch> --no-git-tag-version
   ```
   This updates `package.json` + `package-lock.json`. (`npm version` runs the `version` lifecycle script, which invokes `version:sync` and propagates the new version into the plugin files.)
3. **Re-bake the Fusion plugin artifacts.** This step is non-optional after `version:sync`:
   ```bash
   npm run prepare:fusion-plugin && npm run build:fusion-plugin
   ```
   Re-bakes `plugins/fusion-plugin-stelow/src/skills.ts#STELOW_PLUGIN_VERSION` and the compiled `plugins/fusion-plugin-stelow/artifacts/settings.json` from `manifest.json#version`. SW-008 shipped `v0.55.0` with stale `0.54.3` baked into these files because this step was skipped on the release commit. **Do not skip.**
4. **Update `CHANGELOG.md`.** Insert a new `## [<version>] - <YYYY-MM-DD>` entry above the previous one, with subsections matching this repo's actual sections (see [Release Note Template](#release-note-template)). End the entry with `**Full Changelog:** https://github.com/calionauta/stelow/compare/v<prev>...v<current>`.
5. **Verify the six-point version agreement.** All six must equal the new version:
   - `package.json` → `"version"`
   - `package-lock.json` → root + `packages.""` `version`
   - `plugins/fusion-plugin-stelow/manifest.json` → `"version"`
   - `plugins/fusion-plugin-stelow/package.json` → `"version"`
   - `plugins/fusion-plugin-stelow/src/skills.ts` → `STELOW_PLUGIN_VERSION` constant
   - `plugins/fusion-plugin-stelow/dist/skills.d.ts` → matching declaration (re-baked by Step 3)
6. **Commit the bump.**
   ```bash
   git add -A && git commit -m "chore: bump to v<version>"
   ```
7. **Tag the release** (annotated — `git cat-file -t v<version>` must return `tag`).
   ```bash
   git tag -a v$(node -p "require('./package.json').version") -m "v<version>: <short summary>"
   ```
8. **Push** main (fast-forwarded to the release commit) and the tag.
   ```bash
   git push origin main --tags
   ```
9. **Create the GitHub Release** — required for the GitHub landing page.
   ```bash
   gh release create v$(node -p "require('./package.json').version") \
     --title "v<version>" \
     --notes-file <changelog-section-file>
   ```

The "merge to main first" handoff is owned by the SW-N worktree fast-forward (`git update-ref refs/heads/main <release-sha>`), not by anything in this file — see the SW-N executor pattern in `AGENTS.md` and `docs/audits/sw-010-v0.55.1-release-report.md`.

---

## Conventional Commits Format

Use this format for commit messages (the type drives the changelog section):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type        | When to Use                            | Maps to CHANGELOG section |
|-------------|----------------------------------------|---------------------------|
| `feat`      | New feature                            | `Added`                   |
| `fix`       | Bug fix                                | `Fixed`                   |
| `docs`      | Documentation changes                  | `Documentation`           |
| `test`      | Adding or updating tests               | `Under the Hood`          |
| `refactor`  | Code refactoring (no behavior change)  | `Changed`                 |
| `perf`      | Performance improvements               | `Changed`                 |
| `ci`        | CI/CD changes                          | `Under the Hood`          |
| `chore`     | Maintenance tasks (version bumps, deps)| `Under the Hood`          |

**Scope examples (current repo):** `stages`, `workflow`, `adapter`, `fusion-plugin`, `release`, `skills`, `extensions`, `tests`, `docs`.

**Examples:**
```bash
git commit -m "feat(fusion-plugin): add settings.json artifact validation"
git commit -m "fix(stages): correct phase reference in plan-gate"
git commit -m "docs(AGENTS): clarify six-point version agreement"
```

---

## Release Note Template

Save the body of the release note to a temp file and pass it via `--notes-file` (never inline `--notes`; the file is easy to review and re-uses for the `gh release create` call):

```markdown
## v{X.Y.Z}

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

### Removed
- Dropped legacy Y (see issue/PR)

---
**Full Changelog:** https://github.com/calionauta/stelow/compare/v{prev}...v{current}
```

Section set mirrors what this repo actually publishes in `CHANGELOG.md` (`Added`, `Changed`, `Fixed`, `Removed`, `Documentation`, `Under the Hood`); trim empty sections before uploading.

---

## Version Bump Rules

| Change                | Bump                                  |
|-----------------------|---------------------------------------|
| Add new feature       | Minor (`0.55.x` → `0.56.0`)           |
| Bug fix               | Patch (`0.55.0` → `0.55.1`)           |
| Breaking change       | Major (`0.x.y` → `1.0.0`)             |

`1.0.0` is no longer owner-gated in this repo — AGENTS.md dropped that constraint with the v0.55.x release model. Bump per SemVer and document the rationale in the release commit / changelog.

---

## Quick Reference for LLMs

```bash
# 1. Tests
npm test

# 2. Bump version (runs version:sync via lifecycle)
npm version <major.minor.patch> --no-git-tag-version

# 3. Re-bake Fusion plugin artifacts (do NOT skip)
npm run prepare:fusion-plugin && npm run build:fusion-plugin

# 4. CHANGELOG.md
$EDITOR CHANGELOG.md   # insert ## [<version>] - <YYYY-MM-DD> above previous entry

# 5. Verify six-point version agreement (all six files must match)
grep -H '"version"' package.json package-lock.json \
  plugins/fusion-plugin-stelow/manifest.json \
  plugins/fusion-plugin-stelow/package.json
grep -H 'STELOW_PLUGIN_VERSION' plugins/fusion-plugin-stelow/src/skills.ts

# 6. Commit + annotated tag + push
git add -A && git commit -m "chore: bump to v<version>"
git tag -a v$(node -p "require('./package.json').version") -m "v<version>: <summary>"
git push origin main --tags

# 7. Create the GitHub Release (--notes-file, not inline --notes)
gh release create v$(node -p "require('./package.json').version") \
  --title "v<version>" \
  --notes-file <changelog-section-file>

# Do NOT run npm publish — distribution is Git/GitHub only
```

---

## Remember

1. **`AGENTS.md#Versioning` is canonical.** Re-read it before cutting a release; this file is supplementary.
2. **Distribution is Git/GitHub only — never `npm publish`.** Stelow has no npm distribution channel.
3. **Always include the changelog in the Release body** — use `--notes-file <changelog-section-file>`, never inline.
4. **Use conventional commits** — the type drives the CHANGELOG section mapping.
5. **Tag and GitHub Release are linked — never one without the other.** Both are required for the GitHub landing page.
6. **Verify the six-point version agreement** before the release commit. SW-008 shipped `v0.55.0` with a stale `0.54.3` baked into `STELOW_PLUGIN_VERSION` and `artifacts/settings.json`; the post-version-sync `prepare:fusion-plugin && build:fusion-plugin` step is the fix.
