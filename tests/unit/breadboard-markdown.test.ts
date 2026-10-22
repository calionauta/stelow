/**
 * Breadboard map → markdown.
 *
 * This view is what the visual review gate reads, so its failures are not
 * cosmetic: a missing place section means the reviewer never sees part of the
 * interface, and a table broken by an unescaped pipe reads as a malformed
 * gate.
 *
 * The tests below pin the four properties the view exists for: it follows the
 * MAP's structure, it keeps the two flows apart, it never hides an affordance
 * the map cannot place, and it reports the map's own gaps instead of
 * presenting certainty the map does not have.
 */
import { describe, it, expect } from "vitest";
import { toMarkdown, toMarkdownWithDiagram } from "../../scripts/breadboard-markdown.mjs";

const MAP = {
  schemaVersion: 1,
  interfaceId: "A",
  selectedBy: "human",
  scopeCoverage: [{ scopeId: "S1", effect: "served", note: "first slice" }],
  places: [
    { id: "P1", name: "Inbox", description: "Saved ideas" },
    { id: "P2", name: "Idea Editor", mode: "Edit Mode" },
  ],
  affordances: [
    { id: "U1", kind: "ui", name: "New Idea button", place: "P1", control: "click", wiresOut: ["P2"] },
    { id: "U2", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
    { id: "U3", kind: "ui", name: "Title heading", place: "P2", control: "render" },
    { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"] },
    { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
    { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
    { id: "S2", kind: "store", name: "savedIdea", place: "P2", control: "write", returnsTo: ["U3"] },
  ],
};

describe("the markdown follows the map", () => {
  it("opens with frontmatter naming the interface it maps", () => {
    // The gate and the host both read artifacts by their header. A view
    // that does not say which interface it is belongs to is ambiguous the
    // moment a second interface exists.
    const markdown = toMarkdown(MAP);
    expect(markdown.startsWith("---\ninterface: A\nselected_by: human\nbreadboard: true\n---")).toBe(true);
  });

  it("gives each place its own section, in declaration order", () => {
    const markdown = toMarkdown(MAP);
    expect(markdown.indexOf("## P1 — Inbox")).toBeLessThan(markdown.indexOf("## P2 — Idea Editor (Edit Mode)"));
    // U1 lives in P1 and must not appear in P2's affordance table. The slice
    // stops at the next heading, so the flow tables further down (which do
    // mention U1's wire) are not mistaken for the place's rows.
    const start = markdown.indexOf("## P2 — Idea Editor");
    const editorSection = markdown.slice(start, markdown.indexOf("## Control flow", start));
    expect(editorSection).toContain("| U2 | UI | Problem input |");
    expect(editorSection).not.toContain("| U1 |");
  });

  it("keeps control flow and data flow in separate tables", () => {
    // The two flows are orthogonal; a single mixed table is what makes a
    // reader believe navigation causes a data change.
    const markdown = toMarkdown(MAP);
    const control = markdown.slice(markdown.indexOf("## Control flow"), markdown.indexOf("## Data flow"));
    const data = markdown.slice(markdown.indexOf("## Data flow"));
    expect(control).toContain("| U1 | P2 |");
    expect(control).not.toContain("N1 -.-> ");
    expect(data).toContain("| S2 | U3 |");
    expect(data).not.toContain("| U1 | P2 |");
  });

  it("escapes a pipe so one affordance cannot break the table", () => {
    const withPipe = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: "A | B toggle", place: "P1", control: "click" }],
    };
    const markdown = toMarkdown(withPipe);
    expect(markdown).toContain("A \\| B toggle");
    expect(markdown.split("\n").filter((line) => line.startsWith("| U1 |")).length).toBe(1);
  });

  it("surfaces an affordance the map cannot place instead of dropping it", () => {
    const orphan = {
      ...MAP,
      affordances: [{ id: "U9", kind: "ui", name: "orphan", place: "P7", control: "click" }],
    };
    const markdown = toMarkdown(orphan);
    expect(markdown).toContain("## Affordances outside a declared place");
    expect(markdown).toContain("| U9 | UI | orphan | P7 |");
  });
});

describe("the markdown reports the map's own gaps", () => {
  it("omits the section when the checks found nothing", () => {
    expect(toMarkdown(MAP)).not.toContain("What the checks flag");
  });

  it("lists every finding with its severity", () => {
    // The view is what a reviewer reads. Hiding a known gap would make the
    // view look more finished than the map is.
    const markdown = toMarkdown(MAP, [
      { check: "display has a source", severity: "gap", id: "U3", name: "Title heading", reason: "nothing feeds it" },
      { check: "wiring resolves", severity: "error", id: "N1", name: "saveIdea()", reason: "wires to N9" },
    ]);
    expect(markdown).toContain("## What the checks flag");
    expect(markdown).toContain("| gap | display has a source | U3 | nothing feeds it |");
    expect(markdown).toContain("| **error** | wiring resolves | N1 | wires to N9 |");
  });
});

describe("with the diagram", () => {
  it("appends the Mermaid source so the picture and the tables travel together", () => {
    const markdown = toMarkdownWithDiagram(MAP, "flowchart TB\n  U1 --> P2\n");
    expect(markdown).toContain("## Diagram");
    expect(markdown).toContain("```mermaid\nflowchart TB\n  U1 --> P2\n```");
    // The tables are still there: the diagram is an addition, not a swap.
    expect(markdown).toContain("## Places");
  });
});
