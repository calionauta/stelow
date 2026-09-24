# Host-neutral execution contract

Stelow describes **what** a stage needs; a host adapter supplies **how** to run it. The core never selects a host engine and never imports a host SDK.

## Capability negotiation

An adapter publishes a capability report. For a stage or recipe, every item in `required_capabilities` must be present before the adapter starts native execution. Preferred capabilities are optimizations, not promises. If a required capability is absent, the adapter must choose a documented fallback or refuse the start with the missing capability named. It must never silently substitute a weaker permission, partition, or structured-output mode.

Capabilities are versioned by this vocabulary:

`fanout`, `pipeline`, `structured-output`, `durable-run`, `resume`, `cancel`, `status`, `hidden-workers`, `human-input`, `per-call-model`, `per-call-permission`, `isolated-workspace`, and `file-claims`.

## Adapter interface

```text
ExecutionAdapter
  capabilities() -> CapabilityReport
  run(recipe, context) -> ExecutionHandle
  status(handle) -> NormalizedRun
  resume(handle, input?) -> ExecutionHandle
  cancel(handle) -> ExecutionResult
  result(handle) -> ExecutionResult
```

Normalized run states are `queued`, `running`, `needs_input`, `succeeded`, `failed`, and `cancelled`. Native run IDs, provider details, history, and worker visibility belong to the adapter.

## Human boundaries

`needs_input` is a control-plane boundary, not worker ownership. The execution worker reports that it needs input; the Stelow card remains the owner, persists the question and answer, and invokes `resume` after the answer exists. A host must keep the card answerable while a run is stopped, failed, or waiting for input.

## Writes, permissions, and fallbacks

A `write_policy: workspace` task may fan out only when the adapter supplies an isolation or file-claim strategy. Otherwise execution is sequential or explicitly refused. `permission_profile: per-call` requires `per-call-permission`; a host preset or inherited permission is not equivalent. Structured tasks may use a documented `loose` textual fallback, but they cannot claim schema compliance.

A host's existing card coordinator may be the sequential fallback. That coordinator
is not a synthetic `ExecutionAdapter`: it has no native run ID, status endpoint,
resume handle, or cancel operation. Hosts must record the explicit route decision
and let the coordinator execute sequentially; they must not fabricate a durable
run or claim native lifecycle semantics. A real sequential adapter is a separate
capability and must implement the full durable lifecycle contract before it can
be selected.

The execution DAG is in `recipes/*.yaml`. Recipes declare task dependencies, output schema references, write policy, and human boundaries. They do not contain BB plugin IDs, container names, or run IDs.

## Host transport and run ledger

A host may materialize a validated script in the origin workspace, but a bundled plugin path is never a valid workflow `scriptPath`. The BB adapter uses the official server-side `bb workflows run --script` bridge with an inline, size-checked source and JSON args. The control plane records the local run id, native run id, recipe, stage, source hash, source text, args, workspace identity, card artifact root, origin thread, native/normalized status, resume link, preview directive, and completion dedupe key. The BB adapter compiles the recipe into deterministic ready layers: dependencies, conditional tasks, failure policy, human boundaries, task capabilities, and output schemas are all checked before execution. Unknown conditions and unresolved dependency graphs refuse the run. Each run writes to a unique staging directory; the coordinator must register validated outputs at canonical paths and write a run receipt before the ledger becomes successful.

`scope-batch` remains sequential-only until the host can prove file claims, partition safety, and parent merge/test ownership. A native adapter must refuse it rather than treating shared workspace access as isolation.
