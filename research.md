# Research: CLI Plugin/Install Patterns for OpenCode, Claude Code, and Codex (2026)

## Summary

Each CLI has a distinct plugin architecture: **OpenCode** uses npm packages + local JS/TS files in `opencode.json`, **Claude Code** uses marketplace manifests with component directories (`skills/`, `agents/`, `hooks/`, etc.), and **Codex** uses `.codex-plugin/plugin.json` manifests with skills, MCP, and app integrations. All three support local and distributed (npm/Git) plugin sources with configurable scopes.

---

## Findings

### 1. OpenCode Plugin System

**Configuration File:** `opencode.json` (or `opencode.jsonc` for comments)

#### Plugin Sources (3 ways):
1. **Local files** — `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global)
2. **npm packages** — listed in `opencode.json`
3. **Config-driven** — `~/.config/opencode/opencode.json` (user) or `opencode.json` (project)

#### opencode.json Format:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "autoupdate": true,
  "server": { "port": 4096 },
  "plugins": ["opencode-helicone-session", "opencode-wakatime", "@my-org/custom-plugin"]
}
```

#### Plugin File Structure:
```
.opencode/
├── plugins/
│   └── my-plugin.js       # Project-level plugin
├── package.json           # Optional: local npm deps for plugins
opencode.json              # Project config
```

#### Plugin Code Structure (JS/TS):
```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Hook implementation
    },
    tool: {
      mytool: tool({
        description: "Custom tool",
        args: { foo: tool.schema.string() },
        async execute(args, context) {
          return `Result: ${args.foo}`
        }
      })
    }
  }
}
```

#### Supported Hooks:
- Session: `session.created`, `session.compacted`, `session.idle`, `session.diff`
- Tools: `tool.execute.before`, `tool.execute.after`
- Files: `file.edited`, `file.watcher.updated`
- TUI: `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`

#### Load Order:
1. Global config → 2. Project config → 3. Global plugins → 4. Project plugins

