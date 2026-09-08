### Step 8: Report results

After all scopes are executed and compliance verified, compute **post-execution file overlap** from the captured `actual_files` arrays and produce a consolidated report:

```bash
# Compute pairwise file overlap + declared vs actual diff across completed scopes
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
const completed = (wf?.scopes ?? []).filter(s => s.status === 'completed' && Array.isArray(s.actual_files));

// (a) declared ∩ actual — undeclared writes (scope touched files outside its contract)
const undeclared = completed.map(s => ({
  id: s.id,
  declared: s.target_files ?? [],
  actual: s.actual_files,
  undeclared_writes: s.actual_files.filter(f => {
    // Minimal glob match (`*` within a segment, `**` across segments)
    // so declared patterns like src/auth/** actually match.
    const declared = s.target_files ?? [];
    const globToRegExp = (g) => new RegExp("^" + g.split("**")
      .map((part) => part.split("*")
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*"))
      .join(".*") + "$");
    return !declared.some((g) => g === f || globToRegExp(g).test(f));
  })
})).filter(s => s.undeclared_writes.length > 0);

// (b) pairwise actual ∩ actual — real overlap between parallel scopes
const overlaps = [];
for (let i = 0; i < completed.length; i++) {
  for (let j = i + 1; j < completed.length; j++) {
    const a = completed[i], b = completed[j];
    const shared = a.actual_files.filter(f => b.actual_files.includes(f));
    if (shared.length > 0) overlaps.push({ a: a.id, b: b.id, shared });
  }
}

// (c) lock conflicts — file-locking.md protocol violations
const lockDir = '.stelow/' + tracking.workflows[0]?.dirHash + '/locks';
const lockConflicts = [];
try {
  for (const f of fs.readdirSync(lockDir)) {
    const lock = JSON.parse(fs.readFileSync(lockDir + '/' + f, 'utf8'));
    const expires = new Date(lock.expires_at).getTime();
    if (expires < Date.now()) lockConflicts.push({ lock: f, scope: lock.scope_id, file: lock.file, status: 'stale' });
  }
} catch {}

console.log(JSON.stringify({ undeclared, overlaps, lockConflicts }, null, 2));
" > overlap-report.json
```

**4-class overlap report:**

| Class | Definition | Action |
|---|---|---|
| **(a) undeclared writes** | Scope touched files outside its declared `target_files` | Human review — possible contract violation, possible scope creep |
| **(b) real overlaps** | Two scopes wrote the same file (no lock or lock stolen) | Human decision: merge, sequential re-run, or rework |
| **(c) stale locks** | Locks left behind past `expires_at` (agent crashed mid-edit) | Auto-recover on next acquire; surface for visibility |
| **(d) clean** | declared == actual, no inter-scope overlap, no stale locks | ✅ No action |

Append the overlap result to the report. If any non-clean class is non-empty, surface it to the human for decision.

**Save to:** `docs/{YYYY-MM-DD}/{slug}/execution-report.md`

```
📊 Execution Results: {plan-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [SCOPE-1] Login — feature — DONE (2/3 iterations, 3 files, 2 reviews passed)
✅ [SCOPE-2] Search optimization — optimization — DONE (latency 180ms, target <200ms ✓)
✅ [SCOPE-3] Vector DB eval — spike — DONE (recommendation in docs/spikes/)
⚠️ [SCOPE-4] Dashboard — feature — ESCALATED (3/3 iterations, last error: e2e timeout)

📋 Overlap report: {overlap-report.json}
  class (a) undeclared writes: {n}
  class (b) real overlaps:      {n}
  class (c) stale locks:        {n}
  class (d) clean scopes:       {n}

Timeline: {total duration}
Commits: {commit hashes for each scope}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps:
- Review overlap report (classes a/b/c need human attention)
- Handoff to Verification: run test suite, code review, UI/browser testing
```

---

