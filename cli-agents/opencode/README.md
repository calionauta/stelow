# stelow for OpenCode (Reduced Support)

Command files that delegate to the stelow orchestrator skill.
No plugin, no TUI — just markdown command files.

## Installation

```bash
cd cli-agents/opencode
chmod +x install.sh
./install.sh
```

This copies `commands/sw-*.md` to `~/.opencode/commands/`.

## Available Commands

All 15 `/sw-*` commands delegate to `/skill:stelow-product-orchestrator`.
Commands work, but without Pi's extension guarantees:

| Missing feature | Impact |
|----------------|--------|
| Auto-sync scopes | LLM must run bash snippets manually |
| Stage guard / tool blocking | All tools available at all phases |
| `ask_user_question` tool | Falls back to chat prose |
| Goals / supervision / subagent contracts | Only basic subagent support |
| TUI footer / notifications | No status display |

**For full functionality, use pi.dev.** The extension at `extensions/stelow/`
provides auto-sync, gates, tool enforcement, and rich TUI — unavailable
in OpenCode's plugin model.
