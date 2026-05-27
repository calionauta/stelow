# Context Mode Integration

[Context Mode](https://context-mode.com/) provides significant context reduction (up to 98%) for heavy operations in AI coding agents.

## Overview

Context Mode is an **optional** integration that provides:
- **Sandboxed execution**: `ctx_execute`, `ctx_execute_file`, `ctx_batch_execute`
- **Intelligent search**: `ctx_search`, `ctx_index`, `ctx_fetch_and_index`
- **Session continuity**: SQLite + FTS5 for context preservation

## Benefits

| Without Context Mode | With Context Mode |
|---------------------|-------------------|
| 100% context usage | ~2% context usage |
| High token cost | 98% token savings |
| Lost on compact | Preserved via FTS5 |

### Workflow Impact

| Phase | Without | With | Savings |
|-------|---------|------|---------|
| Setup | 700KB | 14KB | ~98% |
| Strategic Context | 500KB | 10KB | ~98% |
| Shape Up | 300KB | 6KB | ~98% |
| Tech Planning | 400KB | 8KB | ~98% |

## Installation

### pi (Recommended)

```bash
pi install npm:context-mode
# OR
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
```

Verify installation:
```bash
/context-mode:ctx-doctor
```

### opencode

Add to `opencode.json`:

```json
{
  "mcpServers": {
    "context-mode": {
      "command": "context-mode"
    }
  }
}
```

### claude-code

```bash
/plugin marketplace add mksglu/context-mode
/plugin install context-mode@context-mode
```

## Usage

### Automatic Detection

Context Mode tools are automatically used when:
1. Context Mode is installed
2. The CLI supports MCP servers

### Manual Override

Set the CLI explicitly:

```bash
export PRODUCT_WORKFLOW_CLI=pi
```

### Tool Reference

```
Basic Tool     → Context Mode Tool
─────────────────────────────────
bash          → ctx_execute
read          → ctx_execute_file
grep          → ctx_search
web_fetch     → ctx_fetch_and_index
(multiple)    → ctx_batch_execute
```

### Example: Count Lines

**Without Context Mode:**
```bash
# 47 files read = 700KB context
read file1.ts
read file2.ts
# ... 45 more
```

**With Context Mode:**
```bash
# 1 execution = 3.6KB context
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => {
    const content = fs.readFileSync('src/'+f, 'utf8');
    console.log(f + ': ' + content.split('\\n').length + ' lines');
  });
`)
```

## Fallback

If Context Mode is not available, the workflow automatically uses basic tools:

```typescript
// Automatic fallback
if (ctx_mode_available) {
  use ctx_execute(...)
} else {
  use bash(...)
}
```

**Note:** The workflow still functions correctly without Context Mode, just with higher token usage.

## Configuration

### Environment Variables

```bash
# Set CLI explicitly
PRODUCT_WORKFLOW_CLI=pi

# Override data directory (optional)
CONTEXT_MODE_DATA_DIR=~/.custom-dir
```

### Security

Context Mode respects permission rules:

```json
{
  "permissions": {
    "deny": [
      "Bash(sudo *)",
      "Bash(rm -rf /*)"
    ]
  }
}
```

## When to Use

### Use Context Mode when:

- ✅ Large file operations (>50KB)
- ✅ Multiple command executions
- ✅ Long workflow sessions (>30 min)
- ✅ FTS5 search needed
- ✅ Web fetching for research

### Use Basic Tools when:

- ❌ Context Mode not installed
- ❌ Simple single operations
- ❌ Quick checks
- ❌ Security-sensitive operations

## Commands

```bash
# Check context savings
ctx stats

# Diagnose issues
ctx doctor

# Update to latest
ctx upgrade

# Delete all indexed content
ctx purge

# Analytics dashboard
ctx insight
```

## Resources

- [Context Mode Website](https://context-mode.com/)
- [GitHub Repository](https://github.com/mksglu/context-mode)
- [Documentation](https://context-mode.mksg.lu/)