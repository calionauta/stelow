#!/bin/sh
# Refresh the vendored bb-plugin-stelow CHANGELOG snapshot used by /releases/.
# usage: sh site/vendor/refresh.sh <sha-or-tag>   (pin to a tag, never master)
set -eu
REF="${1:?usage: sh site/vendor/refresh.sh <sha-or-tag>}"
curl -fsSL "https://raw.githubusercontent.com/calionauta/bb-plugin-stelow/${REF}/CHANGELOG.md" -o site/vendor/bb-plugin-CHANGELOG.md
grep -q '^## ' site/vendor/bb-plugin-CHANGELOG.md || { echo "snapshot has no sections"; exit 1; }
printf '%s' "$REF" > site/vendor/bb-plugin-SHA
echo "snapshot pinned at $REF ($(grep -c '^## ' site/vendor/bb-plugin-CHANGELOG.md) sections)"
