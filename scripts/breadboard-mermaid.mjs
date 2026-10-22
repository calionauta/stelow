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
 *
 * ## Visual language
 *
 * A breadboard's three element kinds are not decoration: UI affordances are
 * what the user touches, code affordances are what the code does, and stores
 * hold state. The diagram says so with SHAPE first and colour second:
 *
 *   UI      rectangle          (a thing on the screen)
 *   code    double-bordered    (a function/subroutine)
 *   store   cylinder           (held data)
 *   place   subgraph           (a bounded context of interaction)
 *
 * Shape survives a monochrome print, a theme swap, and a host that ignores
 * classDef; colour is the bonus. Ryan Singer's whiteboard conventions say the
 * same thing with position and colour, because the picture is how a reader
 * checks the map without reading the table.
 */

export const DIAGRAM_KIND = "flowchart";

/** Shape wrapper per kind, in Mermaid's node syntax. */
const SHAPE = {
  ui: (label) => `[${label}]`,
  code: (label) => `[[${label}]]`,
  store: (label) => `[(${label})]`,
};

/**
 * Colour per kind, chosen to stay legible on both a white and a near-black
 * page: classDef cannot use `var(...)` (pele's parser rejects it), so these
 * are literal mid-tones rather than theme-aware tokens.
 */
const KIND_STYLE = {
  ui: ["kindUi", "stroke:#3f8f63"],
  code: ["kindCode", "stroke:#8a63d2"],
  store: ["kindStore", "stroke:#b07d18"],
};

/**
 * Mermaid node ids cannot start with a digit and cannot contain characters
 * that read as syntax. Ours are `P1`, `U1`, `N1`, `S1` — safe — but a place
 * reference (`_letter-browser`) is not, and a subplace (`P2.1`) carries a dot.
 *
 * The rewrite must be INJECTIVE. Mapping `-` to `_` was not: `_a-b` and `_a_b`
 * are two different references, and both became `ref_a_b`, merging two nodes
 * into one in the diagram while the map kept them apart. Everything outside
 * [A-Za-z0-9] is encoded as `_<hex>_` instead, and the encoding is injective
 * because a literal `_` is encoded too — no bare underscore survives except
 * the ones the encoder emits.
 */
function nodeId(raw) {
  const isReference = raw.startsWith("_");
  const body = isReference ? raw.slice(1) : raw;
  const encoded = body.replace(/[^A-Za-z0-9]/g, (character) => `_${character.codePointAt(0).toString(16)}_`);
  // A place reference's leading underscore is structure, not content: it
  // becomes the `ref_` prefix so the node reads as a reference in the source.
  return isReference ? `ref_${encoded}` : encoded;
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
  return `"${affordance.id}: ${label(affordance.name)}"`;
}

function placeLabel(place) {
  const parts = [`${place.id}: ${label(place.name)}`];
  if (place.mode) parts.push(`(${label(place.mode)})`);
  return `"${parts.join(" ")}"`;
}

function nodeLine(item, indent) {
  const shape = SHAPE[item.kind] ?? SHAPE.ui;
  return `${indent}${nodeId(item.id)}${shape(nodeLabel(item))}`;
}

/**
 * The Mermaid source for a breadboard.
 *
 * Shape:
 *   - one subgraph per place, with its subplaces NESTED inside it (containment
 *     is the model's relationship; flat siblings would say a subplace is a
 *     separate screen)
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
  const placeIds = new Set(places.map((place) => place.id));

  // A subplace is `P2.1`; its parent is `P2`. Nesting is decided by id, which
  // is how the map records containment, so the picture cannot disagree with
  // the table about what is inside what.
  const childrenOf = new Map();
  const roots = [];
  for (const place of places) {
    const parentId = place.id.includes(".") ? place.id.slice(0, place.id.indexOf(".")) : null;
    if (parentId && placeIds.has(parentId)) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId).push(place);
    } else {
      roots.push(place);
    }
  }

  const membersOf = (placeId) => affordances.filter((item) => item.place === placeId);
  const lines = [`${DIAGRAM_KIND} TB`];

  const emitPlace = (place, indent) => {
    lines.push(`${indent}subgraph ${nodeId(place.id)}[${placeLabel(place)}]`);
    for (const member of membersOf(place.id)) lines.push(nodeLine(member, indent + "  "));
    for (const child of childrenOf.get(place.id) ?? []) emitPlace(child, indent + "  ");
    lines.push(`${indent}end`);
  };

  for (const place of roots) emitPlace(place, "  ");

  // Affordances whose place is not a declared place would be invisible inside
  // a subgraph; they are emitted at the top level so the map never hides one.
  for (const item of affordances) {
    if (placeIds.has(item.place)) continue;
    lines.push(nodeLine(item, "  "));
  }

  // Control flow: solid arrows. Data flow: dashed arrows. Both read forward:
  // the arrow starts at the affordance the map names first.
  for (const item of affordances) {
    for (const target of item.wiresOut ?? []) {
      lines.push(`  ${nodeId(item.id)} --> ${nodeId(target)}`);
    }
    for (const target of item.returnsTo ?? []) {
      lines.push(`  ${nodeId(item.id)} -.-> ${nodeId(target)}`);
    }
  }

  // Style last, grouped by class so the output is stable: Mermaid has to see
  // a classDef before it can apply, and one `class` line per kind keeps the
  // diff of a one-node change to one line.
  const classLines = [];
  for (const [kind, [className, style]] of Object.entries(KIND_STYLE)) {
    const ids = affordances.filter((item) => item.kind === kind).map((item) => nodeId(item.id));
    if (ids.length === 0) continue;
    classLines.push(`  class ${ids.join(",")} ${className}`);
    classLines.push(`  classDef ${className} ${style}`);
  }
  const tentative = affordances.filter((item) => item.tentative).map((item) => nodeId(item.id));
  if (tentative.length > 0) {
    classLines.push(`  class ${tentative.join(",")} tentative`);
    classLines.push("  classDef tentative stroke-dasharray:5 5,stroke-opacity:.7");
  }
  lines.push(...classLines);

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
