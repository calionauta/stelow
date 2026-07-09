# Scope Execution Strategy

> **Status:** design doc. Source of truth for the *why* behind stelow's
> parallel scope execution model. The protocol-level *how* lives in
> `skills/stelow-product-orchestrator/references/cli-tools/file-locking.md`.

## TL;DR

```
prevent  → detect  → respond
────────── ──────── ──────────────────────────────────────────────
Layer 1   Layer 3   If overlap → human decision
(default) (always)    (merge | sequential re-run | rework)
```

Three independent layers. Each prevents or catches a failure mode the
others don't. Stelow ships all three; none is mandatory.

---

## Layer 1 — Sequential default (always active)

```
ALL scopes run sequentially by default.
```

- **Why default:** CooperBench 2026 shows 2-agent cooperation → 25% success vs 50% solo, with monotonic decline as agents scale (68% → 46% → 30% from 2→3→4). clawRxiv 2604.00736: coordination overhead C(n)=0.023n², 50% of tokens lost at n=7. Sequential is the cheapest known-good strategy.
- **When violated:** only when the orchestrator explicitly dispatches scopes in parallel via `subagent({ async: true, ... })` or `tasks: [...]` array.
- **Cost:** zero. Zero additional code, zero additional storage, zero additional coordination.

## Layer 2 — Opt-in prevention (file-locking.md)

```
IF parallel dispatch AND target_files declared
  acquire atomic FS lock per file BEFORE editing
IF parallel dispatch AND target_files undeclared
  rely on Layer 3 (audit) only; sequential re-dispatch on detection
```

- **Mechanism:** atomic `ln` (EEXIST-safe) + sha1 of file path → JSON metadata with TTL. See `file-locking.md` for full protocol.
- **CLI-agnostic:** works in any agent (including agents that read `~/.agents/skills/` but have no extension integration) without runtime hooks, per-CLI flags, or `git worktree` isolation.
- **When violated:** any of: agent doesn't follow the read-before-write protocol, lock TTL expires mid-edit, two scopes declare the same file. Layer 3 catches.

## Layer 3 — Audit (always active)

```
WHEN scope completes
  capture start_sha (Step 3c) → git rev-parse HEAD
  capture actual_files (Step 3e) → git diff --name-only $start_sha..HEAD
AT scope-execution end
  classify all scopes into 4 classes (Step 8)
  surface non-clean classes to human for decision
```

- **Ground truth:** `git diff --name-only` reports exactly what changed. Not a prediction, not an LLM guess.
- **4 classes:**
  - (a) **undeclared writes** — scope touched files outside its declared `target_files` (contract drift, possible scope creep)
  - (b) **real overlaps** — two scopes wrote the same file (lock failed, or not used)
  - (c) **stale locks** — locks left behind past `expires_at` (agent crashed mid-edit; auto-recover on next acquire)
  - (d) **clean** — declared == actual, no inter-scope overlap, no stale locks

---

## Decision matrix

| Dispatch | `target_files` declared? | Overlap risk | Action |
|---|---|---|---|
| Sequential | any | none | run |
| Parallel | declared & disjoint | none | lock OPTIONAL (defensive); run |
| Parallel | declared & intersect | possible | lock ACQUIRE; abort on conflict |
| Parallel | undeclared by some | possible | sequential re-dispatch OR audit-only (Layer 3 catches post-hoc) |
| Parallel | no scope declares | possible | sequential re-dispatch (always opt-in audit) |

---

## Pipeline

```
PLAN     spec-tech.md: scope has [TARGET_FILES] block
            ↓ parsed into wf.scopes[i].target_files + scope-contract.json

DISPATCH parallel scope dispatch decision (matrix above)
            ┌─ disjoint target_files → parallel OK
            ├─ intersect target_files → acquire locks → parallel OR sequential
            └─ no target_files → sequential only

PREVENT  Step 3c: acquire locks (atomic ln, sha1, TTL 30min)
            ┌─ lock free → acquire
            ├─ held by same scope → idempotent
            └─ held by other + valid → orchestrator aborts/waits

EXECUTE  worker does the work (single agent turn per scope)

RELEASE  Step 3e: rm -f lock files (crashed → TTL auto-expires)

DETECT   Step 3e: git diff --name-only $start_sha..HEAD → actual_files

REPORT   Step 8: 4-class classification
            ┌─ class (a) undeclared writes → human reviews contract drift
            ├─ class (b) real overlaps    → human decides merge/re-run/rework
            ├─ class (c) stale locks      → auto-recovered; surface for visibility
            └─ class (d) clean            → ✅ no action
```

