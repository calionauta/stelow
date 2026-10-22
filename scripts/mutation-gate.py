#!/usr/bin/env python3
"""mutation-gate.py — does the suite actually pin the helper's behavior?

Mutation testing for a repository whose production surface is a shell
script, the Python inside it, and the markdown it generates. The off-the-shelf
mutators cover JavaScript (Stryker, PIT, mutmut); this repo's rules live in
`scripts/stelow`, so the mutators that would answer the question do not
reach it.

The question the gate answers is the one the test policy already states:
"If your test passes against a no-op stub of the function, it's worthless."
A mutation IS that stub, applied to a real rule. Each entry below is a
SEMANTIC change — the kind a careless edit makes — and the gate requires
the suite to FAIL under it. A surviving mutant is a rule nobody pins: the
behavior is documented, the code implements it, and nothing would notice if
it stopped.

Usage:
  python3 scripts/mutation-gate.py            # run the gate
  python3 scripts/mutation-gate.py --list     # show the catalog
  python3 scripts/mutation-gate.py --only <id>  # one mutant

Exit 0 when every mutant is killed; 1 when one survives.
"""
from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Every mutant: an id, the rule it breaks, the exact text it replaces, and
# the test file that must notice. The replacement must be UNIQUE in the file
# — a mutation that lands in the wrong place is not a mutation, it is noise.
MUTANTS = [
    {
        "id": "advance-accepts-anything",
        "rule": "advance refuses a candidate the graph does not allow",
        "find": 'echo "$allowed" | grep -qx "$candidate" ||',
        "replace": 'echo "$allowed" | grep -q ".*" ||',
        "test": "tests/integration/stelow-advance-modes.test.ts",
    },
    {
        "id": "mode-skipped-gate-not-refused",
        "rule": "a stage that does not run in this review mode is refused with a redirect",
        "find": '    die "$candidate is skipped in \'$review_mode\' review mode — advance directly to $redirect instead"',
        "replace": '    :',
        "test": "tests/integration/stelow-advance-modes.test.ts",
    },
    {
        "id": "unknown-review-mode-allowed",
        "rule": "an unknown review mode fails fast instead of skipping enforcement",
        "find": "if mode not in modes:\n    fail(f\"unknown review_mode '{mode}' (known: {', '.join(modes)})\")",
        "replace": "if mode not in modes and False:\n    fail(f\"unknown review_mode '{mode}'\")",
        "test": "tests/integration/stelow-advance-modes.test.ts",
    },
    {
        "id": "route-filter-dropped",
        "rule": "the intent route keeps a move to the immediate next stage only",
        "find": "    allowed = [(verb, c) for verb, c in allowed if c in reachable]",
        "replace": "    allowed = [(verb, c) for verb, c in allowed]",
        "test": "tests/integration/stelow-advance-modes.test.ts",
    },
    {
        "id": "skip-passthrough-dropped",
        "rule": "the predecessor of a stage that does not run moves straight to its successor",
        "find": '    if route[idx - 1] == stage:\n        allowed.append(("next", route[idx + 1]))',
        "replace": '    if False:\n        allowed.append(("next", route[idx + 1]))',
        "test": "tests/integration/stelow-advance-modes.test.ts",
    },
    {
        "id": "manifest-merge-dropped",
        "rule": "an artifacts block written by the worker survives the next advance",
        "find": "for item in parse_artifact_blocks(blob):",
        "replace": "for item in []:",
        "test": "tests/integration/artifact-manifest-merge.test.ts",
    },
    {
        "id": "artifact-guard-dropped",
        "rule": "advance refuses to leave a stage whose required artifact is missing",
        "find": 'print(f"missing required artifact: {pat} (expected under {state_dir or statedir})", file=sys.stderr); sys.exit(1)',
        "replace": 'print(f"artifact note: {pat}", file=sys.stderr); sys.exit(0)',
        "test": "tests/unit/stelow-helper.test.ts",
    },
    {
        "id": "context-skip-policy-ignored",
        "rule": "a stage the policy removes is refused and its predecessor moves on",
        "find": "    for stage in absent_by_policy(parse_stage_skips(text), scoped):",
        "replace": "    for stage in []:",
        "test": "tests/integration/context-policy-parity.test.ts",
    },
    {
        "id": "context-ask-level-wrong",
        "rule": "the matrix says the ask level the policy declares",
        "find": '    for quality, level in (policy.get("ask") or {}).items():',
        "replace": '    for quality, level in (policy.get("ask") or {}).items():\n        level = "full"',
        "file": "scripts/generate-stage-policies.py",
        "test": "tests/integration/context-policy-parity.test.ts",
    },
    {
        "id": "generator-drift-allowed",
        "rule": "the generated transitions reference cannot drift from its source",
        "find": 'if current != rendered:\n            print("generate-transitions: transitions.md is stale — run python3 scripts/generate-transitions.py", file=sys.stderr)\n            return 1',
        "replace": 'if False:\n            print("stale", file=sys.stderr)\n            return 1',
        "test": "tests/integration/transitions-generator.test.ts",
        "file": "scripts/generate-transitions.py",
    },
]


