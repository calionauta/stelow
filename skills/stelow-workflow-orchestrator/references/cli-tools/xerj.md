# xerj — prose and reference retrieval

> Optional, and the only tool here that needs a **running node**. Absent, or
> with nothing listening, every use below degrades to `grep -rn` over the same
> files. Never install, index, or boot a node from inside a workflow: offer it
> once (`install.sh` does), then fall back and say so.
> In doubt about flags: `xerj <command> --help` first — never guess.

## Quick Summary

Hybrid search over a folder you index (docs, markdown, code) or over a named
reference corpus of peer projects. It answers *"where is this explained?"* and
*"how did three peers solve this?"* — questions about **text**, which neither
`cymbal` (who calls what) nor `sem` (what changed) can answer.

## What it is not

| Question | Owner |
|---|---|
| Who calls this / what breaks? | `cymbal` `refs` / `impact` |
| Orient in an unfamiliar tree? | `ripwire --for` |
| What entities changed in a diff? | `sem diff` |
| Find a code shape / rename across files? | `ast-grep` |
| **Where is this documented / how do peers do it?** | **xerj** |

Reaching for xerj to navigate symbols is a wrong turn: it returns passages, not
call graphs, and a passage from a stale index reads exactly like a fresh one.

## Two paths

### 1. Your own folder — `autoindex`

Needs a node. Start one outside the repository (loopback-only by default is the
point — do not bind `0.0.0.0`):

```bash
xerj --insecure --data-dir "$HOME/.xerj/nodes/<name>" &   # dev-only flag pair
xerj autoindex . --dry-run        # walk + sniff + infer, print the plan, index nothing
xerj autoindex .                  # then the real pass
xerj autoindex map                # what got discovered
xerj autoindex status             # resume journal + progress
```

- **`--dry-run` first, always.** It measures the corpus and prints the plan; an
  index you did not preview is a decision you did not make.
- Ignore rules are inherited: `.xerjignore` (the same syntax as `.gitignore`,
  xerj-only, wins at any depth), then nested `.gitignore`s. Hidden files
  (`.env`, `.git/`, `.ssh`) are skipped **even under `--no-ignore`** — that is
  not an ignore rule, it is what keeps secrets out. Never index a tree you
  cannot account for; do not reach for `--no-ignore` to "get everything".
- Long walks stop and ask: `--max-minutes` gates phase A's measured estimate,
  `--approve proceed|fast|cancel` answers. Run it in the foreground and answer,
  rather than backgrounding it and forgetting.
- `xerj brain <folder>` is the one-command variant (boots a node, indexes, opens
  a console). That is an interactive surface for a person, not a step for a
  worker mid-card.
- Querying a folder index goes over the Elasticsearch-compatible API
  (`--json` everywhere, console at `/_xerj-console/`). There is no friendly
  query CLI for a folder index, so when the tree is small enough for `grep -rn`
  the index is not worth its node.

### 2. A reference corpus — `code`

`xerj code` reads a **corpus**: named peer repositories harvested once, not your
working tree.

```bash
xerj corpus list                          # what is loaded on this node
xerj corpus add <name> <git-url>...       # clones + writes corpora/<name>/corpus.json
xerj corpus index <name>                  # build + verify + switch
xerj code <name> "<what you need>" [-k N] [--mode bm25|semantic|hybrid] [--lang <lg>] [--json]
```

- Adding a corpus clones third-party code. Public licenses only — the harvester
  detects them and refuses junk; a private customer repo is a decision for the
  human, with their consent, never a default.
- **A corpus older than 30 days is refused** (`--stale-ok` overrides). The
  refusal is the feature: a stale corpus answers confidently about code that
  moved. Overriding it is a recorded decision, not a flag to hide behind — and
  re-indexing is usually the cheaper call.
- Cite what you retrieved: corpus name, query, and `-k` count in the artifact.
  A passage is evidence of *what someone wrote*, never of *what the code does* —
  verify against the workspace before it reaches a plan.

## Failure modes

| Symptom | Do |
|---|---|
| No `xerj` on PATH | `grep -rn` + `find` (portable fallback), and name the missing tool in the receipt |
| No node listening | Do not boot one mid-stage; fall back, or ask for consent once |
| No corpus loaded | Say so — never substitute a folder index for a corpus, or memory for evidence |
| `refused: corpus older than 30 days` | Re-index, or `--stale-ok` **with the reason written down** |
| Index you started is still running | Stop it or hand it over explicitly; a resident `--watch` node nobody owns is a leak |

## Sharing

`xerj share <index|folder>` mints a read-only link with a passcode and an
expiry. It ships index contents to a third party — treat it as a disclosure
decision, never a convenience: never for a private corpus or a customer tree
without explicit consent.
