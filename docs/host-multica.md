# On Multica (a board on a tracker)

[Multica](https://multica.ai) is an issue tracker with agents attached to status
columns: a card moves, an agent runs, the card keeps the artifact and the
timeline. Putting Stelow there means the flow is a **board**, not a chat session.

The provisioner is a separate repository,
[`calionauta/stelow-host-multica`](https://github.com/calionauta/stelow-host-multica).
It ships no runtime and no UI: every write is a `multica` CLI call, and
`plan --all-workflows` prints them before anything happens.

## Three workflows, not one

A tracker binds exactly one workflow to a project, and a project is usually a
repository. So the three shapes cannot be three columns of one board — an
eighteen-stage chain and a "pick one skill and answer one question" lane have
nothing in common except that both are Stelow. They are three workflows:

| workflow | columns | attached to |
|---|---|---|
| `stelow` | the chain from `stages.yaml` (11 for `feature`), plus `todo`/`done` | **one project per repository** — it is the flow that edits code |
| `stelow-explore` | `bucket` → `doing` → `review` | one shared **Explore** project · 14 `stelow-workflow-*` skills |
| `stelow-research` | the same | one shared **Research** project · 21 `stelow-product-*` skills |

Explore and research are *questions about* repositories, not edits to them, so
they share a project and the card names the repository it is about. The count is
**N + 2 projects**, not three flows in every repository.

Every step names the skills it runs. A column's text used to describe its work
for six hundred characters and never name the skill carrying the method, which
left the agent to search for it or improvise one.

## What a card looks like

Build: a normal issue moved into `intake`, then the chain.

```
intake → framing → product_gate → design → interface_gate
       → tech → tech_gate → build → verify → diff_gate → audit → done
```

Explore and research: `ask` opens the card in `bucket`, and the card names one
skill in a `**Strategy:** <skill>` line before it enters `doing`.

```bash
python3 bin/stelow-host ask research "is the current price defensible?" --skill pricing
```

The lane's `doing` column loads exactly that skill and writes one artifact,
attached to the card. `review` is the only gate, and `card <issue>` says what was
kept and what is still owed.

## Install

```bash
git clone https://github.com/calionauta/stelow-host-multica.git
cd stelow-host-multica
python3 bin/stelow-host install --check   # does the workspace match?
python3 bin/stelow-host install           # converge skills, agents, 3 workflows, projects
python3 bin/stelow-host verify --all-workflows
```

Prerequisites, the environment variables, what success looks like and the failure
modes are in that repository's `AGENTS.md`.

## What a tracker forced that a plugin never had to answer

Two things are worth knowing even if you run Stelow elsewhere, because both are
properties of the tracker, not of Stelow:

- **A status key cannot carry a menu, a runner, or a default.** The working column
  has to say which skills exist, or the card has to. Stelow's answer is: the
  column carries the menu, the card names its pick, and the two are cross-checked.
- **A card that waits with nothing saying so is the failure mode.** A parked gate,
  a run whose process died, a stage that ended with nothing queued — all three look
  identical to a healthy card from the outside. The provisioner's `doctor` reads
  the board with CLI calls only (no agent, no tokens) and names each one, and the
  adapter makes a parked run mark the card.

## Limits

The chain is predicated on a person at the four gates; the tracker does not change
that. A card's artifacts live on the card, so the repository's git history is the
record of code, not of decisions — the receipts are the comments. And a lane run
is one skill, deliberately: a question that needs three skills is three cards, or
a build card.
