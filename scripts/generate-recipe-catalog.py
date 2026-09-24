#!/usr/bin/env python3
"""Generate the host-readable recipe catalog from the YAML recipes."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
RECIPES = REPO / "recipes"
OUTPUT = REPO / "skills/stelow-workflow-orchestrator/recipe-catalog.json"


def render() -> str:
    recipes = []
    for path in sorted(RECIPES.glob("*.yaml")):
        recipe = yaml.safe_load(path.read_text())
        for task in recipe.get("tasks", []):
            schema_path = task.get("output_schema")
            if schema_path:
                task["output_schema_contract"] = json.loads((REPO / schema_path).read_text())
        recipes.append(recipe)
    return json.dumps({"version": 1, "recipes": recipes}, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != rendered:
            print("generate-recipe-catalog: stale; run python3 scripts/generate-recipe-catalog.py", file=sys.stderr)
            return 1
        print("generate-recipe-catalog: ok")
        return 0
    OUTPUT.write_text(rendered)
    print("generate-recipe-catalog: wrote recipe-catalog.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
