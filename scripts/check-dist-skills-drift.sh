#!/usr/bin/env bash
# scripts/check-dist-skills-drift.sh
#
# SW-036: secondary guard from
# docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md §"Secondary guard".
# Asserts the compiled plugins/fusion-plugin-stelow/dist/skills.d.ts#STELOW_PLUGIN_VERSION
# agrees with the committed source manifest.json#version after `npm run build`.
#
# Catches the SW-008 historical-miss pattern (v0.55.0 shipped with
# STELOW_PLUGIN_VERSION="0.54.3" baked into dist because the release commit
# skipped `npm run prepare:fusion-plugin && npm run build:fusion-plugin`).
#
# Exit 0 on pass, 1 on drift. Emits `::error::` annotations for GitHub Actions.
#
# POSIX shell + Node. Assumes GNU grep with -oE (Linux, macOS). Run from the
# repo root, after `npm run build`. CI invocation:
#   bash scripts/check-dist-skills-drift.sh
# Local invocation (post-build):
#   bash scripts/check-dist-skills-drift.sh

set -euo pipefail

PLUGIN_DIR="plugins/fusion-plugin-stelow"
DIST_FILE="${PLUGIN_DIR}/dist/skills.d.ts"
MANIFEST_FILE="${PLUGIN_DIR}/manifest.json"

# 1. The dist artifact must exist (the build must have run).
if [ ! -f "$DIST_FILE" ]; then
  printf '::error::%s does not exist; run `npm run build:fusion-plugin` to generate it\n' "$DIST_FILE" >&2
  exit 1
fi

# 2. Extract STELOW_PLUGIN_VERSION from the dist artifact. The regex is
#    anchored to the const declaration so future renames or commented-out
#    declarations surface as parse failures rather than silent matches.
dist_version=$(grep -oE 'STELOW_PLUGIN_VERSION[[:space:]]*=[[:space:]]*"[0-9]+\.[0-9]+\.[0-9]+"' "$DIST_FILE" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
if [ -z "$dist_version" ]; then
  printf '::error::%s does not contain a parseable STELOW_PLUGIN_VERSION declaration\n' "$DIST_FILE" >&2
  exit 1
fi

# 3. Read the canonical source version from manifest.json.
manifest_version=$(node -p "require('./${MANIFEST_FILE}').version")

# 4. Compare.
if [ "$dist_version" != "$manifest_version" ]; then
  printf '::error::%s#STELOW_PLUGIN_VERSION (%s) does not match %s#version (%s)\n' \
    "$DIST_FILE" "$dist_version" "$MANIFEST_FILE" "$manifest_version" >&2
  printf '::error::Re-bake by running `npm run prepare:fusion-plugin && npm run build:fusion-plugin`\n' >&2
  exit 1
fi

printf 'OK: %s#STELOW_PLUGIN_VERSION (%s) matches %s#version (%s)\n' \
  "$DIST_FILE" "$dist_version" "$MANIFEST_FILE" "$manifest_version"
