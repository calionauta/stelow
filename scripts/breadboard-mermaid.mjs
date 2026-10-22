/**
 * Breadboard → Mermaid serializer.
 *
 * The map is the source of truth; the diagram is a projection of it. This
 * module is the whole projection, and it is deliberately deterministic: the
 * same map always yields byte-identical Mermaid. That is what makes a diff in
 * the diagram mean something — if the serializer reordered its output, every
 * diagram diff would be noise and nobody would read it.
 *
 * Kept apart from the renderer so the interesting half (mapping a graph onto
 * Mermaid syntax) is testable without a browser, a DOM, or a renderer at all.
 */

export const DIAGRAM_KIND = "flowchart";

/**
 * Mermaid node ids cannot start with a digit and cannot contain characters
 * that read as syntax. Ours are `P1`, `U1`, `N1`, `S1` — safe — but a place
 * reference (`_letter-browser`) is not, so ids are rewritten to a stable
 * prefix form.
 */
function nodeId(raw) {
  return raw.replace(/^_/, "ref_").replace(/[^A-Za-z0-9_]/g, "_");
}

/** Escape the characters Mermaid treats as syntax inside a quoted label. */
function label(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "&quot;")
    .replace(/[\r\n]+/g, " ");
}

/**
 * A label is `id: name` so a reader can trace the diagram back to the map
 * without opening the JSON. The id is redundant with the node id on purpose:
 * the diagram is read by people who do not have the map open.
 */
function nodeLabel(affordance) {
  const name = label(affordance.name);
  return `"${affordance.id}: ${name}"`;
}

function placeLabel(place) {
  const parts = [`${place.id}: ${label(place.name)}`];
  if (place.mode) parts.push(`(${label(place.mode)})`);
  return `"${parts.join(" ")}"`;
}

/**
 * The Mermaid source for a breadboard.
 *
 * Shape:
 *   - one subgraph per place, containing its affordances
 *   - control flow as solid arrows
 *   - data flow as dashed arrows
 *   - a navigation wire lands on the place boundary, not on a node inside it
 *
 * @param {object} breadboard the parsed breadboard map
 * @returns {string} Mermaid source
 */
export function toMermaid(breadboard) {
  const places = breadboard.places ?? [];
  const affordances = breadboard.affordances ?? [];

  const lines = [`${DIAGRAM_KIND} TB`];

  // Places, in declaration order, each with the affordances that live in it.
  for (const place of places) {
    const members = affordances.filter((item) => item.place === place.id);
    lines.push(`  subgraph ${nodeId(place.id)}[${placeLabel(place)}]`);
    for (const member of members) {
      // A tentative affordance is dashed, not merely marked: the reader has to
      // see at a glance that this part of the map may not survive the next
      // shaping cycle. The class goes AFTER the label — `id:::class["label"]`
      // is not valid Mermaid.
      const style = member.tentative ? ":::tentative" : "";
      lines.push(`    ${nodeId(member.id)}[${nodeLabel(member)}]${style}`);
    }
    lines.push("  end");
  }

  // Affordances whose place is not a declared place would be invisible inside
  // a subgraph; they are emitted at the top level so the map never hides one.
  const placeIds = new Set(places.map((place) => place.id));
  for (const item of affordances) {
    if (placeIds.has(item.place)) continue;
    const style = item.tentative ? ":::tentative" : "";
    lines.push(`  ${nodeId(item.id)}[${nodeLabel(item)}]${style}`);
  }

  // Control flow: solid arrows. Data flow: dashed arrows.
  const edges = [];
  for (const item of affordances) {
    for (const target of item.wiresOut ?? []) {
      edges.push(`  ${nodeId(item.id)} --> ${nodeId(target)}`);
    }
    for (const target of item.returnsTo ?? []) {
      edges.push(`  ${nodeId(item.id)} -.-> ${nodeId(target)}`);
    }
  }
  lines.push(...edges);

  // Style last: Mermaid applies class definitions to the nodes that used
  // them, so the definition has to appear in the source.
  if (affordances.some((item) => item.tentative)) {
    lines.push("  classDef tentative stroke-dasharray:5 5,stroke-opacity:.7");
  }

  return lines.join("\n") + "\n";
}

/**
 * Every id the map declares, so a caller can check the wiring for dangling
 * references before handing it to a renderer. A wire to an id that does not
 * exist renders as a node the map never described — a silent hole.
 *
 * @param {object} breadboard the parsed breadboard map
 * @returns {{known: Set<string>, referenced: Set<string>, dangling: string[]}}
 */
export function wiringReport(breadboard) {
  const known = new Set();
  for (const place of breadboard.places ?? []) known.add(place.id);
  for (const item of breadboard.affordances ?? []) known.add(item.id);

  const referenced = new Set();
  for (const item of breadboard.affordances ?? []) {
    for (const target of item.wiresOut ?? []) referenced.add(target);
    for (const target of item.returnsTo ?? []) referenced.add(target);
  }

  const dangling = [...referenced].filter((id) => !known.has(id)).sort();
  return { known, referenced, dangling };
}
