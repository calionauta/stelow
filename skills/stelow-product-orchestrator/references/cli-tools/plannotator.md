# Visual Review Gate (Plannotator)

## Quick Summary

> **Plannotator --gate** opens plans/code in a visual browser UI with point-by-point
> annotation support. Every annotation is returned as structured feedback to the LLM
> for revision. It is an interactive review gate, not just a passive display.
> See `stages/gate.md` for what the gate DOES and DOES NOT catch.
> Alternative: manual review with approval tracking.

## Primary Path (pi, stelow stages)

Use the `plannotator` tool registered by the stelow extension. This is the **recommended**
path — it works when bash is blocked (gate/int-gate stages).

```
plannotator filePath=.stelow/.../plans/spec-product_v1.md
```

The tool spawns the CLI binary with `--gate --json`, blocks until the user decides,
and returns a structured JSON decision.

## Fallback: CLI Binary (bash)

When the `plannotator` tool is unavailable (e.g., subagent without extension), fall
back to the standalone CLI binary via bash:

```bash
plannotator annotate <file>.md --gate --json
```

| Info | Value |
|------|-------|
| Example | `plannotator annotate .stelow/.../spec-product_v1.md --gate --json` |

### Stdout contract (`--gate --json`)

| Decision | Stdout |
|----------|--------|
| Approved | `{"decision":"approved"}` |
| Annotated | `{"decision":"annotated","feedback":"..."}` |
| Dismissed | `{"decision":"dismissed"}` |

## Available Commands by CLI (Reference)

| CLI | Command | Package | Available |
|-----|---------|---------|-----------|
| pi | `plannotator annotate <file>.md --gate` | @plannotator/pi-extension | ✅ |
| opencode | `@plannotator/opencode` plugin | @plannotator/opencode | ✅ |
| claude-code | `plannotator annotate <file>.md --gate` (hook) | @backnotprop/plannotator | ✅ |
| codex | `!plannotator review` | Built-in hook | ✅ |
| generic | Manual review with receipt file | — | ✅ |

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
3. Create approval receipt (triggers stelow auto-advance). Use `write` tool:

```
write .plannotator/approvals/{_dir}/{filename}_v{N}.approved.md
approved: true
approved_via: manual review
```

### Tool Failure Path

If the `plannotator` tool returns `decision: "error"`:

1. The CLI binary may be missing or failed to start
2. **Never skip the gate** — degrade gracefully
3. Create a manual-review-needed receipt using the `write` tool:

```
write .plannotator/manual-reviews/{filename}_v{N}.manual-review-needed.md
---
file: {filename}_v{N}.md
reason: Plannotator CLI failed
---

## Manual Review Required

The automated gate tool failed. This file needs human review before proceeding.
- Open the file in your editor/browser
- Annotate issues, approve, or reject
- Create a .approved.md receipt when done
```

4. Inform the user: "Plannotator unavailable — please review manually and create .approved.md receipt."

> **Key rule:** The gate is NEVER skipped. Degrade to manual review but still block.

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
approved_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
approved_via: plannotator --gate
```

### 2. Receipt auto-created
The `plannotator` tool writes `.plannotator/approvals/{_dir}/gate-approved.md` automatically on approval.

If using the fallback CLI or manual review, create receipt manually:
```
write .plannotator/approvals/{_dir}/{filename}_v{N}.approved.md
approved: true
approved_via: plannotator --gate
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
4. Create manual receipt file at `.plannotator/approvals/{_dir}/`
