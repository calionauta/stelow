#!/usr/bin/env bash
# recon.sh — portable capability preflight for Stelow code reconnaissance.
#
# Run from any directory inside the target repository:
#   bash <skill-dir>/references/cli-tools/recon.sh <tech-preview|feature-recon>
#
# The receipt is intentionally small and host-neutral. It records which
# optional tools were actually available and whether the invocation had a Git
# workspace; it never installs tools or claims that a fallback found anything.
set -eu

kind="${1:-}"
case "$kind" in tech-preview|feature-recon) ;; *) echo "usage: recon.sh <tech-preview|feature-recon>" >&2; exit 64 ;; esac

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ]; then
  printf 'RECON_REFUSED: run reconnaissance from a Git workspace root or a child directory.\n' >&2
  exit 2
fi
cd "$root"

tool_state() {
  if command -v "$1" >/dev/null 2>&1; then printf 'available'; else printf 'missing'; fi
}

cymbal="$(tool_state cymbal)"
ripwire="$(tool_state ripwire)"
sem="$(tool_state sem)"
if command -v ast-grep >/dev/null 2>&1 || command -v sg >/dev/null 2>&1; then ast_grep=available; else ast_grep=missing; fi
if [ "$cymbal" = available ]; then method=cymbal; elif [ "$ripwire" = available ]; then method=ripwire; else method=portable; fi

mkdir -p context
node - "$kind" "$root" "$method" "$cymbal" "$ripwire" "$sem" "$ast_grep" <<'NODE'
const [kind, root, method, cymbal, ripwire, sem, astGrep] = process.argv.slice(2);
const fs = require("node:fs");
const tools = { cymbal, ripwire, sem, "ast-grep": astGrep };
const missing = Object.entries(tools).filter(([, state]) => state === "missing").map(([name]) => name);
fs.writeFileSync("context/recon-receipt.json", JSON.stringify({
  contract: "stelow-recon-v1", kind, workspace: { root, git: true },
  tools, method, missing, generatedAt: new Date().toISOString(),
}, null, 2) + "\n");
console.log(`RECON_READY:${method}:context/recon-receipt.json`);
NODE
