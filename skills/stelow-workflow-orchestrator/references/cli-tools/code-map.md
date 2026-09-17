# Code map — which navigation tool, when

> One ladder for every recon moment (Tech Preview, Feature Recon, Alignment
> Check, codebase critique). All four tools are optional, read-only analysis.
> Never install from inside a workflow — offer once at setup (`install.sh`
> does), otherwise fall back.
> In doubt about flags, or after any tool error: run `<tool> --help` first —
> never guess invocations.

## Required portable preflight

Recon always runs from the target workspace root (or a child directory that
resolves to it with `git rev-parse --show-toplevel`), never from a skill or
card-state directory. Before using this ladder, run the bundled wrapper:

```bash
bash <skill-dir>/references/cli-tools/recon.sh <tech-preview|feature-recon>
```

It writes `context/recon-receipt.json`, which records the Git workspace and
the live availability of cymbal, ripwire, sem, and ast-grep. Treat it as
evidence, not a requirement to install anything:

- `RECON_READY:cymbal` — use cymbal for the applicable commands below.
- `RECON_READY:ripwire` — orient with ripwire, then use portable file/text
  inspection for symbol-level work.
- `RECON_READY:portable` — use the documented `find` + `git log` + `grep`
  fallback and state that the richer analysis was unavailable.
- `RECON_REFUSED` — change to the target Git workspace and re-run; do not
  silently skip recon.

Every planning or audit output that relied on recon must cite the receipt and
name any missing tool. A missing optional tool is not a failed workflow; an
unexplained missing receipt is a warning that must be repaired before a
blocking gate is introduced.

## The ladder

### 0th — ripwire: orient first (unfamiliar repo or task)

System binary via bash (install: `RIPWIRE_REPO=redhat-et/ripwire bash -c "$(curl -fsSL https://raw.githubusercontent.com/redhat-et/ripwire/main/scripts/install.sh)"`):

```bash
ripwire . --for="<task>"          # ranked symbols + callers + blast radius + tests, token-budgeted
ripwire . --situ                  # after a diff: tests-to-run + blast radius
ripwire . --expand=SYM --top-k=0  # full body of one symbol
ripwire . --callers=SYM           # who calls it
ripwire . --impact=SYM            # what breaks if it changes
ripwire . --from-trace=FILE       # stack trace → responsible symbols
```

Use it to orient and pick entry points, then drill in with cymbal. ripwire is
read-only context — it never replaces refs/impact verification before a
refactor decision.

### 1st — cymbal: navigate symbols

```bash
cymbal investigate <symbol>   # adaptive: source + callers + impact
cymbal search <name>          # symbol search; --text for literal grep
cymbal show <file:L1-L2>      # structured read before whole-file reads
cymbal refs <symbol>          # call sites
cymbal impact <symbol>        # upstream blast radius (production/test split)
cymbal trace <symbol>         # downstream dependencies
cymbal changed                # diff → changed symbols + impact
```

All commands support `--json`. See `cymbal.md` (shape-up skill) for install
and depth tables.

### 2nd — fffind / ffgrep: fallback (harness-provided only)

Only when the harness exposes them natively: fuzzy file find, SIMD text
search, frecency ranking. Covers non-git trees and weak matches cymbal
missed. Never install for stelow — it is harness business.

### Structural — ast-grep: code patterns, not text

```bash
sg -p 'func $F($$$) error'                  # find a code shape, any language with grammar
sg -p 'OLD' -r 'NEW' --rewrite              # cross-file signature refactors (AST-safe, skips strings/comments)
```

Use for structural queries cymbal can't express (nesting shapes, API misuse
patterns) and for renames spanning files. Install: `brew install ast-grep`
(or `npm i -g @ast-grep/cli`). `install.sh` offers it automatically once a
skill references `ast_grep`.

## Tier boundaries (no overlap)

| Question | Tool |
|---|---|
| Orient in unfamiliar code? | ripwire `--for` |
| Who calls / what breaks? | cymbal `refs` / `impact` (verify before refactor) |
| Find file / fuzzy text? | fffind / ffgrep (fallback only) |
| Find a code shape / rename safely? | ast-grep pattern / `--rewrite` |
| What entities changed? | `sem diff` (version control, not navigation) |
| None installed? | `find` + `git log` + `grep` (documented per-skill fallbacks) |
