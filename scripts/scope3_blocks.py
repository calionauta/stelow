#!/usr/bin/env python3
"""scope3_blocks.py — the dual-mode contract block every skill carries.

Usage:
  python3 scripts/scope3_blocks.py           # write the blocks
  python3 scripts/scope3_blocks.py --check   # CI gate: exit 1 on drift

The blocks tell a skill how to behave in workflow mode: which stage it is,
whether it needs an approval, and the shape of the hand-off it must emit.

They are GENERATED from `stages.yaml`, and `--check` fails when a committed
block disagrees with the source. The script used to be a one-shot writer
with no check: it skipped any skill that already carried a block, so a
stage renamed in stages.yaml left every shipped skill naming the old one,
forever, with a green CI.

Two facts the blocks used to get wrong, both from parsing stages.yaml by
hand instead of reading it:

  - `gate` was always "none", because the hand-rolled parser never read
    `requires_approval` — so a skill that owns plan-gate told the worker it
    needed no approval.
  - `next-candidate` was a static copy of the graph edge. That edge is not
    the same in every review mode: `diff-gate` does not run in Auto, and
    the helper refuses it there. A copy of the graph is a graph that goes
    stale, so the block asks the helper instead.
"""

from __future__ import annotations

import pathlib
import sys

try:
    import yaml
except ImportError:
    print("scope3_blocks: PyYAML required (python3 -c 'import yaml')", file=sys.stderr)
    sys.exit(2)

BEGIN = "<!-- stelow:scope3:begin -->"
END = "<!-- stelow:scope3:end -->"
ENTRY_HEADING = "## Entry (mode detection)"

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else ".").resolve()
STAGES_YAML = ROOT / "skills/stelow-workflow-orchestrator/stages.yaml"

# 1. Read stages.yaml once.
try:
    data = yaml.safe_load(STAGES_YAML.read_text())
except (OSError, yaml.YAMLError) as exc:
    print(f"scope3_blocks: cannot read {STAGES_YAML}: {exc}", file=sys.stderr)
    sys.exit(1)
stages = data.get("stages") or []
if not stages:
    print("scope3_blocks: no stages in stages.yaml", file=sys.stderr)
    sys.exit(2)
STAGE_BY_NAME = {s["name"]: s for s in stages}

# 2. Map skill -> stage.
#
#    The stage catalog OWNS the mapping for the skills that own a stage:
#    stages.yaml says which skill each stage dispatches to, and that is the
#    fact the hand-off must agree with. The hint map below only carries the
#    skills that own NO stage — the standalone playbooks and the extra
#    workflow skills that feed a stage without running it.
#
#    The two used to be one map, and the one map was wrong: it said
#    `scope-executor` was the `scope` stage (the catalog says `execution`)
#    and `execution-critique` was the `execution` stage (the catalog says
#    `audit`). The committed blocks followed the catalog; the script that
#    claims to generate them followed the map. A generator that disagrees
#    with the file it writes is a generator nobody runs.
STAGE_OWNED_BY_SKILL = {
    stage["skill"]: stage["name"] for stage in stages if stage.get("skill")
}

# Skills that own no stage but whose work belongs to one.
STAGE_HINTS = {
    "ads": "shape",
    "audience-market": "context",
    "business-models": "shape",
    "discovery": "context",
    "evolutionary-principles": "context",
    "health": "audit",
    "job-to-be-done": "context",
    "launch-validation": "shape",
    "marketplace-playbook": "shape",
    "multi-method-market-analysis": "context",
    "open-source": "shape",
    "opportunity-mapping": "triage",
    "paywall": "shape",
    "pricing": "shape",
    "promotions": "shape",
    "trust-building": "shape",
    "architecture-alternatives": "architecture",
    "architecture-contrast": "architecture",
    "codebase-critique": "diff-gate",
    "coding-standards": "execution",
    "interface-alternatives": "interface",
    "testing-ai-code": "verification",
    "ux-critique": "int-gate",
}

# The control plane does not run a stage, so it emits no stage hand-off.
# The router CONSUMES a hand-off block and appends its own; giving it the
# workflow-mode template would invite it to emit one.
CONTROL_PLANE = {
    "stelow-workflow-orchestrator",
    "stelow-workflow-entry",
    "stelow-workflow-router",
}

_unknown_hints = {skill: stage for skill, stage in STAGE_HINTS.items() if stage not in STAGE_BY_NAME}
if _unknown_hints:
    raise SystemExit(
        "scope3_blocks: these hints name a stage the graph does not have: "
        + ", ".join(f"{skill} -> {stage}" for skill, stage in sorted(_unknown_hints.items()))
    )

ENTRY_BLOCK = """## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.
"""


def gate_of(stage_info: dict) -> str:
    """The gate the stage really carries — `requires_approval`, not a guess."""
    if not stage_info.get("requires_approval"):
        return "none"
    tool = stage_info.get("approval_tool") or "approval"
    return f"approval-required ({tool})"


