# Plannotator Review Rules

> **Part of cali-product-workflow** — Centralized rules for all Plannotator review gates.

---

## When to Use Plannotator

Plannotator is used for **visual review gates** — mandatory approval steps that require human confirmation before proceeding.

| Phase | Purpose | File to Review |
|-------|---------|----------------|
| Phase 5 | Shape Up spec approval | `specs/spec-product_v{N}.md` |
| Phase 8 | Interface proposals approval | `interfaces/interfaces_v{N}.md` |
| Standalone Tech Planning | Plan approval (when no Shape Up/Interface) | `plans/spec-tech_v{N}.md` |

---

## Command Format

**ALWAYS use `--gate` flag:**

```bash
plannotator annotate <file>.md --gate
```

---

## ⚠️ CRITICAL: --gate Flag

**The `--gate` flag is MANDATORY.**

| Without `--gate` | With `--gate` |
|-------------------|---------------|
| No Approve button | ✅ Approve button visible |
| No blocking behavior | ✅ Blocks until approved |
| Opens as background tab | ✅ Opens as active review |
| Can be dismissed | ✅ Forces decision |

**If you forget `--gate`:** The Plannotator UI opens but the user cannot approve, and the workflow continues incorrectly.

---

## After Approval

After the user approves in Plannotator:

1. **Stamp the YAML frontmatter:**
   ```yaml
   approved: true
   approved_at: "2026-05-19T15:00:00-03:00"
   approved_via: plannotator --gate
   ```

2. **Create approval receipt:**
   ```bash
   mkdir -p .plannotator/approvals/{_dir}
   cat > .plannotator/approvals/{_dir}/{filename}_v{N}.approved.md << 'EOF'
   # Approval: {filename}_v{N}.md
   - Approved at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Spec hash: `git hash-object <file>`
   - Verdict: approved
   EOF
   ```

3. **File is now frozen:** Future changes require new version + new gate.

---

## Standalone Gate (Tech Planning only)

When Tech Planning runs standalone (no Shape Up/Interface):

```bash
plannotator annotate .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md --gate
```

Same rules apply: `--gate` is mandatory.

---

## References

This file is referenced by:
- `SKILL.md` (orchestrator Safety Rules)
- `phases/gate.md`
- `skills-workflow/cali-shape-up/SKILL.md`
- `skills-workflow/cali-tech-planning/SKILL.md`
- `skills-workflow/cali-interface-brainstorm/SKILL.md`
- `references/environment-adaptation.md`