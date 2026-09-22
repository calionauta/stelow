#### 3e-bis. Record convention (claim-proof evidence before close)

**Convention (v1 — advisory, no enforcement):** every completed scope must have a `## Record` section in its iteration-state file (`docs/{YYYY-MM-DD}/{slug}/iteration-state-{SCOPE-ID}.md`). The Record is the **claim-proof artifact** that proves the scope did what it claimed, under the conditions that existed, with the limitations and non-claims spelled out. Without it, the ✅ is unearned.

Template (copy into `iteration-state-{SCOPE-ID}.md` on scope start, fill on close):

```markdown
## Record

### Files touched (auto from git diff)
<!-- Filled by executor at Step 3e from `git diff $start_sha..HEAD`. -->
- path/one.ts
- path/two.ts

### Commands run (manual, log every verify command)
<!-- Filled by executor; every verify/test/lint command goes here. -->
- `npm test` → exit 0
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0 (3 warnings, non-blocking)

### Baseline (pre-change verify results)
<!-- Captured at scope start (Step 3c) BEFORE any edit: run each verify
     command once against the unmodified tree. Best-effort; commands that
     cannot run pre-change go in Limitations instead. Step 8 compares these
     exits against close-time exits; newly failing checks are gaps. -->
- `npm test` → exit 0 (412 passed)
- `npm run typecheck` → exit 0

### Timing (machine-written, never hand-edited)
<!-- started_at is written by the seed guard; finished_at + duration_s at
     close. cost is host-reported tokens only — omit when unknown, never
     estimate (an estimated cost is a hallucinated metric). -->
- started_at: 2026-09-19T07:00:00.000Z
- finished_at: 2026-09-19T07:23:11.000Z
- duration_s: 1391
- cost: {input: 12000, output: 3400} (omit entirely when the host reports nothing)

### Verification checklist
<!-- Filled by executor. unchecked items = blocker. -->
- [ ] acceptance criteria met (cite AC text from spec-tech.md)
- [ ] no scope overlap introduced (Step 8 report class a/b clean)
- [ ] no new TODO/FIXME introduced without entry in spec-tech.md
- [ ] suggested commit: `feat: <conventional> (<scope-name>)`

### Limitations / non-claims
<!-- What this Record does NOT prove. Honest scope. -->
- Did not test under load (out of DoD).
- Did not verify backward-compat with the v0.4 API (broken in v0.5+ by design).
```

**Field semantics (matches Evidence Ladder, weakest-true-claim discipline):**
- `Files touched` — ground truth, NOT a re-statement of `target_files`. The diff between `start_sha` and HEAD is authoritative; never hand-edit this list.
- `Commands run` — agent discipline. Every verify command executed MUST appear with its exit code. Skipped commands go in `Limitations / non-claims`, not here.
- `Baseline` — pre-change exits for the same commands, captured before the first edit. Empty is honest ONLY when the commands cannot run pre-change (say so in Limitations); otherwise Step 8 cannot distinguish regressions from pre-existing failures.
- `Timing` — machine-written. `duration_s` is computed (`finished_at - started_at`), never hand-written. `cost` exists ONLY with host-reported numbers; an omitted cost beats an estimated one.
- `Verification checklist` — minimum proof level. unchecked items block close.
- `Limitations / non-claims` — anti-overclaim. If the scope "works", but you didn't test the failure mode, say so here. Future agents (and humans) need to know what's NOT proven.

**How to fill the bash placeholders (`{M}`, `{COMMAND_COUNT_FROM_BODY}`, `{true_or_false}`, `{conventional-commit-line}`):**

