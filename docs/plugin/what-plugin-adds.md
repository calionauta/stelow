# What the bb plugin adds

The core (`skills/` + `scripts/stelow`) is the whole methodology and runs
anywhere. The bb plugin (`bb-plugin-stelow`, separate repo) is a visual and
operational layer on top of the same state machine. The hosting contract it
implements is defined in [HOSTING.md](../../HOSTING.md) and
[host-plugin-blueprint.md](../host-plugin-blueprint.md).

## Core vs plugin

| Core (this repo) | Plugin only |
|---|---|
| 32 skills, `scripts/stelow` CLI, 18-stage state machine | Board (Inbox / Build / Research / Explore / About), card detail, hill/list views |
| `stelow.json`, `state.md`, `.stelow/` artifacts and receipts | Quiet inbox with per-kind resolution and a sidebar badge counting unresolved items and unopened completions |
| `ask_user_question` / `visual_review` portable vocabulary | Blocking question forms, artifact comments, "answer in thread" |
| Approval receipts (evidence, never transitions) | Gate approval buttons that write the canonical receipts |
| No scheduler | Automation rules (per-project GitHub label watchers on the host scheduler) + GitHub issue import with shared dedupe |
| No execution surface | Worker thread spawning, agent presets (provider/model/reasoning/permission), `bb stelow` worker CLI (status, advance, verify, review, metrics, …) |
| `audit-trail.md` portable receipt | Auditable completion gating on the exact tree, publication panel (commit/push/PR) |
| Methodology only | Research tab (product strategy playbooks) and Explore tab (one-shot techniques) as guided UI |

## What the plugin never does

These are load-bearing guarantees, not implementation details:

- The board **reads** `stelow.json` and `.stelow/` — it never replaces them.
- An approval creates a **receipt only**; validating and advancing the state
  machine stays with the agent/router.
- Automation rules never move cards, merge code, or import behind your back.
  Both import flows default to parked drafts; auto-start requires an
  isolated worktree and fails closed without one.
- Completion write-back to GitHub is explicit and human-gated. Done in
  Stelow is not merged/deployed.
- External issue text rendered on a card is context, never instructions.

## Operator guides (live here)

- [what-plugin-adds.md](what-plugin-adds.md) — this page (core vs plugin).
- [install-bb.md](install-bb.md) — install and update on bb.
- [github-issues.md](github-issues.md) — import now, watch automatically, trust model.
- [automation-rules.md](automation-rules.md) — rule semantics, backlog guard, kill switch.
- [agent-presets.md](agent-presets.md) — presets and spawn pass-through.
- [board-and-inbox.md](board-and-inbox.md) — tracks, bucket, badge honesty rules.
- [native-workflows.md](native-workflows.md) — the host Workflows execution
  backend and what stays sequential. (Placement decision: this is bb-only
  runtime — the core has no Workflows substrate — so it lives here, not in
  Core.)
- [decision-routing.md](decision-routing.md) — deterministic-first policy and
  the Decision API. (Placement decision: the Decision API, decision points,
  and providers are plugin implementation; the portable principle —
  never delegate a checkable decision to a model — stays in Core workflow
  pages.)
- [scope-contracts.md](scope-contracts.md) — scope ownership, Interface
  Contrast receipts, challenges, and native human boundaries.
- [team-playbook.md](team-playbook.md) — experimental: one bb per teammate,
  GitHub as the team room.
