# Visual Review Gate (Plannotator)

## Quick Summary

> **Plannotator --gate** opens plans/code in a visual browser UI with point-by-point
> annotation support. Every annotation is returned as structured feedback to the LLM
> for revision. It is an interactive review gate, not just a passive display.
> See `stages/gate.md` for what the gate DOES and DOES NOT catch.
> Alternative: manual review with approval tracking.

## Available Commands by CLI

| CLI | Command | Package | Available |
|-----|---------|---------|-----------|
| pi | `plannotator annotate <file>.md --gate` | @plannotator/pi-extension | ✅ |
| opencode | `@plannotator/opencode` plugin | @plannotator/opencode | ✅ |
| claude-code | `plannotator annotate <file>.md --gate` (hook) | @backnotprop/plannotator | ✅ |
| codex | `!plannotator review` | Built-in hook | ✅ |
| generic | Manual review with receipt file | — | ✅ |

## Command Details

### pi

```bash
plannotator annotate <file>.md --gate
```

| Info | Value |
|------|-------|
| Package | @plannotator/pi-extension |
| Example | `plannotator annotate .cali-product-workflow/.../spec-product_v1.md --gate` |

### opencode

```bash
# Install plugin first:
# Add to opencode.json: "plugin": ["@plannotator/opencode@latest"]

# Then use via plugin API
```

### claude-code

```bash
# Via hook (auto-configured with plugin)
/plannotator annotate <file>.md --gate
```

### codex

```bash
$plannotator review
# or
!plannotator review
```

### generic (Fallback)

When Plannotator is not available:

1. Open the file manually in browser or editor
2. Review and annotate manually
3. Create approval receipt:

```bash
mkdir -p .workflow/approvals/{_dir}
cat > .workflow/approvals/{_dir}/{filename}_v{N}.approved.md << 'EOF'
# Approval: {filename}_v{N}.md
- Approved at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Verdict: approved
- Method: manual review
EOF
```

---

## When to Use

| Stage | Purpose | File |
|-------|---------|------|
| Shape Up | Shape Up spec approval | `specs/spec-product_v{N}.md` |
| Interface | Interface proposals approval | `interfaces/interfaces_v{N}.md` |
| Tech Planning | Plan approval | `plans/spec-tech_v{N}.md` |

---

## ⚠️ CRITICAL: --gate Flag (pi, claude-code)

**The `--gate` flag is MANDATORY for blocking behavior.**

| Without `--gate` | With `--gate` |
|------------------|--------------|
| ❌ No Approve button | ✅ Approve button visible |
| ❌ No blocking | ✅ Blocks until approval |
| ❌ Opens in background | ✅ Opens as active review |
| ❌ Can be skipped | ✅ Forces decision |

---

## After Approval

After user approval:

### 1. Stamp YAML frontmatter
```yaml
approved: true
approved_at: "2026-05-20T15:00:00Z"
approved_via: plannotator --gate
```

### 2. Create receipt
```bash
mkdir -p .workflow/approvals/{_dir}
cat > .workflow/approvals/{_dir}/{filename}_v{N}.approved.md << 'EOF'
# Approval: {filename}_v{N}.md
- Approved at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Spec hash: `git hash-object <file>`
- Verdict: approved
EOF
```

### 3. File is frozen
Future changes require new version + new gate.

---

## Fallback (Generic)

> Open plans or code diffs visually for review. Block execution until explicit approval. Document approval in receipt file.

If Plannotator is not available:

1. Open the file in browser/editor
2. Review manually
3. Block execution until approval
4. Create manual receipt file