- `{M}` — final iteration count (the `iteration` variable Step 3 tracked). Already familiar from previous 3e bash above.
- `{COMMAND_COUNT_FROM_BODY}` — count the `- \`command\`` entries inside the `### Commands run` section. If you ran 4 verify commands, this is `4`. If you skipped verifications, document the skips under `Limitations / non-claims` AND set `commands_count: 0` honestly.
- `{true_or_false}` — literally `true` or `false` (no quotes around the boolean at the JSON level). Set `true` ONLY when every `- [ ]` in `### Verification checklist` is `- [x]`. Set `false` if ANY checkbox is unchecked AND you closed anyway (rare — usually means you should escalate instead of close).
- `{conventional-commit-line}` — a Conventional Commits line like `feat(auth): add SQLite migration`. The Record body has a dedicated line for this in the Verification checklist.

**Why markdown body, not YAML/JSON:** LLMs parse markdown natively with zero escape risk; the `stelow.json` mirror fields (`record.completed_at`, `record.files_count`, `record.commands_count`, `record.verified`, `record.suggested_commit` — all snake_case to match the rest of the schema) are the machine-checkable subset for execution-critique. Body is human + LLM readable; mirror is programmatic.

**Wire into `stelow.json` (machine-checkable subset):**

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'completed';
    scope.iteration = {M};
    scope.actual_files = {ACTUAL_FILES.split('\n').filter(Boolean)};
    scope.record = {
      completed_at: new Date().toISOString(),
      started_at: scope.started_at ?? null,
      finished_at: new Date().toISOString(),
      duration_s: scope.started_at ? Math.round((Date.now() - new Date(scope.started_at).getTime()) / 1000) : null,
      baseline: {BASELINE_JSON_FROM_RECORD},  // {command: exitCode} captured pre-change; {} when legitimately skipped (say so in Limitations)
      cost: {COST_JSON_OR_NULL},  // host-reported tokens only; null when unknown — never estimate
      files_count: scope.actual_files.length,
      commands_count: {COMMAND_COUNT_FROM_BODY},
      verified: {true_or_false},  // set true ONLY when ALL Verification checklist items are [x]
      suggested_commit: '{conventional-commit-line}',
    };
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Enforcement:**
- By default, `record` is an advisory convention. `stelow-workflow-execution-critique`
  Criterion 6 flags scopes with `status: 'completed'` AND `record.verified !== true`.
- `STELOW_VALIDATE=1` enables runtime validation (see `scripts/pre-commit-record.sh`). The
  record validators check every scope's `record` and `tasks`
  before persisting the tracking file.
- Pre-commit hook at `scripts/pre-commit-record.sh` blocks commits with
  unverified completed scopes.

#### 3e-ter. Task tracking — Shape Up hill chart inside a scope

**Convention:** each scope carries a `tasks[]` checklist on `wf.scopes[i].tasks`. Tasks are NOT separate execution units — they're a visible checklist that lets the executor and the human see what work the scope is doing right now, what got discovered mid-execution, and where the scope actually was when it closed. This is the Shape Up hill chart collapsed into a single scope.

**Two sources of tasks:**

| Source | Origin | When to use |
|---|---|---|
| `planned` | Parsed from the `\| # \| Task \| ... \|` table in spec-tech.md (see `../../stelow-workflow-tech-planning/references/scopes-and-sequencing.md#Scope Detail Template`). | Tasks defined at planning time. |
| `discovered` | Appended by the executor (LLM child) during execution when reality reveals new work — a test flake, a missing index on a slow query, a refactor needed for the ACs. | Always requires a `note:` explaining the trigger. |

**Seeding planned tasks (scope start, in Step 3c):**

After parsing the scope body for the Tasks table, seed via the single
writer — never hand-edit tracking (see `stelow scope seed-tasks` for the
guard contract: non-empty list, id+name, planned|discovered sources,
pending|done|skipped statuses, trigger note required for discovered):

```bash
stelow scope start --scope "{SCOPE-ID}" --start-sha "$SCOPE_START_SHA"
stelow scope seed-tasks --scope "{SCOPE-ID}" --tasks '{TASKS_JSON_FROM_PARSED_TABLE}'
# e.g. [{id:'3.1', name:'SQLite migration', source:'planned', status:'pending', risk:2}, ...]
```

