import { describe, expect, it } from 'vitest';

import { parseSpecTechScopes } from '../../extensions/stelow/state';

const POPULATED_SPEC = `# Technical plan

[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 3
Objective: Build authentication foundation
Dependencies: None
DoD: Users can sign in
[TARGET_FILES]
- src/auth/login.ts
- src/auth/session.ts

[SCOPE-2]
[TYPE] test-integration
[MAX_ITERATIONS] 5
Objective: Verify authentication flows
Dependencies: SCOPE-1, SCOPE-9
DoD: Authentication is covered end to end
[TARGET_FILES]
- tests/auth/login.test.ts
`;

describe('parseSpecTechScopes', () => {
  it('maps populated scope blocks to complete runtime records deterministically', () => {
    const expected = [
      {
        id: 'scope-1',
        name: 'Build authentication foundation',
        type: 'feature',
        status: 'pending',
        source: 'spec-tech',
        targetFiles: ['src/auth/login.ts', 'src/auth/session.ts'],
        maxIterations: 3,
      },
      {
        id: 'scope-2',
        name: 'Verify authentication flows',
        type: 'test-integration',
        status: 'pending',
        source: 'spec-tech',
        blockedBy: ['scope-1', 'scope-9'],
        targetFiles: ['tests/auth/login.test.ts'],
        maxIterations: 5,
      },
    ];

    expect(parseSpecTechScopes(POPULATED_SPEC)).toEqual(expected);
    expect(parseSpecTechScopes(POPULATED_SPEC)).toEqual(expected);
  });

  it('returns no scopes for empty, whitespace-only, or malformed content', () => {
    expect(parseSpecTechScopes('')).toEqual([]);
    expect(parseSpecTechScopes('  \n\n')).toEqual([]);
    expect(
      parseSpecTechScopes('# Scopes\n\n[SCOPE-X]\nObjective: Invalid identifier'),
    ).toEqual([]);
  });

  it('rejects undefined runtime input instead of inventing a second fallback contract', () => {
    const parseUndefined = () =>
      parseSpecTechScopes(undefined as unknown as string);

    expect(parseUndefined).toThrow(TypeError);
  });

  it('defaults an incomplete valid block and omits unparseable optional fields', () => {
    const incompleteSpec = `[SCOPE-7]
Dependencies: SCOPE-X
[MAX_ITERATIONS] many
[TARGET_FILES]
not-a-list-entry
`;

    expect(parseSpecTechScopes(incompleteSpec)).toEqual([
      {
        id: 'scope-7',
        name: 'scope-7',
        type: 'feature',
        status: 'pending',
        source: 'spec-tech',
      },
    ]);
  });

  it('retains duplicate scope blocks in document order without cross-call state', () => {
    const duplicateSpec = `[SCOPE-3]
[TYPE] spike
Objective: First declaration
Dependencies: None

[SCOPE-3]
[TYPE] optimization
Objective: Retained duplicate
Dependencies: SCOPE-1
`;
    const expected = [
      {
        id: 'scope-3',
        name: 'First declaration',
        type: 'spike',
        status: 'pending',
        source: 'spec-tech',
      },
      {
        id: 'scope-3',
        name: 'Retained duplicate',
        type: 'optimization',
        status: 'pending',
        source: 'spec-tech',
        blockedBy: ['scope-1'],
      },
    ];

    expect(parseSpecTechScopes(duplicateSpec)).toEqual(expected);
    expect(parseSpecTechScopes(duplicateSpec)).toEqual(expected);
  });
});
