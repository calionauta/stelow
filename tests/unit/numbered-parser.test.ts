/**
 * Tests: numbered-options parser.
 *
 * The Multica adapter emulates structured choice via a numbered markdown
 * list (per docs/design/host-adapter-multica.md §5.6). This parser turns
 * reviewer replies ("1", "1, 3", "anything else") into `selections[]`.
 *
 * Mutation-target: every test targets a behavior the parser MUST hold
 * under refactor — losing any of them would silently break the HITL
 * flow.
 */

import { describe, it, expect } from "vitest";
import { parseNumberedReply } from "../../extensions/stelow/adapters/host/numbered-parser";

const OPTIONS = [
  { label: "Auth foundation" },
  { label: "Payment" },
  { label: "Dashboard" },
  { label: "Settings" },
];

describe("parseNumberedReply", () => {
  // ── Happy path: single index ─────────────────────────────────────

  describe("single index", () => {
    it("parses '1' → [option 1 label]", () => {
      expect(parseNumberedReply("1", OPTIONS).selections).toEqual(["Auth foundation"]);
    });

    it("parses '4' → [option 4 label]", () => {
      expect(parseNumberedReply("4", OPTIONS).selections).toEqual(["Settings"]);
    });

    it("tolerates leading whitespace", () => {
      expect(parseNumberedReply("   2", OPTIONS).selections).toEqual(["Payment"]);
    });

    it("tolerates trailing whitespace", () => {
      expect(parseNumberedReply("3   ", OPTIONS).selections).toEqual(["Dashboard"]);
    });

    it("treats empty reply as free text", () => {
      const r = parseNumberedReply("", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("treats whitespace-only reply as free text", () => {
      const r = parseNumberedReply("   ", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });
  });

  // ── Multi-select: comma-separated ───────────────────────────────

  describe("multi-select (comma-separated)", () => {
    it("parses '1, 3' → [opt1, opt3]", () => {
      expect(parseNumberedReply("1, 3", OPTIONS).selections).toEqual([
        "Auth foundation",
        "Dashboard",
      ]);
    });

    it("parses '1,3' (no space) → [opt1, opt3]", () => {
      expect(parseNumberedReply("1,3", OPTIONS).selections).toEqual([
        "Auth foundation",
        "Dashboard",
      ]);
    });

    it("parses '2 , 4' (extra spaces) → [opt2, opt4]", () => {
      expect(parseNumberedReply("2 , 4", OPTIONS).selections).toEqual([
        "Payment",
        "Settings",
      ]);
    });

    it("preserves reviewer order in selections", () => {
      expect(parseNumberedReply("4, 2, 1", OPTIONS).selections).toEqual([
        "Settings",
        "Payment",
        "Auth foundation",
      ]);
    });

    it("dedupes repeated indices", () => {
      // The parser does NOT dedupe — that's intentional. The reviewer
      // can list "1, 1" and we don't silently collapse. Tests pin that.
      expect(parseNumberedReply("1, 1", OPTIONS).selections).toEqual([
        "Auth foundation",
        "Auth foundation",
      ]);
    });
  });

  // ── Out-of-range / malformed ────────────────────────────────────

  describe("out-of-range indices", () => {
    it("treats '0' as free text (no 0-based index)", () => {
      const r = parseNumberedReply("0", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("treats '5' (out of range) as free text", () => {
      const r = parseNumberedReply("5", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("treats '99' as free text", () => {
      const r = parseNumberedReply("99", OPTIONS);
      expect(r.isFreeText).toBe(true);
    });

    it("treats '1, 5' (mixed valid + invalid) as free text", () => {
      // Strict: one bad token invalidates the whole reply.
      const r = parseNumberedReply("1, 5", OPTIONS);
      expect(r.isFreeText).toBe(true);
    });
  });

  // ── Free text ────────────────────────────────────────────────────

  describe("free text", () => {
    it("treats plain words as free text", () => {
      const r = parseNumberedReply("let's go with payment", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("treats '1. Actually...' as free text (period disqualifies)", () => {
      // Real reviewers write things like "1. Actually option 2" — we
      // must NOT misinterpret the leading "1" as a selection.
      const r = parseNumberedReply("1. Actually let's go with option 2", OPTIONS);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("treats 'one' (word) as free text", () => {
      const r = parseNumberedReply("one", OPTIONS);
      expect(r.isFreeText).toBe(true);
    });

    it("preserves raw text in result.raw", () => {
      const r = parseNumberedReply("  my custom answer  ", OPTIONS);
      expect(r.raw).toBe("my custom answer");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns isFreeText=true when options is empty", () => {
      // Caller passed no options → parser can't interpret indices.
      const r = parseNumberedReply("1", []);
      expect(r.isFreeText).toBe(true);
      expect(r.selections).toEqual([]);
    });

    it("returns isFreeText=true for single option with index '2'", () => {
      const r = parseNumberedReply("2", [{ label: "Only option" }]);
      expect(r.isFreeText).toBe(true);
    });
  });
});