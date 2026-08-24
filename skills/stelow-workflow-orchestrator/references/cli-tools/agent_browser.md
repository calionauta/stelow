# agent-browser

Automated web browser for live testing, accessibility checks, and visual inspection.

## How to invoke

### Pi-native path
The `agent_browser` tool registered by the stelow extension handles invocation and result parsing. Use it when available.

```typescript
agent_browser({ args: ["open", "--url", "{URL}", "--", "snapshot", "-i"] })
```

### Universal fallback for any agent
For any agent that does not have the stelow extension loaded, use the `agent-browser` CLI directly via bash:

```bash
npx -y @earendil-works/pi-agent-browser open --url "{URL}" -- snapshot -i
```

The `npx` invocation downloads the binary on first run. Subsequent calls reuse the cache. Watch for the same-level `--` separator that splits the open command from the snapshot subcommand.

> Note: the LLM CLI ecosystem does not have a standardized browser tool. If neither path is available, fall back to source-level review for CSS/HTML audit and skip the rendered-UI verification tier.

## When to Use

agent-browser is needed when:

- **Rendered UI verification** — the LLM can see how CSS/JS actually render, not just source
- **Interaction testing** — clicks, forms, navigation sequences 
- **Visual evidence** — screenshots for audit reports
- **Screen reader / accessibility** — real DOM state, not inferred from source
- **Runtime-only bugs** — issues that only appear in a live browser (CSS cascade, JS state, animations)

## When NOT to Use (use Quick Tier instead)

agent-browser is **not needed** when the LLM can audit from source code alone:

| Check | Source audit | Browser needed? |
|-------|-------------|-----------------|
| ARIA attributes in HTML | ✅ LLM reads JSX/Templ | ❌ No |
| Semantic HTML structure | ✅ LLM reads JSX/Templ | ❌ No |
| Keyboard nav patterns | ✅ LLM reads event handlers | ❌ No |
| Color contrast via CSS vars | ✅ LLM computes from source | ❌ No |
| Form validation in code | ✅ LLM reads validation logic | ❌ No |
| Actual rendered colors | ❌ | ✅ CSS cascade may differ |
| Interaction animations | ❌ | ✅ Must see it render |
| Screen reader output | ❌ | ✅ Must test with actual AT |
| Hover/focus/active states | ❌ | ✅ Must interact |

## How to Use

### Open a page
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

### Test a flow (click + fill)
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"],
  job: {
    steps: [
      { action: "click", selector: "@e3" },
      { action: "wait", milliseconds: 1000 },
      { action: "screenshot", path: "evidence.png" }
    ]
  }
})
```

### Snapshot with interactive elements
```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

## Limitations

- **Requires live server** — URL must be deployed or running locally (`localhost`)
- **Token cost** — browsing adds latency + tokens
- **Not deterministic** — rendered state varies by browser, viewport, timing