`start` sets in-progress + `started_at` once (a re-seed never restarts the
clock) and enforces dependency order; `seed-tasks` validates, replaces
planned tasks, and preserves already-appended discovered tasks (the old
inline snippet dropped them on re-seed — the CLI does not).

**Re-sync guard rationale:** Instead of a separate `node -e` that re-reads the file
(post-seed verification), validation runs inline during the seed write. Same
pass, same data, same guarantees. If the guard fails, inspect the spec-tech.md
Tasks table and fix the parsing before proceeding. Do NOT start execution
without seeded tasks — every task not discovered will be invisible and uncheckable.

**Appending a discovered task (mid-execution, in iteration feedback):**

When the child LLM discovers new work, append a task with `source: 'discovered'` and a non-empty `note:`.

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    if (!scope.tasks) scope.tasks = [];
    // {DISCOVERED_TASK_JSON} — emit e.g. {id:'3.7', name:'Index on users.email', source:'discovered', status:'pending', discovered_in_iter:3, note:'P95 query time 380ms without index; AC requires 50ms'}
    const task = {DISCOVERED_TASK_JSON};
    // Validate discovered task has a note (anti-rationalization)
    if (!task.note) {
      console.error('[Append guard] SCOPE-{SCOPE-ID}: discovered task missing note. Explain what triggered this task.');
      process.exit(1);
    }
    if (task.source !== 'discovered') {
      console.error('[Append guard] SCOPE-{SCOPE-ID}: appended task must have source:\'discovered\', got ' + task.source);
      process.exit(1);
    }
    scope.tasks.push(task);
    scope.discovered_tasks_count = (scope.discovered_tasks_count || 0) + 1;
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

Then run `scripts/stelow sync-scopes` (no-op when already in sync — the run
itself is the refresh signal, so the host reloads the card and the new task
appears on the board without waiting for the next lifecycle event).

**Marking tasks done / skipped (during execution):**

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope?.tasks) {
    const t = scope.tasks.find(t => t.id === '{TASK-ID}');
    if (t) t.status = '{done_or_skipped}';
  }
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

Then run `scripts/stelow sync-scopes` — same refresh signal as above, so
done/skipped tasks flip on the board immediately.

**Render tasks checklist into `iteration-state-{SCOPE-ID}.md`:**

The SKILL-rendered checklist (rendered into the markdown body so the executor + human can see state at a glance):

```
## Tasks

### Planned ({PLANNED_TOTAL}, {PLANNED_DONE} done)
- [x] 3.1 SQLite migration (LOW, db)
- [x] 3.2 CRUD commands (MED, api)
- [ ] 3.3 Integration test (MED, test)

### Discovered ({DISCOVERED_TOTAL}, {DISCOVERED_DONE} done)
- [x] 3.4 Fix race in DB init (iter 2 — discovered when migrate crashed twice)
- [ ] 3.5 Index on users.email (iter 3 — slow query observed)
```

**Rule of thumb (Shape Up style):** if a discovered task grows large enough to be its own delivery unit, **escalate and split into a new scope** instead of bloating the current scope. The hill chart's job is to make scope size honest, not to encourage scope creep in disguise.

**Why runtime tracking, not just markdown:**

The `scope.tasks` array on `wf.scopes[i]` lets `stelow-workflow-execution-critique` report:

- "Scope 3 closed with 5 of 6 planned tasks done and 1 skipped + 2 discovered (both done). Work was real."
- "Scope 7 closed with 1 task in `tasks` and the body was 80% unwritten." (catches scope-vs-task confusion early)

This is the machine-checkable proof that the scope was actually executed, not just declared. Combined with `Record Evidence` (Criterion 6) and `Tasks Tracking` (Criterion 11), the audit cycle ensures scope delivery is verified, not just claimed.