[Source: OpenCode Plugins Docs](https://github.com/anomalyco/opencode/blob/9ad6588f/packages/web/src/content/docs/plugins.mdx)

---

### 2. Claude Code Plugin System

**Configuration Files:**
- `.claude-plugin/plugin.json` — Plugin manifest (required)
- `.claude/settings.json` — Installation scope settings
- `marketplace.json` — Marketplace catalog

#### Marketplace Structure:
```
claude-plugin-marketplace/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace index
├── greetings/
│   ├── .claude-plugin/
│   │   └── plugin.json       # Plugin manifest
│   ├── commands/
│   │   └── welcome.md
│   └── skills/
│       └── greet-info/
│           └── SKILL.md
```

#### marketplace.json Format:
```json
{
  "name": "team-tools",
  "plugins": [
    {
      "name": "greetings",
      "source": { "source": "local", "path": "./greetings" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

#### plugin.json Manifest Schema:
```json
{
  "name": "plugin-name",
  "displayName": "Plugin Name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": { "name": "Author", "email": "author@example.com" },
  "skills": "./custom/skills/",
  "commands": ["./commands/*.md"],
  "agents": ["./agents/reviewer.md"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json",
  "lspServers": "./.lsp.json",
  "userConfig": {
    "api_endpoint": { "type": "string", "title": "API", "sensitive": true }
  },
  "dependencies": [{ "name": "helper-lib", "version": "~2.1.0" }]
}
```

#### Component Directories:
```
plugin/
├── .claude-plugin/plugin.json
├── skills/
│   └── my-skill/SKILL.md
├── commands/
│   └── command.md
├── agents/
│   └── agent-name.md
├── hooks/
│   └── hooks.json
├── .mcp.json
└── .lsp.json
```

#### Installation Scopes:
| Scope | Settings File | Use Case |
|-------|--------------|----------|
| `user` | `~/.claude/settings.json` | Personal (default) |
| `project` | `.claude/settings.json` | Team/shared via VCS |
| `local` | `.claude/settings.local.json` | Project-specific, gitignored |
| `managed` | Managed settings | Read-only, update-only |

#### Skill Format (SKILL.md):
```markdown
---
name: skill-name
description: What this skill does
---

Detailed skill instructions here. Can include code examples, context, etc.
```

#### Agent Format:
```markdown
---
name: reviewer
description: Code reviewer agent for PRs
model: sonnet
effort: medium
maxTurns: 20
---

System prompt for the agent's role and behavior.
```

[Source: Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference)

---

### 3. Codex Plugin System

**Configuration Files:**
- `.codex-plugin/plugin.json` — Plugin manifest (required)
- `.agents/plugins/marketplace.json` — Marketplace catalog
- `~/.codex/config.toml` — User config
- `.codex/config.toml` — Project config

#### Marketplace Structure:
```
.agents/plugins/
└── marketplace.json
plugins/
└── my-plugin/
    ├── .codex-plugin/
    │   └── plugin.json
    ├── skills/
    │   └── hello/SKILL.md
    ├── hooks/
    │   └── hooks.json
    ├── .app.json
    └── .mcp.json
```

#### marketplace.json Format:
```json
{
  "name": "local-repo",
  "interface": { "displayName": "Local Example Plugins" },
  "plugins": [
    {
      "name": "my-plugin",
      "source": { "source": "local", "path": "./plugins/my-plugin" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

#### plugin.json Manifest:
```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "Bundle reusable skills",
  "author": { "name": "Team", "url": "https://example.com" },
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "apps": "./.app.json",
  "hooks": "./hooks/hooks.json",
  "interface": {
    "displayName": "My Plugin",
    "shortDescription": "Reusable skills",
    "category": "Productivity",
    "defaultPrompt": ["Use My Plugin to summarize notes."]
  }
}
```

#### Skills Format (SKILL.md):
```markdown
---
name: hello
description: Greet the user with a friendly message.
---

Greet the user warmly and ask how you can help.
```

#### hooks.json Format:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${PLUGIN_ROOT}/hooks/session_start.py"
          }
        ]
      }
    ]
  }
}
```

#### MCP Server Config (.mcp.json):
```json
{
  "docs": {
    "command": "docs-mcp",
    "args": ["--stdio"]
  }
}
```

#### Installation Methods:
1. **CLI:** `codex plugin marketplace add owner/repo`
2. **Local:** Add to `~/.agents/plugins/marketplace.json` or `.agents/plugins/marketplace.json`
3. **Git-backed:** `"source": "git-subdir"` with `url` and `path`

#### Environment Variables:
- `${PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_ROOT}` — Plugin directory
- `${PLUGIN_DATA}` / `${CLAUDE_PLUGIN_DATA}` — Persistent data directory
- `${CLAUDE_PROJECT_DIR}` — Project root

[Source: Codex Plugin Build Guide](https://developers.openai.com/codex/plugins/build)

---

## Sources

### Kept
- [OpenCode Plugins Documentation](https://github.com/anomalyco/opencode/blob/9ad6588f/packages/web/src/content/docs/plugins.mdx) — Complete plugin API, hooks, load order, npm integration
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — Full manifest schema, component specs, installation scopes
- [Codex Plugin Build Guide](https://developers.openai.com/codex/plugins/build) — Plugin structure, marketplace format, manifest fields
- [OpenCode Config Docs](https://dev.opencode.ai/docs/config/) — opencode.json schema reference
- [Claude Code Discover Plugins](https://code.claude.com/docs/en/discover-plugins.md) — Installation commands, marketplace management

### Dropped
- SST/OpenCode ecosystem docs — Partial overlap with main repo
- Third-party plugin guides — Less authoritative than official docs

---

## Gaps

- **OpenCode:** Plugin publishing/distribution mechanism unclear (npm-only currently)
- **Claude Code:** Official marketplace submission process not fully documented
- **Codex:** Plugin hooks still experimental in current release (`plugin_hooks = true` required)

## Suggested Next Steps

1. Compare plugin hook event catalogs across all three tools
2. Research cross-CLI plugin compatibility layers
3. Document skill/command format variations between tools

---

## Supervisor Coordination

If you need me to:
- Fetch additional detail on any specific config format
- Compare specific hook/event systems
- Research plugin ecosystem availability for any tool

Use `contact_supervisor` with `reason: "need_decision"` for scope clarification.