---

## Why not the alternatives

| Alternative | Why rejected |
|---|---|
| **Predicted `[TARGET_FILES]` guard (LLM heuristic)** | LLM guessing which files a scope *will* touch — always unreliable. Layer 3 audit confirms or refutes after the fact. |
| **OS-level flock hooks (claude-code-file-lock, agentlocks)** | Per-CLI integration. Stelow = workflow, not hook framework. Users who want this layer install it at the harness level. |
| **`git worktree` isolation** | Avoided. Adds merge-step complexity disproportionate to the actual risk of 2-3 parallel scopes. Audit + locks give the same guarantees without the merge burden. |
| **`sibling-scopes.json` (phantom heuristic)** | Replaced. Documented in v0.39.3 but never implemented as code. Replaced by Layer 3 `git diff` capture — observed, not predicted. |
| **Semantic AST merge (Phantom)** | Heavyweight. Out of KISS scope. Useful for high-frequency parallel editing; stelow serves occasional parallel dispatch. |

---

## Optional enhancements (not required)

| Tool | Where it adds value | Auto-install? |
|---|---|---|
| **cymbal** | `[TARGET_FILES]` authoring: `cymbal impact <scope>` → symbols/functions affected → author populates the block with informed paths instead of guessing | Detected + offered during `scripts/setup.sh` (cross-platform: brew on macOS/Linux, PowerShell on Windows) |
| **sem** ([Ataraxy-Labs/sem](https://github.com/Ataraxy-Labs/sem)) | Step 8 4-class report: `sem diff $start_sha HEAD` → entity-level changes (functions added/removed/modified) per scope, instead of file-path-only. Much clearer human decision support. | Detected + offered during `scripts/setup.sh` (cross-platform: curl\|sh, brew, winget, choco). NOTE: GNU Parallel has its own `sem` binary; setup.sh detects and warns. |

### Detection at setup time

`scripts/setup.sh` runs after every install/upgrade. It detects both tools via `command -v` and offers cross-platform install with cascading fallbacks:

- **Already installed** → logs ✅, no action.
- **macOS + Linuxbrew** → `brew install <formula>`. Default `[Y]` prompt.
- **Windows (Git Bash)** → `powershell.exe` for cymbal's `install.ps1`; `winget install AtaraxyLabs.sem` for sem. Falls back to Chocolatey if winget missing.
- **macOS / Linux / WSL (no brew)** → `curl -fsSL <tool>/install.sh | sh`.
- **All paths exhausted** → logs manual install URL + skips. Tool marks absent in `tools.json`.

Detection state is persisted to `.stelow/tools.json`:

```json
{
  "cymbal": true,
  "sem": false,
  "detected_at": "2026-07-06T20:48:11Z"
}
```

Downstream stages read this file to decide whether to call `cymbal` / `sem` or fall back to plain `git` / `find`. The fallback paths are always implemented — these tools enrich, never gate, the workflow.

Both tools are OFF by default at the workflow-level (a stage that wants to use cymbal must opt in explicitly). The setup detection only ensures the binary is present; usage is per-stage.

---

## Audit trail per scope execution

After every Execution phase, `execution-report.md` includes:

```
📋 Overlap report: {path}/overlap-report.json
  class (a) undeclared writes: {n}
  class (b) real overlaps:      {n}
  class (c) stale locks:        {n}
  class (d) clean scopes:       {n}
```

Non-empty (a)/(b)/(c) → block advance to Verification until human decides.

---

## Related docs

- `skills/stelow-product-orchestrator/references/cli-tools/file-locking.md` — protocol-level how-to (FS ops, TTL, JSON shape)
- `skills/cali-product-scope-executor/SKILL.md` — Step 2e (init), Step 3c (acquire), Step 3e (release + capture), Step 8 (report)
- `extensions/stelow/types.ts#Scope` — `target_files?`, `actual_files?`, `start_sha?` fields
- `CHANGELOG.md` — v0.41.2 entry (initial implementation)
