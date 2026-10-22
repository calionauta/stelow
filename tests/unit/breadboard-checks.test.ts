/**
 * The affordance checks, as executable rules.
 *
 * Ryan Singer's breadboarding skill states the failure modes a map hides when
 * it is written from memory. These tests pin them as machine checks — and
 * they pin the FALSE POSITIVES away, because a check that fires on a
 * well-formed map teaches the writer to ignore it.
 *
 * The bug each catches:
 *   - a display with no source reads as a display whose source was forgotten
 *   - a disconnected code affordance reads as working code
 *   - an unread store reads as state that matters
 *   - navigation written as containment hides that the whole screen changed
 *   - an affordance in an undeclared place reads as a complete map
 *   - a placeholder name reads as a real method
 *   - two affordances with one id merge into one node in every view
 */
import { describe, it, expect } from "vitest";
import {
  CHECKS,
  checkAffordancesHaveDeclaredPlace,
  checkCodeAffordancesConnect,
  checkDisplaysHaveSource,
  checkIdKindMatches,
  checkIdsUnique,
  checkNavigationLandsOnPlaces,
  checkNamesAreReal,
  checkStoresAreRead,
  checkWiringResolves,
  collectErrors,
  collectProblems,
  runAffordanceChecks,
} from "../../scripts/breadboard-checks.mjs";

const WELL_FORMED = {
  schemaVersion: 1,
  interfaceId: "A",
  places: [
    { id: "P1", name: "Inbox" },
    { id: "P2", name: "Idea Editor" },
  ],
  affordances: [
    { id: "U1", kind: "ui", name: "New Idea button", place: "P1", control: "click", wiresOut: ["P2"] },
    { id: "U2", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
    // A display: its source is the store's outgoing return, S2 -.-> U3.
    { id: "U3", kind: "ui", name: "Title heading", place: "P2", control: "render" },
    { id: "N1", kind: "code", name: "saveIdea()", place: "P2", control: "call", wiresOut: ["N2"], returnsTo: ["S2"] },
    // A LEAF: nothing wires out, but saveIdea() wires into it. That is the
    // last call in a chain, not dead code.
    { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
    { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
    { id: "S2", kind: "store", name: "savedIdea", place: "P2", control: "write", returnsTo: ["U3"] },
  ],
};

function ids(flagged: { id: string }[]): string[] {
  return flagged.map((item) => item.id).sort();
}

describe("a well-formed map passes every check", () => {
  it("produces no findings at all", () => {
    // The guard against a check that fires on correct work. A rule that
    // cries wolf is worse than no rule: the writer learns to ignore it.
    expect(collectProblems(WELL_FORMED)).toEqual([]);
  });

  it("runs every check, not just some of them", () => {
    const checks = runAffordanceChecks(WELL_FORMED);
    expect(checks.length).toBe(CHECKS.length);
    expect(checks.length).toBe(9);
    for (const check of checks) {
      expect(check.flagged, check.name).toEqual([]);
    }
  });
});

describe("display has a source", () => {
  it("flags a display nothing feeds", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" }],
    };
    expect(ids(checkDisplaysHaveSource(map))).toEqual(["U1"]);
  });

  it("does not flag a display a store returns to", () => {
    // The direction that matters: the data flows OUT of the store INTO the
    // display, so the display is the target.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" },
        { id: "S1", kind: "store", name: "letters", place: "P1", control: "write", returnsTo: ["U1"] },
      ],
    };
    expect(checkDisplaysHaveSource(map)).toEqual([]);
  });

  it("still flags a display whose own wire points AT its source", () => {
    // THE BUG THIS PINS: reading `returnsTo` on the display made a display
    // that points at a store look fed, although nothing feeds it. The
    // arrow's direction is the whole meaning of the column.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render", returnsTo: ["S1"] },
        { id: "S1", kind: "store", name: "letters", place: "P1", control: "write" },
      ],
    };
    expect(ids(checkDisplaysHaveSource(map))).toEqual(["U1"]);
  });

  it("does not flag an input — an input produces data, it does not show it", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Problem input", place: "P1", control: "type", returnsTo: ["S1"] },
      ],
    };
    expect(checkDisplaysHaveSource(map)).toEqual([]);
  });

  it("does not count a self-reference as a source", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render", returnsTo: ["U1"] },
      ],
    };
    expect(ids(checkDisplaysHaveSource(map))).toEqual(["U1"]);
  });
});

