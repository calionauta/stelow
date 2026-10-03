# Contributing

Docs and methodology live in one place: this repo, on `main`, via
squash-merged PRs. Coding agents working here read `AGENTS.md` at the
repo root — it is normative for them. This page is the human summary.

## What goes where

- `skills/**`, `scripts/stelow`, `product-strategies.json`,
  `stages.yaml`/`transitions.md` are **executable methodology** — an LLM
  reads them as behavior, not prose. Any change that alters what a worker
  does ships as `feat:` / `fix:` and merits a release, even when the diff
  is only Markdown.
- `docs:` prefix is reserved for **editorial** changes that alter no
  behavior (typos, formatting, `docs/`, `HOSTING.md`, `README.md`).
  Mislabeling behavior as `docs:` silently skips the release it deserves.
- `docs/` (this site) must stay truthful: feature bullets and behavior
  sections describe the current product only. Any behavioral commit
  updates them alongside the code; counts are test-pinned, prose is
  reviewer-pinned.

## Rules that matter most

- **Single working clone:** `~/repos/stelow` is the only clone where
  methodology/skill work happens on the deploy host. Never edit skills
  in a throwaway clone.
- **Stages:** edit `stages.yaml`, regenerate `transitions.md` — never
  hand-edit the mirror. Skill changes update `product-strategies.json`
  in the same commit (enforced by the host-surface contract test).
- **Tests must catch real bugs.** No snapshots of incidental output, no
  mocks of the code under test, no order-dependent tests. Run
  `npx tsx scripts/scan-test-value.ts` before a PR with new tests.
- **Filenames** are `lowercase-kebab-case`. No secrets in docs.
- **Versions:** `package.json#version` is the single source; tags and
  GitHub Releases are created together, never one without the other.
  Stay on `0.x` until explicit human approval declares `1.0.0`.

## Checks

```bash
npm run build            # TypeScript + skill-sync sanity
npm test                 # full suite (unit + integration + skills)
npm run verify:generated # transitions freshness
npm run security:full    # fails on high/critical advisories
```
