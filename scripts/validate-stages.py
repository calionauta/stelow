#!/usr/bin/env python3
"""Validate canonical stages, recipes, and skill execution frontmatter."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml
try:
    from jsonschema import Draft202012Validator
except ImportError as exc:
    raise SystemExit("validate-stages: jsonschema required (python3 -m pip install jsonschema pyyaml)") from exc

REPO = Path(__file__).resolve().parent.parent
STAGES = REPO / "skills/stelow-workflow-orchestrator/stages.yaml"
RECIPES = REPO / "recipes"
CAPABILITIES = {
    "fanout", "pipeline", "structured-output", "durable-run", "resume", "cancel",
    "status", "hidden-workers", "human-input", "per-call-model",
    "per-call-permission", "isolated-workspace", "file-claims",
}
MODES = {"direct", "hybrid", "orchestrated"}
WRITES = {"none", "artifact", "state", "workspace"}
PARTITIONS = {"none", "dependencies", "target-files", "transitive-impact", "custom"}
SLUG = re.compile(r"^[a-z][a-z0-9-]*$")

# The verbs the helper parses out of the transitions mirror. A verb outside
# this set is a typo, and a typo used to vanish: the generator emitted no
# line for it, the mirror stayed byte-identical, and the stage lost an edge
# with a green CI.
TRANSITION_VERBS = {"next", "accept", "reject", "rework", "annotate"}


def recipe_conditions() -> set[str]:
    """The recipe condition vocabulary, read from the schema that owns it.

    `recipes.schema.json` is the single declaration of which `when` values
    exist. The host that evaluates them reads the same file, so a condition
    added here is a condition the host has not implemented yet — and the host's
    own drift gate fails on that. A second list in this script would be a
    second owner of the same vocabulary, which is how the three host copies
    drifted apart in the first place.
    """
    try:
        schema = json.loads((REPO / "recipes.schema.json").read_text())
        declared = schema["$defs"]["condition"]["enum"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
        fail(f"recipes.schema.json: cannot read the condition vocabulary: {exc}")
    if not isinstance(declared, list) or not declared or not all(isinstance(value, str) for value in declared):
        fail("recipes.schema.json: $defs.condition.enum must be a non-empty list of strings")
    return set(declared)


def fail(message: str) -> None:
    raise ValueError(message)


def load_yaml(path: Path):
    try:
        return yaml.safe_load(path.read_text())
    except (OSError, yaml.YAMLError) as exc:
        fail(f"{path}: cannot read YAML: {exc}")


def validate_schema(instance, schema_path: Path, label: str) -> None:
    try:
        schema = json.loads(schema_path.read_text())
        errors = sorted(Draft202012Validator(schema).iter_errors(instance), key=lambda error: list(error.path))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{label}: cannot read schema {schema_path}: {exc}")
    if errors:
        error = errors[0]
        location = ".".join(str(part) for part in error.path) or "<root>"
        fail(f"{label}: schema violation at {location}: {error.message}")


def validate_path(value, field: str) -> None:
    if not isinstance(value, str) or value.startswith("/") or ".." in Path(value).parts:
        fail(f"{field} must be a safe relative path")


def load_recipes() -> dict[str, dict]:
    recipes: dict[str, dict] = {}
    for path in sorted(RECIPES.glob("*.yaml")):
        recipe = load_yaml(path)
        validate_schema(recipe, REPO / "recipes.schema.json", f"recipe {path.stem}")
        if not isinstance(recipe, dict) or recipe.get("id") != path.stem:
            fail(f"{path}: recipe id must match filename")
        if recipe["id"] in recipes:
            fail(f"duplicate recipe {recipe['id']}")
        recipes[recipe["id"]] = recipe
    for recipe_id, recipe in recipes.items():
        for supporting in recipe.get("supporting_recipes", []):
            if supporting not in recipes:
                fail(f"recipe {recipe_id}: unknown supporting recipe {supporting}")
    return recipes


def validate_recipe(recipe_id: str, recipe: dict, conditions: set[str]) -> None:
    if recipe.get("skill") and not (REPO / "skills" / recipe["skill"] / "SKILL.md").is_file():
        fail(f"recipe {recipe_id}: missing skill {recipe['skill']}")
    if recipe.get("mode") not in MODES:
        fail(f"recipe {recipe_id}: invalid mode")
    if recipe.get("write_policy") not in WRITES:
        fail(f"recipe {recipe_id}: invalid write_policy")
    if recipe.get("partition") not in PARTITIONS:
        fail(f"recipe {recipe_id}: invalid partition")
    if recipe.get("permission_profile") not in {"inherit", "per-call", "host-preset"}:
        fail(f"recipe {recipe_id}: invalid permission_profile")
    for field in ("required_capabilities", "preferred_capabilities"):
        values = recipe.get(field, [])
        if not isinstance(values, list) or len(values) != len(set(values)) or any(value not in CAPABILITIES for value in values):
            fail(f"recipe {recipe_id}: invalid {field}")
    fallback = recipe.get("fallback")
    if not isinstance(fallback, dict) or fallback.get("mode") not in {"sequential", "refuse"} or not isinstance(fallback.get("preserves"), list):
        fail(f"recipe {recipe_id}: invalid fallback")
    tasks = recipe.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        fail(f"recipe {recipe_id}: tasks must be a non-empty list")
    ids: set[str] = set()
    dependencies: dict[str, list[str]] = {}
    for task in tasks:
        task_id = task.get("id") if isinstance(task, dict) else None
        if not isinstance(task_id, str) or not SLUG.fullmatch(task_id) or task_id in ids:
            fail(f"recipe {recipe_id}: invalid or duplicate task id {task_id!r}")
        ids.add(task_id)
        if not isinstance(task.get("skill"), str) or not (REPO / "skills" / task["skill"] / "SKILL.md").is_file():
            fail(f"recipe {recipe_id}/{task_id}: unknown skill")
        requirements = task.get("requirements", [])
        if not isinstance(requirements, list) or len(requirements) != len(set(requirements)) or any(value not in CAPABILITIES for value in requirements):
            fail(f"recipe {recipe_id}/{task_id}: invalid task requirements")
        if task.get("failure_policy") not in {"fail", "skip-with-reason"}:
            fail(f"recipe {recipe_id}/{task_id}: invalid failure_policy")
        if task.get("human_boundary") not in {"none", "coordinator"}:
            fail(f"recipe {recipe_id}/{task_id}: invalid human_boundary")
        if not isinstance(task.get("when"), str) or not task["when"]:
            fail(f"recipe {recipe_id}/{task_id}: when is required")
        elif task["when"] not in conditions:
            fail(
                f"recipe {recipe_id}/{task_id}: unknown condition {task['when']!r}; "
                f"known conditions are {sorted(conditions)}"
            )
        deps = task.get("depends_on", [])
        if not isinstance(deps, list) or any(not isinstance(dep, str) for dep in deps):
            fail(f"recipe {recipe_id}/{task_id}: depends_on must be a string list")
        dependencies[task_id] = deps
        if task.get("output_schema") is not None:
            validate_path(task["output_schema"], f"recipe {recipe_id}/{task_id}.output_schema")
            if not (REPO / task["output_schema"]).is_file():
                fail(f"recipe {recipe_id}/{task_id}: missing output schema {task['output_schema']}")
        if task.get("output") is not None:
            validate_path(task["output"], f"recipe {recipe_id}/{task_id}.output")
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(task_id: str) -> None:
        if task_id in visiting:
            fail(f"recipe {recipe_id}: circular dependency at {task_id}")
        if task_id in visited:
            return
        visiting.add(task_id)
        for dependency in dependencies[task_id]:
            if dependency not in dependencies:
                fail(f"recipe {recipe_id}/{task_id}: unknown dependency {dependency}")
            visit(dependency)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in dependencies:
        visit(task_id)


def frontmatter(path: Path) -> dict:
    lines = path.read_text().splitlines()
    if not lines or lines[0] != "---":
        fail(f"{path}: missing YAML frontmatter")
    try:
        end = lines.index("---", 1)
    except ValueError:
        fail(f"{path}: unterminated frontmatter")
    data = yaml.safe_load("\n".join(lines[1:end]))
    if not isinstance(data, dict):
        fail(f"{path}: frontmatter must be a mapping")
    return data


def validate_skill(path: Path, recipe_ids: set[str]) -> None:
    data = frontmatter(path)
    name = data.get("name")
    metadata = data.get("metadata")
    if not isinstance(name, str) or not name.startswith("stelow-"):
        fail(f"{path}: invalid skill name")
    if not isinstance(metadata, dict) or not isinstance(metadata.get("category"), str):
        fail(f"{path}: metadata.category is required")
    execution = metadata.get("execution")
    if not isinstance(execution, dict):
        fail(f"{path}: metadata.execution is required")
    unknown = set(execution) - {"mode", "recipe", "recipes", "capabilities", "write_policy", "permission_profile"}
    if unknown:
        fail(f"{path}: unknown execution metadata {sorted(unknown)}")
    mode = execution.get("mode")
    if mode not in MODES | {"reference"}:
        fail(f"{path}: invalid execution mode {mode}")
    if execution.get("write_policy") is not None and execution["write_policy"] not in WRITES:
        fail(f"{path}: invalid execution write_policy")
    caps = execution.get("capabilities", [])
    if not isinstance(caps, list) or any(cap not in CAPABILITIES for cap in caps):
        fail(f"{path}: unknown execution capability")
    recipes = execution.get("recipes", [])
    if execution.get("recipe") is not None:
        recipes = [execution["recipe"], *recipes]
    if not isinstance(recipes, list) or any(recipe not in recipe_ids for recipe in recipes):
        fail(f"{path}: execution references an unknown recipe")


def validate_stages() -> dict:
    data = load_yaml(STAGES)
    validate_schema(data, REPO / "skills/stelow-workflow-orchestrator/stages.schema.json", "stages.yaml")
    if not isinstance(data, dict) or data.get("version") != 2:
        fail("stages.yaml: version must be 2")
    phases = data.get("phases")
    if not isinstance(phases, list) or not phases:
        fail("stages.yaml: phases are required")
    phase_ids = {phase.get("id") for phase in phases if isinstance(phase, dict)}
    if len(phase_ids) != len(phases) or any(not SLUG.fullmatch(p) for p in phase_ids if p):
        fail("stages.yaml: invalid or duplicate phase")
    recipes = load_recipes()
    conditions = recipe_conditions()
    for recipe_id, recipe in recipes.items():
        validate_recipe(recipe_id, recipe, conditions)
    stages = data.get("stages")
    if not isinstance(stages, list) or not stages:
        fail("stages.yaml: stages are required")
    names: set[str] = set()
    orders: set[int] = set()
    for stage in stages:
        name = stage.get("name")
        if not isinstance(name, str) or not SLUG.fullmatch(name) or name in names:
            fail(f"stages.yaml: invalid or duplicate stage {name!r}")
        names.add(name)
    for stage in stages:
        name = stage["name"]
        if not isinstance(stage.get("order"), int) or stage["order"] in orders:
            fail(f"stage {name}: invalid or duplicate order")
        orders.add(stage["order"])
        if stage.get("phase") not in phase_ids:
            fail(f"stage {name}: unknown phase {stage.get('phase')}")
        skill = stage.get("skill")
        if not isinstance(skill, str) or not (REPO / "skills" / skill / "SKILL.md").is_file():
            fail(f"stage {name}: missing owner skill {skill}")
        execution = stage.get("execution")
        if not isinstance(execution, dict) or execution.get("mode") not in MODES:
            fail(f"stage {name}: invalid execution profile")
        if execution.get("write_policy") not in WRITES or execution.get("partition") not in PARTITIONS:
            fail(f"stage {name}: invalid execution write/partition policy")
        for field in ("required_capabilities", "preferred_capabilities"):
            values = execution.get(field, [])
            if not isinstance(values, list) or len(values) != len(set(values)) or any(v not in CAPABILITIES for v in values):
                fail(f"stage {name}: invalid {field}")
        recipe = execution.get("recipe")
        if recipe is not None and recipe not in recipes:
            fail(f"stage {name}: missing recipe {recipe}")
        if execution.get("mode") == "direct" and recipe is not None:
            fail(f"stage {name}: direct stages cannot require a recipe")
        if recipe is not None and recipes[recipe].get("skill") != skill:
            fail(
                f"stage {name}: recipe {recipe} runs skill {recipes[recipe].get('skill')!r}, but this stage "
                f"is owned by {skill!r} — the recipe and the stage name two different owners"
            )
        for verb, targets in (stage.get("transitions") or {}).items():
            if verb not in TRANSITION_VERBS:
                fail(
                    f"stage {name}: unknown transition verb {verb!r}; the verbs are {sorted(TRANSITION_VERBS)}"
                )
            if not isinstance(targets, list) or any(target not in names for target in targets):
                fail(f"stage {name}: transition {verb} has an unknown target")
        playbook = stage.get("playbook")
        if playbook is not None:
            validate_path(playbook, f"stage {name}.playbook")
            candidates = [REPO / "skills" / skill / playbook, REPO / "skills" / playbook, REPO / "skills/stelow-workflow-orchestrator" / playbook]
            if not any(candidate.is_file() for candidate in candidates):
                fail(f"stage {name}: missing playbook {playbook}")
    for intent, route in (data.get("routes", {}).get("intents", {}) or {}).items():
        if any(target not in names for target in route):
            fail(f"route {intent}: unknown stage")
    for mode, route in (data.get("routes", {}).get("review_modes", {}) or {}).items():
        # Two kinds of skip, and both lists must be present: a mode that
        # omits one is ambiguous, and the helper would silently enforce the
        # wrong rule for it.
        for key in ("skipped", "no_human_wait"):
            if key not in route:
                fail(f"review route {mode}: missing '{key}' — a review mode declares both "
                     f"(skipped = the stage does not run, no_human_wait = it runs but nobody is asked)")
        for key in ("skipped", "no_human_wait"):
            if any(target not in names for target in route.get(key, [])):
                fail(f"review route {mode}.{key}: unknown stage")
        overlap = set(route.get("skipped", [])) & set(route.get("no_human_wait", []))
        if overlap:
            fail(f"review route {mode}: {', '.join(sorted(overlap))} is both skipped and "
                 f"no_human_wait — a stage either does not run or runs without a human, never both")
    for phase, target in (data.get("routes", {}).get("entry_stages", {}) or {}).items():
        if phase not in phase_ids or target not in names:
            fail(f"entry stage {phase}: unknown phase or stage")
    validate_stage_policies(data.get("routes", {}).get("stage_policies", []) or [], names)
    for path in sorted((REPO / "skills").glob("stelow-*/SKILL.md")):
        validate_skill(path, set(recipes))
    validate_stage_skill_binding(stages, recipes)
    return data


def validate_stage_policies(policies: list[dict], names: set[str]) -> None:
    """A stage policy must name a real stage and a rule the runtime can read.

    The policy is one fact with two faces — the gate that refuses a stage
    which does not run, and the matrix the LLM reads — so a policy that
    names a stage the graph does not have, or a condition the runtime
    cannot evaluate, is a dead rule in one of them.
    """
    known_knobs = {"quality", "review_mode", "exploration_count", "appetite", "intent"}
    seen: set[str] = set()
    for policy in policies:
        identifier = policy.get("id")
        stage = policy.get("stage")
        if not identifier or identifier in seen:
            fail(f"stage policy {identifier!r}: missing or duplicate id")
        seen.add(identifier)
        if stage not in names:
            fail(f"stage policy {identifier}: unknown stage {stage!r}")
        skip = policy.get("skip") or {}
        condition = skip.get("when") or {}
        if skip and not condition:
            fail(f"stage policy {identifier}: a skip rule needs a condition")
        for key in condition.keys():
            if key != "any_of" and key not in known_knobs:
                fail(f"stage policy {identifier}: unknown knob {key!r}")
        for key in (condition.get("any_of") or {}).keys():
            if key not in known_knobs:
                fail(f"stage policy {identifier}: unknown knob {key!r}")
        for key, allowed in (condition.get("any_of") or {}).items():
            if not allowed:
                fail(f"stage policy {identifier}: any_of.{key} allows nothing")
        ask = policy.get("ask") or {}
        for quality, level in ask.items():
            if level not in ("reduced", "full"):
                fail(f"stage policy {identifier}: unknown ask level {level!r}")


def validate_stage_skill_binding(stages: list[dict], recipes: dict[str, dict]) -> None:
    """A skill that owns ONE stage must agree with that stage about the recipe.

    The stage's `execution` block says how the stage runs the skill; the
    skill's frontmatter says how the skill runs. A host reading one and a
    host reading the other must reach the same answer — otherwise the stage
    runs a recipe the skill does not know about, or the skill runs with no
    recipe at all and the stage produces nothing while looking successful.

    The orchestrator is exempt: it hosts many stages and has one frontmatter
    block, so it cannot name ten recipes. Every other single-stage owner has
    exactly one binding and can be held to it.
    """
    owners: dict[str, list[dict]] = {}
    for stage in stages:
        owners.setdefault(stage.get("skill"), []).append(stage)
    for skill, owned in owners.items():
        if len(owned) != 1 or skill == "stelow-workflow-orchestrator":
            continue
        stage = owned[0]
        recipe = (stage.get("execution") or {}).get("recipe")
        path = REPO / "skills" / skill / "SKILL.md"
        if not path.is_file():
            continue
        meta = frontmatter(path)
        declared = (meta.get("metadata", {}).get("execution") or {}).get("recipe")
        if recipe is None:
            if declared is not None:
                fail(
                    f"stage {stage['name']}: skill {skill} declares recipe {declared!r}, but the stage runs no recipe"
                )
            continue
        if declared != recipe:
            fail(
                f"stage {stage['name']}: runs recipe {recipe!r}, but skill {skill} declares "
                f"recipe {declared!r} — the stage and the skill must name the same recipe"
            )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="reserved for CI symmetry; validation is read-only")
    parser.parse_args()
    try:
        validate_stages()
    except ValueError as exc:
        print(f"validate-stages: {exc}", file=sys.stderr)
        return 1
    print("validate-stages: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
