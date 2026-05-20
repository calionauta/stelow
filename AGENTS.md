# pi-product-workflow Auto-Trigger

## What This Does

Provides automatic triggering of `/skill:cali-product-workflow` when detecting product development discussions.

## When It Triggers

Any mention of:
- Product planning, roadmap, features, requirements
- Interface design, UX, screens, components
- Technical planning, architecture, implementation
- Product critique, review, feedback
- Market analysis, business models, pricing

## How to Disable

```bash
rm ~/.pi/agent/AGENTS.md
```

Or use the uninstall script in your pi-product-workflow directory.

## Alternative: Use Skill Directly

Instead of auto-trigger, use explicitly:
```
/skill:cali-product-workflow
```

This keeps your context cleaner for non-product tasks.

## For Full Documentation

See: https://github.com/renatocaliari/pi-product-workflow/blob/main/README.md