def clone_tree(destination: pathlib.Path) -> pathlib.Path:
    """A writable copy of the repo: the sources, and node_modules borrowed."""
    shutil.copytree(
        ROOT,
        destination,
        ignore=shutil.ignore_patterns("node_modules", ".git", "dist", "reports", ".stryker-tmp"),
        symlinks=True,
    )
    modules = ROOT / "node_modules"
    if modules.exists():
        os.symlink(modules, destination / "node_modules")
    return destination


def apply_mutant(tree: pathlib.Path, mutant: dict) -> None:
    relative = mutant.get("file", "scripts/stelow")
    path = tree / relative
    text = path.read_text()
    occurrences = text.count(mutant["find"])
    if occurrences != 1:
        raise SystemExit(
            f"mutation-gate: the anchor for '{mutant['id']}' matches {occurrences} times "
            f"in {relative} — a mutation that lands in the wrong place is noise, not a mutant"
        )
    path.write_text(text.replace(mutant["find"], mutant["replace"], 1))


def run_test(tree: pathlib.Path, test: str) -> tuple[int, str]:
    result = subprocess.run(
        ["npx", "vitest", "run", test],
        cwd=tree,
        capture_output=True,
        text=True,
        timeout=600,
    )
    return result.returncode, result.stdout + result.stderr


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="show the catalog and exit")
    parser.add_argument("--only", help="run one mutant by id")
    args = parser.parse_args()

    if args.list:
        for mutant in MUTANTS:
            print(f"{mutant['id']:34} {mutant['rule']}")
        return 0

    selected = [m for m in MUTANTS if not args.only or m["id"] == args.only]
    if not selected:
        raise SystemExit(f"mutation-gate: no mutant named '{args.only}'")

    survivors: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="stelow-mutation-") as raw:
        tree = clone_tree(pathlib.Path(raw) / "repo")
        for mutant in selected:
            apply_mutant(tree, mutant)
            code, output = run_test(tree, mutant["test"])
            if code == 0:
                survivors.append(mutant)
                print(f"SURVIVED  {mutant['id']}: nothing noticed ({mutant['test']})")
            else:
                print(f"killed    {mutant['id']}: {mutant['test']} failed as it must")
            # Restore, so each mutant is judged on its own.
            original = ROOT / mutant.get("file", "scripts/stelow")
            shutil.copyfile(original, tree / mutant.get("file", "scripts/stelow"))

    if survivors:
        print(f"\nmutation-gate: {len(survivors)} of {len(selected)} mutants SURVIVED.", file=sys.stderr)
        for mutant in survivors:
            print(f"  {mutant['id']}: {mutant['rule']}", file=sys.stderr)
        return 1
    print(f"\nmutation-gate: all {len(selected)} mutants killed — the suite pins them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