describe("code affordance connects", () => {
  it("flags a code affordance nothing points at and that points at nothing", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "orphanFn()", place: "P1", control: "call" },
      ],
    };
    expect(ids(checkCodeAffordancesConnect(map))).toEqual(["N1"]);
  });

  it("does not flag a leaf that something wires into", () => {
    // The false positive that matters: the last call in a chain wires
    // nowhere itself. Flagging it would make the check noise.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "saveIdea()", place: "P1", control: "call", wiresOut: ["N2"] },
        { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P1", control: "call" },
      ],
    };
    expect(checkCodeAffordancesConnect(map)).toEqual([]);
  });

  it("does not flag a code affordance that returns somewhere", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "findLetters()", place: "P1", control: "call", returnsTo: ["U1"] },
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render", returnsTo: ["N1"] },
      ],
    };
    expect(checkCodeAffordancesConnect(map)).toEqual([]);
  });
});

describe("store is read by something", () => {
  it("flags a store nothing reads", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "S1", kind: "store", name: "orphanStore", place: "P1", control: "write" }],
    };
    expect(ids(checkStoresAreRead(map))).toEqual(["S1"]);
  });

  it("does not flag a store whose data a display receives", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "S1", kind: "store", name: "draftIdea", place: "P1", control: "write", returnsTo: ["U1"] },
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" },
      ],
    };
    expect(checkStoresAreRead(map)).toEqual([]);
  });

  it("still flags a store that is only ever written, never read", () => {
    // THE BUG THIS PINS: counting INCOMING returns as a read made a
    // write-only store look consumed, because the writer's arrow points at
    // the store. A store is read when its own return goes somewhere.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "S1", kind: "store", name: "savedIdea", place: "P1", control: "write" },
        { id: "N1", kind: "code", name: "saveIdea()", place: "P1", control: "call", returnsTo: ["S1"] },
      ],
    };
    expect(ids(checkStoresAreRead(map))).toEqual(["S1"]);
  });
});

describe("navigation lands on a place", () => {
  it("flags a wire that crosses a place boundary as containment", () => {
    // U1 in P1 wiring to an affordance inside P2: the user leaves P1, so
    // the wire must land on P2 itself.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "New button", place: "P1", control: "click", wiresOut: ["U2"] },
        { id: "U2", kind: "ui", name: "Problem input", place: "P2", control: "type", returnsTo: ["S1"] },
        { id: "S1", kind: "store", name: "draftIdea", place: "P2", control: "write", returnsTo: ["U2"] },
      ],
    };
    expect(ids(checkNavigationLandsOnPlaces(map))).toEqual(["U1"]);
  });

  it("does not flag a wire to an affordance in the SAME place", () => {
    // Local interaction inside one place is not navigation.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "New button", place: "P1", control: "click", wiresOut: ["U2"] },
        { id: "U2", kind: "ui", name: "Inline field", place: "P1", control: "type", returnsTo: ["S1"] },
        { id: "S1", kind: "store", name: "draftIdea", place: "P1", control: "write", returnsTo: ["U2"] },
      ],
    };
    expect(checkNavigationLandsOnPlaces(map)).toEqual([]);
  });

  it("does not flag a code affordance calling into another place", () => {
    // The false positive this pins: a frontend handler calling a backend
    // resolver crosses a place boundary, but the USER did not move. This is
    // a call; flagging it would fire on every map that spans two systems.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "saveIdea()", place: "P1", control: "call", wiresOut: ["N2"] },
        { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P2", control: "call" },
      ],
    };
    expect(checkNavigationLandsOnPlaces(map)).toEqual([]);
  });

  it("does not flag a wire to a place", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "New button", place: "P1", control: "click", wiresOut: ["P2"] },
      ],
    };
    expect(checkNavigationLandsOnPlaces(map)).toEqual([]);
  });
});

