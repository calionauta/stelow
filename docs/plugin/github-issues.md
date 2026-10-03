# GitHub issues

One Build entry point with two triggers sharing everything underneath:
**Import now** (manual pull while you watch) and **Auto-import**
(per-project label watchers on the host scheduler). Both funnel through
one matcher, one intent heuristic, and one card-creation path, so manual
and automatic can never draft the same `repo#number` twice. Rule
semantics live in [automation-rules.md](automation-rules.md).

## Guarantees

- **Single dedupe.** `github_imports(issue_key → card_id)` is claimed with
  an owner token *before* any work starts. Liveness is verified by card
  existence: a deleted card's issue can come back instead of being refused
  as in-flight forever.
- **Parked by default.** Both flows default to parked Bucket drafts
  (creation dialogs default to started instead).
- **Isolated auto-start.** Rules start workers only into an isolated
  worktree, verified against the effective spawn environment. Without one
  it fails closed: save refuses, ticks park with the fix named.
- **Verified write-back.** Completion summaries carry a hidden card marker
  matched back on the issue before counting as posted — retries never
  double-post. Posting is explicit and confirmed, never automatic. Done in
  Stelow is not merged/deployed.
- **Bounded blast radius.** 10 drafts per rule per tick; rules never move
  cards, merge code, or clear labels behind your back (the import clears its own trigger labels so the loop is pull-once).

## Trust model

Issue text is **untrusted input**: it lands verbatim in a worker prompt on
your machine, and no permission mode is read-only. The author allowlist is
the gate (explicit logins only — role associations don't exist upstream).
Prefer parked drafts for public repos; reserve auto-start for member-only
traffic into worktrees. Defense in depth, cheapest first: exact-label
matching → allowlist → parked default → worktree isolation → file claims →
10/tick cap.

## Linked discussion and completion notes

- **Mirror:** linked issues render a read-only, badged comment stream on
  the card. Mirrored text never routes to the worker. Posting back needs
  an inline confirm naming the destination — human gesture only.
- **Card-birth issues:** opt-in checkbox (off by default) creates the
  issue via `gh` after the card exists; failures keep the card and name
  the cause instead of inviting double-creation.
- **Done-note draft:** a cheap preset drafts the completion note from the
  card's scopes; artifacts ride as a detachable checklist; Post uses the
  human-gated comment RPC.

## Operations

- Schedules: watchers plus the discussion mirror (see
  [automation-rules.md](automation-rules.md)).
- Kill switch: `STELOW_GITHUB_ISSUES=0` on the host disables the
  scheduler, its RPCs, and the panel button.
- Troubleshooting: "saved disabled" means GitHub was unreachable at save
  (re-enable to prime and go live); "parked, no worktree preset" means
  create a New-worktree preset; "in-flight" on manual import means another
  flow is creating that card — refresh.
