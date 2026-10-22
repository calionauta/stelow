/**
 * The affordance checks, as executable rules.
 *
 * Ryan Singer's breadboarding skill states the failure modes a map hides when
 * it is written from memory. They are good rules — but a rule that lives only
 * in prose is a rule the writer can forget, and the whole point of a map is
 * that it is checkable. So they live here too: the same checks, machine-run.
 *
 * Each check returns the affordances it flagged, not a boolean. "Which display
 * has no source?" is a question the writer can act on; "invalid" is not.
 *
 * ## One direction, stated once
 *
 * The two wiring fields are directional and the direction is not symmetric:
 *
 *   wiresOut  — this affordance triggers that one (control flow)
 *   returnsTo — this affordance's output flows to that one (data flow)
 *
 * So a display is fed by an INCOMING wire, and a store is read by its own
 * OUTGOING return. Reading the arrows the other way round still "passes"
 * whenever a map happens to wire both ways, which is exactly how a map can
 * look complete and say nothing.
 *
 * ## Two kinds of finding
 *
 *   error — the map is wrong. An id nobody declares, a duplicate, a kind that
 *           contradicts its prefix. No judgement is needed to agree with it.
 *   gap   — the map is incomplete in a way only the writer can resolve. A
 *           display with nothing feeding it looks exactly like a display whose
 *           source was forgotten.
 *
 * The split is what makes `--strict` usable: it refuses the first kind, and
 * reports the second.
 */
import { wiringReport } from "./breadboard-mermaid.mjs";

const KIND_BY_PREFIX = { U: "ui", N: "code", S: "store" };

function finding(item, reason) {
  return { id: item.id, name: item.name, reason };
}

/** The id prefix is how every table, diagram, and reader tells kinds apart. */
function kindOfId(id) {
  if (typeof id !== "string") return null;
  if (id.startsWith("_")) return "ui"; // a place reference renders in the parent place
  return KIND_BY_PREFIX[id[0]] ?? null;
}

/** Two affordances sharing an id merge into one node in every view. */
export function checkIdsUnique(breadboard) {
  const seen = new Map();
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    if (seen.has(item.id)) {
      flagged.push(finding(item, `shares its id with ${seen.get(item.id)}, so every view merges two affordances into one`));
      continue;
    }
    seen.set(item.id, item.name);
  }
  return flagged;
}

/** `kind` is what the checks and the diagram act on; the id prefix must agree. */
export function checkIdKindMatches(breadboard) {
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    const expected = kindOfId(item.id);
    if (expected && item.kind !== expected) {
      flagged.push(finding(item, `is kind "${item.kind}" but its id says "${expected}" — the prefix is what the tables and the diagram divide on`));
    }
  }
  return flagged;
}

/** A wire to an id nobody declares renders a node the map never described. */
export function checkWiringResolves(breadboard) {
  const report = wiringReport(breadboard);
  if (report.dangling.length === 0) return [];

  // Attribute each dangling id to the affordances that wire to it, so the
  // finding names an actionable row instead of only a missing id.
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    const missing = [...(item.wiresOut ?? []), ...(item.returnsTo ?? [])].filter((target) =>
      report.dangling.includes(target),
    );
    if (missing.length > 0) {
      flagged.push(finding(item, `wires to ${missing.join(", ")}, which the map never declares`));
    }
  }
  return flagged;
}

/**
 * Navigation wires to the Place it lands in. Wiring to a UI affordance inside
 * another place hides the fact that the whole screen changed — the place is
 * the destination.
 *
 * Only a wire to a UI affordance counts. A code affordance calling one in
 * another place is a CALL, not navigation: the frontend handler calling the
 * backend resolver does not move the user, and flagging it would make the
 * check fire on every map that spans more than one system.
 */
export function checkNavigationLandsOnPlaces(breadboard) {
  const placeIds = new Set((breadboard.places ?? []).map((place) => place.id));
  const byId = new Map((breadboard.affordances ?? []).map((item) => [item.id, item]));

  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    for (const target of item.wiresOut ?? []) {
      if (placeIds.has(target)) continue;
      const targetAffordance = byId.get(target);
      if (!targetAffordance || targetAffordance.kind !== "ui") continue;
      // A wire to a UI affordance in the SAME place is local interaction,
      // which is fine. One behind another place boundary is navigation
      // written as containment.
      if (targetAffordance.place !== item.place) {
        flagged.push(
          finding(
            item,
            `wires to ${target} in place ${targetAffordance.place}, but reaching a screen is navigation — wire to ${targetAffordance.place} itself`,
          ),
        );
      }
    }
  }
  return flagged;
}

/** An affordance in a place the map never declares is a hole in the map. */
export function checkAffordancesHaveDeclaredPlace(breadboard) {
  const placeIds = new Set((breadboard.places ?? []).map((place) => place.id));
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    if (!placeIds.has(item.place)) {
      flagged.push(finding(item, `belongs to place ${item.place}, which the map never declares`));
    }
  }
  return flagged;
}

/**
 * Every display is fed by something. The wire arrives from the source, so the
 * display is the TARGET of a `returnsTo` (a store or query returning data) or
 * of a `wiresOut` (control that renders it). A display nothing points at
 * means either the source is missing from the map, or the display is not real.
 */
