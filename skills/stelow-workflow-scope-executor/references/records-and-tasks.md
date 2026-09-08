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
| `planned` | Parsed from the `\| # \| Task \| ... \|` table in spec-tech.md (see `skills/stelow-workflow-tech-planning/references/scopes-and-sequencing.md#Scope Detail Template`). | Tasks defined at planning time. |
| `discovered` | Appended by the executor (LLM child) during execution when reality reveals new work — a test flake, a missing index on a slow query, a refactor needed for the ACs. | Always requires a `note:` explaining the trigger. |

**Seeding planned tasks (scope start, in Step 3c):**

After parsing the scope body for the Tasks table, push each into `scope.tasks` with
`status: 'pending'`, `source: 'planned'`. **Seed + validate in one pass** — no
separate guard step needed.

```bash
node -e "
const fs = require('fs');
const VALID_SOURCES = new Set(['planned', 'discovered']);
const VALID_STATUSES = new Set(['pending', 'done', 'skipped']);

const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'in-progress';
    scope.start_sha = process.env.SCOPE_START_SHA || '';
    // Seed planned tasks from spec-tech.md — executor parses the body table and emits this list.
    const tasks = {TASKS_JSON_FROM_PARSED_TABLE};   // e.g. [{id:'3.1', name:'SQLite migration', source:'planned', status:'pending', risk:2}, ...]

    // Re-sync guard: validate tasks exist and have correct shape.
    // FAIL: empty/malformed table (parse failed).
    // FAIL: invalid source or status (typo, wrong field name).
    // WARN: discovered task without note.
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.error('[Seed guard] SCOPE-{SCOPE-ID}: tasks empty or not an array. spec-tech.md table may be malformed.');
      process.exit(1);
    }
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.id || !t.name) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] missing id or name');
        process.exit(1);
      }
      if (!VALID_SOURCES.has(t.source)) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] invalid source: ' + t.source + ' (expected planned|discovered)');
        process.exit(1);
      }
      if (!VALID_STATUSES.has(t.status)) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] invalid status: ' + t.status + ' (expected pending|done|skipped)');
        process.exit(1);
      }
      if (t.source === 'discovered' && !t.note) {
        console.warn('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] discovered but no note. Add note explaining trigger.');
      }
    }
    scope.tasks = tasks;
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
  console.log('[Seed guard] SCOPE-{SCOPE-ID}: ' + (scope?.tasks?.length ?? 0) + ' tasks seeded OK.');
}
"
```

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

