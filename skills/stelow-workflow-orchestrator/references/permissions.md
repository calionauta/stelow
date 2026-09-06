# Permissions Reference

Documentation of what permissions the stelow requires per stage.

## Filesystem Access

| Path | Stage | Access | Purpose |
|------|-------|--------|---------|
| `stelow.json` | All | Read/Write | **Stage state — single source of truth** (phases, currentPhase, stage) |
| `.stelow/state/current-stage.json` | All | Read (write via state-manager) | Legacy — maintained for backward compat; LLM prefers stelow.json |
| host inbox surface | triage | Read/Write | The host's own inbox or task surface (Stelow core no longer mirrors `.stelow/inbox/`) |
| `.stelow/{yyyy-mm-dd}/` | setup+ | Read/Write | Workflow artifacts |
| `stages.yaml` | All | Read | Tool restriction metadata |
| `RULES.md` | All | Read | Hard constraints |

## Tool Permissions Per Stage

See `stages.yaml` for the full matrix of `blocked_tools` and `allowed_tools`.

## External Service Permissions

| Service | Stage | Purpose |
|---------|-------|---------|
| visual review (`visual_review annotate`) | gate | Visual plan review |
| Browser (`agent_browser`) | shape, execution | Research, QA |
| Git | All | Versioning |
| Socket.dev | execution | Supply chain audit |
| Trivy | execution | CVE/secret scanning |

## Native Hook Permissions

Hosts with a hook system may intercept tool calls (e.g. a PreToolUse
stage guard blocking tools based on current stage, applied in the host's
own adapters directory). These live in host code, never in this repo.
