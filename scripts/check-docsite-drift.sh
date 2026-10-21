#!/bin/bash
# check-drift.sh — a vendored copy must match the upstream commit it pins.
#
# Usage: scripts/check-drift.sh [project-dir]   (default: the repo root)
#
# Reads site/UPSTREAM_SHA, fetches the three engine files at that commit from
# GitHub and compares them byte for byte. A local edit to a vendored file, or a
# hand-copied "fix" that never went upstream, fails here.
#
# Run it from a scheduled workflow; it needs network access and no token for a
# public upstream.
set -uo pipefail

target="${1:-$(pwd)}"
root=$(cd "$target" && pwd)
sha_file="$root/site/UPSTREAM_SHA"
upstream="${DOCSITE_UPSTREAM:-calionauta/docsite}"
raw="https://raw.githubusercontent.com/$upstream"

[ -f "$sha_file" ] || { echo "missing $sha_file" >&2; exit 1; }
sha=$(tr -d '[:space:]' < "$sha_file")
[ -n "$sha" ] || { echo "empty $sha_file" >&2; exit 1; }

fail=0
check() {
	local rel="$1" vendored="$2" tmp
	tmp=$(mktemp)
	if ! curl -fsSL "$raw/$sha/$rel" -o "$tmp"; then
		echo "❌ cannot fetch $rel at $sha from $upstream" >&2
		rm -f "$tmp"
		fail=1
		return
	fi
	if ! cmp -s "$tmp" "$vendored"; then
		echo "❌ $vendored differs from $rel at $sha" >&2
		fail=1
	fi
	rm -f "$tmp"
}

check src/build.mjs "$root/site/build.mjs"
check src/releases.mjs "$root/site/releases.mjs"
check src/site-layout.test.mjs "$root/scripts/site-layout.test.mjs"
# The checker is vendored too: an edited checker could hide every other drift.
check scripts/check-drift.sh "$root/scripts/check-docsite-drift.sh"
check scripts/bump.sh "$root/scripts/bump-docsite.sh"

if [ "$fail" -ne 0 ]; then
	echo "" >&2
	echo "Vendored files are read-only: fix it upstream, then re-run scripts/install.sh and commit the SHA change." >&2
	exit 1
fi

echo "✓ docsite vendored files match $sha"
