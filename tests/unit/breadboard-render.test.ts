/**
 * The breadboard serializer and its renderer.
 *
 * The map is the source of truth and the diagram is a projection of it, so
 * three properties carry the whole contract:
 *
 *   1. DETERMINISM — the same map always yields byte-identical Mermaid.
 *      If the serializer reordered its output, every diagram diff would be
 *      noise and nobody would read a diagram diff again. A diff in the
 *      diagram has to mean a diff in the map.
 *
 *   2. FIDELITY — nothing in the map is silently dropped. A wire to an id
 *      the map never declares is a hole: it renders as a node the map does
 *      not describe, so the diagram would show something the workflow never
 *      decided. The renderer reports it instead of drawing it.
 *
 *   3. LEGIBILITY — the kinds are distinguishable in the picture. UI, code
 *      and store are the model's primary distinction; a diagram that draws
 *      all three as the same rectangle makes the reader open the JSON to
 *      find out what they already looked at.
 *
 * The tests here run the real serializer and the real renderer against real
 * files. Nothing is mocked: a stubbed render would prove only that the stub
 * returns what the stub returns.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toMermaid, wiringReport } from "../../scripts/breadboard-mermaid.mjs";
import { readMap as readMapForTest } from "../../scripts/render-diagram.mjs";
import { render as renderMermaid } from "pele";

// fileURLToPath, not import.meta.dirname: the declared engine floor is Node
// 20.0, and import.meta.dirname only landed in 20.11.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RENDER = join(REPO_ROOT, "scripts", "render-diagram.mjs");

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "stelow-breadboard-"));
}

const MAP = {
  schemaVersion: 1,
  interfaceId: "A",
  selectedBy: "human",
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

function runRender(args: string[]): { stdout: string; stderr: string; status: number } {
  // spawnSync, not execFileSync: a successful run still writes findings to
  // stderr, and execFileSync hands back only stdout when the exit code is
  // zero. A gap reported on a run that SUCCEEDS would be lost.
  const result = spawnSync("node", [RENDER, ...args], { encoding: "utf8" });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

describe("breadboard → Mermaid serializer", () => {
  it("is deterministic: the same map always yields the same source", () => {
    // Key order differs between these two literals; the output must not.
    const reordered = {
      affordances: MAP.affordances,
      places: MAP.places,
      interfaceId: "A",
      schemaVersion: 1,
      selectedBy: "human",
    };
    expect(toMermaid(reordered)).toBe(toMermaid(MAP));
  });

  it("puts each affordance inside the subgraph of its own place", () => {
    const mermaid = toMermaid(MAP);
    const inbox = mermaid.slice(mermaid.indexOf("subgraph P1"), mermaid.indexOf("subgraph P2"));
    const editor = mermaid.slice(mermaid.indexOf("subgraph P2"));
    expect(inbox).toContain('U1["U1: New Idea button"]');
    expect(inbox).not.toContain("U2");
    expect(editor).toContain('U2["U2: Problem input"]');
  });

  it("gives each kind its own shape, so the picture says what the table says", () => {
    // Shape first, colour second: a monochrome print or a host that ignores
    // classDef still separates UI from code from store.
    const mermaid = toMermaid(MAP);
    expect(mermaid).toContain('U2["U2: Problem input"]'); // rectangle
    expect(mermaid).toContain('N1[["N1: saveIdea()"]]'); // subroutine
    expect(mermaid).toContain('S1[("S1: draftIdea")]'); // cylinder
  });

  it("gives each kind a class and defines it", () => {
    const mermaid = toMermaid(MAP);
    expect(mermaid).toContain("class U1,U2,U3 kindUi");
    expect(mermaid).toContain("class N1,N2 kindCode");
    expect(mermaid).toContain("class S1,S2 kindStore");
    expect(mermaid).toContain("classDef kindCode stroke:#8a63d2");
  });

  it("wires control flow solid and data flow dashed", () => {
    const mermaid = toMermaid(MAP);
    // Control flow: what triggers what.
    expect(mermaid).toContain("U1 --> P2");
    expect(mermaid).toContain("N1 --> N2");
    // Data flow: where the output goes.
    expect(mermaid).toContain("U2 -.-> S1");
    expect(mermaid).toContain("N1 -.-> S2");
    expect(mermaid).toContain("S1 -.-> U2");
  });

  it("lands a navigation wire on the place boundary, not on an affordance inside it", () => {
    // The rule: navigation wires to the PLACE. Wiring to an affordance
    // inside it hides the fact that the whole screen changed.
    const mermaid = toMermaid(MAP);
    expect(mermaid).toContain("U1 --> P2");
    expect(mermaid).not.toContain("U1 --> U2");
  });

  it("labels every node with its id, so the diagram can be traced back to the map", () => {
    const mermaid = toMermaid(MAP);
    for (const item of MAP.affordances) {
      expect(mermaid, item.id).toContain(`"${item.id}: `);
    }
    expect(mermaid).toContain('"P1: Inbox"');
    expect(mermaid).toContain('"P2: Idea Editor (Edit Mode)"');
  });

  it("renders a place reference as a node in the parent place", () => {
    // Singer's `_letter-browser` convention: the reference marks where a
    // detached place renders. Mermaid cannot take the leading underscore as
    // a node id, so the node id is rewritten while the label keeps the name.
    const withReference = {
      ...MAP,
      affordances: [
        ...MAP.affordances,
        { id: "_letter-browser", kind: "ui", name: "Letter browser", place: "P1", control: "render", wiresOut: ["P2"] },
      ],
    };
    const mermaid = toMermaid(withReference);
    expect(mermaid).toContain('ref_letter_2d_browser["_letter-browser: Letter browser"]');
    expect(mermaid).toContain("ref_letter_2d_browser --> P2");
    expect(() => renderMermaid(mermaid)).not.toThrow();
  });

  it("keeps two references that differ only by punctuation apart", () => {
    // THE BUG THIS PINS: node ids were rewritten by mapping every punctuation
    // character to "_", so `_a-b` and `_a_b` — two different references —
    // became one Mermaid node. The map kept them apart; the diagram merged
    // them, silently.
    const map = {
      ...MAP,
      affordances: [
        ...MAP.affordances,
        { id: "_a-b", kind: "ui", name: "dashed ref", place: "P1", control: "render", wiresOut: ["P2"] },
        { id: "_a_b", kind: "ui", name: "underscore ref", place: "P1", control: "render", wiresOut: ["P2"] },
      ],
    };
    const mermaid = toMermaid(map);
    expect(mermaid).toContain("ref_a_2d_b");
    expect(mermaid).toContain("ref_a_5f_b");
    expect(() => renderMermaid(mermaid)).not.toThrow();
  });

  it("nests a subplace inside its parent place", () => {
    // Containment is the model's relationship: `P2.1` is a widget INSIDE P2,
    // not a screen beside it. Drawing them as siblings says the user leaves
    // P2 to reach the widget, which the map never claimed.
    const withSubplace = {
      ...MAP,
      places: [...MAP.places, { id: "P2.1", name: "Sales widget" }],
      affordances: [
        ...MAP.affordances,
        { id: "U7", kind: "ui", name: "sales total", place: "P2.1", control: "render", returnsTo: ["S9"] },
        { id: "S9", kind: "store", name: "sales", place: "P2.1", control: "write", returnsTo: ["U7"] },
      ],
    };
    const mermaid = toMermaid(withSubplace);
    const parent = mermaid.indexOf("subgraph P2[");
    const child = mermaid.indexOf("subgraph P2_2e_1[");
    // The child opens after the parent and before the parent's `end`.
    expect(parent).toBeGreaterThan(-1);
    expect(child).toBeGreaterThan(parent);
    // A flat sibling would sit at two spaces; a nested one sits inside the
    // parent's block. That indentation is the nesting.
    const childLine = mermaid.split("\n").find((line) => line.includes("subgraph P2_2e_1"));
    expect(childLine?.startsWith("    subgraph")).toBe(true);
    expect(() => renderMermaid(mermaid)).not.toThrow();
  });

  it("marks a tentative affordance with a dashed style instead of hiding it", () => {
    const tentative = {
      ...MAP,
      affordances: [
        ...MAP.affordances,
        { id: "N9", kind: "code", name: "maybe()", place: "P2", control: "call", tentative: true },
      ],
    };
    const mermaid = toMermaid(tentative);
    expect(mermaid).toContain("class N9 tentative");
    expect(mermaid).toContain("classDef tentative");
  });

  it("renders a tentative affordance through the real renderer", () => {
    // The string-level assertion above cannot catch a class placed BEFORE
    // the label: `id:::class["label"]` is not valid Mermaid, and the diagram
    // silently fails to render. Only a real render catches it.
    const tentative = {
      ...MAP,
      affordances: [
        ...MAP.affordances,
        { id: "N9", kind: "code", name: "maybe()", place: "P2", control: "call", tentative: true },
      ],
    };
    const mermaid = toMermaid(tentative);
    expect(() => renderMermaid(mermaid)).not.toThrow();
  });

  it("escapes a label that carries Mermaid syntax instead of emitting it as syntax", () => {
    const hostile = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: 'x"] --> P9["injected', place: "P1", control: "click" }],
    };
    const mermaid = toMermaid(hostile);
    // The quote in the name must not close the label and open a new node.
    expect(mermaid).not.toContain('--> P9["injected');
    expect(mermaid).toContain("&quot;");
  });

  it("emits an affordance whose place is not declared, rather than dropping it", () => {
    // A map that hides an affordance is worse than one that shows it wrong:
    // the reader would believe the map is complete.
    const orphan = {
      ...MAP,
      affordances: [...MAP.affordances, { id: "U9", kind: "ui", name: "orphan", place: "P7", control: "click" }],
    };
    expect(toMermaid(orphan)).toContain('U9["U9: orphan"]');
  });
});

describe("breadboard wiring report", () => {
  it("finds no dangling wiring in a well-formed map", () => {
    const report = wiringReport(MAP);
    expect(report.dangling).toEqual([]);
    expect(report.known.has("P1")).toBe(true);
    expect(report.known.has("S1")).toBe(true);
  });

  it("catches a dangling wire on the data-flow side too", () => {
    const broken = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", control: "click", returnsTo: ["S7"] }],
    };
    expect(wiringReport(broken).dangling).toEqual(["S7"]);
  });
});

describe("render-diagram", () => {
  it("writes a self-contained HTML with the diagram inline and no external request", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      const out = join(dir, "breadboard.html");
      writeFileSync(input, JSON.stringify(MAP), "utf8");

      const result = runRender(["breadboard", "--input", input, "--out", out]);
      expect(result.status, result.stderr).toBe(0);

      const html = readFileSync(out, "utf8");
      expect(html).toContain("<svg");
      // The artifact is durable: it must not depend on a network fetch.
      expect(html).not.toMatch(/<script[^>]+src=/);
      expect(html).not.toMatch(/<link[^>]+href=/);
      // The key travels with the picture, because the picture is the point.
      expect(html).toContain("How to read it");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("renders a map with places, stores, data flow and a tentative affordance", () => {
    // The full shape of a real map: three places, code affordances, data
    // stores, control flow, data flow, and a speculative affordance. The
    // renderer has to accept every one of those constructs — a diagram that
    // fails to parse is a blank page that reads like an empty interface.
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(input, JSON.stringify({
        schemaVersion: 1,
        interfaceId: "B",
        selectedBy: "human",
        scopeCoverage: [{ scopeId: "S1", effect: "served" }],
        places: [
          { id: "P1", name: "Inbox" },
          { id: "P2", name: "Idea Editor", mode: "Edit Mode" },
          { id: "P3", name: "Idea Detail" },
        ],
        affordances: [
          { id: "U1", kind: "ui", name: "New Idea button", place: "P1", control: "click", wiresOut: ["P2"] },
          { id: "U2", kind: "ui", name: "Save button", place: "P2", control: "click", wiresOut: ["N1"] },
          { id: "U3", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
          { id: "U4", kind: "ui", name: "Title heading", place: "P3", control: "render" },
          { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"] },
          { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
          { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U3"] },
          { id: "S2", kind: "store", name: "savedIdea", place: "P3", control: "write", returnsTo: ["U4"] },
          { id: "N9", kind: "code", name: "maybeArchive()", place: "P2", control: "call", tentative: true },
        ],
      }), "utf8");

      const out = join(dir, "breadboard.html");
      const result = runRender(["breadboard", "--input", input, "--out", out]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).not.toContain("render failed");

      const html = readFileSync(out, "utf8");
      expect(html).toContain("<svg");
      // The Mermaid source ships with the page, so a reader can see the map
      // itself without trusting the picture.
      expect(html).toContain("flowchart TB");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits Mermaid source separately for hosts that render diagrams themselves", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(input, JSON.stringify(MAP), "utf8");

      const result = runRender(["breadboard", "--input", input, "--emit-mermaid"]);
      expect(result.status, result.stderr).toBe(0);

      const mermaid = readFileSync(join(dir, "breadboard.mmd"), "utf8");
      expect(mermaid).toBe(toMermaid(MAP));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits the markdown a visual review can actually read", () => {
    // The interface gate reviews markdown. Without this file the gate sees
    // the proposals, never the map that was picked.
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(input, JSON.stringify({
        ...MAP,
        // A map with a gap: the display U7 nothing feeds. The view has to
        // say so, or it reads as more certain than the map is.
        affordances: [...MAP.affordances, { id: "U7", kind: "ui", name: "Empty state", place: "P1", control: "render" }],
      }), "utf8");

      const result = runRender(["breadboard", "--input", input, "--emit-markdown", "--with-diagram"]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain("display has a source");

      const markdown = readFileSync(join(dir, "breadboard.md"), "utf8");
      expect(markdown).toContain("# Interface breadboard");
      expect(markdown).toContain("## P2 — Idea Editor (Edit Mode)");
      expect(markdown).toContain("## What the checks flag");
      expect(markdown).toContain("U7");
      expect(markdown).toContain("```mermaid");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to draw a map that contradicts its own contract", () => {
    // A view of a broken map presents a hole as a decision. The JSON stands;
    // no view is written.
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      const out = join(dir, "breadboard.html");
      const broken = structuredClone(MAP);
      delete broken.affordances[0].control;
      writeFileSync(input, JSON.stringify(broken), "utf8");

      const result = runRender(["breadboard", "--input", input, "--out", out, "--emit-markdown"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("contract");
      expect(result.stderr).toContain("control");
      expect(existsSync(out)).toBe(false);
      expect(existsSync(join(dir, "breadboard.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("draws a map with gaps and carries them into the views", () => {
    // A gap is the writer's call, not the renderer's: the picture is drawn and
    // says what the map does not know yet. (The check's own --strict refusal
    // is the checker's business — see tests/integration/breadboard-check.)
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(
        input,
        JSON.stringify({
          ...MAP,
          affordances: [{ id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" }],
        }),
        "utf8",
      );

      const result = runRender(["breadboard", "--input", input, "--emit-markdown"]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toContain("display has a source");

      const markdown = readFileSync(join(dir, "breadboard.md"), "utf8");
      expect(markdown).toContain("## What the checks flag");
      expect(markdown).toContain("U1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to draw a map whose wiring points at an id nobody declares", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      const out = join(dir, "out.html");
      writeFileSync(
        input,
        JSON.stringify({
          schemaVersion: 1,
          interfaceId: "A",
          places: [{ id: "P1", name: "X" }],
          affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", control: "click", wiresOut: ["P9"] }],
        }),
        "utf8",
      );

      const result = runRender(["breadboard", "--input", input, "--out", out]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("P9");
      expect(result.stderr).toContain("error");
      expect(existsSync(out)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a malformed map, naming the file", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "broken.json");
      writeFileSync(input, "{ not json", "utf8");
      const result = runRender(["breadboard", "--input", input]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("broken.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws a named Error for a malformed map, so a caller can catch it", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "broken.json");
      writeFileSync(input, "{ not json", "utf8");
      // The error carries the file: a reader who finds the map broken must be
      // told WHICH map, not that "something" was wrong.
      expect(() => readMapForTest(input)).toThrow(Error);
      expect(() => readMapForTest(input)).toThrow(/broken\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws on an empty map instead of rendering an empty diagram", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "empty.json");
      writeFileSync(input, JSON.stringify({ schemaVersion: 1, interfaceId: "A" }), "utf8");
      const result = runRender(["breadboard", "--input", input, "--out", join(dir, "out.html")]);
      // No places and no affordances: there is nothing to draw, and the run
      // must say so rather than write a blank page that reads as "this
      // interface has no places" — a claim the map never made.
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("no places and no affordances");
      expect(result.stderr).toContain("empty.json");
      expect(existsSync(join(dir, "out.html"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes nothing and explains itself when --input is missing", () => {
    const result = runRender(["breadboard"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--input");
  });

  it("rejects an unknown command instead of guessing", () => {
    const result = runRender(["gantt"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown command");
  });

  it("rejects an unknown option instead of ignoring it", () => {
    // `--emmit-markdown` used to be skipped in silence: exit 0, nothing
    // written, which reads exactly like a successful run with nothing to do.
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(input, JSON.stringify(MAP), "utf8");
      const result = runRender(["breadboard", "--input", input, "--emmit-markdown"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("unknown option --emmit-markdown");
      expect(existsSync(join(dir, "breadboard.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a flag that was given no value", () => {
    const result = runRender(["breadboard", "--out"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--out needs a value");
  });

  it("rejects a run with flags but no command", () => {
    // Exit 0 here would let a scripted run report success without doing
    // anything at all.
    const result = runRender(["--input", "somewhere.json", "--emit-markdown"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("missing command");
  });

  it("rejects --with-diagram without --emit-markdown", () => {
    // The flag only means something for the markdown view; ignoring it leaves
    // the caller believing a diagram was written.
    const result = runRender(["breadboard", "--input", "somewhere.json", "--with-diagram"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--with-diagram needs --emit-markdown");
  });
});
