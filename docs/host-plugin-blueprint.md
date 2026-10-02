# Host Plugin Blueprint

How to wrap stelow in a visual host (board + inbox + workers) the way
`bb-plugin-stelow` does — without forking methodology. The contract lives in
[HOSTING.md](../HOSTING.md); this is the build guide: domain model, sync
recipe, and UI patterns, each mapped to the reference implementation files.

## 1. What the host must provide

Same table as [HOSTING.md](../HOSTING.md#what-a-host-provides), plus what the
board specifically needs beyond skill execution:

| Capability | Why the board needs it |
|---|---|
| Spawnable worker threads with presets (provider/model/reasoning) | One worker per card; preset swaps at band boundaries |
| Structured blocking input (form with options + timeout) | The ask/answer protocol (§4); plain chat text is not routable |
| Realtime pub/sub or polling | Card, board, and inbox refresh (§7) |
| Key/value or SQLite storage | Cards, comments, inbox events, ledger, sync state |
| Host-served reading list | exact state/transitions/stage-playbook paths per card — workers read what they are given, never discover skills through shell pipelines over content-hashed ids |
| Scheduler (cron-like) | 6h skills sync; idle reconciliation sweeps |

Missing structured input? Then questions degrade to chat text and the inbox
loses its "answerable" guarantee — the single most valuable property below.
Prefer a host that has it.

## 2. Card lifecycle model

```
Build:        draft → in-progress → completed
                              ↘ archived (terminal, from any state)
Research/Explore (lightweight):
              pending → in-progress → completed
                              ↘ archived (terminal, from any state)
```

`status` is durable board position. `activity` (`running`/`held`/`idle`/
`error`/`awaiting-answer`) is an ephemeral signal and must never move a card.
Invariants (encode every one; each has bitten us):

- **Idle is a statement about the thread, not about the card.** Three things can
  own a card while its thread sits idle, and each needs a different projection —
  none of them is "a person should nudge this":
  - **The host is holding the message** (`held`). The dispatch was accepted and
    not sent. Project the hold, spend no budget, never nudge — the pending
    message IS the pending work, and a nudge would queue a duplicate of something
    already on its way. See §8 `host-hold`.
  - **A host Workflows run owns the stage.** The run outlives the turn that
    started it, so thread-idle says nothing. Hold the card as running and offer
    nothing. See §8 `native-run`.
  - **A run failed.** That is not idleness, it is a hold, and it gets a door:
    see the failed-run invariant below.

  Order matters and is not arbitrary: host hold first (the host already said so),
  then live run (the run IS the pending work), and only then the auto-continue
  decision.
- **A stage whose newest run failed holds the card there, and the refusal names
  the door.** Continuing past a failed run is how a card advances on work that
  never happened — and the symptom is not an error, it is a card that cheerfully
  reports a stage it never reached. A refusal that names no exit is a deadlock
  with a good error message, so the refusal names the retry, the retry is a real
  action, and it appears on the run that is actually blocking. Scoped to the
  card's CURRENT stage: a card carries failed runs for every stage it has passed,
  and offering a retry on one of those produces a button whose only outcome is an
  error explaining that the card moved on. Take the hold on the dry run too — a
  dry run is how a worker asks "may I advance?" before committing, so a gate below
  that short-circuit means the one probe built to prevent the mistake is the one
  place it does not fire.

- **Archived is terminal to every automated path.** No poll, event, error path,
  or drag may take a card out of `archived`. Enforce at the single write choke
  point, checked against a fresh read (a poll that read before Archive lands must
  not write after it), and put the guard in front of the move resolver rather
  than inside it, so no track has to remember it. A card already there dropped
  back onto the archived column is a no-op, not a violation — the most common
  drag in this UI is nudging a card a few pixels and letting go where it
  already sat. The one exit is the confirmed action below, and nothing carries
  its key.
- **Terminal is terminal; park is reversible — archive through a confirmed
  separate action.** Archive parks work intact, so an accidental archive is one
  of the cheapest mistakes a user can make and one of the most expensive to
  leave parked. The undo is a distinct user-initiated action in Manage, never a
  poll side effect and never bundled into Archive itself, and it states which
  stage the card returns to before anything runs. Delete stays irreversible
  either way: restoring an archive is not restoring the run files it removed,
  so this is a rescue and not an undo, and the UI should not imply otherwise.

  Restore reactivates events **per kind, never blanket**, and only those the
  archive actually took away — the discriminator is the resolution reason the
  archive itself wrote, so a question the user answered before archiving stays
  answered:

  | kind | on restore |
  |------|------------|
  | `question` | reopens, clearing the stale reason (a reopened row that keeps its resolution reason reads as resolved to every consumer) |
  | `error` | reopens, carrying the card's stored last error **verbatim** as the summary — never a paraphrase, never a generic "something went wrong" |
  | `paused` | re-derived from live state by a fresh worker, not resurrected |
  | `completed` | never returns; it was a delivery dismissed by reading, not work taken away |

  A restored card is a card at its previous stage with a **new worker** (the old
  thread is gone; the stage is what persists), and it is drag-refused again
  immediately — restore is not a hole in terminality, so terminality is
  re-asserted on the very next write rather than trusted from the restore call.
  If spawning the restored worker fails, the action rolls back rather than
  leaving a half-restored card.

  The new worker has a consequence worth deciding on purpose: a pending question
  belongs to the thread that asked it, so the fresh worker's question sync
  resolves the reopened row `superseded` within seconds — truthfully, since
  nobody is waiting on it any more, but it means the per-kind table above is not
  the whole story for `question`. "Fresh worker" and "the question is still
  answerable" cannot both hold for a question addressed to the dead thread.
  Decide whether a pending question should outlive its worker; do not leave it to
  whichever sync runs first. This was measured on live data, not inferred.
  The stage it returns to is the card's own stage, never the entry stage of the
  phase it belongs to: re-entering a phase would overwrite the card's real
  position with a guess about where the phase begins, so derive the status the
  way the phase-entry path derives it and never touch the stage.

- **One primary action per state.** Destructive actions (archive, delete,
  reseed) live behind confirm dialogs; never as the prominent choice.
- **Completed reopens only through defined paths** (user comment on
  lightweight tracks; explicit reseed/move) — never as a poll side effect.
- **Done is an explicit commit, never an inference.** The worker declares
  completion; the host verifies in code (terminal stage, artifact gates,
  no pending question) and every refusal names the fix. Inferring
  done-ness from `audit` + idle made narrate-and-stop indistinguishable
  from stuck — the same confusion that produced the stop-per-turn
  incidents.
- **One refusal sentence per cause, with the predicate beside it.** A
  refusal with a single correct answer is one constant, read by every
  surface that refuses and by every surface that has to recognise it.
  The drift this prevents is invisible by construction: the sentence can
  name one action while the menu entry it points at is worded
  differently, so the reader is told to use a door they cannot find —
  and the confirm dialog for that very entry can advise the cheaper
  alternative that cannot help, because on that card every command is
  refused until the records agree. Eight server sites and two components
  each held their own copy of the words, which is how the mismatch gets
  there — and three of them still did when an earlier version of this
  paragraph claimed five, which is why the count is measured against the
  sources rather than remembered, and why a test enumerates the sites and
  fails when one re-spells the verdict inline. The sentence earns its
  length because every clause
  is one the reader would otherwise have to infer: what failed, what the
  workflow will not do instead, which action clears it, **where that
  action lives**, and that the obvious alternative does not work.
  Recognition is a prefix match — not equality, and not a substring test:
  sites append their own tails, so equality misses real refusals, while a
  message that merely mentions the phrase mid-sentence is not the
  refusal. It is a function, never a string comparison at each call site:
  a site that misspells the constant compiles, runs, and silently stops
  recognising its own refusal. Keep it a plain module both sides can
  import — server and client need the same words, and threading one
  sentence through a dependency bag costs three wiring files and two dep
  types to move a string.
  **Repair advice varies by cause even though the action does not.**
  Restart-fresh is the right answer for most failures, so most of them
  earn "try the cheaper retry first"; on a card whose state ownership
  cannot be verified, a retry resumes a worker whose every command is
  refused, which teaches the reader that retry is the cheap thing to try
  twice. Only the sentence changes — the action, its confirmation, and
  its blast radius stay identical — and it is chosen by a function rather
  than by a conditional inside markup, which is testable only by matching
  its own source.
- **Discard ≠ archive.** Archive parks with work intact; discard destroys
  unpushed work (worktree drop, branch reset to the pre-card base, or
  folder delete — refused on pushed history, shared lines, detached
  HEAD), then archives. Preview proves the blast radius (files, commits)
  and the confirm states it in full; execution stops the worker,
  re-validates, verifies clean, and leaves a trail comment.
- ** terminal cards show terminal UI**: history + final state only, no worker
  controls except Delete.
- **Terminal states release workspace claims.** `done`, archive, cancel,
  `blocked`, and delete drop every file claim the card holds, and the host
  resumes exactly the cards that waited on each freed file (paused event
  resolved as `resumed` plus an agent-only nudge to re-acquire). Per-card
  lock dirs are invisible to sibling cards — claims are keyed by the
  checkout the worker actually writes to (falling back to the project
  source), not by card state dir — so a parked card can never hold files
  hostage, and cards isolated in their own worktrees do not falsely
  serialize.
- **A claim ledger only sees cards — say so, and cover the rest.** A
  thread outside the host plugin never acquires a claim, so on a card
  whose environment resolves to the *shared* checkout the ledger answers
  "nobody" while another agent edits the same file. This is the default
  arrangement wherever the fallback environment preset is the project
  checkout rather than a per-card worktree, which makes it a mainstream
  case and not an edge. These rules make covering it cheap and honest:
  - **Isolate, then stop.** A card in a managed worktree answers
    `isolated` before any subprocess. A scan that could never find
    anything is theatre, and it costs.
  - **Ask, don't poll.** The host-wide thread list is a fact about the
    host, not about a card: read it once, cache it for seconds, and spend
    it only when a reader asks — never on the open-card path. Cache per
    host, never per card, or the cost multiplies by the number of cards
    being read.
  - **A shared working tree has no per-agent ownership.** Report *who is
    here* and *which of my files are dirty*, as two separate facts, and
    never attribute a file to an agent. The first is a fact about the
    host; the second is a fact about this card. Fusing them, or naming
    the author, invents provenance the host cannot supply.
  - **A failed read is not a clean read.** "Could not read the host's
    threads" and "nobody is there" are different answers and a reader
    must be able to tell them apart. Every read on this surface fails
    soft, and says which of the two it was.
  - **One empty set is not an empty relation.** Order the questions by
    what each one licenses asking next: *who else is in this checkout* is
    a fact about the host, so it is answered first, and it decides whether
    this card's own files may be compared at all. A card holding no
    files therefore does not get "no overlap, zero threads" — it gets
    unknown footprint: the population is real and measured, and the
    intersection was never computed because one side is empty. Export the
    verdict set as one list, because the transport schema, the server's
    own type, and the reader's copy all have to agree — a reason invented
    in one and forgotten in another is a reason the UI has no sentence
    for:

     | verdict | what it asserts |
     |---|---|
     | `isolated` | the card works in a managed worktree, so isolation already answered it |
     | `no-checkout` | there is no checkout on this surface to read |
     | `no-threads` | the host's thread list was read and nobody else is in this directory |
     | `no-overlap` | others are here, and none of the files this card holds are dirty there |
     | `shared` | others are here and a held file is dirty; the per-file lines say it |
     | `unknown-footprint` | others are here, but this card holds nothing, so no overlap could be measured |
     | `unreadable-tree` | others are here, but the working tree could not be read |
     | `unavailable` | the host's threads could not be read at all |

     A verdict that could not be measured never renders as a clean one:
     the unmeasurable ones report the population they did measure **and**
     what could not be compared, and both halves are load-bearing —
     dropping the count turns "we could not compare" into "nothing to
     compare". A verdict the sentence function does not know says nothing
     at all, because a wrong sentence is worse than none: a reader cannot
     tell a confident lie from a fact. And the whole report is a report,
     never enforcement — it blocks nothing and resolves nothing, and the
     moment it is allowed to gate a write it has become a policy decision
     nobody made on purpose.
- **An unanswerable read is neither a card verdict nor silence.** When
  the host cannot read a card's state, both card-verdict channels are
  wrong: writing the failure onto the card files a host fault where the
  card's own health belongs, and it lands in the same stored error that
  decides whether the reader is offered a resume action — so a fault no
  resume can fix renders as a button that cannot work. Refusing that write
  is the same fail-soft rule the cross-thread read above obeys, applied to
  the card's own state. Silence is the other failure, because the next
  occurrence is then explained by theory instead of by evidence. Three live
  cards lost their reads to a stalled host event loop, recovered on their
  own about a minute later, and left no trace at all.
  So the shipped answer is a **third** channel that is neither a verdict
  nor silence: count consecutive misses per card **in memory**, and on a
  threshold long enough that one slow read, one restarting worker, or one
  dropped connection is not a report, write **one** persisted timestamp
  and warn **once per outage** — the same number, crossing the same
  threshold, on the same tick, so the board and the log cannot disagree
  about when an outage became worth reporting. A second counter for the
  card would be the drift this repository refuses: two things counting one
  outage, one of them quietly wrong.
  The persisted fact is a nullable per-card `since` column and nothing
  more, and each of the channels it could have used instead is refused for
  a reason a host author will hit: it is **not** `activity`, because that
  is the last **verified** projection and overwriting it destroys the only
  true thing the card knows while the host is silent — a card that is
  probably working would stop saying so; it is **not** `last_error`, for
  the resume-button reason above; and it is **not** an inbox row, because
  every kind there is an action or a review request, and a row would hold
  the badge above zero asking for something that changes nothing. The card
  learns **that** its reads are failing and **since when**, never **why**:
  a symptom was measured and a cause was not, so a cause would be a guess
  wearing a fact's clothes. The write is latched, so a card unreadable for
  an hour keeps saying "since 14:32" instead of a moving number, and every
  door out of the state writes the column back to null rather than waiting
  for a tick that may not come — a warning that outlives the fault is a
  second lie, and an archived card would otherwise sit there naming a host
  that came back an hour ago.
  The properties below the count are load-bearing and each reads like a
  simplification somebody makes later: the **streak itself** is never
  persisted (persisted, it outlives its meaning — a restarted host
  inherits a streak and immediately warns about failures it never saw),
  which is why what is persisted is the timestamp the crossing latch and
  not the running count; the warn fires on equality, not on greater-than
  (an hour-long outage must not produce forty copies of one sentence); and
  the counter holds no database and no card beyond an id, which is what
  makes the whole rule checkable from a unit test with no wiring harness.
  A read that succeeds clears the streak and un-latches the column, and a
  card that leaves the scope drops both: a counter kept for a card nobody
  is watching eventually warns about the wrong thing. The card-facing
  sentence is derived from the measurement every time it is shown, exactly
  as `host-hold.mjs` derives its hold — the record is the truth and the
  module owns the only wording — and it ends in the promise that makes the
  state bearable: the card recovers by itself, so the reader is told there
  is nothing to do rather than left wondering what a stale card wants.
- **Work the system is already doing is not a card that stopped.** Two
  records say a card is in flight while its own thread says nothing is
  running: a message the **host** queued and has not dispatched (capacity
  full, host offline, a permission interaction open, the host's clock
  holding it), and a **native run** that outlives the turn which started
  it. Neither is the plugin's to push, and both were projected as `idle`
  behind a Resume button — so a reader was told a card needed recovery
  moments before the host released it on its own, and pressing Resume
  queued a *second* copy of a message already in the queue. Ten ticks of
  that turned one held card into ten nudges and spent the whole
  auto-continue budget on turns that never ran.
  So the record is the truth and the sentence is **derived** from it,
  every time, in one place per record — a writer cannot hold a card and
  render a different reason, because it only has one value to pass. Keep
  the host's own words **verbatim** where they count: the capacity
  message counts live slots ("4 of 4 running on host X") that nothing in
  the plugin can recompute, so a paraphrase is a second source of truth
  that rots the moment a slot frees.
  Three rules make this portable rather than a re-implementation:
  **a queued row IS a hold** — the kinds say *which* hold, never *whether*
  it counts, because a rule that excludes the short-lived kinds has two
  authors (the send path needs them or a card claims `running` for a turn
  that has not started; the poll path does not), and an **unknown kind
  degrades to the generic hold rather than to no hold** — the row exists,
  so the host has not dispatched it, and that much is true whatever the
  kind turns out to be, which is also how a host that adds a kind
  tomorrow stays on the card. A run's `needs_input` counts as live only
  while nothing else is asking the user something: a card with an open
  question is a card the reader is already in, and the question is the
  thing to show. And every derivation ends in "no action needed" — a
  sentence implying resume, retry, or check-the-run puts a human between
  work that is already progressing, which is what teaches people to
  distrust the badge. Both update **activity and text only**: never
  `status`, for the reason above, and the idle timestamp is cleared
  because a card that is not idle has no "idle since" to show. Give the
  queue depth its own clause when it exceeds one, since that is the
  pile-up this rule exists to make visible rather than hide behind "no
  action needed".
- **A failed run holds the stage, and the hold has a door.** A card may
  not advance out of a stage whose **newest** run at that stage failed:
  the run is the work the stage was supposed to do, and a failure nobody
  looks at is how a card walks past a stage that produced nothing.
  Newest, not *any* failed run — that distinction is the whole design,
  because a retry creates a newer run and so releases the hold the moment
  it starts. A rule keyed on "a failed run exists" would need a way to
  clear the failed row, and nothing clears one, so that version is a
  wedge. Scope the gate to the **stage**, not the card: a card
  accumulates runs for every stage it has passed, and gating on the
  card's newest run blocks a card that failed three stages ago and has
  moved on cleanly since.
  Key it on the run, deliberately **not** on the deliverable being
  missing. Those are two facts and they come apart — a coordinator can
  do a stage's work itself, outside the run, so the staging directory is
  empty while the stage's real output sits at its canonical path — and a
  deliverable-keyed gate lets that card through while stopping a genuinely
  empty stage. Choose the stricter rule knowing both facts; the door is
  what makes the stricter rule safe to choose. The refusal names the exit
  (**retry the run**), the run's own id, and the reason — a refusal that
  names no exit is a deadlock with a good error message.
  One implementation detail is load-bearing and was a bug the test
  caught: "newest" needs an explicit tie-break. Ordering by timestamp
  alone ties for two runs created in the same millisecond, and a tie the
  store does not promise to break means "newest" is whatever the scan
  happened to yield — so a retry launched in the same tick as the run it
  retries can read as the older one, and the hold reports a run the card
  has already moved past. Break the tie on insertion order, which is what
  "newest" actually means.

Reference (copyable, zero host imports): `worker-action-policy.mjs`
(action visibility), `card-move.mjs` (board-move decisions),
`workflow-intent-policy.mjs` (type edits), `card-detail-presentation.mjs`
(archived hero copy), `tracks.mjs` (build vs lightweight routing),
`card-claims.mjs` (workspace claim registry, terminal release, waiter
resume), `card-restore-pending.mjs` (per-kind event reactivation, driven by
the archive's own resolution reason), `shared-checkout-exposure.mjs`
(cross-thread overlap: who shares this checkout, which held files are
dirty, and the honesty bounds on both), `host-read-streak.mjs` (the
per-card unreadable-read streak: in memory, latching a persisted
`since` column, logging once per outage),
`ownership-refusal.mjs` (one refusal sentence, its prefix predicate, and
the repair advice that varies by cause), `host-hold.mjs` (a host-held
dispatch read as a fact, with the sentence derived from the record),
`native-run.mjs` (the run that keeps a card alive while its thread reads
idle), and `failed-run-gate.mjs` (the newest failed run holding a stage,
its tie-break, and the refusal that names the door).

## 3. Inbox event model

Four kinds, each with its own lifecycle — never blanket-resolve:

| Kind | Created when | Resolved when |
|---|---|---|
| `question` | worker asks (structured) | answered (or expired → `expired_questions` flow) |
| `error` | worker fails / probe fails | worker moves again |
| `paused` | idle past the grace period with unfinished work | worker moves again |
| `completed` | card reaches Done | seen (read, never auto-resolved) |

- **Dedupe by stable identity** (interaction/question id), never by
  timestamp: a state flap (`awaiting-answer → running → awaiting-answer`)
  must not duplicate alerts.
- **Lock-blocked pauses name the holder and the unlock.** A card that hits a
  file claimed by another live card parks that scope (never a retry loop)
  and gets one `paused` event per file (`lock-blocked:<card>:<file>` dedupe)
  naming the holder and the automatic release (owner release or lease
  expiry). Release resolves it as `resumed` and nudges the worker to
  re-acquire — the scope, not the human, does the retrying.
- **Badge counts unresolved action items only**, plus unseen fresh
  completions (7-day window). Resolved items persist under history.
- **Tier the queue deterministically, never suppress.** Score every event
  at write from observable signals (kind, age, stall count, error
  repetitions) into escalating / action / routine, recompute open rows on
  the reconcile sweep, and order reads by tier then newest. Each tier
  carries reason chips (`stalled 3d`, `error ×2`) so the ranking explains
  itself. The badge still counts every open action; resolved history stays
  chronological; thresholds live in one file, no migration to retune. A
  semantic bump (one yes/no per open item, confidence-gated, provenance
  chip) may promote within a tier later — never assign it, only after a
  golden set shows measured agreement.
- Render sections: needs-you, recent updates, resolved (collapsed),
  archived. Never show a resolved event with an actionable label
  ("Needs a decision" on a decided event is a bug, not a copy choice).

Reference: `inbox-events.mjs` (insert/sync/resolve/badge),
`inbox-event-presentation.mjs` (one label function for list, banner, and
deep link — a single text rule for active/resolved/archived).

## 4. Ask/answer protocol

1. Worker calls structured ask (title + options + optional previews/
   artifacts + timeout, ~1h).
2. Card flips to `awaiting-answer` (activity only — same column).
3. Answers arrive as **one batch**: exactly one worker continuation for the
   whole batch, unanswered items stay open.
4. Timeout without answer → persist as `expired_questions` (still
   answerable on the card); answering an expired question resumes the
   *current* worker with the Q/A pair as context.
5. Cancellation splits in two: transient (timeout/reload/abort) persists
   like a timeout; explicit end states (dismissed, thread stopped) return
   as-is for the worker to interpret.
6. Optional contract linkage: a group may declare `--contract <id>`; answers
   naming it are trailed with the contract. Undeclared flows behave exactly
   as before — provenance without enforcement.
7. Selection asks carry evidence **per option** (wireframe preview +
   proposal artifact each); one evidenced option must never launder blind
   siblings. Other gates review one shared document — a single evidence
   anywhere in the ask suffices there.
8. Failed submits keep the draft and stay open with a persistent inline
   warning naming the cause — a transient toast alone loses the retry.
9. A document that reaches an option it was never attached to is **marked as
   such**, by whatever route delivered it: inheritance from a sibling, or
   recovery from the stage manifest when the ask carried nothing at all.
   Marking only one route fixes nothing — the other is how a real card ended
   up with all four options rendering `Open: interfaces.md` as if each were
   its own evidence.
10. When several options open the **same** document, opening it from an
    option shows **that option's section**, above the document. A combined
    brief holds every proposal in one file, so opening it at the top shows
    exactly the options the reader did not pick — the hybrid is last, and the
    reader clicked the hybrid. Match the section on **words**, never on
    substring containment: `Hybrid A+C` is a substring of the title
    `Scope Map interface proposals (v1, Core: 3 + hybrid)`, so containment
    anchors on the file's H1 and reproduces the bug. Three routes, strongest
    first: the heading carries the label, the label carries the heading (a
    brief that only wrote `## Proposal A`), or both name the same option
    letter. No matching section renders nothing — never another option's
    words under this option's name.

    **Scroll to the heading; do not quote the section above the document.**
    A lifted section duplicates the reader's own text and makes one brief read
    as two documents, which is worse than either alone. An earlier version of
    this rule said the opposite, on the reasoning that rendered headings carry
    no ids and injecting them means rewriting the renderer's output. That
    reasoning was wrong in a way worth recording: an id is only needed to
    address a node you cannot otherwise find, and these nodes are found by
    reading the document text. The renderer already emitted them as heading
    elements inside the document's own scroll container, which the host
    component owns. One `scrollIntoView` lands on the option and the document
    stays one document. Lifting the section is the FALLBACK, for the cases
    where the heading is genuinely absent from the rendered DOM — a
    non-markdown file, a renderer that flattens headings, a partial load.

    Comparing a rendered heading against the one the text scan resolved is the
    same question, so it is the same function (`sectionHeadingsMatch`), not a
    second rule in the component. A local copy is how a scroll starts
    disagreeing with the anchor it follows, and no test can catch it because it
    needs a DOM — so the shared predicate carries the weight and the wiring is
    pinned at the call.
11. The option's label travels with the open request through every hop to the
    viewer, under one shared exported handler type. A handler taking fewer
    parameters is assignable, so a dropped label typechecks and silently
    reinstates the top-of-document behaviour.
12. **A composed option carries its own wireframe, and names what it composes.**
    When options are merged into a hybrid, the hybrid is itself a layout, so it
    is drawn: a fenced wireframe of the combination as it actually looks, not
    "combine A and C" and not a copy of either. It also names the proposals it
    composes by heading, so the full proposal stays one step away.

    The reason is the gate. A visual-review gate reviews *wireframes*, so a
    hybrid written only as prose cannot be reviewed at that gate at all — and a
    reader who clicks the hybrid option lands on text while the two mockups it
    merges sit elsewhere in the file. This is the difference between an option
    that can be judged and one that must be taken on trust. Where a host renders
    the option's section rather than scrolling to it, that composed wireframe is
    what the reader sees first.
13. **A machine receipt is not a deliverable, and is never counted as one.**
     Workflow hosts that write their own receipts into the run bundle (a
     portable audit trail, a codebase-context snapshot) must keep them out of
     the artifacts a card *produced*, and out of the count it states. They are
     real audit value — they belong in the bundle, the manifest, and the commit
     trailer — but a reader who counts them as output is being told the card
     did work it did not do.

     Two rules make that hold, and both exist because the classification was
     computed and then lost:

     - **The role travels with the artifact and is applied where it becomes
       visible.** A receipt classified at write time, carried on the artifact
       payload, and then dropped by the view is the common shape: one track
       re-implemented the filter inline (twice, in a single file) and drew a
       hand-made section around the result, while another track passed every
       artifact through untouched and reported "3 files" over two
       deliverables. The rule lives in one shared predicate, the inventory
       applies it once for every track, and the number a section states is
       read from that same predicate, so the count and the list cannot
       disagree.
     - **Receipts get their own named home, closed by default.** A disclosure
       that says what it is — the host's own audit record, not output — rather
       than a heading invented per surface. Closed, because a receipt is
       reference material and not a decision awaiting the reader, so it is
       neither live nor blocking and never earns open-on-load. A receipt must
       also not appear twice for the same fact, and the row that renders it is
       the row every other artifact uses, so a file cannot look like two
       different things depending on which section it landed in.

Reference: `question-batch.mjs` (pure parsing/grouping; the only
host-shaped corner is reading the payload top-level vs nested) +
`card-question-state.mjs` (pure wait-state transitions) +
`option-anchor.mjs` (pure section lookup over document text; no I/O, no DOM,
so any host can reuse it and test it).

## 5. Skills sync recipe

This is the HOWTO that [HOSTING.md](../HOSTING.md) ("vendor them, sync
them") omits. All 28 `skills/stelow-*` directories (workflow AND product)
plus `scripts/stelow`, `data/stelow`, `data/product-strategies.json`:

1. `GET` the repo git tree (`.../git/trees/main?recursive=1`); **refuse
   the whole run if `truncated`** — a partial tree prunes valid skills.
2. Filter blobs to `skills/stelow-*/` (+ the single files above).
3. Compare git blob-sha per file against local state; download only what
   differs; verify downloaded bytes against the tree sha (CDN staleness
   guard) before recording.
4. Publish atomically per skill: stage each skill fully in a sibling
   directory invisible to scanners, then rename-swap into place, so a
   concurrent reader hashes a complete tree (old or new), never a
   half-written one. Prune local `stelow-*` dirs missing
   upstream (never touch non-`stelow-*` entries); record a verification
   timestamp **only on fully clean runs**.
5. Keep sync state **outside ephemeral install paths** (beside the plugin
   database, never in the served skills dir which scanners read) and run
   one fail-soft pass **at boot** plus a periodic schedule (6h works:
   methodology changes gradually).
6. Fail-soft always: network errors log and keep old files; the plugin
   never breaks because sync failed.

Reference: `workflow-skills-sync.mjs` (including `readLastSyncAt`,
`SYNC_TIMESTAMP_KEY`). Surface freshness in the UI ("N skills · synced
X ago" + inventory dialog) — silent syncs become mystery meat otherwise.

## 6. Worker configuration (operational, not prescriptive)

- One worker thread per card; spawn with explicit provider/model/
  reasoning/permission (never inherit ambient defaults silently).
- Swap presets only at stage-band boundaries (analysis → planning →
  execution → review) so context survives within a band; record the swap
  as an inline mention of the archived predecessor thread.
- Restart (same state, fresh thread) beats reseed (restart from triage)
  for broken workers; reseed is for broken *direction*.
- Research/Explore run single stages with their own band and default.
- **Completion is a worker verb with a host-side gate** (§2): build
  completes only at the terminal stage, research/explore only with
  passing artifact checks and no pending question.
- **Retry transient start failures with backoff, bounded and idempotent**
  (one in flight per card, attempts claimed per failed thread,
  fresh-state revalidation; inbox pings only on exhaustion).
  Deterministic failures fail fast — backoff never fixes the same input
  failing twice.
- **Let models veto, never act, where a heuristic owns the decision.**
  When deterministic rules already decide (e.g. idle resume on fresh
  output within budget), a model judgment may only cancel a cleared
  action on confident contrary evidence — it must never authorize one
  the rules refused, spend budget, or write state. Every fallback keeps
  the heuristic standing; vetoes leave a log trail with the verdict.
- **Workers write conventional commits on repos that release from them**
  (detect release automation from repo markers; freeform elsewhere,
  never empty/`wip`).
- **Verify question-contract receipts at advance time** (agent receipts
  by fresh file + marker, human asks by recorded answer; unreadable
  state fails open, never deadlocks).
- **Fence shared-config mutation off worker threads.** Preset/model
  assignment is a host/UI concern; a worker rewriting it mid-flight
  changes every other card's brain. Refuse with a redirect (ask for it
  via the structured ask protocol instead of reassigning it yourself).
- **Surface child threads under their worker, never as peers.** Workers
  may fan work out to fresh BB child threads under the `subagents.md`
  contract; the host lists each child (title, status, provider,
  per-child token total, open link) beneath its worker row and leaves
  synthesis to the parent.

## 7. UI patterns that survived contact with users

- **Quiet inbox**: interrupt only when the agent needs the human; everything
  else is browsable history.
- **Explicit saves, local refresh**: router and settings rows stage edits
  locally and save through one button; a save refreshes only its own
  section, never the board — flipping a select must not fire a request
  by itself.
- **Project picker with re-anchor**: any cross-project dialog offers every
  project, defaults to the board's, and re-anchors on every open, so a
  stale pick never writes to the wrong project.
- **Bucket lives in the header gallery, never as a column**: the
  captured-but-unstarted pile is labeled Bucket on every track (never
  Inbox — that word belongs to the notification center) and opens from
  a header button into the shared gallery; stored keys, statuses, and
  move targets keep the old identifier, so the rename is labels-only
  with no migration. Rendered boards skip the column while grouping,
  moves, and filters keep the full catalog.
- **One gallery dialog for piles**: bucket columns and hill clusters open
  the same expanded modal — fixed dimensions (70vw wide, 85dvh tall,
  internal scroll), the board tiles
  themselves at the board's own column bounds (240–320px, auto-fill per
  row, natural height, never stretched to equal row heights), filling left
  to right then down, vertical scroll, titled by params (count plus
  context). Creation
  checkboxes link the same gallery from their "park in Bucket" copy.
  Never a second modal, never a positioned overlay.
- **Result-oriented copy**: say "results", never "index"; "result", never
  "artifact". Internal filenames stay out of user-facing text.
- **No destructive primary actions while a worker is healthy**: recovery
  options appear only on error/pause/stuck; archive is secondary with
  confirm.
- **Debounced realtime**: batch mutation bursts (≈250ms) so panels don't
  stampede; reload on `card-state`/`board-changed`, never on a timer.
  The reconcile tick additionally watches a scope-progress fingerprint per
  live card and publishes on movement only — silent worker edits surface
  within one tick, first sight baselines silently, cosmetics never publish.
- **Freshness signals over vibes**: show running build version + build
  time and skills verification age so "did the reload take effect?" is
  checkable.
- **Update status as a tone-coded box under the plugin title**
  (`role="status"`): current/available/checking/not-managed/unreachable
  each name their state and path forward. Installs the manager cannot
  update additionally surface the newest upstream release (fail-soft
  lookup) with the manual path; one update signal drives every badge
  (sidebar row, tab, status box). That signal is one shared store, not
  a per-surface mount poll: a forced check republishes it, so a check
  run inside one tab lights every surface at once instead of only the
  component that asked.
- **Unavailable controls state why, in place**: a disabled control
  cannot be focused and `title` is never announced, so the reason an
  action is unavailable is visible text the control is described by —
  never a hover tooltip, never a silent no-op. The same rule covers
  background work: a scheduled rule or setup-dependent job that cannot
  run names the missing dependency and where to fix it, instead of
  returning quietly while an empty list reads as "nothing to do".
- **Creation failures stay open**: a failed submit keeps the dialog and
  draft with a persistent inline warning — never a toast alone.
- **Automation proposes by default, disposes only isolated and opted-in**:
  scheduled rules create unstarted drafts unless the user explicitly opts
  into auto-start — and then only into an isolated worktree destination
  verified against the *effective* spawn environment (band routing wins
  over any passed preset; checking preset existence is not enough).
  Enabling a rule records the current backlog as seen without drafting;
  a dry-run preview names what would match now and exactly why the rest
  would not; every refusal names the fix. Never move cards, merge code,
  or import behind the user's back.
- **Progress hero above work detail**: one glanceable readout (scope/task
  bars with counts — never percentages — doing-now names, blocked names)
  over the same scopes/tasks contract the detail list renders — presentation
  only, no second data source, refreshed by the same realtime channel.
  Board-level flow keeps tempo (lead/cycle) apart from attention (stuck,
  review-awaiting) in tabs; signal chips ride the closed header only when
  nonzero, so a calm board shows no amber.
- **Destructive confirms state the full blast radius**: name data rows,
  run files, and what explicitly survives (e.g. Git checkouts) before
  anything runs — the dialog text must match what the handler deletes,
  in both directions (no silent leftovers, no silent preservation).
- **Sync is the refresh signal for file-owned state**: when workers edit
  tracking files the host cannot watch, an idempotent sync command the
  worker runs after each edit doubles as the notify — the host publishes
  its realtime event on the sync, so boards reload live instead of on
  the next lifecycle event. A re-sync must preserve host/worker overlay
  (rework scopes, discovered items), never replace it.
- **Name the checkout, never guess it**: open cards show where the worker
  runs in one stored word (isolated worktree, shared checkout,
  BB-managed, exploratory) plus the live branch — decided once at spawn
  from the resolved environment, read back afterwards. Path-sniffing
  rots; a stored label does not.
- **Decouple features into modules with their own kill switch**: one
  feature (contract fragment + migrations + scheduler + RPCs) behind one
  seam of explicit dependencies; the host wires a contract spread, one
  migration call, one schedule line. An env-gated flag disables the
  scheduler, the RPCs (each refusal names the variable), and the panel
  entry — evolving, refactoring, or switching a feature off never touches
  the core.
- **A rule is a module-level function over a narrow slice; the factory
  only binds it**: when a factory or a hook outgrows the file budget, the
  fix is not to move the closure body to a neighbour — that leaves one
  oversized function with a new name. Each rule becomes a module-level
  function whose first parameter is the slice of dependencies it actually
  reads, and the factory returns it bound. The slice is the test seam: a
  behavior test passes a double host and the real ledger, with no factory
  and no composition root standing up. Relocating without narrowing the
  parameter keeps the debt and moves the file that reports it.
- **A hook's concerns are its components' concerns**: split a dialog's
  state per tab, and each tab owns the state it renders while the shared
  choreography — tab switch, re-anchor on open, close reset — lives in one
  hook of its own. A tab that imports the other tab's state is a
  component that cannot be deleted with its tab; the seam is the
  choreography, not a second copy of the state.
- **Keep host entry files as composition roots**: `app.tsx` and the server
  entry wire slices, shared contracts, and migrations; they do not retain
  the slice implementations. A server slice depends downward on its
  contract, host-neutral libraries, and injected host services, never back
  into the composition root. This applies across layers: a capability may
  own pure policy in `lib/`, host adapters in the server, presentation in
  components, and its tests together without creating a new architecture
  layer.
- **Route fuzzy judgments through decision routers, not prompts**: one
  decision endpoint configured once (endpoint + key + model for
  Jev-compatible APIs; endpoint only for keyless labels APIs such as
  classifier.dev); each judgment is a registry entry with modes (built-in
  rules vs API) and a confidence floor. Providers differ only in a small
  request/response adapter behind one shared client — questions,
  thresholds, and fallbacks stay provider-agnostic. Unconfigured means
  built-in rules; failures degrade, never block; the key never leaves the
  host (reads report presence only); an explicit probe is the only
  on-demand spend. Seeds are advisory — whatever the router suggests, the
  worker re-settles it in its own stage.
- **Static assets**: if the host bundler has no image loader, serve brand
  marks as data URIs over RPC — never runtime relative URLs (they 404 on
  managed installs).

## 8. Portable modules (copy freely)

These `bb-plugin-stelow/lib/*.mjs` files import nothing host-specific and
encode the rules above as tested pure functions: `worker-action-policy`,
`card-move`, `card-detail-presentation`, `card-question-state`,
`inbox-events`, `inbox-event-presentation`, `question-batch`,
`question-contracts`, `advance-contracts`, `ask-gate`, `ask-contracts`,
`gate-ask-evidence`, `context-ask-gate`, `stage-skips`, `split-proposal`,
`tracks`, `workflow-vocabulary`, `workflow-intent-policy`, `worker-ledger`,
`worker-failure`, `spawn-retry`, `discard-policy`, `github-release`,
`automation-rules`, `github-intent`, `github-automation-gate`, `thread-children`,
`research-*`, `kanban-layout`, `github-lists`,
`promote-card`, `workflow-lineage`, `completion`, `card-claims`, `playbook`,
`preview-session`, `preview-runtime`, `audit-receipt`,
`audit-trail-contract`, `audit-verification`, `vcs-publication`,
`workspace-recovery`, `workflow-config`, `remote-url`, `trackables`,
`trackable-contracts`, `trackable-relations`, `trackable-evidence`,
`trackable-events`, `tracking-paths`, `spec-scope-reader`, `build-gates`,
`scope-command`, `artifact-roles`, `reliable-preset`,
`preset-staleness`, `decision-api`, `decision-points`, `preset-judge`,
`hill-position`, `card-metrics`, `skill-criteria`, `task-evidence`,
`delegation-evidence`, `inbox-severity`, `delegation-map`, `draft-burst`,
`app-support-state`, `board-list-presentation`, `board-views`,
`build-detail-lifecycle`, `build-diff-presentation`, `build-panel-state`,
`build-progress-presentation`, `build-review-target`, `card-attention`,
`detail-presentation`, `explore-panel-state`, `host-tools`,
`inbox-panel-state`, `message-directives`, `panel-state`, `panel-storage`,
`plugin-update-signal`, `plugin-update`, `preset-assignment`,
`preset-onboarding-state`, `publication-mutation`, `question-form`,
`relative-time`, `research-panel-state`, `scope-order`, and
`scope-xray-presentation` (the approved map drawn once: freshness in the
header, deviations per row, and an empty state keyed on the map).

Also portable, and the trio every host needs the moment a card can produce
files: `artifact-manifest` (manifest parse, project-relative path
resolution, the deliverable bar, the unregistered-document set),
`artifact-validation` (the deterministic check DSL over markdown depth
contracts), `artifact-contracts` with `artifact-contract-lookup` and
`explore-contracts` (the contract data by area, plus one id lookup that
returns null for an unmigrated artifact instead of throwing).

And the vocabulary half, which any host that prints a stage or a status needs:
`trackables` already above, plus `card-status` (`CARD_STATUSES`, its labels, and
an `assertCardStatus` that refuses an unknown value BY NAME — a bare CHECK failure
says `CHECK constraint failed` and leaves the writer guessing), and
`execution-run-ledger` (`RUN_STATUSES` beside the `execution_runs` CHECK, its
labels, `RUN_STATUS_PHRASES` for sentences, `BLOCKING_RUN_STATUS`, and the gate in
§2). See §13 for the rules.

Two more, both about the same failure — a card that looks idle while something is
still working on it:

- **`host-hold`** — the host can take a card's next message and decline to
  dispatch it, so the dispatch verdict travels as a discriminated union
  (`{delivery:"sent"}` / `{delivery:"queued", hold}` / refused) instead of a
  boolean. A queued delivery projects the hold and **spends no budget**; a held
  card is never nudged at all, because the pending message IS the pending work and
  a nudge would queue a duplicate of something already on its way. That duplication
  is what turned one held card into ten.
- **`native-run`** — a host Workflows run outlives the turn that started it, so an
  idle thread is not an idle card. `keepsCardRunning` and the sentence it derives.
  Pairs with the reconciler that writes the ledger it reads: a liveness rule that
  trusts a signal needs that signal to have a writer, and a function that reports
  a failure is not one (see §9).
- **`failed-run-gate`** — a stage whose newest run failed holds the card there,
  and the refusal names the door that opens it. The card is TOLD which run blocks
  rather than re-deriving the rule in the UI, so the button and the gate cannot
  disagree about which run is the one.
- **`scope-xray-presentation`** and **`execution-run-presentation`** — read-only
  projections whose whole job is to keep two surfaces from contradicting each
  other: an approved map shown as "no scopes yet", and a run list whose titles are
  the host's recipe slugs while every other surface says "Tech Planning".

### One walk, one bar: reading a workflow state dir

A workflow's state dir holds its bookkeeping and its documents in one tree,
and the layout puts documents one level down — `plans/spec-product_<v>.md`,
`reviews/review-*.md`, `critiques/`, `context/recon-receipt.json`, plus
per-run dirs. Every surface that lists a card therefore makes the same two
decisions, and both are shared, never re-derived per caller:

1. **What counts as a document.** One exported bar
   (`isDeliverableArtifactPath`), judged on the path *relative to the state
   dir* so a workspace that happens to sit under a `drafts/` parent is not
   emptied by the rule. `state.md` and its backups are bookkeeping, `drafts/`
   is disposable scratch, and the bar is `.md` — a sibling `.json` report is
   not a document.
2. **How to enumerate the tree.** One walk (`listNestedFiles`), depth-bounded
   as the cycle guard, dropping any entry that does not resolve below the
   directory it started from.

The cost of getting this wrong is not a cosmetic difference. A top-level-only
listing published `state.md` as a deliverable while hiding every real
document, and the gate handler that approves against that list refused with
*"the gate artifact does not exist yet"* for a spec that was on disk. The
board read the same directory a second way, so the board and the card
disagreed about what a card contained — and the card's "produced but not
registered" half, the audit safety net that exists precisely because an agent
may forget to declare its own output, was blind in the one place it mattered.

Two host-shape facts to carry into any port:

- **A directory listing is relative to the directory that was asked about.**
  Resolve entries against the listed dir, and honour an entry that already
  names the file in full. A walk that assumes absolute paths silently returns
  nothing on the real host while passing a fixture that modelled absolutes.
- **The walk is shared, not re-implemented.** If a second surface needs the
  tree, export the walk; two walks of one directory is how the disagreement
  starts.

Feature slices use those modules as their pure seam: test each rule directly
with a node test, then test the host adapter only where the wiring or injected
service is part of the contract. Keep regex pins for topology, counts, and
terminal refusals; behavior belongs in executable tests. Mirror the pattern
rather than copying the code.

## 9. Anti-patterns (each paid for at least once)

- **A rule that trusts a signal nobody refreshes.** The sharpest one here,
  because it wore the costume of a fix. A liveness rule read the run ledger and
  correctly concluded "a run is live"; the ledger was written in exactly one
  place; that place caught an unanswerable host and *returned the error without
  changing anything*. So the row stayed `running` forever and the rule held the
  card as working indefinitely — no button, no inbox row, no park. Every part
  was individually correct. The defect is structural: a decaying signal needs a
  writer, and a function that reports a failure is not a writer. Bound the
  unanswerable case (generously — it is a recovery path, not a latency budget),
  stamp it on the FIRST failed poll rather than at run start so a plugin restart
  cannot condemn a healthy long run, and close the window on any answered poll.
- **A vocabulary listed by which word it contains rather than who writes it.**
  The sharpest one here too, and it hides behind tidiness. A status list that
  classifies `pending` as "a trackable" because that is where the word also
  appears produces a validator that refuses the creation of every lightweight card
  and every drag back to Bucket — while the suite stays green, because the test
  guarding the list is a restatement of the list. Ask **who writes the value**.
  Where a value is genuinely written on two machines it belongs to both, and
  sharing one entry between them is the collision you were trying to end.
- **A second status or stage vocabulary beside the first.** Not a lint: the
  symptom is a reader concluding that "Interface gate" and `int-gate` are two
  different stages, or that a card is Done on the board and `in-progress` in a
  search result. See §13 for the rule and its test.
- Second workflow database beside `stelow.json`/`.stelow/` (they stay the
  source of truth).
- Hand-editing `current_stage` (only `advance` writes it).
- Blanket inbox resolution (per-kind, §3).
- Compat shims for dead RPCs (delete, don't shim).
- Status changes from activity signals (§2).
- Compat `fr` units stretching kanban columns (bounded minmax instead).- Second workflow database beside `stelow.json`/`.stelow/` (they stay the
  source of truth).
- Hand-editing `current_stage` (only `advance` writes it).
- Blanket inbox resolution (per-kind, §3).
- Compat shims for dead RPCs (delete, don't shim).
- Compat `fr` units stretching kanban columns (bounded minmax instead).
- Inferring completion from stage + idle instead of an explicit
  worker commit verified in code (§2).
- Scope/task status as worker-edited JSON without host validation
  (single-writer transitions: the worker proposes via `stelow scope
  start|done`, the CLI validates containment/order/terminality and commits;
  hosts project observed state from claims and records instead of trusting
  the self-report).
- Machine-readable plans without a machine dialect (specs that only use
  human headings sync zero scopes; `sync-scopes` now accepts `### SCOPE-N`
  as a fallback, but the `[SCOPE-N]` block stays canonical).
- Evidence scattered per kind (one registry, one condition shape, one
  event log, one path rule — a new pendency adds a contracts-table row,
  never a new strategy).
- Guessing the active scope from open-task counts (no conditions without a
  named writer and citable evidence; unknown reads unknown).
- Workers discovering playbooks through skill-list shell pipelines
  instead of reading host-served paths (§1).
- Fail-closed on unreadable contract/methodology sources (fail open;
  pin the source with tests so drift breaks the build instead).
- Pasted prompt clauses across spawn paths (single-source consts with a
  test pinning definition + references).
- Checking that *some* isolated preset exists instead of the *effective*
  spawn environment (band routing silently wins over passed presets —
  gate on what the spawn resolves, at save time and on every tick).
- Check-then-insert dedupe across concurrent flows (claim the key with an
  owner token before working; losers read already-imported/in-flight,
  never a second card).
- Treating issue text as trusted prompt input (allowlist authors on
  auto-dispatch rules; no host permission mode is read-only, so the gate
  is the protection, not the sandbox).
- Trusting the send instead of verifying the write (match a hidden
  marker back on the remote; a run that posted nothing is not success;
  retries must never double-post).
- Fire-and-forget RPC writes that update UI before the server confirms
  (await, then write from the response — or revert on failure).
- Per-card lock directories as cross-card coordination (sibling cards never
  see each other's state-dir locks; key claims by workspace path, §2).
- Gating composite output on the primary file alone (validate every
  registered substep individually — a 200-char file with the right filename
  is not a playbook result).
- Background jobs that fail setup silently: a scheduler without its
  integration loaded returns quietly, and the empty result is
  indistinguishable from "nothing to do" — the unavailable state is
  content, not a log line.
- Hover-only explanations for disabled controls (`title` on a control
  that cannot be focused is invisible to keyboard and screen-reader
  users, and the reason for the refusal is the part they need).
- A narrowing guard kept alive by an un-narrowed parser (`!("choice" in
  parsed)` against a total parser). The guard cannot fail, its error
  string names a shape the parser cannot produce, and no test can
  observe it — so it reads as a refusal path that never fires. Retire
  it with a type, not with more code: one overload per mode in the
  declaration file, the guards and the strings go together, and a
  restored guard type-checks silently — which is why the deleted
  strings also need a `doesNotMatch` pin. Prove the runtime claim where
  it is decided (a generated sweep over the parser's inputs, asserting
  every result either refuses with a named error or carries its mode's
  key), not at the call sites that stopped checking.
- An undispatched key in a kind-dispatch table read as a passing
  document. A chain of `if (kind === ...)` returned nothing for a key it
  did not name, so a typo in a contract was a check that could not fail
  and the artifact it guarded shipped. Dispatch through a map keyed by
  kind, export the key list as the surface a contract-integrity test
  pins every entry against, and throw on an unknown kind: a new DSL
  version is a contract bug, never a lenient pass. The same shape covers
  a documented kind the interpreter never ran — the doc comment is a
  contract with no executor, so a kind listed there and absent from the
  map is a floor nobody enforces.
- An intent route naming an edge the stage graph never declared. The
  helper intersects a stage's `next`/`accept`/`reject`/`rework` set with
  the intent's projected route, under the rule that a route "may omit
  stages, but it may not invent a transition outside the graph". The
  intersection is all that is left where the two disagree, and for
  `investigate` at `context` it was the single backward `reject: setup`
  edge — so every investigate card that reached `context` had no
  forward move at all: a refusal with no exit, which is the one
  outcome a transition table must never produce. It reached production
  on three live cards at once, and neither the per-stage blocks nor the
  per-intent routes look wrong read alone; only the intersection is
  dead. The format also blocks the obvious repair: `audit` terminates
  *every* route, so adding it to `### context`'s `next` to free
  `investigate` hands `feature` a `context → audit` skip past shape,
  critique, both review gates, planning, execution, verification, and
  the diff gate. An intent-specific edge needs a format change or a
  helper that scopes a route edge to its intent — never a shared `next:`
  list. Pin the invariant instead: for every `(stage, intent)` pair a
  route visits, the effective set must contain a forward edge, exempting
  only the terminal stage, whose `next: (done)` legitimately has none.
  Assert it against the same intersection the helper computes, so the
  test fails on the disagreement rather than restating the tables.
- **An integrity check that gates execution on a record the system also
  declares immutable.** A host that records a hash of each applied
  migration and verifies every recorded position **before** it executes
  anything is right about the check — and has built a record that cannot
  be repaired forward. Append a corrective migration and it never runs:
  the append happens behind the refusal, and the refusal is what stops
  the boot. So a bad record bricks the install permanently through the
  very mechanism that was supposed to protect it. This was paid for
  across two releases: one shipped a statement whose recorded text was a
  transcription of a generated template literal rather than the released
  form, so the position no longer hashed; the affected population was
  exactly the installs that had recorded it, which is why the symptom
  read as a corrupt database when the database was fine, and why a fresh
  install never saw it — the check only fires on a recorded position.
  The only door is the record itself, before the host looks at it, and it
  must be narrow, because a repair that touches a record the migrator
  calls immutable is otherwise indistinguishable from tampering. Match
  the seeded bad value on the **full** digest: a prefix match rewrites a
  position you have not actually identified, which is the case the host
  refuses on purpose. Repeat the recorded value in the `WHERE` clause so a
  concurrent writer that already fixed the row is not reverted. And
  decline when the statement the host is about to run no longer hashes to
  the released value — the repair is for a record of a statement that is
  still the released one, so a second drift must leave the host's own
  refusal standing rather than be papered over. Worth asking of any
  pre-flight gate before shipping it: what repairs the record it checks,
  and does the answer survive the gate being closed?

## 10. Contract tests to mirror

Pin the shared surface so upstream changes break your build loudly, not
your users silently: stage count + board order + transitions (see
`workflow-contracts`), card-insert placeholders derived from columns,
methodology-mirror pins (vendored `stages.yaml`/`transitions.md` against
the host mirror), refusal-matrix tests for every gate,
skill-count vectors. The reference `bb-plugin-stelow` suite pins every
contract above plus a suite-wiring test that fails when any test file is
unwired from CI (unwired tests once shipped green-but-never-run); steal
its shape, not just its assertions.

The archive/restore rules need their own pins, and a refusal is the easiest
thing in a lifecycle to get wrong in the direction that looks correct:

- **Refusal, per column, per track.** Drag an archived build card to a phase
  *and* an archived research card to a status column, and assert both refuse.
  One is not a proof of the other — they take different branches of the move
  resolver, so a guard inside the resolver would pass one and miss the other.
- **The no-op.** The same card dropped back on `archived` succeeds.
- **Restore is not a move target.** `resolveCardMove` must have no branch that
  produces it, asserted on the resolver, so widening the move path fails a unit
  test instead of shipping a drag that resurrects.
- **Stage survives.** Restore returns to the card's own stage; assert the stage
  is byte-identical across the round trip, and separately that the derived status
  matches what the phase-entry path derives for that stage.
- **By reason, not by card.** A question closed `answered` before the archive
  stays resolved after a restore; a question closed `archived` reopens. Two
  fixtures on one card, because a blanket restore passes the first and fails the
  second.
- **Refusals name an exit.** Assert the archived refusal mentions restore. A
  correct guard with a doorless message is still a deadlock, and a message
  assertion is the only thing that catches it — the status code is already right.

And the last one is the meta-rule this section is really about: a test that
asserts an *error occurred* is worth little when a schema rejection and a policy
refusal both produce one. Assert the **message**, so the test fails when the
error stops meaning what it says.

## 11. Artifact quality strategy

Thin files with right filenames read as complete work unless the host
says otherwise in code. Layer the guarantee:

1. **Countable contracts in the skills.** Every playbook states its
   machine-checkable minima (sections, item counts, tables with required
   columns, scores) in a Completeness contract the worker reads. Counts restate what the
   methodology already demands — never invent rigor the playbook doesn't
   promise. Prefer column presence over prose mentions: a criterion named
   once in passing must not satisfy a per-item requirement — the table
   carrying the per-item column is the check.
2. **Deterministic host validation as the blocking gate.** The host
   validates every registered artifact individually (including composite
   substeps, not just the primary file) and refuses completion with
   file + expected-vs-found. Prompts teach the contract; code enforces it.
   Unknown shapes never block — only matched documents that fail depth do.
3. **Optional cross-lineage review, never blocking by default.** A reviewer
   from a different model family judges only what code cannot (coherence,
   scope fit), against the deterministic report as rubric, with findings
   anchored to verbatim quotes the host re-verifies. Reviews cost budget:
   explicit opt-in, shift-left refusal on thin files, no silent fallback
   to the worker's own preset — and the designation UI lives below the
   subagent tiers, never among them, so capability (reliable/generation)
   is never mistaken for independence (review). Enforcement waits for a golden set with
   measured agreement — wire the rubric to the gate only then.
   Gate entry with a reviewer designated fires one hidden pre-review of
   the gate artifact as a card comment before approval (advisory,
   fire-and-forget, silent on every miss).
4. **Provenance seals, not truth claims.** Surfaces show checked
   provenance (verified / hypothesis-only / needs-revision / unverified)
   resolved live from revalidation, with progressive disclosure down to
   the failing checks. A seal without backing content reads unverified —
   a first-class state, never an error, never "true".
5. **Close the rework loop in code, not prose.** When the methodology
   classifies findings (fixed / documented / escalated), require the
   classification as structured frontmatter on the report so the host
   can check it: every row needs a known impact + resolution, and the
   methodology's escalation rule (e.g. high/critical impact escalates)
   becomes a deterministic failure when violated — a misclassified row
   must never pass silently. Stated effort is checked the same way
   (medium impact with moderate-or-heavier effort must not resolve as
   an inline fix), fail-open when absent so older reports never
   retro-fail. Escalations become rework scopes through a
   host-owned idempotent command (never by asking the worker to edit
   tracking JSON), each scope linked to its gap on the same card —
   never new cards: a card with open gaps loops back through the
   methodology's audit-rejects-to-execution transition, reworks,
   re-critiques, and only then completes. Completion refuses
   while escalations lack scopes or linked scopes stay open, and refuses
   with any non-terminal scope still open (done, completed, or explicitly
   skipped pass) — done
   means every gap has a disposition, every escalation is executed,
   and no promised scope was walked past.
   Surface the loop state early (verify-time warnings, not just
   completion refusals) and name the loop-back: an audit-to-execution
   advance should state which open rework it picks up. Validate every
   matched critique, not just the newest — a lingering superseded file
   still makes claims, and newest-wins would let a clean rewrite silently
   drop registered escalations; re-critique overwrites the same file.
   Judgment
   stays automatic with full transparency (counts, per-escalation
   scope status, trail record) rather than human-gated: gating
   completion on per-item human confirmation stalls autonomous runs,
   while over-escalation is cheap and visible and under-escalation is
   blocked by the rule above.
7. **Commit the run bundle, link it with trailers.** Git commits cannot
   carry file attachments and hosting UIs show no git-notes, so the
   convention is two halves: (a) a flat `docs/runs/<card-id>/` directory
   in the checkout holding the registered artifacts under stable
   basenames plus a `manifest.md` (SHA pin per file, gap counts,
   unreadable entries listed, trailer embedded) — committed with the
   work, versioned by git log, never per-commit subdirectories;
   (b) a `Stelow-*` trailer block below the commit subject (card id,
   artifact paths, gap counts) as the grepable audit link. The host
   provides an idempotent, path-confined export command; the worker
   protocol requires export → commit → trailer on every commit. Seeding
   a git checkout ignores the live runtime dir (`.stelow/`) so a worker
   `git add -A` can never sweep live runs into history — only the
   exported bundle is committed.
8. **Route delegated work by capability, not by stage.** Subagent tiers:
   Reliable runs on the band preset (tools/web/exact shapes/multi-step)
   unless a board-level override is set — empty means the band preset, and
   every live worker re-evaluates restart-pending when it changes;
   Generation (a cheap preset for disposable
   text-only bursts the worker judges 100% before using) is one board
   default with a board → band cascade (a card-level pin is reserved
   in the resolver, unwired — no per-card UI today). The tier rides the spawn
   call site where output is disposable by construction — never user
   choice per task, never a band × tier matrix. Rule of thumb: when the
   worker rewrites over 20% of a burst's output, that call site belongs
   back on Reliable. Every spawn is fresh by contract: context travels
   inside the call, never as inherited history — previous threads are
   referenced for selective retrieval, never forked.
6. **Critique generated UI once, after implementation — never before
   and after.** Visual critique (accessibility, heuristics, design
   quality) runs post-implementation, gated by appetite and whether
   UI files actually changed; its gap report feeds the execution
   critique as evidence. The "before" is already covered without LLM
   cost by the interface stage (proposals + review gate). Running the
   full critique twice per visual card doubles the most expensive
   audit for no new signal — the pre-implementation direction is
   chosen by proposal, the post-implementation reality is what needs
   checking.

9. **Mirror Completeness contracts as structured criteria for the checks
   code cannot do.** Count/shape minima stay deterministic (layers 1–2
   above). For semantic minima ("grounded in context", statement rules,
   trade-off quality), each playbook carries a fenced `criteria:` block
   beside its prose contract — `{id, kind, text}` with kinds `presence`
   | `count` | `semantic`. The host parses the blocks (`skill-criteria`
   pattern), routes deterministic kinds to the existing validators, and
   translates each semantic criterion into one atomic Score question
   against the artifact (one call per criterion, never batched; low
   confidence abstains). Semantic findings start advisory with quoted
   evidence, promoted to blocking only after a golden set shows measured
   per-criterion agreement — never on launch day.
10. **Calibrate judges with golden sets before enforcing.** Humans label
    artifacts met/unmet per criterion; the judge scores the same files;
    Cohen's kappa per criterion decides keep (≥0.6), repair, or drop —
    under 5 labels always repairs, abstentions never enter kappa.
    Recalibrate when criteria text, judge model, or thresholds change;
    a drifted criterion fails kappa and gets quarantined, not argued
    with.

## 12. Automation rules (propose, never decide)

Scheduled rules may draft work and notify — never start workers, move
cards, merge, or import behind the user's back. Reference implementation:
`bb-plugin-stelow` watches one GitHub label per project on a 5-minute
schedule; each newly matching open issue becomes one unstarted Inbox draft
carrying an origin marker ("Drafted from GitHub issue #X", source link),
idempotent by `repo#number` so re-runs never duplicate. Rules never clear
labels and never touch workflow state — every rule action is an inbox event
or a reversible draft. Copy the shape: event + filter + draft/notify
template, per-project settings, one fire record per source key.

## 13. One vocabulary per axis, and the reader's words in it

A stage name and a status value are both identifiers first and words second, and
the pull is always toward printing the identifier. `int-gate`, `plan-gate` and
`in-progress` are correct database keys, CLI arguments and prompt tokens. They
are not words to put in front of a person who has to decide something.

**Every axis gets one owner, and the names sit beside the values they name.**
In `bb-plugin-stelow` this took four modules and the pattern is the portable
part: `stageLabel()` over the stage catalog; `TRACKABLE_STATUS_LABELS` beside
`TRACKABLE_STATUSES`; `RUN_STATUS_LABELS` beside the `execution_runs` CHECK
constraint; `CARD_STATUS_LABELS` beside `CARD_STATUSES`. Half-centralising is
worse than either extreme — when `isDoneStatus` came from the machine but the
words came from a component, a rename could pass the whole suite and still ship.

Three rules make it an authority rather than a list, and each has a test:

- **Nothing declares a map outside its owner.** Checked per-file, so a second
  owner fails naming the file AND the map.
- **Every owner still declares its map.** Otherwise deleting a vocabulary passes
  by leaving the permission behind.
- **No label may be its own stored id.** Shipping a stage and forgetting its name
  is an ordinary accident, and a variable name on screen is what it looks like.

**Labels are the reader's words; descriptions are the agent's words.** They do
not have to agree, and forcing them to is a mistake: `produces` is rendered
beside the label on the workflow map, so it must agree — but `description` is
agent instruction prose, and its Shape Up vocabulary ("appetite", "hill chart")
is legitimate there. Renaming a label must not drag the agent's instructions
with it.

**Names are axis-specific; appearance is not.** Tone and glyph are the one thing
that does not need an axis: a finished card and a finished scope are both green,
a blocked task and a blocked card are both red. A reader learns colour once. So
tone and glyph are shared across axes, while names stay with their own — `failed`
on a run (retriable) and `failed` on a scope (needs rework) are different facts
and get two entries, not one shared one.

**Renaming is labels-only.** Stored ids are keys: renaming one is a migration for
zero reader-visible gain. Label changes with the key left alone are free, and are
how you keep the vocabulary honest.

**A rename only moves the UI if every copy of the name moves with it.** The
reference host learned this the hard way: the phase label lives in a generated
catalog that the host copies into its own `data/` at sync time, and the sync
that refreshed the *source* copy did not refresh the *derived* one. The label
changed upstream, the automated sync opened a green pull request whose whole
diff was four lines, and the board kept rendering the old word — because the
board reads the derived copy, not the source. Two paths had come to mean
different things by "sync", and the evidence that it ran was a green check on a
tree no user ever sees.

So: **a derived copy is part of the rename.** Whenever a host materialises
vocabulary into a second location, that location is in scope of every change to
the name — same commit, same review, same test. A vocabulary test that reads the
*derived* copy and a rendered string that reads it too will catch the case where
someone hand-copies a label into a component, which is the other way the rename
stops landing: the catalog says one thing, a paragraph beside it says another,
and the paragraph is what the reader reads.

**Whether a name is GOOD is a product call and no test can make it.** "Plan gate"
satisfied every machine rule above for months. A test can insist there is one
place to change a word; it cannot insist the word is right, and a test that tried
would just encode one person's taste as a gate.

## 14. Execution adapters and canonical stage data

A host may provide a native workflow engine, but the methodology must remain
engine-neutral. `skills/stelow-workflow-orchestrator/stages.yaml` owns stable
stage identity, phase, routing, owner skill, and execution requirements;
`recipes/*.yaml` owns task DAGs; `SKILL.md` frontmatter owns skill execution
profiles. Hosts consume the generated `stage-catalog.json` rather than copying
stage literals or parsing YAML.

An adapter publishes capabilities and implements `run`, `status`, `resume`,
`cancel`, and `result`. Required capabilities are negotiated before start.
Missing capabilities produce a named refusal or a documented coordinator-owned
sequential route, never a silent downgrade. The existing card coordinator may
execute that sequential route, but it is not a synthetic native adapter: it has
no native run ID, status endpoint, resume handle, or cancel operation. A real
sequential adapter is a separate capability and must implement the full durable
lifecycle before selection. Native run IDs and provider details stay in the
adapter. The host control plane owns the card and owns `needs_input`: the worker
reports the boundary, the card creates and persists the real question, and an
answer invokes `resume`. A native run must not own the card.

A richer host may map recipes to a native pipeline, worktrees, queues, or file
claims. Hosts that do not support per-call permissions must refuse recipes that
require them; permission inheritance is not equivalent to per-call permission.
See `references/execution-contract.md` for the vocabulary and
`stages.schema.json` for the canonical shape.

### Scope Map and decision-artifact portability

A host that supports the Scope Map pattern should keep the map in the canonical
stage data rather than inventing a parallel scope state. The existing `scope`
stage owns the approved map; Shape may produce candidate slices, and planning
may enrich the approved map with tasks and technical detail without changing
scope IDs, ownership, IN/OUT boundaries, or dependency meaning. A map challenge
is a named artifact with a destination: a product-commitment change returns to
Shape, while a scope-boundary or dependency change returns to Scope.

Interface Contrast uses the same execution substrate. A decision recipe may
produce a decision brief, alternatives, contrast, and reaction evidence, but
the canonical selection stage remains the owner of the actual pick. The card
control plane remains the only owner of human questions.
A native `needs_input` result carries a durable boundary ID, artifact versions,
and an answer schema; the card persists the question and resumes the same run
only when the answer matches the current boundary and versions. Scope X-ray is a
server-derived read projection with provenance and freshness for every edge; it
must not mutate the map or create a second question or execution lifecycle.

**A projection names its freshness once, and each row only when it deviates.**
The X-ray projects the **approved** map. It is a different thing from the
execution tracker, and a host that prints both under one word makes two true
statements contradict each other: the X-ray listed seven approved scopes and
four lines below it said the agent was still shaping the card. Both were true —
one read the map, the other read state plus the latest spec — and neither was
the condition for the other's empty state. So state plainly that the X-ray is
the map and the tracker is execution, and key the empty state on **whether the
map exists**, not on whether the tracker is populated: a card can hold an
approved map with nothing tracked yet, and calling that "nothing broken down
yet" tells a reader the shaping never happened when it did.

The raw freshness enum is the second half of the same mistake. `current` is a
**staleness** value from the map contract, not a progress state, and printing it
verbatim beside a scope id made "env-seed-mapper · current" read as "this is
the scope being worked on" — then printed it nine times, once in the header and
once per node, from the same variable. One fact in two registers, and the
most-repeated fact on the card was the one nobody asked for. So: the header
carries freshness once, as a sentence; a row carries a label **only when it
deviates from the map's own baseline**, because "in sync" on all seven lines is
the header's job done seven more times. One override matters and lives in one
place: a **stale map makes every row stale**, whatever the row claims, so the
staleness stays the header's fact and the rows stay quiet about it. Unknown is a
first-class answer here — a freshness value that could not be read says so
rather than falling back to the reassuring one.

## 15. Host runtime composition and lifecycle slices

A host with a large plugin entrypoint should keep the package entry as a
bounded composition root and keep only wiring in the runtime module. Each
capability owns one seam: contract fragments, migrations, handlers, schedules,
and disposal for that capability. The runtime constructs the seams, passes
explicit dependencies, registers their handlers, and publishes lifecycle
events; capability modules do not import the entry or runtime module.

Extraction is a migration, not a relabeling. Until the runtime module is
actually decomposed, architecture notes must name it as transitional debt and
must not claim that creating directories or factories completed the split.

The portable seam pattern is:

- **Card lifecycle and RPC dispatch** own card reads, writes, question state,
  and card-detail composition. Their handlers receive storage and host services
  through a small dependency object.
- **CLI command families** own argument parsing, refusals, and command-specific
  output. A command family may call a capability service, but it does not
  duplicate lifecycle policy.
- **Execution composition** owns the native adapter, durable run ledger,
  reconciliation, and stage advance policy. A missing capability is a named
  refusal or coordinator-sequential route. The card remains answerable while a
  native run waits for input. The four factories stay composition roots: the
  boundary, artifact, one-run, and sweep rules are separate modules taking
  their own dependency slice, and the root owns only the in-flight guard and
  the wiring. Both entry points (the card action and the CLI) call the one
  preflight and the one dispatch, so a fix to either is a fix to both.
- **Preview, publication, and update composition** own read models and
  user-facing presentation data. They leave durable state changes to their
  owning capability.
- **Startup and disposal** are observable seams. Migrations run before
  registration, schedules are named, and event handlers are registered once.
  Every owned timer, child process, and retry is disposed idempotently; host
  event subscriptions remain scoped to the plugin instance. Disposal must not
  stop live worker threads: hot reload is not uninstall.

A **vocabulary the server must validate** cannot live in the component the
server cannot import. When a layer rule forbids the server reaching into a
component, a settings vocabulary defined there leaves the server with **no
validator at all** — which is not a missing convenience, because a value outside
the set cannot be honoured at spawn: the host either refuses it or silently
drops to a default while the settings screen keeps showing what the human chose.
So the list moves to one plain module both sides import, the write boundary
refuses, and read paths *narrow* to the fallback so a stored row stays
readable. Narrowing on read and refusing on write are different jobs: a read
must not throw on a row written before the vocabulary existed, and a write must
never be quietly rewritten. The default must equal the host's own default, so
repairing an out-of-enum row lands on the effort the host would have chosen —
which is what makes the repair invisible rather than a surprise.

The second half of that rule is the one a host author will get wrong:
**the set is the host's global enum, which is a superset of what any one
provider accepts.** Passing the enum check is necessary and not
sufficient, because each provider declares its own ladder (ids only) and
every provider is missing at least one global value — so a level that is
perfectly legal at the write boundary can still be unhonourable for the
card's own provider. The provider's declared levels are therefore the
second half of the check, and they live **in the same module**: read the
host roster as plain data (so the portable module keeps no dependency on
the host SDK), ask which levels that provider declares, and refuse on the
write path with a sentence naming **the ladder the provider declared** —
"invalid level" would send the reader back to a picker that is not where
the mismatch lives. A provider absent from the roster, or declaring no
ladder at all, is a third state — "the host did not say" — which must
never collapse into "supported" or "unsupported": report it as unverified
rather than guessing. And do not fold the verdict into the narrowing
function, because narrowing is display/read normalisation whose whole job
is to make an old row renderable; the unsupported-but-legal level has to be
reported *next to* the level, not silently normalised away. Reference:
`preset-reasoning-level.mjs` — `isPresetReasoningLevel` /
`asPresetReasoningLevel` (the global half, refused on write and narrowed
on read) alongside `declaredProviderLevels` / `isLevelDeclaredForProvider`
/ `ladderIncludes` / `unsupportedLevelMessage` (the provider half).

Reference evidence in `bb-plugin-stelow`: `server.ts` is the package entry;
`server/rpc-contract.ts` composes capability fragments;
`server/core-migrations.ts` orders persisted-state migration;
`server/runtime/lifecycle-startup.ts`, `thread-lifecycle.ts`, and
`reconciler.ts` expose startup, event, and timer seams; and capability
factories return the handlers and disposal handles consumed by
`server/plugin-runtime.ts`. `tests/plugin-startup.test.mjs` runs every disposer
twice and fails if a live thread is stopped, while
`tests/runtime-reconciler.test.mjs` pins timer cleanup.

Every registered contract method must have a handler, and representative
behavior tests must cover success, refusal, fail-soft, publication, and
disposal paths at each seam. A topology assertion complements behavior tests;
it never substitutes for them. Cross-capability changes update this blueprint
and the host's architecture note in the same change.

### Splitting one oversized module into feature slices

The size rule in §7 covers the rule, the hook, and the entry point. A data
module has its own recipe, and it is the one that pays best:

- **Slice by area, not by size.** A module holding three datasets that happen
  to share a lookup helper becomes one file per dataset, named for the area
  (`jtbd-`, `strategy-`, `explore-`), not for the number of lines it had to
  shed. Size is what forced the split; the area is what keeps the slices
  apart when the next entry arrives.
- **Extract the shared helper before the data.** The one thing the datasets
  had in common moves to its own module first, so each slice is a plain data
  export and the old file is left with nothing but re-exports.
- **Leave a re-export facade at the old path.** Every consumer keeps its
  import; no consumer learns which slice an entry came from. Deleting the
  facade is a later, separate decision — a split that also rewires the tree
  cannot be reviewed for shape.
- **Budget each slice against the real limit, not the average.** A
  mechanically even split is a smell: one slice at 165 and one at 137 can
  still be the wrong seam if the 165 holds two areas.
- **Expect the split to find contract bugs, and fix them there.** Moving the
  data apart is the first time each entry is read next to its interpreter.
  This split exposed both holes in §9's dispatch entry: a documented check
  kind the interpreter never dispatched, and an unknown kind that was
  silently ignored. Neither was a shape problem; both were live. The commit
  that moves the code is the commit that repairs what the move revealed —
  carrying a found bug forward into the new slices is how a refactor ships a
  regression wearing a clean diff.

### Secure subprocess and delegated execution

A host that runs a vendored state machine, or spawns threads on the user's
behalf, has two subprocess seams with the same shape: an untrusted-ish input
crosses a process boundary, so the contract is about what crosses, never
about what the child does with it.

**Running a vendored orchestrator.** Run the pinned script as an argv array —
`spawn(interpreter, [scriptPath, ...args], { cwd, env, stdio })` — never a
concatenated command string, so a stage name or a path with a space in it
cannot become a second command. `cwd` is the workspace that owns the state,
and the script path is absolute and resolved at import time, not assembled
from a request. Pass state through the environment rather than as arguments,
because the child reads it the way a worker does and one spelling then serves
both callers. Report the child's exit code and both streams verbatim, and
treat a non-zero code as the child's refusal to relay, not as a host error to
reinterpret. Wrap only a fixed verb vocabulary plus fixed flags, and let the
interpreter remain the single owner of the stage vocabulary: it refuses an
invalid transition with a named redirect, which the host relays. A host-side
copy of the legal stage list is a second source of truth that drifts the moment
the transitions file moves.

The verb list is worth deriving rather than remembering, because it is the one
place a host invents surface the interpreter never had. Enumerate it from the
call sites — every literal verb that reaches the spawn — and pin it, so a verb
added to the CLI without a spawn contract, or a spawn contract without a verb,
fails a check. A verb the host implements itself never belongs on the list: it
is not a subprocess seam, and listing it claims a seam that does not exist.

**One seam, both entry points.** The card action and the CLI must call the
same wrapper and the same preflight, so a fix to either is a fix to both. A
verb a host can reach from a shell is a verb whose state directory it may not
be able to derive: give the wrapper the card's own state dir, and have the
host-side wrappers resolve the card from the thread context, refuse when the
workflow state is not that card's to own, and never silently adopt
project-root state. Then publish the reachability rule next to the command:
a command whose only card-scoped inputs arrive through the thread context is
runnable from the card's worker thread, and its shell form is either fleet-wide
read-only or a named refusal.

**Spawning disposable threads.** Validate through a site registry *before* the
SDK call: unknown site, a visible spawn, or a full-permission mode throws
there, so a misrouted spawn fails before it exists rather than mid-flight. The
registry is the single list of spawn sites, and a topology pin requires every
call site to carry its site marker, so a new spawn cannot bypass the check by
simply not being listed. Keep the lifetime field the host understands and add
one compat retry that drops exactly that key when the host rejects it as
unrecognized — a spawn that dies with its worker must not break on a daemon
that has not learned the field yet, and the retry is bounded to that one
error string.

Reference evidence in `bb-plugin-stelow`: `server/runtime/helper-script.ts`
is the vendored-orchestrator seam, wrapped over a fixed verb vocabulary of
`advance`, `audit-trail`, `config`, `doctor`, `lock`, `schema`, `scope`, and
`sync-scopes` — the `seed` command is deliberately absent, because the host
implements it without spawning. `advance` is the verb that shows what the rule
above costs when it is not met: the host has four spawn sites for it — the card
action's two (`server/runtime/card-gates.ts`,
`server/execution-advance-card.ts`), the RPC surface's
(`server/runtime/wiring/rpc-surfaces.ts`), and the CLI's
(`server/execution-advance-cli.ts`) — and the two entry points do *not* share
one, which is the next paragraph rather than a footnote to it. Read the
argument lists off the call sites too: the card action spawns exactly
`["advance", stage]`, while the CLI spawns the verb, the stage, and at most two
fixed flags (`--dry-run`, `--json`), appended only when set — so "the same
wrapper" has to mean the same *shape* of argument list, not the same literal.

`server/runtime/cli/cli-helper-passthrough.ts` holds the shared preamble for
`sync-scopes`, `scope`, and `config get`, which is what the rule above asks
for. `server/execution-advance-cli.ts` does **not** use it: it re-implements the
same five beats — resolve the card from the thread context, take its workspace,
derive the state dir, run the artifact guard, refuse without one — under
renamed deps (`workflowStateDir` as `stateDir`, `ensureProjectArtifacts` as
`ensureArtifacts`). That is a real instance of the cost this rule exists to
prevent, and it is recorded here rather than smoothed over: the reference host
satisfies the rule for the passthrough family and violates it for `advance`. A
second copy of the preamble is also where the dead-end env var below hides, since
the two copies drifted apart independently.

A schema that advertises an env var the host never reads is the clearest
operator-facing instance. In the reference host, `STELOW_STATE` and
`STELOW_STATEDIR` are listed under `advance`'s env, and the host only ever
*writes* them into the child's environment — nothing in the host reads them, so
an operator who sets one sees no effect and concludes the flag is broken. Note
that the schema itself may be owned by the vendored interpreter, in which case
the host cannot fix this alone: the correction is upstream, and the host's part
is to publish the reachability rule beside the command so the shell form's real
limit is stated rather than implied.

`server/runtime/disposable-spawn.ts` is the spawn seam and
`lib/delegation-map.mjs` its registry, with `tests/delegation-map.test.mjs`
pinning one marker per call site and `tests/server-drafting.test.mjs`
exercising both the lifetime field and the retry that drops it.


### Two portable presentation decisions

**How a document is shown is decided by its path, in one pure function.** The
reference host reads artifacts through a viewer that had to answer three
different questions: is this prose the reader must read, a page they must look
at, or code they must read? The rule was an inline extension test in the
component, which meant the one place deciding how evidence appeared was the one
place with no test — and a generated interface mockup rendered as HTML source,
which is the one thing that cannot answer the question an option under decision
asks.

`lib/artifact-render.mjs` owns the decision as a pure function of the path
(`markdown` | `html` | `source`), the viewer is a switch over its answer, and
the frame is `srcdoc` under `allow-scripts` **without** `allow-same-origin`. That
sandbox is the portable half: untrusted generated HTML needs to run, and
`srcdoc` otherwise inherits the embedding origin, so the pairing of those two
flags hands a worker's page the reader's session. A partial file must not be
framed either — a truncated page is a broken layout presented as evidence — so
it degrades to source and says why.

**A cost cap that drops required content is counted, not just noted.** The same
host reviews artifacts through a character budget, and a note in the prompt that
truncation happened makes an accident look considered. Choosing the excerpt by
the artifact's contract rather than by offset fixes the judgement; the count is
what keeps it fixed. A cut to the contract's sections and a cut to the document's
opening are *different failures* — only the second can have hidden a section the
contract named — so they are counted separately, and a fleet that has never had
the problem prints nothing at all.

The durable form is the portable part: the choice is a field on the review
record beside the fields the gate already reads, so the count comes from the same
scan that decides whether a review exists, with no new table and no second reader.
Records written before the field existed are uncounted rather than reported as
records that read everything.
