## Stage 5: Review Gate

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
> **This is Stage 5** in the workflow sequence, after Plan Critique and before Scope Adjustment.

### 6x. Claim Verification (before the Gate)

**BEFORE submitting to Plannotator**, run claim verification:

```bash
grep -E '\`[^\`]+:[0-9]+\`' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md | \
  sed 's/.*\`\([^\`]*:[0-9]*\).*/\1/' | \
  sort -u > /tmp/refs_to_verify.txt
```

**For each reference**, reopen the file and verify:
1. Does the mentioned code/class/function exist?
2. Does the line match what the spec claims?
3. Are there discrepancies?

**Generate verification report:**
```markdown
## Claim Verification Report

### ✅ Verified
- `src/auth/jwt.ts:45` — JWT refresh mechanism exists as described

### ⚠️ Discrepancies
- `src/auth/session.ts:23` — Spec says "Redis cache" but code shows "In-memory map"

### ❌ Not Found
- `src/utils/token.ts` — File does not exist (spec references this path)
```

**If there are discrepancies:**
1. Fix the spec before the Gate
2. Document the fix in the report
3. Add note: "Claims verified with corrections applied"

**Effort:** Medium — **Value:** High (catches false positives before approval)

### Review Gate

**⚠️ SAFETY RULES — DO NOT SKIP:**
1. **Verbal approval in chat does NOT replace the gate.**
2. **Plannotator with --gate is MANDATORY.** Only proceed AFTER "approved".
3. If the reviewer requests changes, adjust and re-submit.
4. After approval, spec-product.md is frozen.

**Use `references/cli-tools/plannotator.md`** for:
- Plannotator command format
- After-approval workflow (stamp + receipt)
- Frozen file rules

> **If only Tech Planning was selected (standalone):** the Review Gate runs at the end of Tech Planning, not here.