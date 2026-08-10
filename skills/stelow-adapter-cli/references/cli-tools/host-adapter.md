# Tool: host_decide (Host Adapter / DecisionGateway)

> Route a human-in-the-loop decision (question OR gate) through a
> configured external host (Multica today; Slack / Linear / Notion future).
> Drop-in replacement for `ask_user_question` / `plannotator --gate`
> when `.stelow/host-workgroup.yaml` is present.

## When to use

Use `host_decide` INSTEAD of `ask_user_question` / `plannotator` when:

1. The project root has a `.stelow/host-workgroup.yaml` file, AND
2. The current stage has a reviewer configured (`shape → pm`,
   `interface → ux`, `planning → tech-lead`, etc.).

Otherwise, fall back to the local tools:

- `ask_user_question` — Pi-native question UI (see `ask.md`)
- `plannotator filePath=...` — local visual gate (see `plannotator.md`)

## Pi-native path

The `host_decide` tool is registered by the stelow extension. It is the
**recommended** path whenever a host adapter is configured, because the
parked-decision flow auto-resumes the workflow on the reviewer's reply.

```typescript
host_decide({
  kind: "question",
  questions: [
    {
      header: "Scope",
      question: "Which scope should we ship first?",
      options: [
        { label: "Auth foundation", description: "Login + session" },
        { label: "Payment",        description: "Stripe integration" },
      ],
    },
  ],
})
```

For a gate:

```typescript
host_decide({
  kind: "gate",
  artifactPath: ".stelow/2026-07-16/abc123/specs/spec-product_v1.md",
})
```

The adapter:
- Resolves `stage → reviewer` from the workgroup config.
- Creates a Multica issue (or Slack message, etc.) with the rendered
  question / gate description.
- Attaches the artifact (gate only) — the reviewer does NOT need repo
  access.
- Stores `pending_decision` in `tracking.json` so the resume hook
  re-polls the host on the next run.
- Returns immediately with `decision: pending`.

## Universal fallback

When the host adapter is NOT configured:

- Use `ask_user_question` for questions (see `ask.md`).
- Use `plannotator` for gates (see `plannotator.md`).

The orchestrator picks the path at runtime via two mechanisms:

1. **Presence of `.stelow/host-workgroup.yaml`** — if the file exists,
   the host adapter is active; `host_decide` is the right tool.
2. **Otherwise** — fall back to the local Pi-native tools.

## Resume flow

When the reviewer answers on the host (Multica issue comment, Slack
button, etc.), the host re-triggers the stelow agent. The resume hook:

1. Reads `Workflow.pending_decision` from `tracking.json`.
2. Polls the host for the latest reviewer reply.
3. Translates the reply to a `DecisionResult`.
4. Clears `pending_decision` and continues the workflow.

Manual fallback: `/sw-host resolve` (re-poll now) or `/sw-host clear`
(discard without polling).

## Stdout contract

`host_decide` returns immediately with:

```json
{
  "decision": "pending",
  "external_ref": "<multica-issue-uuid>",
  "host": "multica"
}
```

The actual decision (`approved` / `annotated` / `dismissed` /
`answered` / `expired`) is delivered on the next session after the
reviewer replies — it is NOT returned synchronously by the tool.

## Configuration

`.stelow/host-workgroup.yaml` (project root, optional):

```yaml
host: multica                       # multica today; slack/linear/notion future
reviewers:
  shape:     { role: pm,        member_id: <uuid> }
  interface: { role: ux,        member_id: <uuid> }
  planning:  { role: tech-lead, member_id: <uuid> }
  gate:      { role: pm,        member_id: <uuid> }
fallback_owner: <uuid>              # used for SLA escalation
sla_minutes: 1440                   # 24h default
```

If the file is absent, `createHostAdapter()` returns `null` and the
orchestrator falls back to the local tools. If the file is present
but malformed, the extension surfaces a clear error to the LLM
(`WorkgroupConfigError`) — it never silently uses the wrong reviewer.

## /sw-host command

| Subcommand | Purpose |
|------------|---------|
| `/sw-host`        | Show active adapter + pending decision status (default) |
| `/sw-host status` | Same as above |
| `/sw-host resolve`| Re-poll the host for the current pending decision |
| `/sw-host clear`  | Discard the pending marker without polling |

## Failure modes

- **Adapter config error** — `createHostAdapter()` throws
  `WorkgroupConfigError`. The tool returns `decision: error` with the
  underlying message; the LLM falls back to `ask_user_question` /
  `plannotator`.
- **Host unreachable / CLI missing** — `MulticaAdapter` returns
  `DecisionResult{decision: "error", feedback: ...}`. The pending
  marker is NOT written; the LLM should retry or fall back.
- **SLA elapsed** — adapter escalates to `fallback_owner` (per
  `docs/design/host-adapter-multica.md` §5.5). Decision result is
  `expired`, NOT `error`.
- **Reviewer comments NOT from a member** — Multica comments with
  `author_type != "member"` are ignored. Trust is anchored to
  `author_type=member` per §5.4.

## See also

- `docs/design/host-adapter-multica.md` — full architecture + decisions
- `references/cli-tools/ask.md` — fallback for `kind: question`
- `references/cli-tools/plannotator.md` — fallback for `kind: gate`
- `.pi/skills/multica-working-on-issues/SKILL.md` — host semantics
- `.pi/skills/multica-mentioning/SKILL.md` — `@agent` push trigger
- `extensions/stelow/adapters/host/` — implementation