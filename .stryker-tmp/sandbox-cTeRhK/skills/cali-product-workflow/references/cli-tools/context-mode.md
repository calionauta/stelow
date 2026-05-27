# Context Mode Tools

## Quick Summary

> Sandboxed execution with 98% context reduction. Use `ctx_*` tools instead of basic tools (bash, read, grep) when available. Falls back to basic tools automatically.

## Available Commands by CLI

| CLI | Tools | Package | Available |
|-----|-------|---------|-----------|
| pi (with context-mode) | `ctx_execute`, `ctx_search`, `ctx_fetch_and_index` | context-mode | ⚠️ Optional |
| pi (without context-mode) | `bash`, `read`, `grep` | built-in | ✅ Default |
| opencode | `ctx_*` via MCP | context-mode | ⚠️ Manual install |
| claude-code | `ctx_*` via MCP | context-mode | ⚠️ Manual install |
| generic | `bash`, `read`, `grep` | built-in | ✅ Default |

## Tool Mapping

### Basic vs Context Mode Comparison

| Basic Tool | Context Mode Tool | Context Reduction |
|------------|-------------------|------------------|
| `bash` | `ctx_execute` | 80-95% |
| `read` (large files) | `ctx_execute_file` | 90%+ |
| `grep` | `ctx_search` | 85% |
| `web_fetch` | `ctx_fetch_and_index` | 95%+ |
| Multiple operations | `ctx_batch_execute` | 80-95% |

### ctx_* Tools Reference

```typescript
// Sandboxed code execution
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => console.log(f));
`)

// Execute with intent-based search
ctx_execute_file("path/to/large-file.txt", "javascript", `
  // Process file and only output relevant data
`)

// Search indexed content (FTS5)
ctx_search({
  queries: ["search query 1", "search query 2"],
  limit: 5
})

// Fetch and index web content
ctx_fetch_and_index({
  url: "https://example.com/doc",
  source: "documentation"
})

// Batch operations
ctx_batch_execute({
  commands: [
    { command: "find . -name '*.ts'" },
    { command: "wc -l src/**/*.ts" }
  ],
  queries: ["file counts", "total lines"]
})
```

---

## When to Use Context Mode

### Use `ctx_*` tools when:

- ✅ Large file operations (>50KB)
- ✅ Multiple command executions
- ✅ Long workflow sessions (>30 min)
- ✅ FTS5 search needed (searching previously indexed content)
- ✅ Web fetching for research

### Use basic tools when:

- ❌ Context-mode not installed
- ❌ Simple single operations
- ❌ Quick checks
- ❌ Security-sensitive operations

---

## Workflow Phase Benefits

| Phase | Context Mode Tool | Savings |
|-------|------------------|---------|
| Setup | `ctx_batch_execute` | 80-95% |
| Strategic Context | `ctx_fetch_and_index` | 90%+ |
| Shape Up | `ctx_execute` (count lines, analyze) | 95% |
| Plan Critique | `ctx_search` (search codebase) | 85% |
| Tech Planning | `ctx_execute_file` (read specs) | 90% |
| Scope Executor | `ctx_batch_execute` | 80-90% |

---

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

---

## Detection

Context Mode is automatically detected if installed. To force detection:

```bash
export PRODUCT_WORKFLOW_CLI=pi
# or
export PRODUCT_WORKFLOW_CLI=opencode
```

---

## Fallback (Generic)

> When Context Mode is not available, use built-in tools (bash, read, grep). They work the same but consume more context tokens.

If context-mode tools are not available:

1. Use `bash` instead of `ctx_execute`
2. Use `read` instead of `ctx_execute_file`
3. Use `grep` instead of `ctx_search`
4. Use `web_fetch` instead of `ctx_fetch_and_index`
5. Execute operations sequentially instead of with `ctx_batch_execute`

**Note:** The workflow will still function correctly, just with higher token usage.

---

## Example: Before/After

### Before (Basic Tools)

```bash
# 47 files read = 700KB context
read file1.ts
read file2.ts
# ... 45 more
```

### After (Context Mode)

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
