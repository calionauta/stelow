# Getting started

Pick one path. Both run the same workflow; they differ only in surface.

## Path A — bb desktop + plugin (recommended)

Requirements: bb desktop ≥ 0.43, a coding-agent CLI installed and
authenticated (bb drives the CLI you already have — it does not replace it),
and a normal bb project backed by a local workspace source. The plugin
vendors all 32 skills, so there is no separate skills install step.

```bash
curl -fsSL https://calionauta.github.io/stelow/install.sh | bash
```

Or from a shell:

```bash
bb plugin install stelow
```

Or in bb: Extensions → Plugins → marketplace, install Stelow. Full
instructions: [plugin/install-bb.md](plugin/install-bb.md).

Then:

1. Open **Stelow** in bb's left navigation and select a project with Stelow
   state.
2. Choose **run knobs** (quality, exploration) and **Review mode** (default Auto) —
   labeled *Quality*, *Exploration* and *Pause for my review* on the board —
   enter a product request in the composer, and submit. The card is created
   in Triage and the agent begins there.
3. When the agent needs a decision, a structured question appears — answer
   in the form, in the thread, or from the card. The agent waits instead of
   guessing.
4. Approve each gate only after review; the plugin records the portable
   receipt.

## Path B — skills-only (any Agent Skills-compatible host)

Install the skills into `~/.agents/skills/` — either:

```bash
git clone https://github.com/calionauta/stelow.git
cd stelow
./install.sh
```

```bash
npx skills add calionauta/stelow -g
```

`./install.sh` variants: `--minimal` (skills only, no optional tooling),
`update` (re-copy + prune retired), `remove`, `--help`. Non-interactive CI:
`ASSUME_YES=1 ./install.sh`. The installer never modifies your
`AGENTS.md` / `CLAUDE.md`.

Then, in any compatible agent:

```text
/sw-start "Here's what I want to build"
/sw-status
```

Advanced installer options (`--minimal`, `update`, `remove`,
non-interactive CI, third-party skill registry, why Git-based
distribution): [INSTALLATION.md](INSTALLATION.md).

`/sw-*` commands are skill-provided and work on every compatible host —
there is no host command registry. Setup asks for run knobs and Review mode
explicitly; gates without a native review UI fall back to portable approval
receipts under `.stelow/approvals/`.

## Path C — Multica workspace (the flow on a real board)

A tracker gives you what a chat cannot: a column per stage, an agent handler per
column, and a durable timeline per idea. Provision stelow onto a
[Multica](https://multica.ai) workspace with
[`stelow-host-multica`](https://github.com/calionauta/stelow-host-multica):

```bash
git clone https://github.com/calionauta/stelow-host-multica.git
cd stelow-host-multica
python3 bin/stelow-host sync              # pin this stelow release
python3 bin/stelow-host plan --all-workflows
python3 bin/stelow-host install --check   # does the workspace match?
python3 bin/stelow-host install           # converge it
```

What lands there is three workflows, because a tracker binds one workflow per
project and a project is a repository:

| workflow | what runs | project |
|---|---|---|
| `stelow` | the chain from `stages.yaml` (11 columns for `feature`) | one per repository |
| `stelow-explore` | one `stelow-workflow-*` skill per card (14) | shared **Explore** |
| `stelow-research` | one `stelow-product-*` skill per card (21) | shared **Research** |

A lane card is created with `ask` and names its strategy, so the run picks the
skill instead of guessing:

```bash
python3 bin/stelow-host ask explore "does the CLI refuse a recipe the host does not declare?" --skill codebase-critique
python3 bin/stelow-host ask research "is the current price defensible?" --skill pricing
```

Multica is a tracker, not an agent host: the agents that run each column live in
your workspace (any runtime you have online), and stelow reaches them as skills.
Prerequisites, the two environment variables, and the failure modes worth
knowing are in that repository's `AGENTS.md`.

## Check it worked

```bash
scripts/stelow status [--json]   # from a workflow checkout (Path B)
scripts/stelow doctor [--json]   # detects drift: stale locks, missing dirs
bb stelow status --project <id>  # Path A equivalent
python3 bin/stelow-host install --check  # Path C: three workflows + project bindings
```

If `status` reports no workflow, the scaffold step (`/sw-start` or the board
composer) has not run yet — `scripts/stelow` never creates state, it only
validates and advances it.

## Common problems

| Symptom | Likely cause |
|---|---|
| Skills not picked up after install | Agent reads another skills directory, not `~/.agents/skills/` (agentskills.io standard) |
| `advance` refuses a transition | The move is not in `transitions.md` — the stage graph is enforced, not advisory |
| Worker asks the same question twice | A previous ask timed out before persisting; answer once, the worker re-asks per protocol |
| Optional tooling missing (cymbal, sem, ctx7) | All optional with documented fallbacks; the workflow runs without them |
