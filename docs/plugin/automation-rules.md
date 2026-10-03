# Automation rules

Per-project watchers over GitHub labels: each newly matching open issue
becomes one source-linked Inbox card. Rules run on the host scheduler and
are idempotent. The import machinery they feed is described in
[github-issues.md](github-issues.md).

## Configuration

Per rule, per project: labels (comma-separated, **all** required, exact
case-sensitive match), optional author allowlist (empty means anyone),
optional worker-instructions template appended to the issue prompt, and
the start policy. A dry-run preview names what would match now and exactly
why the rest would not (`missing-labels`, `untrusted-author`,
`other-project`, `already-fired`, `already-imported`); each rule lists its
recent runs with the per-run outcome (`Started`, `Parked`,
`Already imported`).

## Safety rails

- **Backlog guard.** Enabling a rule marks already-tagged issues as seen
  without drafting — only genuinely new issues create cards. If GitHub is
  unreachable, the rule is saved *disabled* instead of firing blind later.
- **Start policy.** Auto-start requires an isolated-worktree destination
  (checked against the effective spawn environment, not just preset
  existence). Without one, ticks park with the fix named in a trail
  comment.
- **Bounds.** 10 drafts per rule per tick. Rules never move cards, merge
  code, or import behind your back.
- **Kill switch.** `STELOW_GITHUB_ISSUES=0` on the host switches off the
  scheduler, RPCs, and panel button without touching anything else.

## Operations

- Scheduler cadence: every 5 minutes for watcher ticks (plus the
  discussion-mirror schedule for linked issues).
- Manage rules from the Build header dialog: rules grouped by project,
  with search, status filter, counts, and bulk enable/disable/delete. A
  new rule picks its project inline; the save button names its project so
  labels from another project can never land silently.
