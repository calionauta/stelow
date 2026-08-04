#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-"$ROOT/tmp/multica-skills"}
mkdir -p "$OUT"
rm -f "$OUT"/*.tgz

count=0
for skill_dir in "$ROOT"/skills/stelow-product-*; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  name=$(basename "$skill_dir")
  (
    cd "$(dirname "$skill_dir")"
    tar -czf "$OUT/$name.tgz" "$name"
  )
  count=$((count + 1))
done

if [ "$count" -ne 25 ]; then
  printf 'Expected 25 Stelow skills, packaged %s\n' "$count" >&2
  exit 1
fi

printf 'Packaged %s skills in %s\n' "$count" "$OUT"
