# FAQ

**Do I need bb to use Stelow?**
No. Path B (skills-only) runs the identical workflow on any Agent
Skills-compatible host. bb adds the visual layer (board, inbox, questions,
presets) — see [overview.md](overview.md).

**Which path should I pick?**
Pick bb if you want visual review gates, a quiet inbox instead of chat
pings, and GitHub issue automation. Pick skills-only if you already live
in another agent and are comfortable with slash commands and receipts on
disk.

**Who decides Appetite and Review Mode?**
You do, once, at setup. The LLM never raises appetite and never skips a
gate you asked for. `Lean + Auto` is the fastest path (~6 stages, no
questions); `Complete + full review` runs all 17.

**Does the AI estimate the work?**
No. Appetite is a constraint you declare ("how much is this worth?"); the
workflow only checks fit (`fits` / `cuts_needed` / `reshape`) and proposes
cuts. There is no estimation step to be overconfident about.

**What happens when the agent needs me?**
It opens a structured question and waits — in bb as a form on the card, on
other hosts via the `ask` protocol. Unanswered questions stay answerable;
the agent does not guess ahead.

**Is parallel scope execution safe?**
Sequential is the default and stays safe by construction. Parallel
dispatch is opt-in with file locks plus a post-hoc overlap audit, and any
overlap routes to you (merge, re-run, or rework). See
[scopes-tasks-records.md](scopes-tasks-records.md).

**Does it work on brownfield codebases?**
Yes, with a caveat: Tech Preview and Feature Recon surface architecture
and constraints before shaping, but a codebase with years of undocumented
conventions will still surprise the agent. Greenfield is the home turf.

**Where is my workflow state?**
`stelow.json` (tracking), `state.md` (per-workflow frontmatter),
`.stelow/` (artifacts, approvals, locks). Hosts read these; no host keeps
a second workflow database. `scripts/stelow doctor` detects drift.

**Can I turn off the GitHub automation?**
Yes: `STELOW_GITHUB_ISSUES=0` on the host disables the scheduler, its
RPCs, and the panel button without touching anything else.

**Is the API stable?**
No — pre-1.0 (`0.x`). Skills, contracts, and the CLI may change
incompatibly before `1.0.0`. See [status.md](status.md).

**Who reviews the reviewers?**
Critique stages use fresh-context reviewers (same model, clean session),
never the worker reviewing its own output in place. Independent
cross-lineage review is opt-in (`bb stelow review` on bb).
