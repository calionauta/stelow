#!/usr/bin/env python3
"""scope3_blocks.py — append the dual-mode contract blocks to every
stelow-product-* / stelow-workflow-* skill (SCOPE-3 deliverable).

Reads stages.yaml for stage metadata, reads each skill's first paragraph to
infer its stage (by filename heuristic + description scan), and appends:

  ## Entry (mode detection)       (boilerplate, identical per skill)
  ## Hand-off (workflow mode)     (per-stage: stage/status/next-candidate/gate/rework-on)
  ### Workflow slice              (per-stage summary)

Idempotent: skips files that already carry the blocks (idempotency header
check on `## Entry (mode detection)`).
"""

from __future__ import annotations
import os, re, sys, glob, pathlib

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

# 1. Read stages.yaml once.
stages_yaml = (ROOT / "skills/stelow-workflow-orchestrator/stages.yaml").read_text()
stages = []
current = None
for line in stages_yaml.splitlines():
    m = re.match(r"^\s*-\s*name:\s*(\S+)", line)
    if m:
        current = {"name": m.group(1), "transitions": {}, "description": ""}
        stages.append(current); continue
    if current is None: continue
    dm = re.match(r"^\s*description:\s*(.*)$", line)
    if dm: current["description"] = dm.group(1).strip().strip('"')
    for k in ("next", "accept", "reject", "rework", "annotate"):
        m = re.match(rf"^\s+{k}:\s*\[([^\]]*)\]", line)
        if m:
            current["transitions"][k] = [x.strip().strip('"') for x in m.group(1).split(",") if x.strip()]
            break

STAGE_BY_NAME = {s["name"]: s for s in stages}

# 2. Map skill directory -> stage (heuristic: filename contains stage, else description).
#    Falls back to a generic template.
STAGE_HINTS = {
    "shape-up": "shape",
    "plan-critique": "plan-gate",
    "ux-critique": "int-gate",
    "tech-planning": "planning",
    "interface-alternatives": "interface",
    "scope-executor": "scope",
    "testing-ai-code": "verification",
    "testing-execution": "verification",
    "execution-critique": "execution",
    "codebase-critique": "diff-gate",
    "discovery": "context",
    "multi-method-market-analysis": "context",
    "job-to-be-done": "context",
    "evolutionary-principles": "context",
    "opportunity-mapping": "triage",
    "ads": "promotions",
    "business-models": "shape",
    "coding-standards": "execution",
    "health": "audit",
    "marketplace-playbook": "shape",
    "open-source": "shape",
    "pricing": "shape",
    "promotions": "shape",
    "trust-building": "shape",
}

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
`references/host-levers.md` for the full marker protocol (SCOPE-9).
"""

def hand_off_block(stage_name: str, stage_info: dict | None) -> str:
    if stage_info is None:
        return f"""## Hand-off (workflow mode)

```
stage          : {stage_name}  (no transitions defined in stages.yaml)
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <next stage from stages.yaml>
gate           : <none|approval-required>
rework-on      : <previous stage if rework path>
```

Workflow mode: emit the above Hand-off block verbatim, then stop.
"""

    trans = stage_info["transitions"]
    next_list = trans.get("next", []) or trans.get("accept", [])
    rework_list = trans.get("rework", []) or trans.get("reject", [])
    next_str = ", ".join(next_list) if next_list else "(terminal)"
    rework_str = ", ".join(rework_list) if rework_list else "(none)"
    gate = "approval-required (visual_review)" if stage_info.get("requires_approval") else "none"
    desc = stage_info.get("description", "").strip().strip('"')
    return f"""## Hand-off (workflow mode)

```
stage          : {stage_name}
description    : {desc[:120]}
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : {next_str}
gate           : {gate}
rework-on      : {rework_str}
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.
"""


def workflow_slice_block(stage_name: str, stage_info: dict | None) -> str:
    if stage_info is None:
        return """### Workflow slice

Standalone (non-workflow) steps are not part of the workflow slice. In
workflow mode this skill emits the Hand-off block and exits.
"""
    desc = stage_info.get("description", "").strip().strip('"')
    primary = stage_info.get("primary_actions", []) or []
    pa = ", ".join(primary) if primary else "read, write"
    return f"""### Workflow slice

Workflow mode for the **{stage_name}** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> {desc[:160]}

Primary actions (per stages.yaml): `{pa}`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.
"""

def detect_stage(skill_name: str, description: str) -> tuple[str | None, dict | None]:
    # strip "stelow-product-" prefix
    stem = skill_name.replace("stelow-product-", "")
    hint = STAGE_HINTS.get(stem)
    if hint:
        return hint, STAGE_BY_NAME.get(hint)
    # try direct match (e.g., "shape" in stem)
    for sname in STAGE_BY_NAME:
        if sname in stem:
            return sname, STAGE_BY_NAME[sname]
    return None, None

def process_skill(path: pathlib.Path) -> str:
    text = path.read_text()
    if "## Entry (mode detection)" in text:
        return "skip-already-has-blocks"
    skill_name = path.parent.name
    # description is the first 'description:' block in the frontmatter
    desc_match = re.search(r"description:\s*\n((?:\s+.*\n)+?)\n\S", text)
    description = (desc_match.group(1).strip() if desc_match else "")[:200]
    stage_name, stage_info = detect_stage(skill_name, description)
    blocks = (
        ENTRY_BLOCK
        + "\n"
        + hand_off_block(stage_name or skill_name, stage_info)
        + "\n"
        + workflow_slice_block(stage_name or skill_name, stage_info)
        + "\n"
    )
    # append after a trailing blank line
    if not text.endswith("\n\n"): text = text.rstrip() + "\n\n"
    text += blocks
    path.write_text(text)
    return f"appended (stage={stage_name or 'generic'})"

def main():
    skills_dir = ROOT / "skills"
    targets = sorted(glob.glob(str(skills_dir / "stelow-*-*/SKILL.md")))
    targets = [t for t in targets if "orchestrator" not in t]
    results = []
    for t in targets:
        try:
            r = process_skill(pathlib.Path(t))
            results.append((t, r))
        except Exception as ex:
            results.append((t, f"ERROR: {ex}"))
    for t, r in results:
        print(f"{r:35} {t}")
    print(f"\n{len(results)} skills processed.")

if __name__ == "__main__":
    main()