describe("affordance has a declared place", () => {
  it("flags an affordance in a place the map never declares", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "U1", kind: "ui", name: "orphan", place: "P7", control: "click" }],
    };
    expect(ids(checkAffordancesHaveDeclaredPlace(map))).toEqual(["U1"]);
  });
});

describe("ids are unique and their prefix matches the kind", () => {
  it("flags two affordances sharing an id", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Save button", place: "P1", control: "click" },
        { id: "U1", kind: "ui", name: "Cancel button", place: "P1", control: "click" },
      ],
    };
    expect(checkIdsUnique(map).length).toBe(1);
    expect(checkIdsUnique(map)[0].reason).toContain("merges two affordances");
  });

  it("flags a kind that contradicts its id prefix", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "ui", name: "Save button", place: "P1", control: "click" },
      ],
    };
    expect(ids(checkIdKindMatches(map))).toEqual(["N1"]);
  });

  it("accepts a place reference as a UI affordance", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "_letter-browser", kind: "ui", name: "Letter browser", place: "P1", control: "render", wiresOut: ["P2"] },
      ],
    };
    expect(checkIdKindMatches(map)).toEqual([]);
  });
});

describe("wiring resolves", () => {
  it("flags the affordance that wires to an undeclared id", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "U1", kind: "ui", name: "b", place: "P1", control: "click", wiresOut: ["P9"] }],
    };
    const flagged = checkWiringResolves(map);
    expect(ids(flagged)).toEqual(["U1"]);
    expect(flagged[0].reason).toContain("P9");
  });
});

describe("name is a real thing", () => {
  it("flags a code affordance named after an abstraction", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "database", place: "P1", control: "call", wiresOut: ["N2"] },
        { id: "N2", kind: "code", name: "repo.save()", place: "P1", control: "call" },
      ],
    };
    expect(ids(checkNamesAreReal(map))).toEqual(["N1"]);
  });

  it("does not flag a real method name", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "N1", kind: "code", name: "userRepo.save()", place: "P1", control: "call", wiresOut: ["N2"] },
        { id: "N2", kind: "code", name: "ideaRepo.save()", place: "P1", control: "call" },
      ],
    };
    expect(checkNamesAreReal(map)).toEqual([]);
  });

  it("does not flag a UI affordance named after an abstraction", () => {
    // The rule is about code: a button called "modal" is fine, a method
    // called "modal" is not a thing you can point at.
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "U1", kind: "ui", name: "modal", place: "P1", control: "click" }],
    };
    expect(checkNamesAreReal(map)).toEqual([]);
  });
});

describe("collectProblems", () => {
  it("names the check that found each problem and what it costs", () => {
    const map = {
      ...WELL_FORMED,
      affordances: [{ id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" }],
    };
    const problems = collectProblems(map);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].check).toBe("display has a source");
    expect(problems[0].severity).toBe("gap");
    expect(problems[0].id).toBe("U1");
    expect(problems[0].reason).toBeTruthy();
  });

  it("separates the findings that mean the map is wrong from the ones that mean it is unfinished", () => {
    // A dangling wire is an error: the map contradicts itself, and no
    // judgement is needed to agree. A display with no source is a gap: the
    // writer may know something the map does not.
    const map = {
      ...WELL_FORMED,
      affordances: [
        { id: "U1", kind: "ui", name: "Letter list", place: "P1", control: "render" },
        { id: "N1", kind: "code", name: "load()", place: "P1", control: "call", wiresOut: ["N9"] },
      ],
    };
    expect(collectErrors(map).map((problem) => problem.id)).toEqual(["N1"]);
    expect(collectProblems(map).filter((problem) => problem.severity === "gap").map((problem) => problem.id)).toEqual([
      "U1",
    ]);
  });
});
