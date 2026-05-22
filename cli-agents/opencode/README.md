# OpenCode Plugin for cali-product-workflow

This plugin provides cali-product-workflow commands and TUI integration for OpenCode.

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
    "@cali/cali-product-workflow-opencode"
  ]
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/pw:start` | Start a new workflow |
| `/pw:menu` | Show workflow menu |
| `/pw:status` | Show current status |
| `/pw:help` | Get help |

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