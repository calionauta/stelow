# OpenCode Plugin for stelow

This plugin provides stelow commands and TUI integration for OpenCode.

## Installation

```bash
cd cli-agents/opencode/plugin
npm install
npm run build
```

Then add to your `opencode.json`:

```json
{
  "plugin": [
    "@cali/stelow-pw-opencode"
  ]
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/sw-start` | Start a new workflow |
| `/sw-status` | Show current status |
| `/sw-help` | Get help |

## TUI Features

- Workflow status in sidebar footer
- Phase progress indicator
- Toast notifications on phase changes

## Development

```bash
npm run dev    # Watch mode
npm run build  # Production build
npm run typecheck  # Type checking
```

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin API
- `@opentui/core`, `@opentui/solid` - UI components (peer dependencies)