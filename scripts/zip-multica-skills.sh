#!/usr/bin/env bash
# Re-pack each skill directory as a .zip (Multica skill import expects .skill/.zip).
# Source bundles (.tgz) are produced by scripts/package-multica-skills.sh.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARS="$ROOT/tmp/multica-skills"
OUT="$TARS/zips"
mkdir -p "$OUT"

count=0
for tgz in "$TARS"/stelow-*.tgz; do
  name=$(basename "$tgz" .tgz)
  rm -rf "$TARS/$name" "$OUT/$name.zip"
  mkdir -p "$TARS/$name"
  tar -xzf "$tgz" -C "$TARS/$name"
  python3 - "$TARS/$name" "$TARS" "$OUT/$name.zip" <<'PY'
import os, sys, zipfile
src, tars, out = sys.argv[1], sys.argv[2], sys.argv[3]
inner = os.listdir(src)[0]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for dirpath, _, files in os.walk(src):
        for f in files:
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, os.path.join(tars, inner))
            zf.write(full, rel)
PY
  count=$((count + 1))
done

[ "$count" -ne 25 ] && { printf 'Expected 25 zips, got %s\n' "$count" >&2; exit 1; }
printf 'Zipped %s skills into %s\n' "$count" "$OUT"
