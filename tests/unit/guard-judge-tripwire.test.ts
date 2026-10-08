/**
 * guard-judge tripwire (fail-observed guard-quality decision point).
 *
 * Bug it catches: the overturn tripwire miscounts — human-review verdicts
 * inflate the denominator, pending entries count as agreement, or only one
 * overturn direction counts (blind to false-pass, the dangerous direction).
 * The counting logic must also resolve the kill-switch mode in one order
 * (env > stored > quality default) so hosts cannot disagree with the CLI.
 *
 * No validation logic is reimplemented here: stats and mode resolution come
 * from types/stages.ts (guardOverturnStats / resolveGuardJudgeMode).
 */
import { describe, it, expect } from "vitest";
import {
  guardOverturnStats,
  resolveGuardJudgeMode,
  GUARD_JUDGE_WINDOW,
  GUARD_JUDGE_MAX_OVERTURN_RATE,
  type GuardQualityEntry,
} from "../../types/stages.js";

function entry(
  verdict: GuardQualityEntry["verdict"],
  human_decision?: GuardQualityEntry["human_decision"],
): GuardQualityEntry {
  const e: GuardQualityEntry = { guard: "tests/a.test.ts", test_sha: "abc", verdict };
  if (human_decision) e.human_decision = human_decision;
  return e;
}

describe("guardOverturnStats: trailing co-reviewed window", () => {
  it("empty log: zero judged, zero rate, not tripped", () => {
    expect(guardOverturnStats([])).toEqual({ judged: 0, overturned: 0, rate: 0, tripped: false });
  });

  it("counts both overturn directions", () => {
    const stats = guardOverturnStats([
      entry("needs-revision", "approved"),
      entry("pass", "reworked"),
      entry("pass", "approved"),
    ]);
    expect(stats).toEqual({ judged: 3, overturned: 2, rate: 2 / 3, tripped: false });
  });

  it("excludes human-review verdicts and pending entries", () => {
    const stats = guardOverturnStats([
      entry("human-review", "approved"),
      entry("human-review"),
      entry("pass"),
      entry("needs-revision"),
      entry("pass", "approved"),
    ]);
    expect(stats).toEqual({ judged: 1, overturned: 0, rate: 0, tripped: false });
  });

  it(`trips only above ${GUARD_JUDGE_MAX_OVERTURN_RATE} over a full ${GUARD_JUDGE_WINDOW} window`, () => {
    const atBoundary = Array.from({ length: 30 }, (_, i) =>
      entry("pass", i < 3 ? "reworked" : "approved"),
    );
    const boundary = guardOverturnStats(atBoundary);
    expect(boundary.judged).toBe(30);
    expect(boundary.rate).toBeCloseTo(0.1);
    expect(boundary.tripped).toBe(false);
    const over = Array.from({ length: 30 }, (_, i) =>
      entry("pass", i < 4 ? "reworked" : "approved"),
    );
    const tripped = guardOverturnStats(over);
    expect(tripped.overturned).toBe(4);
    expect(tripped.tripped).toBe(true);
  });

  it("uses the trailing window, not the whole history", () => {
    const old = Array.from({ length: 20 }, () => entry("pass", "reworked"));
    const recent = Array.from({ length: 30 }, () => entry("pass", "approved"));
    const stats = guardOverturnStats([...old, ...recent]);
    expect(stats.judged).toBe(30);
    expect(stats.overturned).toBe(0);
    expect(stats.tripped).toBe(false);
  });

  it("short window never trips, however bad", () => {
    const stats = guardOverturnStats(Array.from({ length: 10 }, () => entry("pass", "reworked")));
    expect(stats.rate).toBe(1);
    expect(stats.tripped).toBe(false);
  });
});

describe("resolveGuardJudgeMode: env > stored > quality default", () => {
  it("env wins over everything", () => {
    expect(
      resolveGuardJudgeMode({ env: "off", config: { guard_judge: "strict", quality: "production" } }),
    ).toBe("off");
  });

  it("stored wins over quality default; invalid stored falls through", () => {
    expect(resolveGuardJudgeMode({ config: { guard_judge: "advisory", quality: "production" } })).toBe(
      "advisory",
    );
    expect(
      resolveGuardJudgeMode({
        config: { guard_judge: "bogus" as never, quality: "production" },
      }),
    ).toBe("strict");
  });

  it("quality default: experimental advisory, else strict", () => {
    expect(resolveGuardJudgeMode({ config: { quality: "experimental" } })).toBe("advisory");
    expect(resolveGuardJudgeMode({ config: { quality: "production" } })).toBe("strict");
    expect(resolveGuardJudgeMode({})).toBe("strict");
  });
});
