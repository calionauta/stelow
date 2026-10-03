# Team playbook (experimental)

One bb per teammate. GitHub as the team room.

bb is single-user: one board, one inbox, no shared state across machines.
So the team does not meet inside the plugin — it meets in the GitHub
repository, and each member runs their own bb + Stelow. This is an
operating proposal, not a guaranteed process.

## Roles

- **Owner** (one per repo). Labels every issue — risk tier, specialty,
  assignee. Without an owner, labels rot and gates lose their teeth.
- **Operator** (one per issue). Imports the assigned issue into their own
  bb, runs the card, carries it to Done. The issue assignee.
- **Specialist** (shared). Owns verdicts at the gates the issue names.
  Involvement is keyed to risk, not team membership.

## Label schema

Three axes on every tracked issue: **risk tier**
(`risk:go-alone` / `risk:consult` / `risk:approve`), **specialty**
(`needs:product` / `needs:design` / `needs:tech`), **assignee** (the
operator; the GitHub dialog filters by them).

- 🟢 **Go alone** — operator owns the outcome, no specialist involved.
- 🟡 **Consult** — at each marked gate the operator consults the named
  specialist, then advances. Advice in, decision stays with the operator.
- 🔴 **Approve** — at each marked gate the specialist owns the verdict,
  filed as a receipt. The operator cannot advance alone.

Default gate → specialist: spec → product, interface/design → design,
tech planning/review and code review → tech lead. Override per issue.

## Flow

1. **Propose.** Anyone opens an issue (outcome, IN/OUT sketch, planning
   depth). The owner labels it. Nothing starts without owner + assignee.
2. **Own.** The operator imports the issue into their own bb (manual or
   auto-import rule). Auto-start needs an isolated worktree; shared
   checkouts coordinate through file claims.
3. **Gate.** Specialists review the artifact — never the token stream —
   and leave verdicts as issue comments; the operator files them by
   approving the gate, which writes the receipt.
4. **Merge.** Export refreshes the run bundle, the trailer goes in the
   commit, completion writes back to the issue. Note the trust boundary:
   receipts record that the operator approved in their own bb — they do
   not prove who authorized it outside.

## Rituals and limits

Weekly gate review (open marked gates are the agenda; receipts are the
minutes) and label hygiene by the owner — stale labels are the commonest
failure mode. Honest scope: no shared board or inbox, nothing notifies
specialists (@-mention them), and automation never moves cards, merges
code, or imports behind anyone's back.