def hand_off_block(stage_name: str, stage_info: dict | None) -> str:
    if stage_info is None:
        return f"""## Hand-off (workflow mode)

```
stage          : {stage_name}
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : none
rework-on      : (none)
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
"""

    trans = stage_info.get("transitions") or {}
    next_list = trans.get("next") or trans.get("accept") or []
    rework_list = trans.get("rework") or trans.get("reject") or []
    rework_str = ", ".join(rework_list) if rework_list else "(none)"
    desc = str(stage_info.get("description", "")).strip()
    return f"""## Hand-off (workflow mode)

```
stage          : {stage_name}
description    : {desc}
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : {gate_of(stage_info)}
rework-on      : {rework_str}
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
The router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.
"""


def workflow_slice_block(stage_name: str, stage_info: dict | None) -> str:
    if stage_info is None:
        return """### Workflow slice

Standalone (non-workflow) steps are not part of the workflow slice. In
workflow mode this skill emits the Hand-off block and exits.
"""
    desc = str(stage_info.get("description", "")).strip()
    primary = stage_info.get("primary_actions") or []
    pa = ", ".join(primary) if primary else "read, write"
    return f"""### Workflow slice

Workflow mode for the **{stage_name}** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> {desc}

Primary actions (per stages.yaml): `{pa}`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.
"""


def detect_stage(skill_name: str, description: str) -> tuple[str | None, dict | None]:
    """The stage this skill belongs to, and that stage's metadata.

    The owner mapping comes from the catalog. The hint map covers the skills
    that own no stage. The substring fallback is the last resort, and it
    runs on the name with BOTH prefixes stripped: the prefix is
    `stelow-product-` for the playbooks and `stelow-workflow-` for the
    workflow skills, and stripping only the first left every workflow skill
    on the fallback — which matched `critique` inside `codebase-critique`
    and handed the diff-gate skill the critique stage.
    """
    if skill_name in STAGE_OWNED_BY_SKILL:
        owned = STAGE_OWNED_BY_SKILL[skill_name]
        return owned, STAGE_BY_NAME.get(owned)
    stem = skill_name
    for prefix in ("stelow-product-", "stelow-workflow-"):
        if stem.startswith(prefix):
            stem = stem[len(prefix):]
            break
    hint = STAGE_HINTS.get(stem)
    if hint:
        return hint, STAGE_BY_NAME.get(hint)
    for sname in STAGE_BY_NAME:
        if sname in stem:
            return sname, STAGE_BY_NAME[sname]
    return None, None


def render_region(stage_name: str, stage_info: dict | None) -> str:
    blocks = (
        ENTRY_BLOCK
        + "\n"
        + hand_off_block(stage_name, stage_info)
        + "\n"
        + workflow_slice_block(stage_name, stage_info)
    )
    return f"{BEGIN}\n{blocks}\n{END}\n"


def current_region(text: str) -> str | None:
    """The generated region as it stands in the file, or None."""
    if BEGIN in text and END in text:
        start = text.index(BEGIN)
        stop = text.index(END) + len(END)
        return text[start:stop]
    # A file written before the region was delimited: the block runs from the
    # entry heading to the end of the file.
    if ENTRY_HEADING in text:
        start = text.index(ENTRY_HEADING)
        return text[start:].rstrip("\n")
    return None


def apply_region(text: str, region: str) -> str:
    existing = current_region(text)
    if existing is None:
        prefix = text.rstrip("\n")
        return (prefix + "\n\n" if prefix else "") + region
    start = text.index(existing)
    before = text[:start].rstrip("\n")
    after = text[start + len(existing):].lstrip("\n")
    head = (before + "\n\n") if before else ""
    tail = ("\n" + after) if after else "\n"
    return head + region.rstrip("\n") + "\n" + tail


def main() -> int:
    check = "--check" in sys.argv
    skills_dir = ROOT / "skills"
    targets = sorted(
        p for p in skills_dir.glob("stelow-*/SKILL.md")
        if p.parent.name not in CONTROL_PLANE
    )
    drifted: list[str] = []
    for path in targets:
        text = path.read_text()
        skill_name = path.parent.name
        # description is the first 'description:' block in the frontmatter
        desc_match = __import__("re").search(r"description:\s*\n((?:\s+.*\n)+?)\n\S", text)
        description = (desc_match.group(1).strip() if desc_match else "")[:200]
        stage_name, stage_info = detect_stage(skill_name, description)
        region = render_region(stage_name or skill_name, stage_info)
        existing = current_region(text)
        if existing == region.rstrip("\n"):
            continue
        drifted.append(f"{path.relative_to(ROOT)} (stage={stage_name or 'generic'})")
        if not check:
            path.write_text(apply_region(text, region))
    if drifted:
        verb = "stale" if check else "rewrote"
        print(f"scope3_blocks: {verb} {len(drifted)} skill block(s):", file=sys.stderr)
        for item in drifted:
            print(f"  {item}", file=sys.stderr)
        if check:
            print("scope3_blocks: run `python3 scripts/scope3_blocks.py` to regenerate", file=sys.stderr)
            return 1
    else:
        print(f"scope3_blocks: ok ({len(targets)} skills)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
