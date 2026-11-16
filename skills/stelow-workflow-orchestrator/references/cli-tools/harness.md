# Harness capabilities — the settings that decide what a card costs

A stage's prompt can ask an agent to be economical. Only the harness can make it
true. Measured on one real card: **61.9M tokens across 11 runs**, one build run
alone making **601 shell calls** — 123 `sed`, 104 `grep`, 33 `cat`, 125 one-line
`python3` — while writing **0.4%** of its tokens as output. The card was not
expensive to think about; it was expensive to *look*. A fitted line over 43 runs
puts the fixed cost of a run near **1.2M tokens before it does anything**.

Three harness capabilities move those numbers. Each entry says what the
capability is, the setting or pattern that *enforces* it, and what a host can do
when it has neither.

## 1. Programmatic tool calling (the big one)

Standard tool calling is one round trip per action, and every result re-enters
the conversation. Programmatic tool calling (PTC, also "code mode") lets the model
write **one script** that calls tools through an injected API, loops and filters
inside the sandbox, and returns only its final value:

> "Instead of issuing standard tool calls directly, the model writes code in the
> agent sandbox… orchestration, filtering, looping, and branching can all happen
> within a single script execution" — [Glean, 2026](https://www.glean.com/blog/enterprise-agent-harness)

**Enforce it in pi** (`~/.pi/agent/settings.json`, or `.pi/settings.json` in the
project the agent runs in):

```json
{
  "defaultTools": ["+codemode"],
  "codemode": { "mode": "only" }
}
```

`codemode.mode: "only"` hides the built-in tools from the model and lists them in
the `codemode` description instead, so the model reaches `read`/`bash`/`edit`
*through scripts*. That is a harness guarantee. The default `"on"` keeps them
declared and merely appends "how to call this from a script" to each description
— a suggestion, which is what a prompt rule already was. See pi's
[settings reference](https://pi.dev/docs/latest/settings) (`codemode.mode`,
`defaultTools`).

**The MCP shape**, if the host fronts many tools: advertise *two* — `search_tools`
and `execute` — and run the script in a sandbox. Intermediate responses never
reach the model, so a three-tool chain that returns 200 bytes costs 200 bytes
regardless of what it read ([Cloudflare Code Mode MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/),
[Anthropic: code execution with MCP](https://www.anthropic.com/research/code-execution-with-mcp),
[Redpanda Code Mode](https://docs.redpanda.com/agentic-data-plane/gateway/code-mode/)).

**If the host has neither**, the honest fallback is the workdir script — one call
in, one screen out:

```bash
cat > .stelow-probe.sh <<'EOF'
set -e
grep -n "def cmd_advance" scripts/stelow
sed -n '1050,1075p' scripts/stelow
EOF
bash .stelow-probe.sh
```

A convention, not a guarantee: it depends on the agent choosing it, so a host
that can set `codemode.mode` should, before betting on the script. When the
number does not move after the prose, the next attempt is a harness feature or a
mandatory wrapper in the workdir — never another paragraph.

## 2. Tool-result pruning

Every result stays in the conversation and is re-sent on every later turn. On a
long card the same file is read three or four times, each copy still there. Hosts
that support context editing (clearing stale tool results, masking superseded
reads) remove the middle copies; a compactor does the same after the fact.

What a stage can still do about it, without the harness:

- re-read the **line you are about to act on**, not the file;
- carry **artifact path + line** into the handoff, so the next stage opens one
  range instead of re-deriving the repository;
- write the finding into the artifact, and delete the reasoning that produced it.

## 3. A gate must name a *person*, not a role

A gate whose step is assigned to a role queues work nobody sees: the agent stops,
the card sits in `review`, and the human who started it is never told. The card
does not move until someone notices by accident.

A host implements this as data, not prose: resolve the gate owner to a workspace
**member id** (one command, stored once), then have `doctor` fail when any gate
step names anything else. `stelow-host human <name>` writes the choice and
`stelow-host doctor` checks every gated workflow against it.

## What a host must implement

| Capability | Enforced by | Checkable |
|---|---|---|
| PTC | `codemode.mode: "only"`, or an `execute`-only tool surface | tool mix per session (see below) |
| Result pruning | host compaction / context editing | context tokens per turn, not per card |
| Gate owner is a member | stored member id + `doctor` gate check | `doctor` fails, does not warn |

## Measuring it

Repeat these two on the next card and compare against the baseline above; both
read the tracking system, not the transcript:

```bash
<cli> issue runs <card> --output json    # tokens in/out/cache per run
grep -o '"toolName":"[a-zA-Z_]*"' <session>.jsonl | sort | uniq -c   # call mix
```

Targets, from the card above: **< 400** calls in a build run, **inspection < 45%**,
**no run re-reading a file it already read**. If PTC is on and the numbers do not
move, the agent is not using it — check `codemode.mode` actually applied, then
measure again before changing prompts.
