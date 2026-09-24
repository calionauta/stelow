#!/usr/bin/env python3
"""Generate host-consumable stage catalog and capability documentation."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
SOURCE = REPO / "skills/stelow-workflow-orchestrator/stages.yaml"
CATALOG = REPO / "skills/stelow-workflow-orchestrator/stage-catalog.json"
CAPABILITIES = REPO / "skills/stelow-workflow-orchestrator/references/capabilities.md"


def load():
    data = yaml.safe_load(SOURCE.read_text())
    if not data:
        raise ValueError("stages.yaml is empty")
    return data


def catalog(data: dict) -> dict:
    stages = []
    for stage in data["stages"]:
        item = dict(stage)
        item["id"] = item.pop("name")
        item["playbook_skill"] = "stelow-workflow-orchestrator" if item["playbook"] and item["playbook"].startswith("stages/") else item["skill"]
        stages.append(item)
    return {
        "version": data["version"],
        "tools": data["tools"],
        "phases": data["phases"],
        "routes": data.get("routes", {}),
        "entry_stages": data.get("routes", {}).get("entry_stages", {}),
        "stages": stages,
    }


def capabilities(data: dict) -> str:
    rows = []
    seen = set()
    for stage in data["stages"]:
        for capability in stage.get("execution", {}).get("required_capabilities", []):
            seen.add((capability, "required"))
        for capability in stage.get("execution", {}).get("preferred_capabilities", []):
            seen.add((capability, "preferred"))
    lines = [
        "# Execution capabilities",
        "",
        "Generated from `stages.yaml`; do not edit this table by hand.",
        "",
        "| Capability | Requirement |",
        "|---|---|",
    ]
    for capability, requirement in sorted(seen):
        lines.append(f"| `{capability}` | {requirement} |")
    if not seen:
        lines.append("| _none_ | _none_ |")
    lines.extend([
        "",
        "Adapters must negotiate these capabilities before selecting a native engine. See `../../../references/execution-contract.md`.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        data = load()
        rendered_catalog = json.dumps(catalog(data), indent=2, ensure_ascii=False) + "\n"
        rendered_capabilities = capabilities(data)
    except (OSError, KeyError, TypeError, ValueError, yaml.YAMLError) as exc:
        print(f"generate-stage-catalog: {exc}", file=sys.stderr)
        return 1
    if args.check:
        stale = []
        for path, rendered in ((CATALOG, rendered_catalog), (CAPABILITIES, rendered_capabilities)):
            if not path.exists() or path.read_text() != rendered:
                stale.append(str(path.relative_to(REPO)))
        if stale:
            print("generate-stage-catalog: stale: " + ", ".join(stale), file=sys.stderr)
            return 1
        print("generate-stage-catalog: ok")
        return 0
    CATALOG.write_text(rendered_catalog)
    CAPABILITIES.write_text(rendered_capabilities)
    print("generate-stage-catalog: wrote stage-catalog.json and references/capabilities.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
