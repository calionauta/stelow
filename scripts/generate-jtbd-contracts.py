#!/usr/bin/env python3
"""Generate the machine-readable contract for every job-to-be-done substep.

The source of truth is the prose in `references/NN-*.md`: each file ends with a
`criteria:` block under its "Completeness contract" heading, written for a human
to read. Hosts need the same list as data, and re-typing it in a host is how the
two drift apart (one host invented its own word floor that the methodology never
declared). This generator reads the blocks, keeps the substep order from
`product-strategies.json`, and writes `references/contracts.json`.

Usage:
    python3 scripts/generate-jtbd-contracts.py            # write the file
    python3 scripts/generate-jtbd-contracts.py --check    # exit 1 if stale
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKILL_ID = "stelow-product-job-to-be-done"
SKILL = ROOT / "skills" / SKILL_ID
REFS = SKILL / "references"
STRATEGIES = ROOT / "product-strategies.json"
OUT = REFS / "contracts.json"


def substep_order() -> list[str]:
    data = json.loads(STRATEGIES.read_text(encoding="utf-8"))
    strategies = data["strategies"] if isinstance(data, dict) and "strategies" in data else data
    entries = strategies if isinstance(strategies, list) else list(strategies.values())
    for entry in entries:
        if entry.get("skill") == SKILL_ID or entry.get("id") == "job-to-be-done":
            return list(entry.get("substeps") or [])
    raise SystemExit(f"generate-jtbd-contracts: {SKILL_ID} is not registered in product-strategies.json")


def parse_criteria(text: str) -> list[dict]:
    """Read the top-level `criteria:` block: id, kind, text, one criterion each."""
    lines = text.splitlines()
    start = None
    for index, line in enumerate(lines):
        if line.strip() == "criteria:" and not line.startswith((" ", "\t")):
            start = index + 1
            break
    if start is None:
        return []
    criteria: list[dict] = []
    current: dict | None = None
    for line in lines[start:]:
        if not line.strip():
            continue
        if not line.startswith((" ", "\t")):
            break  # back to prose: the block ended
        stripped = line.strip()
        if stripped.startswith("- "):
            stripped = stripped[2:]
        key, separator, value = stripped.partition(":")
        if not separator:
            continue
        key, value = key.strip(), value.strip()
        if key == "id":
            current = {"id": value}
            criteria.append(current)
        elif current is not None and key in ("kind", "text"):
            if len(value) >= 2 and value[0] == value[-1] == '"':
                value = value[1:-1]
            current[key] = value
    return [c for c in criteria if c.get("id") and c.get("kind")]


def build() -> tuple[dict, list[str], list[str]]:
    order = substep_order()
    files = {path.stem.split("-", 1)[1]: path for path in sorted(REFS.glob("[0-9][0-9]-*.md"))}
    substeps: list[dict] = []
    missing: list[str] = []
    for slug in order:
        path = files.get(slug)
        if path is None:
            missing.append(slug)
            continue
        substeps.append({
            "slug": slug,
            "ref": f"references/{path.name}",
            "criteria": parse_criteria(path.read_text(encoding="utf-8")),
        })
    without: list[str] = [s["slug"] for s in substeps if not s["criteria"]]
    # `00-*.md` is the skill-level policy, not a substep: it ships as its own block.
    policies = [
        {"slug": slug, "ref": f"references/{files[slug].name}", "criteria": parse_criteria(files[slug].read_text(encoding="utf-8"))}
        for slug in sorted(set(files) - set(order))
        if files[slug].name.startswith("00-")
    ]
    extra = sorted(set(files) - set(order) - {p["slug"] for p in policies})
    payload = {
        "skill": SKILL_ID,
        "generated_by": "scripts/generate-jtbd-contracts.py",
        "source": "the criteria block under 'Completeness contract' in each reference",
        "policies": policies,
        "substeps": substeps,
    }
    return payload, missing + without, extra


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if contracts.json is stale")
    args = parser.parse_args()

    payload, problems, extra = build()
    for slug in problems:
        print(f"generate-jtbd-contracts: substep {slug!r} has no reference file or no criteria", file=sys.stderr)
    if extra:
        print(f"generate-jtbd-contracts: references without a substep entry: {', '.join(extra)}", file=sys.stderr)

    rendered = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if problems:
            return 1
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != rendered:
            print(
                "generate-jtbd-contracts: contracts.json is stale — "
                "run python3 scripts/generate-jtbd-contracts.py",
                file=sys.stderr,
            )
            return 1
        print(f"jtbd-contracts: ok ({len(payload['substeps'])} substeps)")
        return 0

    OUT.write_text(rendered, encoding="utf-8")
    total = sum(len(s["criteria"]) for s in payload["substeps"])
    print(f"jtbd-contracts: wrote {OUT.relative_to(ROOT)} ({len(payload['substeps'])} substeps, {total} criteria)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
