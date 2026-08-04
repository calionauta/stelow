#!/usr/bin/env bash
#
# stelow Pulse setup — removed in v0.57.0.
#
# Pulse was a background inbox processor (cron/launchd/systemd/Task Scheduler)
# that wrapped `pi --print` to advance items from `.stelow/inbox/items.md`
# into workflows automatically. It is replaced by per-host native scheduling:
#
#   - Multica: autopilot `run_only` + trigger on `backlog`/`todo` issues.
#   - Fusion:  its own scheduler/agent loop.
#   - Pi:      `pi-subagents` background runs.
#
# This stub remains so legacy callers get a clear error instead of a missing
# file. It exits 0 (do nothing) for `--help`, exit 2 for any other invocation.
#
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
stelow setup-pulse.sh — REMOVED in v0.57.0

Pulse was retired when the Stelow core slimmed its responsibilities.
Scheduling and inbox processing are now host-driven:

  Multica: autopilot (run_only + triggers on backlog/todo issues)
  Fusion:  native scheduler
  Pi:      pi-subagents background runs

No equivalent "setup-pulse.sh" step exists anymore. If you previously had
a cron entry that called this script, remove it from your crontab and let
your host take over.

See README.md "Host Installation Guide" for the per-host setup recipe.
EOF
  exit 0
fi

echo "setup-pulse.sh: removed in v0.57.0. Use your host's native scheduler instead." >&2
echo "  - Multica: autopilot + run_only triggers on backlog/todo issues" >&2
echo "  - Fusion:  native scheduler" >&2
echo "  - Pi:      pi-subagents" >&2
echo "Run '$0 --help' for details." >&2
exit 2