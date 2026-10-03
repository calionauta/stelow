# Getting started

Pick one path. Both run the same workflow; they differ only in surface.

## Path A — bb desktop + plugin (recommended)

Requirements: bb desktop ≥ 0.43, a coding-agent CLI installed and
authenticated (bb drives the CLI you already have — it does not replace it),
and a normal bb project backed by a local workspace source. The plugin
vendors all 30 skills, so there is no separate skills install step.

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
2. Choose **Appetite** (default Lean) and **Review mode** (default Auto),
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
there is no host command registry. Setup asks for Appetite and Review mode
explicitly; gates without a native review UI fall back to portable approval
receipts under `.stelow/approvals/`.

## Check it worked

```bash
scripts/stelow status [--json]   # from a workflow checkout (Path B)
scripts/stelow doctor [--json]   # detects drift: stale locks, missing dirs
bb stelow status --project <id>  # Path A equivalent
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
