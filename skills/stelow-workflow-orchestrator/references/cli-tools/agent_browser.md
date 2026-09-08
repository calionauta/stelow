# agent-browser

Automated web browser for live testing, accessibility checks, and visual inspection.

## How to invoke (ladder — first available wins)

### 1. Harness-native browser tool

If the harness exposes a browser/automation tool, prefer it — it handles
invocation and result parsing. Adapt the args below to the registered tool:

```typescript
agent_browser({ args: ["open", "--url", "{URL}", "--", "snapshot", "-i"] })
```

### 2. URL review via the review gate

For reviewing a rendered page (no interaction), run it through
`visual_review.md` tooling against the URL instead of a file.

### 3. Source-level review (always available)

If neither path exists, fall back to source-level review for CSS/HTML audit
and skip the rendered-UI verification tier.

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
