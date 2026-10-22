/**
 * Breadboard map → markdown.
 *
 * The map is the truth; this is the reading view. It exists for two reasons:
 *
 *   1. The visual review gate reviews MARKDOWN. Without this file the gate
 *      never sees the chosen interface's shape — it sees the proposals, not
 *      the map that was picked.
 *   2. A reader without a renderer still gets the whole thing.
 *
 * The structure follows the MAP, not a narrative: places in order, each with
 * the affordances inside it, then the two flows kept apart. Ryan Singer's rule
 * is that the structure of the prose follows the structure of the breadboard —
 * here the prose IS the breadboard, so the rule applies to the section order.
 */

/** Escape the pipes that would break a markdown table cell. */
function cell(text) {
  return String(text ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function kindLabel(kind) {
  return kind === "ui" ? "UI" : kind === "code" ? "Code" : "Store";
}

/** One line, so a reader knows the shapes without the diagram. */
const READING_KEY =
  "**How to read:** a place is a box you are inside; UI affordances are what you act on, code affordances are what the code does, stores are held state. Control flow triggers; data flow returns.";

/**
 * The affordance tables, grouped by place.
 *
 * @param {object} breadboard the parsed map
 * @param {{check: string, severity: string, id: string, name: string, reason: string}[]} [problems]
 *   findings from the executable checks; reported so the reader of the view
 *   learns what the map itself says it does not know yet
 * @returns {string} markdown
 */
export function toMarkdown(breadboard, problems = []) {
  const places = breadboard.places ?? [];
  const affordances = breadboard.affordances ?? [];
  const byPlace = new Map(places.map((place) => [place.id, []]));
  const orphans = [];
  for (const item of affordances) {
    const bucket = byPlace.get(item.place);
    if (bucket) bucket.push(item);
    else orphans.push(item);
  }

  const lines = [];

  lines.push("---");
  lines.push(`interface: ${cell(breadboard.interfaceId ?? "unknown")}`);
  if (breadboard.selectedBy) lines.push(`selected_by: ${cell(breadboard.selectedBy)}`);
  lines.push("breadboard: true");
  lines.push("---");
  lines.push("");
  lines.push("# Interface breadboard");
  lines.push("");
  lines.push(
    "The map below is the source of truth for this interface's shape. The prose in",
    "`selected-interface.md` is its commentary.",
  );
  lines.push("");
  lines.push(READING_KEY);
  lines.push("");

  if (breadboard.scopeCoverage?.length) {
    lines.push("## Scope coverage");
    lines.push("");
    lines.push("| Scope | Effect | Note |");
    lines.push("|---|---|---|");
    for (const entry of breadboard.scopeCoverage) {
      lines.push(`| ${cell(entry.scopeId)} | ${cell(entry.effect)} | ${cell(entry.note ?? "—")} |`);
    }
    lines.push("");
  }

  lines.push("## Places");
  lines.push("");
  lines.push("| # | Place | Description | System |");
  lines.push("|---|---|---|---|");
  for (const place of places) {
    const label = place.mode ? `${place.name} (${place.mode})` : place.name;
    lines.push(
      `| ${cell(place.id)} | ${cell(label)} | ${cell(place.description ?? "—")} | ${cell(place.system ?? "—")} |`,
    );
  }
  lines.push("");

  for (const place of places) {
    const members = byPlace.get(place.id) ?? [];
    if (members.length === 0) continue;
    const label = place.mode ? `${place.name} (${place.mode})` : place.name;
    lines.push(`## ${place.id} — ${label}`);
    lines.push("");
    if (place.description) {
      lines.push(place.description);
      lines.push("");
    }
    lines.push("| # | Kind | Affordance | Control | Wires out | Returns to |");
    lines.push("|---|---|---|---|---|---|");
    for (const item of members) {
      lines.push(
        `| ${cell(item.id)} | ${cell(kindLabel(item.kind))} | ${cell(item.name)} | ${cell(item.control ?? "—")} | ${cell(
          (item.wiresOut ?? []).join(", ") || "—",
        )} | ${cell((item.returnsTo ?? []).join(", ") || "—")} |`,
      );
    }
    lines.push("");
  }

  if (orphans.length > 0) {
    lines.push("## Affordances outside a declared place");
    lines.push("");
    lines.push("These belong to a place the map does not declare — the map is incomplete.");
    lines.push("");
    lines.push("| # | Kind | Affordance | Place | Control |");
    lines.push("|---|---|---|---|---|");
    for (const item of orphans) {
      lines.push(
        `| ${cell(item.id)} | ${cell(kindLabel(item.kind))} | ${cell(item.name)} | ${cell(item.place)} | ${cell(
          item.control ?? "—",
        )} |`,
      );
    }
    lines.push("");
  }

  // The two flows, kept apart — the whole reason the model has two columns.
  const control = [];
  const data = [];
  for (const item of affordances) {
    for (const target of item.wiresOut ?? []) control.push([item.id, target]);
    for (const target of item.returnsTo ?? []) data.push([item.id, target]);
  }
  if (control.length) {
    lines.push("## Control flow");
    lines.push("");
    lines.push("What triggers what, read forward. A navigation wire lands on a place, not on an affordance inside it.");
    lines.push("");
    lines.push("| From | To |");
    lines.push("|---|---|");
    for (const [from, to] of control) lines.push(`| ${cell(from)} | ${cell(to)} |`);
    lines.push("");
  }
  if (data.length) {
    lines.push("## Data flow");
    lines.push("");
    lines.push(
      "Where output flows, read forward. A display is fed by a wire pointing AT it; a store is read by a wire pointing AWAY from it.",
    );
    lines.push("");
    lines.push("| From | To |");
    lines.push("|---|---|");
    for (const [from, to] of data) lines.push(`| ${cell(from)} | ${cell(to)} |`);
    lines.push("");
  }

  // The map's own account of what it does not know yet. Hiding it would make
  // the view look more certain than the map is.
  if (problems.length > 0) {
    lines.push("## What the checks flag");
    lines.push("");
    lines.push("These are mechanical findings, not a design verdict. A gap is a place to look.");
    lines.push("");
    lines.push("| Severity | Check | # | Why |");
    lines.push("|---|---|---|---|");
    for (const problem of problems) {
      const severity = problem.severity === "error" ? "**error**" : "gap";
      lines.push(`| ${severity} | ${cell(problem.check)} | ${cell(problem.id)} | ${cell(problem.reason)} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * The markdown with the diagram appended, for a reader who wants the picture
 * and the tables in the same document.
 *
 * @param {object} breadboard the parsed map
 * @param {string} mermaid the Mermaid source
 * @param {{check: string, severity: string, id: string, name: string, reason: string}[]} [problems]
 * @returns {string} markdown
 */
export function toMarkdownWithDiagram(breadboard, mermaid, problems = []) {
  const base = toMarkdown(breadboard, problems);
  return `${base}\n## Diagram\n\nThe same map as a picture. UI is a rectangle, code a double-bordered rectangle, a store a cylinder; solid arrows are control flow, dashed arrows are data flow.\n\n\`\`\`mermaid\n${mermaid.trimEnd()}\n\`\`\`\n`;
}
