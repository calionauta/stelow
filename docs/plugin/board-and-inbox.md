# Board and inbox

One panel, five tracks: **Inbox / Build / Research / Explore / About**.
Build cards flow through Analyze, Plan, Execute and Review to Done;
Research and Explore move To-Do → Doing → Done. New cards start in Triage
(build) or To-Do (research/explore).

## The bucket, the badge, the card

- **Bucket, not a column.** Captured work with no worker yet lives in the
  Bucket — a per-track gallery behind a header button, never a rendered
  column. Leaving it starts the card. Parking a card that already has a
  worker is refused (it would orphan the worker); archive it instead.
- **Honest badge.** The sidebar counts unresolved action items and unopened completions, and
  always agrees with the Inbox's Needs-attention list. A finished card is
  review work (emerald marker until opened), never blocked work. Tab
  counts exclude terminal outcomes and the Bucket.
- **One state language.** Tiles and headers read the same ordered pills:
  board location, lifecycle, worker state, workflow type. A card waiting
  on you says so; a card whose worker stopped with an error says that
  instead — never the same border for both.
- **A drop that changes nothing changes nothing.** Releasing a card where
  it already sits is a no-op; dragging within its own phase refuses and
  names the explicit restart affordance. Stage progress moves by doing
  the work. Nothing automated takes a card out of Archived; a mistaken
  archive is restored by one human-initiated action behind a confirm,
  back to its exact stage — pending questions stay withheld for the fresh worker to re-ask, with the count trailed on the card.

## When a question could not be recorded

A worker that reports **"The question could not be recorded"** has stopped, and the card
says why: an entry in **Needs attention** naming the cause, and a line on the card's trail.

This is an interrupted write, not lost work. The question was never stored, so there is
nothing to recover and nothing was answered into a void. What happened is that the card was
marked as waiting for your answer, the answer timed out, and the write that files the
question for later failed — most often a database lock that outlived its one automatic
retry, less often a closed handle or a full disk.

**To resume: send any message on the worker thread.** The worker re-asks once on its next
turn. Do not archive the card and do not start a fresh one — nothing is broken, and the card
picks up where it stopped.

The plugin log (`~/.bb/plugins/stelow/logs/plugin.log`) carries one
`stelow ask persist attempt` warning per attempt. A single `SQLITE_BUSY` is normal and
expected: a reconcile pass or a sync poll can hold the lock briefly. Repeated non-busy
errors mean the plugin lost its database handle or the disk is full, and restarting bb is
then the real fix.

## Views and setup

- **List view** for narrow screens, **hill view** for Build progress
  (dots positioned from scope data alone — never jittered, never
  percentages). Filters are multi-select facets shared by every track.
- **No tours.** Each track opens a one-time setup dialog (presets, plus
  planning depth and review gates on Build) and never nags again.
- **Keyboard:** Enter/Space opens the card, W opens its worker thread,
  Esc returns focus to the card on the board.
