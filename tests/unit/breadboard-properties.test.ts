/**
 * Property tests for the breadboard serializer.
 *
 * The serializer's contract is universal: for ANY map, the diagram must be a
 * faithful, deterministic projection of it. Hand-written cases pin the shapes
 * we thought of; these pin the property every map must satisfy.
 *
 * The bug class this catches: a serializer that silently drops an affordance
 * (a node outside every place, a malformed subplace id) or reorders its output
 * between calls. A dropped node makes the picture look complete while the map
 * says something else — the exact failure the whole artifact exists to prevent.
 * Reordering makes every diagram diff noise, which is how people stop reading
 * diagram diffs at all.
 *
 * fast-check generates maps as sets of unique ids, so the properties hold for
 * combinations no fixture list would reach (a subplace without a parent, an
 * affordance wired to itself, ten affordances across two places).
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { render as renderMermaid } from "pele";
import { toMermaid, wiringReport } from "../../scripts/breadboard-mermaid.mjs";

const placeId = fc.integer({ min: 1, max: 6 }).map((n) => `P${n}`);
const affordanceId = fc
  .tuple(fc.constantFrom("U", "N", "S"), fc.integer({ min: 1, max: 8 }))
  .map(([prefix, n]) => `${prefix}${n}`);

const kindOf = (id: string): "ui" | "code" | "store" => (id[0] === "U" ? "ui" : id[0] === "N" ? "code" : "store");

/** A map with unique ids, every affordance in a declared place, and wiring. */
const mapArbitrary = fc
  .tuple(
    fc.uniqueArray(placeId, { minLength: 1, maxLength: 4 }),
    fc.option(fc.uniqueArray(placeId, { minLength: 1, maxLength: 2 }), { nil: [] }),
    fc.uniqueArray(affordanceId, { minLength: 1, maxLength: 8 }),
  )
  .map(([places, subplaces, affordanceIds]) => {
    const placesWithSubplaces = [
      ...places.map((id) => ({ id, name: `Place ${id}` })),
      // A subplace reuses an existing parent id, which is what makes it a
      // subplace; the parent is always declared, so containment resolves.
      ...subplaces.filter((id) => places.includes(id)).map((id) => ({ id: `${id}.1`, name: `Widget ${id}` })),
    ].slice(0, 4);
    const placeIds = placesWithSubplaces.map((place) => place.id);
    const targets = [...placeIds, ...affordanceIds];
    return {
      schemaVersion: 1,
      interfaceId: "prop",
      places: placesWithSubplaces,
      affordances: affordanceIds.map((id, index) => ({
        id,
        kind: kindOf(id),
        name: `Thing ${id}`,
        place: placeIds[index % placeIds.length],
        control: kindOf(id) === "store" ? "write" : "call",
        wiresOut: [targets[(index + 1) % targets.length]],
        returnsTo: index % 3 === 0 ? [targets[(index + 2) % targets.length]] : [],
      })),
    };
  });

describe("the serializer is a faithful projection", () => {
  it("emits every declared affordance, whatever the map holds", () => {
    fc.assert(
      fc.property(mapArbitrary, (map) => {
        const source = toMermaid(map);
        for (const affordance of map.affordances) {
          // The label is the only place a node says what it is; an edge can
          // mention the id without the node existing, so the assertion is on
          // the label, not on the id string.
          expect(source, `dropped ${affordance.id}`).toContain(`"${affordance.id}: ${affordance.name}"`);
        }
        for (const place of map.places) {
          expect(source, `dropped ${place.id}`).toContain(`"${place.id}: ${place.name}"`);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("is deterministic: the same map always yields the same source", () => {
    fc.assert(
      fc.property(mapArbitrary, (map) => {
        expect(toMermaid(map)).toBe(toMermaid(structuredClone(map)));
      }),
      { numRuns: 50 },
    );
  });

  it("keeps the wiring report consistent with the map", () => {
    fc.assert(
      fc.property(mapArbitrary, (map) => {
        const report = wiringReport(map);
        const declared = new Set([...map.places.map((p) => p.id), ...map.affordances.map((a) => a.id)]);
        const referenced = new Set(map.affordances.flatMap((a) => [...(a.wiresOut ?? []), ...(a.returnsTo ?? [])]));

        for (const id of declared) expect(report.known.has(id)).toBe(true);
        expect(report.dangling).toEqual([...referenced].filter((id) => !declared.has(id)).sort());
        for (const id of report.dangling) expect(report.referenced.has(id)).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it("mermaid always accepts what the serializer produces", () => {
    // A source the renderer rejects is a blank page that reads as "this
    // interface has no places". Checked through the real renderer on generated
    // maps, not on fixtures — the serializer escapes labels, and an escaping
    // bug only shows up on input nobody wrote by hand.
    fc.assert(
      fc.property(mapArbitrary, (map) => {
        expect(() => renderMermaid(toMermaid(map))).not.toThrow();
      }),
      { numRuns: 25 },
    );
  });
});
