# Overview

Stelow brings product methodology to AI coding agents. Instead of open-ended
feature lists, you shape proposals with clear scope boundaries, validate them
through adversarial critique, and generate typed technical scopes ready for
autonomous execution.

> **Pre-1.0 status:** Stelow is under active product and market validation.
> Its public release line is `0.x`; APIs, workflow contracts, and skills may
> change incompatibly before a stable `1.0.0`.

## Three ways to run it

| Path | What you get | Start here |
|---|---|---|
| **A — bb + plugin** (recommended) | Visual board, quiet inbox, blocking questions, agent presets, `bb stelow` worker CLI | [getting-started.md](getting-started.md) (Path A), [plugin/install-bb.md](plugin/install-bb.md) |
| **B — skills-only** | The same 38 skills + `scripts/stelow` CLI on any Agent Skills-compatible host | [getting-started.md](getting-started.md) (Path B) |
| **C — Multica board** | Three workflows on a real tracker: the build chain per repository, plus shared explore and research lanes | [host-multica.md](host-multica.md), [getting-started.md](getting-started.md) (Path C) |

All three run the identical workflow. The plugin and the tracker are layers; neither
replaces the workflow state (`stelow.json`, `.stelow/`, `state.md` remain the
source of truth). What the plugin adds is listed in
[plugin/what-plugin-adds.md](plugin/what-plugin-adds.md); what a tracker forced is
in [host-multica.md](host-multica.md).

## How it works, in five lines

1. **Shape** the idea into a proposal with IN/OUT scope boundaries and an
   run knobs (quality, exploration).
2. **Critique** it adversarially and pass the review gates you asked for
   (product spec, interface, tech plan, code diff).
3. **Scope** it into typed delivery units (feature, spike, optimize, test-*)
   with dependencies sequenced.
4. **Execute** each scope against an acceptance contract, then verify and
   audit the result. Escalated gaps become new scopes until none remain.
5. Every approval is a portable receipt (`.stelow/approvals/`); every finish
   leaves an `audit-trail.md` receipt hashed against the exact repository
   tree that was verified.

The full pipeline is 18 stages (`triage` → … → `audit`); lighter review modes
skip gates without changing the shape. Details: [architecture.md](../architecture.md)
and the workflow pages.

## What Stelow does not do

- No scheduler of its own — each host drives invocations from its native
  event surface (the bb plugin is the reference implementation).
- No TUI in this repo — workflow status is `/sw-status`; visual overlays are
  host-owned.
- No extension code, no compiled plugin, no per-host adapter here — just
  skills plus the `scripts/stelow` shell helper (bash + python3).
