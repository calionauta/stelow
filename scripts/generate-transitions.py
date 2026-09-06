#!/usr/bin/env python3
"""Generate transitions.md from stages.yaml (single source of truth).

Usage:
  python3 scripts/generate-transitions.py           # rewrite transitions.md
  python3 scripts/generate-transitions.py --check   # CI gate: exit 1 on drift

What is generated vs curated (see transitions.template.md banner):
  - GENERATED: {{STAGE_ORDER}} rows and {{TRANSITIONS:<stage>:<verb>}}
    lines for next/accept/reject/annotate (bare token lists only).
  - CURATED (pass through verbatim): gate prose, (none) lines, commented
    rework lines, gate-condition/artifact tables, intent stubs, all headers.
"""
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("generate-transitions: PyYAML required (python3 -c 'import yaml')", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parent.parent
STAGES_YAML = REPO / "skills/stelow-workflow-orchestrator/stages.yaml"
TEMPLATE = REPO / "skills/stelow-workflow-orchestrator/references/transitions.template.md"
OUTPUT = REPO / "skills/stelow-workflow-orchestrator/references/transitions.md"

VERB_ORDER = ("next", "accept", "reject", "annotate")


def load_stages(path):
    with open(path) as handle:
        data = yaml.safe_load(handle)
    stages = data.get("stages") or []
    if not stages:
        print("generate-transitions: no stages in stages.yaml", file=sys.stderr)
        sys.exit(2)
    return stages


def order_rows(stages):
    return [f"| {s['order']} | {s['name']} | {s['description']} |" for s in stages]


def verb_lines(stage):
    transitions = stage.get("transitions") or {}
    lines = []
    for verb in VERB_ORDER:
        values = transitions.get(verb) or []
        if values:
            lines.append(f"{verb + ':':<11}{', '.join(values)}")
    return lines


def render():
    stages = load_stages(STAGES_YAML)
    by_name = {s["name"]: s for s in stages}
    template = TEMPLATE.read_text().split("\n")
    if template and template[-1] == "":
        template.pop()
    out = []
    for line in template:
        if line.startswith("<!-- TEMPLATE:"):
            continue
        stripped = line.strip()
        if stripped == "{{STAGE_ORDER}}":
            out.extend(order_rows(stages))
            continue
        marker = re.fullmatch(r"\{\{TRANSITIONS:([a-z][a-z0-9-]*):(next|accept|reject|annotate)\}\}", stripped)
        if marker:
            name, verb = marker.group(1), marker.group(2)
            if name not in by_name:
                print(f"generate-transitions: template references unknown stage '{name}'", file=sys.stderr)
                sys.exit(2)
            values = (by_name[name].get("transitions") or {}).get(verb) or []
            if values:
                out.append(f"{verb + ':':<11}{', '.join(values)}")
            continue
        out.append(line)
    return "\n".join(out) + "\n"


def main(argv):
    rendered = render()
    if "--check" in argv:
        current = OUTPUT.read_text() if OUTPUT.exists() else ""
        if current != rendered:
            print("generate-transitions: transitions.md is stale — run python3 scripts/generate-transitions.py", file=sys.stderr)
            return 1
        return 0
    OUTPUT.write_text(rendered)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
