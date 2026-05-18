## Phase 6: Review Gate

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for phase sequence, safety rules, and capability reference.

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

**Generate verification report**:
```markdown
## Claim Verification Report

### ✅ Verified
- `src/auth/jwt.ts:45` — JWT refresh mechanism exists as described

### ⚠️ Discrepancies
- `src/auth/session.ts:23` — Spec says "Redis cache" but code shows "In-memory map"

### ❌ Not Found
- `src/utils/token.ts` — File does not exist (spec references this path)
```

**If there are discrepancies**:
1. Fix the spec before the Gate
2. Document the fix in the report
3. Add note: "Claims verified with corrections applied"

**Effort**: Medium — **Value**: High (catches false positives before approval)

### Review Gate

⚠️ **SAFETY RULES — DO NOT SKIP:**
1. **Verbal approval in chat does NOT replace the gate.** Even if the user says "approved", "go ahead" — run the command BELOW for formal registration.
2. **Plannotator with --gate is MANDATORY.** Only proceed to Phase 7 AFTER "approved".
3. If the reviewer requests changes, adjust and re-submit.
4. After approval, spec-product.md is frozen. **IMPORTANT:** Phase 6 ends with approved:true + receipt. Only proceed to Phase 7 after stamping. Any subsequent edit requires `spec-product_{v+1}.md` and a new gate.

Submit the revised spec-product.md for approval:
```bash
plannotator annotate .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md --gate
```

**IMPORTANT — After approval, stamp the spec:**

1. **Stamp the YAML frontmatter of spec-product.md:**
   ```yaml
   approved: true
   approved_at: "2026-05-14T10:30:00-03:00"
   approved_via: plannotator --gate
   ```

2. **Create an approval receipt** at `.plannotator/approvals/{_dir}/spec-product_{v}.approved.md`:
   ```bash
   mkdir -p .plannotator/approvals/{_dir} && cat > .plannotator/approvals/{_dir}/spec-product_{v}.approved.md << 'EOF'
   # Approval: spec-product_{v}.md
   - Approved at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   - Spec hash: `git hash-object .cali-product-workflow/.../spec-product_{v}.md`
   - Verdict: approved
   EOF
   ```

3. **Frozen file:** After stamping, spec-product.md can NOT be changed. Future revisions must create `spec-product_{v+1}.md`.

4. **To skip verification in following phases:** if the frontmatter has `approved: true`, subsequent phases know the gate was executed.

> **If only Tech Planning was selected (standalone):** the Review Gate runs at the end of Tech Planning, not here.
