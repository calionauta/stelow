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

## 📁 File Naming Convention

**All project files must use `lowercase-kebab-case`:**

```bash
# ✅ Correct
spec-product.md
tech-planning.md
cali-testing-ai-code/

# ❌ Wrong
SpecProduct.md  # PascalCase
TECH-PLANNING.md  # UPPERCASE
techPlanning.md  # camelCase
```

**Rationale:**
- Consistent with URL standards (lowercase is standard for web paths)
- Easier tab completion
- Cross-platform compatibility (macOS is case-insensitive by default)
- Easier to type and remember

**Applies to:**
- Markdown files (.md)
- Configuration files (.yaml, .json, .toml)
- Directories and folders
- Source code files (use language conventions, but prefer lowercase for project files)