#!/bin/bash
# bump.sh — re-vendor the engine from upstream main and move the pin.
#
# Usage: scripts/bump.sh [project-dir]   (default: the repo root)
# Leaves a clean working tree when already current; otherwise the four files
# and site/UPSTREAM_SHA change together, ready to commit.
set -euo pipefail

target="${1:-$(pwd)}"
upstream="${DOCSITE_UPSTREAM:-calionauta/docsite}"
sha=$(curl -fsSL "https://api.github.com/repos/$upstream/commits/main" \
	| python3 -c 'import json,sys; print(json.load(sys.stdin)["sha"])')
raw="https://raw.githubusercontent.com/$upstream/$sha"
[ -n "$sha" ] || { echo "cannot resolve $upstream main" >&2; exit 1; }

curl -fsSL "$raw/src/build.mjs" -o "$target/site/build.mjs"
curl -fsSL "$raw/src/releases.mjs" -o "$target/site/releases.mjs"
curl -fsSL "$raw/src/site-layout.test.mjs" -o "$target/scripts/site-layout.test.mjs"
curl -fsSL "$raw/scripts/check-drift.sh" -o "$target/scripts/check-docsite-drift.sh"
curl -fsSL "$raw/scripts/bump.sh" -o "$target/scripts/bump-docsite.sh"
chmod +x "$target/scripts/check-docsite-drift.sh" "$target/scripts/bump-docsite.sh"
printf '%s\n' "$sha" > "$target/site/UPSTREAM_SHA"
echo "✓ vendored $upstream@$sha"
