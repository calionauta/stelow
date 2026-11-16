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
the live availability of cymbal, ripwire, sem, ast-grep, and xerj. Treat it as
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

Use it to orient and pick entry points. Do not chain it into cymbal by reflex:
both are rungs of one ladder, and taking two when one answers is the extra round
trip described below. ripwire is read-only context — it never replaces
refs/impact verification before a refactor decision.

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

All commands support `--json`. Pass `--no-federate` for deterministic
single-worktree results (otherwise cymbal merges hits from sibling
worktrees). See `cymbal.md` (shape-up skill) for install
and depth tables.

### 2nd — fffind / ffgrep: fallback (harness-provided only)

Only when the harness exposes them natively: fuzzy file find, SIMD text
search, frecency ranking. Covers non-git trees and weak matches cymbal
missed. Never install for stelow — it is harness business.

### Structural — ast-grep: code patterns, not text

```bash
ast-grep run -p 'func $F($$$) error' -l go --json  # find a code shape, any language with grammar (-l go|ts|py|rs|...)
ast-grep run -p 'OLD' -r 'NEW' -l <lang>           # cross-file signature refactors (AST-safe, skips strings/comments)
```

Use for structural queries cymbal can't express (nesting shapes, API misuse
patterns) and for renames spanning files. Install: `brew install ast-grep`
(or `npm i -g @ast-grep/cli`). `install.sh` offers it automatically once a
skill references `ast_grep`.

### Text — xerj: prose and reference retrieval

The one rung that needs a running node, and the only one that answers about
**text** rather than symbols: which doc still describes the old behaviour, how
peers solved this, where a term is explained across a large tree.

```bash
xerj autoindex . --dry-run            # plan first; an unpreviewed index is an unmade decision
xerj code <corpus> "<what you need>"  # reference retrieval over a corpus of peer projects
```

Read `xerj.md` before the first call: node lifecycle, ignore and secret rules,
the 30-day corpus staleness refusal, and what it must never be used for. When
there is no node, no corpus, or the tree is small, `grep -rn` is the whole
answer — say that instead of booting an index mid-stage.

## When a rung costs more than it saves

A map is not a substitute for reading. It says *where*; the edit still needs the
code. So a rung pays only when it **replaces** a search you would have run
anyway. When it merely precedes the read of the same symbol, it is one extra
round trip, and every round trip re-sends the conversation.

- **You can already name the symbol** → `ffgrep`/`grep -n`, then `read` with
  `offset`/`limit`: two calls, and the second returns the code. `cymbal impact`
  earns its call only when "who calls this" is genuinely ambiguous — dynamic
  dispatch, string-built names, DI containers, a refactor across packages.
- **Unfamiliar repo, change touches ≥3 files** → `ripwire --for` pays: one call
  replaces several blind searches and ranks what to open first.
- **One file, one obvious home** → no map. Open the file.
- **Docs versus code** → xerj answers "which prose says X"; on a small tree
  `grep -rn` answers it in one call, and a contract test answers "does the doc
  still match the code" better than any index.
- **After a diff** → `sem diff` or `ripwire --situ` replaces `git diff` at the
  same cost; they earn the call whenever the diff is larger than a screen.

Measured, not assumed: on SWE-bench Verified, structure-aware retrieval raised
agent cost by up to **28%** while improving results inconsistently
([arXiv 2609.30725](https://arxiv.org/abs/2609.30725)) — the extra hop is the
mechanism. Prefer the rung that returns the code with the location, and treat a
map-first habit as a cost with a hoped-for benefit, not a free upgrade.

## Tier boundaries (no overlap)

| Question | Tool |
|---|---|
| Orient in unfamiliar code? | ripwire `--for` |
| Who calls / what breaks? | cymbal `refs` / `impact` (verify before refactor) |
| Find file / fuzzy text? | fffind / ffgrep (fallback only) |
| Find a code shape / rename safely? | ast-grep pattern / `--rewrite` |
| What entities changed? | `sem diff` (version control, not navigation) |
| Which doc says X / how do peers do Y? | xerj `code` (node required; `grep -rn` when it is not) |
| None installed? | `find` + `git log` + `grep` (documented per-skill fallbacks) |
