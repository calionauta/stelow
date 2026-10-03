# Status

> **Pre-1.0.** Stelow is under active product and market validation on the
> `0.x` line. APIs, workflow contracts, and skills may change
> incompatibly before a stable `1.0.0`. Pin a release if you depend on
> current behavior.

## What changed recently

`CHANGELOG.md` and the
[releases page](https://github.com/calionauta/stelow/releases) are the
record. The unified docs (this site) are new and still filling in —
the plugin operator guides arrived in the second pass; anything still absent is intentionally unlisted (proposals and history stay out of site nav).

## Known limitations (honest scope)

The workflow amplifies judgment; it does not substitute for it. The full
register with evidence and mitigations lives in [evidence.md](evidence.md);
the short version:

- Long sessions rot: rule compliance decays with context length.
  Fresh-context reviewers mitigate; the orchestrator itself can forget.
- Same-model review: critique is fresh context, not an independent mind.
  Cross-lineage review is opt-in.
- Gates depend on you: approval fatigue is real — pick the lightest
  Review Mode that fits the risk.
- Brownfield tacit knowledge: undocumented conventions will be violated.
- Structured parallelism for code execution is experimental and
  off by default; sequential stays the default until measured otherwise.

## Experimental surfaces

- Team playbook (one bb per teammate, GitHub as the team room) —
  [plugin/team-playbook.md](plugin/team-playbook.md).
- Parallel scope dispatch and the native Workflows pilot on bb —
  [scopes-tasks-records.md](scopes-tasks-records.md),
  [plugin/native-workflows.md](plugin/native-workflows.md).
- Anything in `docs/rfc-*`, `docs/design/`, `docs/archive/` is a
  proposal or history, not a promise. It is intentionally not in the
  site navigation.
