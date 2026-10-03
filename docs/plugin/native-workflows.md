# Native Workflows execution

Stelow uses the host's built-in `workflows` plugin as its native execution
backend for recipes that are safe to run through the durable Workflows
substrate. Eligible recipes are submitted through `bb workflows run`,
their `runId` persists in the execution ledger, and status, cancellation,
receipts, and artifacts reconcile back into the card. It is not a
universal replacement: the execution router chooses the narrowest safe
mode per recipe.

## Why some work stays sequential

`scope-batch` declares workspace writes, dependency partitioning, file
claims, parent verification, and gap escalation — operations needing a
shared workspace and a parent-owned merge. A generic fan-out cannot prove
two workers won't edit the same files or that the parent stays consistent
after a worker fails. So `scope-batch → coordinator-sequential` until the
host proves otherwise.

## Pilot boundary

Native fan-out is allowed for exactly one pilot class:
**independent-disjoint-scopes-with-satisfied-claims**. Everything else —
overlaps, unsatisfied or missing claims, workspace-writing batches in
general — stays sequential. A batch fans out only when every gate passes:
capability (file-claims + isolated-workspace), admission (every scope
presents a satisfied claim), disjointness (pairwise-disjoint file sets),
bounded concurrency (cap + per-scope timeout + batch-cancel), per-scope
receipts (claims, files touched, manifest), and parent merge with
post-merge verification. Any gate failure falls back to sequential with no
partial fan-out; one flag (`native_pilot_allowed=false`) rolls everything
back with no code change.

## Host behavior

Stelow probes the built-in plugin at runtime and uses the native path when
the recipe is eligible; otherwise it fails soft to the explicit
sequential fallback. The About tab and first-visit setup identify the
dependency and offer install/enable actions — the package never installs
or enables another plugin silently. The next safe step is a host-level
claims-and-isolation contract, promoting only the scope classes that
satisfy it.
