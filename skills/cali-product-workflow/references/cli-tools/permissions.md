# Permissions Reference

Documentation of what permissions the cali-product-workflow requires per stage.

## Filesystem Access

| Path | Stage | Access | Purpose |
|------|-------|--------|---------|
| `.cali-product-workflow/state/current-stage.json` | All | Read/Write | Stage state persistence |
| `.cali-product-workflow/inbox/` | triage | Read/Write | Inbox items |
| `.cali-product-workflow/{yyyy-mm-dd}/` | setup+ | Read/Write | Workflow artifacts |
| `skills/cali-product-workflow/stages.yaml` | All | Read | Tool restriction metadata |
| `RULES.md` | All | Read | Hard constraints |

## Tool Permissions Per Stage

See `stages.yaml` for the full matrix of `blocked_tools` and `allowed_tools`.

## External Service Permissions

| Service | Stage | Purpose |
|---------|-------|---------|
| Plannotator (`plannotator annotate`) | gate | Visual plan review |
| Browser (`agent_browser`) | shape, execution | Research, QA |
| Git | All | Versioning |
| Socket.dev | execution | Supply chain audit |
| Trivy | execution | CVE/secret scanning |

## Pi-Only Permissions (hooks)

The following hooks may intercept tool calls:

- **PreToolUse** (stages-guard.ts) — blocks tools based on current stage
- Applied in `extensions/cali-product-workflow/adapters/` directory
