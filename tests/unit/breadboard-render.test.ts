/**
 * The breadboard serializer and its renderer.
 *
 * The map is the source of truth and the diagram is a projection of it, so
 * two properties carry the whole contract:
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
 * The tests here run the real serializer and the real renderer against real
 * files. Nothing is mocked: a stubbed render would prove only that the stub
 * returns what the stub returns.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toMermaid, wiringReport } from "../../scripts/breadboard-mermaid.mjs";
import { readMap as readMapForTest } from "../../scripts/render-diagram.mjs";
import { render as renderMermaid } from "pele";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
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
    { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S1"] },
    { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
    { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
  ],
};

function runRender(args: string[]): { stdout: string; stderr: string; status: number } {
  // spawnSync, not execFileSync: a successful run still writes warnings to
  // stderr, and execFileSync hands back only stdout when the exit code is
  // zero. The dangling-wiring warning goes to stderr on a run that SUCCEEDS,
  // so reading stdout alone would lose it.
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
    expect(editor).toContain('N1["N1: saveIdea()"]');
  });

  it("wires control flow solid and data flow dashed", () => {
    const mermaid = toMermaid(MAP);
    // Control flow: what triggers what.
    expect(mermaid).toContain("U1 --> P2");
    expect(mermaid).toContain("N1 --> N2");
    // Data flow: where the output goes.
    expect(mermaid).toContain("U2 -.-> S1");
    expect(mermaid).toContain("N1 -.-> S1");
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

  it("marks a tentative affordance with a dashed style instead of hiding it", () => {
    const tentative = {
      ...MAP,
      affordances: [...MAP.affordances, { id: "N9", kind: "code", name: "maybe()", place: "P2", tentative: true }],
    };
    const mermaid = toMermaid(tentative);
    expect(mermaid).toContain(":::tentative");
    expect(mermaid).toContain("classDef tentative");
  });

  it("renders a tentative affordance through the real renderer", () => {
    // The string-level assertion above cannot catch a class placed BEFORE
    // the label: `id:::class["label"]` is not valid Mermaid, and the diagram
    // silently fails to render. Only a real render catches it.
    const tentative = {
      ...MAP,
      affordances: [...MAP.affordances, { id: "N9", kind: "code", name: "maybe()", place: "P2", tentative: true }],
    };
    const mermaid = toMermaid(tentative);
    expect(() => renderMermaid(mermaid)).not.toThrow();
  });

  it("escapes a label that carries Mermaid syntax instead of emitting it as syntax", () => {
    const hostile = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: 'x"] --> P9["injected', place: "P1" }],
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
      affordances: [...MAP.affordances, { id: "U9", kind: "ui", name: "orphan", place: "P7" }],
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

  it("names a wire that points at an id the map never declares", () => {
    const broken = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", wiresOut: ["P9"] }],
    };
    expect(wiringReport(broken).dangling).toEqual(["P9"]);
  });

  it("catches a dangling wire on the data-flow side too", () => {
    const broken = {
      ...MAP,
      affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", returnsTo: ["S7"] }],
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
          { id: "U4", kind: "ui", name: "Title heading", place: "P3", control: "render", returnsTo: ["S2"] },
          { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"] },
          { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
          { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U3"] },
          { id: "S2", kind: "store", name: "savedIdea", place: "P3", control: "write", returnsTo: ["U4"] },
          { id: "N9", kind: "code", name: "maybeArchive()", place: "P2", tentative: true },
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

  it("reports dangling wiring and refuses under --strict", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "breadboard.json");
      writeFileSync(
        input,
        JSON.stringify({
          schemaVersion: 1,
          interfaceId: "A",
          places: [{ id: "P1", name: "X" }],
          affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", wiresOut: ["P9"] }],
        }),
        "utf8",
      );

      const lenient = runRender(["breadboard", "--input", input, "--check"]);
      expect(lenient.status).toBe(0);
      expect(lenient.stderr).toContain("P9");

      const strict = runRender(["breadboard", "--input", input, "--check", "--strict"]);
      expect(strict.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps the map usable when the map itself is malformed, naming the file", () => {
    const dir = tempDir();
    try {
      const input = join(dir, "broken.json");
      writeFileSync(input, "{ not json", "utf8");
      const result = runRender(["breadboard", "--input", input, "--check"]);
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
});
