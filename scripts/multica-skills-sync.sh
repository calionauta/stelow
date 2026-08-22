#!/usr/bin/env bash
# Dry run: enumerate what `multica skill import` would do for the 25 Stelow skills.
# Compares source bundles to currently installed skills and prints:
#   CREATE  — skill missing in workspace
#   OVERWRITE — skill present, would be replaced
#   SKIP — nothing to do
# Never modifies the workspace. Pair with --apply to actually import.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ZIPS="$ROOT/tmp/multica-skills/zips"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

if [ ! -d "$ZIPS" ] || [ -z "$(ls -A "$ZIPS" 2>/dev/null)" ]; then
  printf 'Building zips first...\n' >&2
  bash "$ROOT/scripts/package-multica-skills.sh" >/dev/null
  bash "$ROOT/scripts/zip-multica-skills.sh" >/dev/null
fi

multica skill list --output json > /tmp/stelow-skills-current.json
python3 - "$ZIPS" "$APPLY" /tmp/stelow-skills-current.json <<'PY'
import json, os, sys, subprocess, zipfile

zips_dir, apply_flag, current_path = sys.argv[1], int(sys.argv[2]), sys.argv[3]
current = {s["name"]: s["id"] for s in json.load(open(current_path))}

plan = []
for path in sorted(os.listdir(zips_dir)):
    if not path.endswith(".zip"):
        continue
    name = path[:-4]
    files = zipfile.ZipFile(os.path.join(zips_dir, path)).namelist()
    if name in current:
        action = "OVERWRITE"
    else:
        action = "CREATE"
    plan.append((action, name, current.get(name), len(files)))

creates = [p for p in plan if p[0] == "CREATE"]
overwrites = [p for p in plan if p[0] == "OVERWRITE"]
print(f"Total skills: {len(plan)} | CREATE: {len(creates)} | OVERWRITE: {len(overwrites)}")
print()
for action, name, sid, nfiles in plan:
    print(f"  {action:<9} {name}  ({nfiles} files)  -> {sid or '(new)'}")

if not apply_flag:
    print("\nDry run only. Pass --apply to execute the plan.")
    sys.exit(0)

print("\nApplying...")
for action, name, sid, nfiles in plan:
    if action == "OVERWRITE":
        subprocess.run(
            ["multica", "skill", "delete", sid, "--yes"],
            check=True,
        )
    out = subprocess.check_output([
        "multica", "skill", "import",
        "--file", os.path.join(zips_dir, f"{name}.zip"),
        "--on-conflict", "fail",
    ], text=True)
    summary = json.loads(out)
    print(f"  imported {name} -> {summary.get('id')}")
PY
