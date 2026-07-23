# Host Adapter and Command Guide

Stelow's workflow and 25 skills are host-agnostic. `stages.yaml#tools` is the
canonical vocabulary; adapters translate those names to native host tools.

## Pi

`extensions/stelow/adapters/pi/` owns native `/sw-*` registration, lifecycle
hooks, TUI integration, runtime skill synchronization, and the Plannotator
implementation of `visual_review`. No Pi dependency is imported by the core
bootstrap or command/state modules.

## Fusion

Fusion is a host, not a competing workflow engine.
`scripts/generate-cli-commands.ts` emits `.fusion/commands/sw-*.md` artifacts.
Fusion maps `ask_user_question` to `fn_ask_question` and `subagent` to
`fn_spawn_agent`; because Fusion has no native visual-review tool, the adapter
writes portable receipts under `.stelow/approvals/`. See
`docs/design/fusion-integration-facts.md`.

## Generic and future hosts

Implement `CLIAdapter`/`BaseAdapter`, add capabilities and tool mappings, and
keep host-specific code under `extensions/stelow/adapters/<host>/`. Skills must
never call host-native names directly.
