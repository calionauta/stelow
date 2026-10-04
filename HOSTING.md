# Hosting stelow

stelow is **skills + one CLI**. There is no host adapter code in this repo —
any host that meets the contract below can run it, wrap it, or build a visual
layer on top (like [bb-plugin-stelow](https://github.com/calionauta/bb-plugin-stelow)).

## What a host provides

| Capability | Required? | Notes |
|---|---|---|
| Skill directories (`~/.agents/skills/<name>/SKILL.md`, agentskills.io) | ✅ | How workers load the 32 skills |
| Delegate/subagent capability (any tier: acceptance-native, isolated, headless, generic — see `skills/stelow-workflow-orchestrator/references/cli-tools/subagents.md`) | ✅ | At minimum the generic tier (same-session + files) |
| Workflow activation (`STELOW_WORKFLOW=1` + `STELOW_STATE=<path>`) | ✅ | Recipes per harness: `references/host-levers.md` |
| Scheduler / inbox surface | ❌ optional | Host-owned (background tasks, cron, autopilot). The bb plugin is the reference implementation |
| Native review UI for `visual_review` | ❌ optional | Fallback is portable approval receipts under `.stelow/approvals/` |

## What a host consumes (the contract)

1. **Skills content** — 15 `stelow-workflow-*` (delivery machinery) + 15
   `stelow-product-*` (reference playbooks). Vendor them, sync them from this
   repo's `main`, or install via `npx skills add calionauta/stelow -g`.
   Per-strategy output contracts live in `product-strategies.json`
   (id → skill → `single`/`variant`/`composite` + substeps); translate the
   presentation (labels, icons, picker copy) to your host, never fork the
   contracts.
2. **`scripts/stelow` semantics** — `status`, `advance`, `doctor`, `seed`,
   `schema`, `ask`, `sync-scopes`, `lock`, `config`. Usage errors exit 2, runtime failures exit 1. No npm
   dependencies (bash + python3). Scope parsing (`sync-scopes`) and file locks
   (`lock`) live here too — hosts must not maintain mirrors.
   Full CLI reference: `references/cli-tools/stelow-helper.md`.
3. **Stage slugs + transitions** — the 18 stages in
   `skills/stelow-workflow-orchestrator/references/transitions.md`
   (generated from `stages.yaml` via `scripts/generate-transitions.py`).
   `scripts/stelow advance` enforces them; hosts must not hand-edit
   `current_stage`.
4. **Approval receipts** — `.stelow/approvals/{dirHash}/{gate,int-gate,plan-gate,diff-gate}-approved.md`.
   A receipt is evidence of approval, never a state transition by itself.
5. **State files** — `stelow.json` (tracking) + `state.md` per workflow.
   Schema: `stelow.schema.json`.
6. **Tool vocabulary** — `stages.yaml#tools`
   (`ask_user_question`, `visual_review`, `subagent`, `read`, `write`,
   `edit`, `bash`, `grep`, `ls`, `agent_browser`). Skills never name
   host-native tools directly in prose; new harness vocabulary goes in the
   tool's `skills/stelow-workflow-orchestrator/references/cli-tools/<tool>.md`.

## Vocabulary: core terms are normative, presentation is mapped

Concept names and state spellings belong to the core and are **normative**.
Visible strings belong to the host and **may differ per surface** (board,
CLI, chat prompts) — but every host publishes the 1:1 mapping, and what
gets written to state always uses the canonical spelling. Unifying visible
strings across unknown future hosts is unenforceable; unifying state is
not.

| Concept | State fields (canonical) | Meaning (do not reframe) | bb label (reference mapping) |
|---|---|---|---|
| **Appetite** | `appetite: Lean\|Core\|Complete` (state frontmatter, `stelow.json`, `seed --appetite`) | Scope budget the scope is cut to fit — **never a time/effort estimate** | Planning depth |
| **Review Mode** | `review_mode:` ladder rung (enforced); `review_gates:` atom list (written by hosts, core promotion tracked — see rule 3) | Breadth of human oversight: which gates park for a decision | Pause for my review (+ rung presets) |

Rules for hosts:

1. State values use canonical spellings (`Lean`, rung names, gate atoms).
   A surface that shows anything else maps back on write.
2. Never present appetite as an estimate of time or effort — in any
   language, on any surface. It is a budget declared before shaping.
3. The six ladder rungs are the portable encoding of gate sets. Gate
   combinations with no rung (e.g. interface-only) are expressible in
   `review_gates:` but currently have **no core reader** — the core
   enforces the ladder only. See the tracking issue for `review_gates`
   promotion before relying on novel combinations portably.

## Adding a new host

No code is required in this repo. An agent that reads agentskills.io skill
directories can run the workflow today; a visual host wraps the contract
above (board/inbox/CLI) the way `bb-plugin-stelow` does.

Downstream freshness is the consumer's job: poll `GET
/repos/calionauta/stelow/releases` (or the pinned `main` commit) on your
own schedule — daily is plenty, methodology changes gradually — and open
your own sync PR when the pin moves. This repo sends no per-consumer
notifications and holds no downstream secrets: push-model fan-out needs
one secret and one workflow file per consumer and does not scale past
the first one.

## Reference implementation

`bb-plugin-stelow` vendors all 30 skills + `scripts/stelow` and auto-syncs
them from this repo (see [host-plugin-blueprint](docs/host-plugin-blueprint.md),
the build guide extracted from it: lifecycle, explicit completion, inbox,
ask/answer protocol, host-served playbook, sync recipe, UI patterns). Its `workflow-contracts` test pins the shared
surface (18 stages, board order, transitions) — the executable version of
this contract.
