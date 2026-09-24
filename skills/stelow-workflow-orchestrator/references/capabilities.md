# Execution capabilities

Generated from `stages.yaml`; do not edit this table by hand.

| Capability | Requirement |
|---|---|
| `durable-run` | preferred |
| `fanout` | preferred |
| `file-claims` | required |
| `per-call-model` | preferred |
| `pipeline` | required |
| `resume` | preferred |
| `status` | required |
| `structured-output` | required |

Adapters must negotiate these capabilities before selecting a native engine. See `../../../references/execution-contract.md`.