export function checkDisplaysHaveSource(breadboard) {
  const affordances = breadboard.affordances ?? [];
  const fed = new Set();
  for (const item of affordances) {
    for (const target of [...(item.wiresOut ?? []), ...(item.returnsTo ?? [])]) {
      // A self-reference is not a source: it is the map talking to itself.
      if (target !== item.id) fed.add(target);
    }
  }

  const flagged = [];
  for (const item of affordances) {
    if (item.kind !== "ui" || item.control !== "render") continue;
    if (!fed.has(item.id)) {
      flagged.push(
        finding(
          item,
          "a display with nothing feeding it — either the source is missing from the map, or this affordance is not real",
        ),
      );
    }
  }
  return flagged;
}

/**
 * Every code affordance connects: it wires out, returns to, or something wires
 * into it. An affordance somebody wires into is connected even when it wires
 * nowhere itself — the last call in a chain is a leaf, not dead code.
 */
export function checkCodeAffordancesConnect(breadboard) {
  const targeted = new Set();
  for (const item of breadboard.affordances ?? []) {
    for (const target of item.wiresOut ?? []) targeted.add(target);
    for (const target of item.returnsTo ?? []) targeted.add(target);
  }

  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    if (item.kind !== "code") continue;
    const wires = (item.wiresOut ?? []).length;
    const returns = (item.returnsTo ?? []).length;
    if (wires === 0 && returns === 0 && !targeted.has(item.id)) {
      flagged.push(
        finding(
          item,
          "a code affordance with no wire out, no return to, and nothing wiring into it — it is disconnected, so it is either dead code or missing wiring",
        ),
      );
    }
  }
  return flagged;
}

/**
 * Every store is read by something. Reading is the store's own `returnsTo`:
 * the data flows OUT of the store to whoever consumes it. A store with no
 * return is state that does not matter yet, or a reader missing from the map.
 */
export function checkStoresAreRead(breadboard) {
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    if (item.kind !== "store") continue;
    if ((item.returnsTo ?? []).length === 0) {
      flagged.push(
        finding(
          item,
          "a store nothing reads — no affordance receives its data, so it is unused state or its reader is missing from the map",
        ),
      );
    }
  }
  return flagged;
}

/**
 * A code affordance names something you can point at. "DATABASE" is not a
 * name; `userRepo.save()` is. The check is deliberately simple — it looks for
 * the shape of a placeholder rather than trying to know every codebase's
 * vocabulary.
 */
const PLACEHOLDER_NAMES = new Set([
  "database", "db", "api", "service", "backend", "frontend", "store", "data",
  "server", "client", "handler", "logic", "helper", "util", "utils", "model",
  "component", "module", "system", "thing", "stuff", "tbd", "todo", "n/a", "na",
]);

export function checkNamesAreReal(breadboard) {
  const flagged = [];
  for (const item of breadboard.affordances ?? []) {
    if (item.kind !== "code") continue;
    const bare = item.name
      .replace(/\(\s*\)$/, "")
      .replace(/\(\)$/, "")
      .trim()
      .toLowerCase();
    if (PLACEHOLDER_NAMES.has(bare)) {
      flagged.push(
        finding(item, "names an abstraction instead of a thing you can point at — use the real method or property name"),
      );
    }
  }
  return flagged;
}

/**
 * All the checks, in the order they are reported, each carrying how much it
 * costs to ignore:
 *
 *   error — the map contradicts itself or its contract (refused by --strict)
 *   gap   — the map may be incomplete (reported, the writer decides)
 */
export const CHECKS = [
  { name: "ids are unique", severity: "error", run: checkIdsUnique },
  { name: "id prefix matches kind", severity: "error", run: checkIdKindMatches },
  { name: "wiring resolves", severity: "error", run: checkWiringResolves },
  { name: "affordance has a declared place", severity: "error", run: checkAffordancesHaveDeclaredPlace },
  { name: "navigation lands on a place", severity: "error", run: checkNavigationLandsOnPlaces },
  { name: "display has a source", severity: "gap", run: checkDisplaysHaveSource },
  { name: "code affordance connects", severity: "gap", run: checkCodeAffordancesConnect },
  { name: "store is read by something", severity: "gap", run: checkStoresAreRead },
  { name: "name is a real thing", severity: "gap", run: checkNamesAreReal },
];

/**
 * Every check with its findings, including the ones that found nothing —
 * a check that silently disappears is indistinguishable from a check that
 * passed.
 *
 * @param {object} breadboard the parsed map
 * @returns {{name: string, severity: "error"|"gap", flagged: {id: string, name: string, reason: string}[]}[]}
 */
export function runAffordanceChecks(breadboard) {
  return CHECKS.map(({ name, severity, run }) => ({ name, severity, flagged: run(breadboard) }));
}

/**
 * The checks as one flat list of problems, each carrying which check found it
 * and what it costs.
 *
 * @param {object} breadboard the parsed map
 * @returns {{check: string, severity: "error"|"gap", id: string, name: string, reason: string}[]}
 */
export function collectProblems(breadboard) {
  const problems = [];
  for (const check of runAffordanceChecks(breadboard)) {
    for (const finding of check.flagged) {
      problems.push({ check: check.name, severity: check.severity, ...finding });
    }
  }
  return problems;
}

/** The findings that mean the map is wrong, not merely unfinished. */
export function collectErrors(breadboard) {
  return collectProblems(breadboard).filter((problem) => problem.severity === "error");
}
