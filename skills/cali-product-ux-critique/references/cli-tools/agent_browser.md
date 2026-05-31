---
source: cali-product-ui-critique
---

# agent-browser

Automated web browser for live site UI auditing.

## Usage

```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

## Why for UI Critique

- **Real DOM evaluation** — contrast ratios from rendered elements, not computed from source
- **Keyboard navigation** — tab through interactive elements to verify focus order
- **Responsive testing** — resize viewport to check mobile/tablet breakpoints
- **Screen reader / accessibility** — real DOM state including ARIA attributes
- **Screenshot capture** — visual evidence for audit report

## Availability

- **pi.dev:** Available (native)
- **OpenCode:** Not available
- **Claude Code:** Not available
- **Codex:** Not available

Fallback: Use Codebase mode for ~80% coverage without browser.
