#!/bin/bash
# bump.sh — re-vendor the engine from upstream main and move the pin.
#
# Usage: scripts/bump.sh [project-dir]   (default: the repo root)
# Leaves a clean working tree when already current; otherwise the vendored
# files and site/UPSTREAM_SHA change together, ready to commit.
set -euo pipefail

target="${1:-$(pwd)}"
upstream="${DOCSITE_UPSTREAM:-calionauta/docsite}"
sha=$(curl -fsSL "https://api.github.com/repos/$upstream/commits/main" \
	| python3 -c 'import json,sys; print(json.load(sys.stdin)["sha"])')
raw="https://raw.githubusercontent.com/$upstream/$sha"
[ -n "$sha" ] || { echo "cannot resolve $upstream main" >&2; exit 1; }

mkdir -p "$target/site/search"
curl -fsSL "$raw/src/build.mjs" -o "$target/site/build.mjs"
curl -fsSL "$raw/src/releases.mjs" -o "$target/site/releases.mjs"
curl -fsSL "$raw/src/search.mjs" -o "$target/site/search.mjs"
curl -fsSL "$raw/src/search.js" -o "$target/site/search/search.js"
curl -fsSL "$raw/src/vendor/minisearch.js" -o "$target/site/search/minisearch.js"
curl -fsSL "$raw/src/vendor/package.json" -o "$target/site/search/package.json"
curl -fsSL "$raw/src/vendor/MINISEARCH-LICENSE.txt" -o "$target/site/search/MINISEARCH-LICENSE.txt"
curl -fsSL "$raw/src/site-layout.test.mjs" -o "$target/scripts/site-layout.test.mjs"
curl -fsSL "$raw/scripts/check-drift.sh" -o "$target/scripts/check-docsite-drift.sh"
# Download the new bump script to a temp file and move it into place: writing
# over the script bash is currently reading truncates it mid-run (“unexpected
# EOF”), because curl opens the same inode. A rename swaps the path, not the
# open descriptor, so this run finishes on the old bytes.
tmp_bump=$(mktemp)
trap 'rm -f "$tmp_bump"' EXIT
curl -fsSL "$raw/scripts/bump.sh" -o "$tmp_bump"
mv "$tmp_bump" "$target/scripts/bump-docsite.sh"
chmod +x "$target/scripts/check-docsite-drift.sh" "$target/scripts/bump-docsite.sh"
printf '%s\n' "$sha" > "$target/site/UPSTREAM_SHA"
echo "✓ vendored $upstream@$sha"
