/**
 * Tests: parseScopesFromSpecTech — mirror of parseSpecTechScopes in state.ts
 *
 * Verifies that the JS mirror of the scope parser in the Muxy panel produces
 * the same results as the TS source. Both runtimes cannot share code (Node vs
 * Electron sandbox), so we rely on mirrored implementations + test parity.
 *
 * @mirror extensions/stelow/state.ts :: parseSpecTechScopes
 * If you update the parser in data.js, add equivalent test cases here.
 */

import { describe, it, expect } from "vitest";
import { parseScopesFromSpecTech } from "../../integrations/muxy/stelow/src/panel/data";
import { parseSpecTechScopes } from "../../extensions/stelow/state";

// ── Fixtures ──────────────────────────────────────────────────────────

const SINGLE_SCOPE = `[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 3
Objective: Implement user login
Dependencies: None
DoD: User can log in with email/password
[TARGET_FILES]
- src/auth/login.ts
- src/auth/session.ts
`;

const MULTI_SCOPE = `[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 3
Objective: Auth foundation
Dependencies: None
[TARGET_FILES]
- src/auth/**

[SCOPE-2]
[TYPE] feature
[MAX_ITERATIONS] 5
Objective: User dashboard
Dependencies: SCOPE-1
[TARGET_FILES]
- src/pages/dashboard.tsx
- src/pages/settings.tsx

[SCOPE-3]
[TYPE] optimization
[MAX_ITERATIONS] 2
Objective: Cache layer
Dependencies: SCOPE-1, SCOPE-2
`;

const WITH_DEPS_NONE = `[SCOPE-1]
[TYPE] feature
Objective: Independent scope
Dependencies: None
`;

const NO_TYPE_DEFAULT = `[SCOPE-1]
Objective: Scope with default type
Dependencies: None
`;

const EMPTY_CONTENT = ``;

const MALFORMED_NO_SCOPE = `Some random markdown content
- list item
- another item

## Heading without SCOPE block
`;

const WITH_ITERATIONS = `[SCOPE-1]
[TYPE] spike
[MAX_ITERATIONS] 1
Objective: Research auth options
Dependencies: None
`;

// ── Tests ─────────────────────────────────────────────────────────────

describe("parseScopesFromSpecTech", () => {
  it("returns empty array for empty content", () => {
    expect(parseScopesFromSpecTech(EMPTY_CONTENT)).toEqual([]);
  });

  it("returns empty array for content without SCOPE blocks", () => {
    expect(parseScopesFromSpecTech(MALFORMED_NO_SCOPE)).toEqual([]);
  });

  it("parses a single SCOPE-1 block", () => {
    const scopes = parseScopesFromSpecTech(SINGLE_SCOPE);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].id).toBe("scope-1");
    expect(scopes[0].name).toBe("Implement user login");
    expect(scopes[0].type).toBe("feature");
    expect(scopes[0].status).toBe("pending");
    expect(scopes[0].source).toBe("spec-tech");
  });

  it("parses target_files from [TARGET_FILES] block", () => {
    const scopes = parseScopesFromSpecTech(SINGLE_SCOPE);
    expect(scopes[0].targetFiles).toEqual([
      "src/auth/login.ts",
      "src/auth/session.ts",
    ]);
  });

  it("parses maxIterations from [MAX_ITERATIONS] block", () => {
    const scopes = parseScopesFromSpecTech(SINGLE_SCOPE);
    expect(scopes[0].maxIterations).toBe(3);
  });

  it("parses multiple scopes with dependencies", () => {
    const scopes = parseScopesFromSpecTech(MULTI_SCOPE);
    expect(scopes).toHaveLength(3);

    // Scope 1: no deps
    expect(scopes[0].id).toBe("scope-1");
    expect(scopes[0].name).toBe("Auth foundation");
    expect(scopes[0].blockedBy).toBeUndefined();

    // Scope 2: depends on SCOPE-1
    expect(scopes[1].id).toBe("scope-2");
    expect(scopes[1].name).toBe("User dashboard");
    expect(scopes[1].blockedBy).toEqual(["scope-1"]);
    expect(scopes[1].type).toBe("feature");

    // Scope 3: depends on SCOPE-1, SCOPE-2
    expect(scopes[2].id).toBe("scope-3");
    expect(scopes[2].name).toBe("Cache layer");
    expect(scopes[2].type).toBe("optimization");
    expect(scopes[2].blockedBy).toEqual(["scope-1", "scope-2"]);
  });

  it('handles "Dependencies: None" as no blockedBy', () => {
    const scopes = parseScopesFromSpecTech(WITH_DEPS_NONE);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].blockedBy).toBeUndefined();
  });

  it('defaults type to "feature" when [TYPE] is missing', () => {
    const scopes = parseScopesFromSpecTech(NO_TYPE_DEFAULT);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].type).toBe("feature");
    expect(scopes[0].name).toBe("Scope with default type");
  });

  it("parses scope with [MAX_ITERATIONS] but no [TARGET_FILES]", () => {
    const scopes = parseScopesFromSpecTech(WITH_ITERATIONS);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].maxIterations).toBe(1);
    expect(scopes[0].type).toBe("spike");
    expect(scopes[0].targetFiles).toBeUndefined();
  });

  it("uses id as fallback name when Objective is missing", () => {
    const noObjective = `[SCOPE-5]
[TYPE] feature
Dependencies: None
`;
    const scopes = parseScopesFromSpecTech(noObjective);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].name).toBe("scope-5");
  });

  it("preserves order from the spec-tech.md document", () => {
    const scopes = parseScopesFromSpecTech(MULTI_SCOPE);
    expect(scopes.map((s) => s.id)).toEqual([
      "scope-1",
      "scope-2",
      "scope-3",
    ]);
  });

  it("all scopes have status='pending' initially", () => {
    const scopes = parseScopesFromSpecTech(MULTI_SCOPE);
    for (const scope of scopes) {
      expect(scope.status).toBe("pending");
    }
  });

  it("all scopes have source='spec-tech'", () => {
    const scopes = parseScopesFromSpecTech(MULTI_SCOPE);
    for (const scope of scopes) {
      expect(scope.source).toBe("spec-tech");
    }
  });

  // ── Parity: TS vs JS mirror produce identical output ────────────────

  describe("TS/JS parser parity", () => {
    const FIXTURES = [SINGLE_SCOPE, MULTI_SCOPE, WITH_DEPS_NONE, NO_TYPE_DEFAULT, WITH_ITERATIONS];

    function normalize(scope) {
      return {
        id: scope.id,
        name: scope.name,
        type: scope.type,
        status: scope.status,
        source: scope.source,
        blockedBy: scope.blockedBy,
        targetFiles: scope.targetFiles,
        maxIterations: scope.maxIterations,
      };
    }

    for (let i = 0; i < FIXTURES.length; i++) {
      it(`produces identical output for fixture ${i + 1}`, () => {
        const tsResult = parseSpecTechScopes(FIXTURES[i]).map(normalize);
        const jsResult = parseScopesFromSpecTech(FIXTURES[i]).map(normalize);
        expect(jsResult).toEqual(tsResult);
      });
    }

    it("produces identical empty arrays for empty content", () => {
      expect(parseScopesFromSpecTech(EMPTY_CONTENT)).toEqual(parseSpecTechScopes(EMPTY_CONTENT));
    });

    it("produces identical empty arrays for malformed content", () => {
      expect(parseScopesFromSpecTech(MALFORMED_NO_SCOPE)).toEqual(parseSpecTechScopes(MALFORMED_NO_SCOPE));
    });
  });
});
