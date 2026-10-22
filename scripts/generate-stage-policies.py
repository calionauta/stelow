#!/usr/bin/env python3
"""generate-stage-policies.py — the stage policy surfaces, rendered from stages.yaml.

Usage:
  python3 scripts/generate-stage-policies.py           # rewrite the regions
  python3 scripts/generate-stage-policies.py --check   # CI gate: exit 1 on drift

A stage policy is one fact with two faces: the machine gate that refuses a
stage which does not run, and the matrix the LLM reads to decide what to do
with the stage that does. Both are rendered from `stages.yaml`, so they
cannot disagree — and they DID disagree, in both directions, for the
context stage: the published matrix skipped only for experimental+Auto,
while the helper skipped for a single direction too, so a worker following
the policy was refused by the gate.

The matrix is a DECISION TABLE: the first matching row wins. The skip rule
is its first row, so the rule is stated once and the table follows from it.

The rendered region is delimited by markers. Everything outside them is
curated prose and passes through untouched.
"""
from __future__ import annotations

import pathlib
import sys

try:
    import yaml
except ImportError:
    print("generate-stage-policies: PyYAML required (python3 -c 'import yaml')", file=sys.stderr)
    sys.exit(2)

REPO = pathlib.Path(__file__).resolve().parent.parent
STAGES_YAML = REPO / "skills/stelow-workflow-orchestrator/stages.yaml"
BEGIN = "<!-- stelow:policy:begin -->"
END = "<!-- stelow:policy:end -->"

# The cells of the context matrix. The DECISION of each cell is derived
# from the policy in stages.yaml; the prose that explains it lives here,
# once, and is never re-derived by hand.
ASK_CELLS = {
    "skip": (
        "**Skip** entire Context stage → go directly to `shape:10`",
        "**Skip** (not reached)",
    ),
    "reduced": (
        "**Reduced ask**: present all 5 strategic approaches, but mark execution "
        "as opt-in per approach (no automatic parallel subagents)",
        "**Reference-only**: detect domain signals and load the 8 libraries as passive "
        "context for Shape/Scope; do not execute subagents per library",
    ),
    "full": (
        "**Full ask** (current behavior): present all 5, execute selected in parallel, "
        "consolidate into `strategic-insights.md`",
        "**Full detect + execute**: 1..N of the 8 libraries via parallel subagents, "
        "inject into Shape/Scope/Interface",
    ),
}


def load_routes() -> dict:
    data = yaml.safe_load(STAGES_YAML.read_text())
    routes = data.get("routes") or {}
    if not routes.get("stage_policies"):
        print("generate-stage-policies: stages.yaml declares no stage_policies", file=sys.stderr)
        sys.exit(2)
    return routes


def condition_holds(condition: dict, knobs: dict) -> bool:
    """The condition shape: a conjunction, plus an optional disjunction."""
    for key, allowed in condition.items():
        if key == "any_of":
            continue
        if str(knobs.get(key, "")) not in [str(value) for value in allowed]:
            return False
    any_of = condition.get("any_of")
    if not any_of:
        return True
    return any(
        str(knobs.get(key, "")) in [str(value) for value in allowed]
        for key, allowed in any_of.items()
    )


def describe(condition: dict) -> str:
    """The condition, in a sentence a reader can check against the knobs."""
    parts = []
    for key, allowed in condition.items():
        if key == "any_of":
            alternatives = " or ".join(
                f"`{name}` is `{', '.join(str(v) for v in values)}`"
                for name, values in allowed.items()
            )
            parts.append(alternatives)
        else:
            parts.append(f"`{key}` is `{', '.join(str(v) for v in allowed)}`")
    return " or ".join(parts)


def modes_of(condition: dict) -> list[str]:
    """The review modes the condition names, or every mode when it names none."""
    declared = condition.get("review_mode")
    return [str(mode) for mode in declared] if declared else []


def context_matrix(policy: dict, modes: list[str]) -> list[str]:
    """The context matrix: the skip rule first, then the ask levels."""
    skip = policy.get("skip") or {}
    skip_when = skip.get("when") or {}
    skip_modes = modes_of(skip_when)
    other_modes = [mode for mode in modes if mode not in skip_modes]
    rows = [
        "| Condition | Review Mode | `context:10` (Strategic Approaches — 5 options) | `context:20` (Domain Libraries — 8 options) |",
        "|---|---|---|---|---|",
    ]
    if skip_when:
        condition = {key: value for key, value in skip_when.items() if key != "review_mode"}
        cell10, cell20 = ASK_CELLS["skip"]
        rows.append(
            f"| {describe(condition)} | {', '.join(f'`{m}`' for m in skip_modes)} | {cell10} | {cell20} |"
        )
    for quality, level in (policy.get("ask") or {}).items():
        cell10, cell20 = ASK_CELLS[level]
        # Every mode: the skip row above already took the ones it names, and
        # the table says the first matching row wins.
        rows.append(f"| `quality` is `{quality}` | any | {cell10} | {cell20} |")
    return rows


def render_context_region(routes: dict) -> str:
    policy = next((p for p in routes["stage_policies"] if p.get("stage") == "context"), None)
    if policy is None:
        raise SystemExit("generate-stage-policies: no policy for the context stage")
    modes = list((routes.get("review_modes") or {}).keys())
    lines = [BEGIN]
    lines.extend(context_matrix(policy, modes))
    lines.append(END)
    return "\n".join(lines)


def replace_region(text: str, region: str) -> str:
    if BEGIN in text and END in text:
        start = text.index(BEGIN)
        stop = text.index(END) + len(END)
        return text[:start] + region + text[stop:]
    raise SystemExit("generate-stage-policies: the target file has no policy region")


def main() -> int:
    check = "--check" in sys.argv
    routes = load_routes()
    target = REPO / "skills/stelow-workflow-orchestrator/stages/context.md"
    text = target.read_text()
    rendered = replace_region(text, render_context_region(routes))
    if rendered == text:
        print("generate-stage-policies: ok")
        return 0
    if check:
        print(
            "generate-stage-policies: stages/context.md is stale — "
            "run python3 scripts/generate-stage-policies.py",
            file=sys.stderr,
        )
        return 1
    target.write_text(rendered)
    print("generate-stage-policies: wrote stages/context.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
