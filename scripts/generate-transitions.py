#!/usr/bin/env python3
"""Generate transitions.md from stages.yaml (single source of truth).

Usage:
  python3 scripts/generate-transitions.py           # rewrite transitions.md
  python3 scripts/generate-transitions.py --check   # CI gate: exit 1 on drift

What is generated vs curated (see transitions.template.md banner):
  - GENERATED: {{STAGE_ORDER}} rows, {{TRANSITIONS:<stage>:<verb>}} lines
    for next/accept/reject/rework/annotate, {{REWORK:<stage>}} lines,
    {{ARTIFACTS:<stage>}} lines, and {{INTENT:<intent>}} route lines.
  - CURATED (pass through verbatim): gate prose, (none) lines, gate-condition
    table, all headers.

Every layer the runtime PARSES is generated. The helper reads the intent
route and the rework edges out of this file, so a layer that lived only in the
template was a second owner of a fact `stages.yaml` already declared: editing
`routes.intents` changed the published catalog and left the enforced mirror
byte-identical, with a green CI.
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

VERB_ORDER = ("next", "accept", "reject", "rework", "annotate")


def load_stages(path):
    try:
        with open(path) as handle:
            data = yaml.safe_load(handle)
    except (OSError, yaml.YAMLError) as exc:
        print(f"generate-transitions: cannot read {path}: {exc}", file=sys.stderr)
        sys.exit(1)
    stages = data.get("stages") or []
    if not stages:
        print("generate-transitions: no stages in stages.yaml", file=sys.stderr)
        sys.exit(2)
    return stages, data


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
    stages, data = load_stages(STAGES_YAML)
    by_name = {s["name"]: s for s in stages}
    routes = data.get("routes") or {}
    intents = routes.get("intents") or {}
    review_modes = routes.get("review_modes") or {}
    if not review_modes:
        print("generate-transitions: stages.yaml declares no review_modes", file=sys.stderr)
        sys.exit(1)
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
        marker = re.fullmatch(r"\{\{ARTIFACTS:([a-z][a-z0-9-]*)\}\}", stripped)
        if marker:
            name = marker.group(1)
            if name not in by_name:
                print(f"generate-transitions: template references unknown stage '{name}'", file=sys.stderr)
                sys.exit(1)
            for artifact in by_name[name].get("artifacts", []):
                out.append(f"artifact:   {artifact}")
            continue
        marker = re.fullmatch(r"\{\{TRANSITIONS:([a-z][a-z0-9-]*):(next|accept|reject|rework|annotate)\}\}", stripped)
        if marker:
            name, verb = marker.group(1), marker.group(2)
            if name not in by_name:
                print(f"generate-transitions: template references unknown stage '{name}'", file=sys.stderr)
                sys.exit(2)
            values = (by_name[name].get("transitions") or {}).get(verb) or []
            if values:
                out.append(f"{verb + ':':<11}{', '.join(values)}")
            continue
        # The rework edge. The runtime reads `rework:` out of this file, so it
        # is generated: a stage whose rework edge lives only in the template is
        # a second owner of a fact `stages.yaml` declares, and the two can
        # disagree with a green CI.
        marker = re.search(r"\{\{REWORK:([a-z][a-z0-9-]*)\}\}", line)
        if marker:
            name = marker.group(1)
            if name not in by_name:
                print(f"generate-transitions: template references unknown stage '{name}'", file=sys.stderr)
                sys.exit(1)
            values = (by_name[name].get("transitions") or {}).get("rework") or []
            expanded = f"rework:    {', '.join(values)}" if values else "rework:    (none)"
            out.append(line.replace(marker.group(0), expanded))
            continue
        # The intent route. The runtime reads `**<intent>:**` out of this file
        # to scope which stage a workflow may reach, so the route is generated
        # from `routes.intents` — the same list the published catalog carries.
        marker = re.search(r"\{\{INTENT:([a-z][a-z0-9-]*)\}\}", line)
        if marker:
            intent = marker.group(1)
            route = intents.get(intent)
            if not route:
                print(f"generate-transitions: stages.yaml declares no route for intent '{intent}'", file=sys.stderr)
                sys.exit(1)
            out.append(line.replace(marker.group(0), f"**{intent}:** " + " → ".join(route)))
            continue
        # The review-mode layer. The helper PARSES this block: the skipped set
        # decides which stages do not run (it refuses to enter one and lets
        # the predecessor move straight to the successor), and the
        # no-human-wait set decides which stages run without parking for a
        # person. Both used to be hardcoded in the helper's `case` statement
        # and hand-tabulated in this template — three owners of one fact.
        if stripped == "{{REVIEW_MODES}}":
            out.extend(review_mode_block(review_modes))
            continue
        # The per-gate mode prose ("Only in:" / "Skipped in:"), rendered from
        # the same data so the gate block cannot disagree with the table.
        marker = re.fullmatch(r"\{\{GATE_MODES:([a-z][a-z0-9-]*)\}\}", stripped)
        if marker:
            name = marker.group(1)
            if name not in by_name:
                print(f"generate-transitions: template references unknown stage '{name}'", file=sys.stderr)
                sys.exit(1)
            out.extend(gate_mode_lines(name, review_modes))
            continue
        # The gate-condition table, rendered from the same data.
        if stripped == "{{REVIEW_MODE_TABLE}}":
            out.extend(review_mode_table(review_modes))
            continue
        out.append(line)
    return "\n".join(out) + "\n"


def modes_where(review_modes, stage, key):
    """The modes that place `stage` under `key`, in declaration order."""
    return [mode for mode, spec in review_modes.items() if stage in (spec.get(key) or [])]


def quote_all(names):
    return ", ".join(f'"{name}"' for name in names)


def review_mode_block(review_modes):
    """The machine-readable review-mode block the helper parses.

    One `review_mode:` header per mode, then its two skip lists. The helper
    reads the skip sets out of this file, so the file is the only place the
    helper's rule and the published catalog can both come from.
    """
    out = [
        "<!-- generated from stages.yaml routes.review_modes — do not edit -->",
        "",
        "The helper parses this block. `skipped` stages DO NOT RUN in that",
        "review mode: entering one is refused, and the predecessor moves",
        "straight to the successor. `no_human_wait` stages DO run, but never",
        "park for a person — the agent decides and records the receipt.",
    ]
    for mode, spec in review_modes.items():
        out.append("")
        out.append(f"review_mode: {mode}")
        skipped = spec.get("skipped") or []
        no_human_wait = spec.get("no_human_wait") or []
        out.append(f"skipped:    {', '.join(skipped) if skipped else '(none)'}")
        out.append(f"no_human_wait: {', '.join(no_human_wait) if no_human_wait else '(none)'}")
    return out


def gate_mode_lines(stage, review_modes):
    """The "Only in:" / "Skipped in:" prose inside a gate block."""
    skipped_in = modes_where(review_modes, stage, "skipped")
    no_human = modes_where(review_modes, stage, "no_human_wait")
    out = []
    if skipped_in:
        only_in = [mode for mode in review_modes if mode not in skipped_in]
        out.append(f"           Only in: {quote_all(only_in)}")
        out.append(f"           Skipped in: {quote_all(skipped_in)}")
    if no_human:
        out.append(f"           No human wait in: {quote_all(no_human)}")
    return out


def review_mode_table(review_modes):
    """The gate-condition table, rendered from the same data as the block."""
    out = [
        "| Stage | review_mode | Blocked? | Gate rule |",
        "|---|---|---|---|",
        "| context | all | see `context:5` | `context:5` is canonical: it decides skip, reduced ask, or full ask from quality and intent. |",
        "| gate | all | block | `requires_approval: true`, `visual_review` required |",
        "| int-gate | all | block | `requires_approval: true`, `visual_review` required |",
    ]
    # Every stage any mode skips — derived from the data, never a hand-typed
    # list of gate names. A mode that skips a stage nobody listed still gets
    # a row.
    skipped_stages = []
    for spec in review_modes.values():
        for stage in spec.get("skipped") or []:
            if stage not in skipped_stages:
                skipped_stages.append(stage)
    for stage in skipped_stages:
        for mode, spec in review_modes.items():
            if stage in (spec.get("skipped") or []):
                out.append(f"| {stage} | {mode} | skip | skipped; the predecessor moves straight to the successor |")
            else:
                out.append(f"| {stage} | {mode} | block | `requires_approval: true`, `visual_review` required |")
    for mode, spec in review_modes.items():
        for stage in (spec.get("no_human_wait") or []):
            out.append(f"| {stage} | {mode} | agent decides | the stage runs, but nobody is asked to pick (see `human-gates.md`) |")
    return out


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
