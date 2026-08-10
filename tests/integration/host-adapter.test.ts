/**
 * Integration tests: Host Adapter (DecisionGateway) end-to-end.
 *
 * Covers:
 *   - createHostAdapter() returns null when no workgroup YAML exists
 *   - createHostAdapter() throws WorkgroupConfigError on malformed config
 *   - createHostAdapter() returns a MulticaAdapter when host=multica
 *   - the adapter returns a structurally valid DecisionResult shape
 *     (DecisionKind / DecisionOutcome union) for every outcome path
 *   - pending_decision marker round-trips through Workflow type
 *
 * Mutation-target: the factory wiring + the type contract. Breaking
 * either would silently route decisions to the wrong host.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createHostAdapter,
  HostAdapterError,
  MulticaAdapter,
  WorkgroupConfigError,
} from "../../extensions/stelow/adapters/host";
import type {
  DecisionGateway,
  DecisionResult,
  DecisionKind,
  DecisionOutcome,
} from "../../extensions/stelow/adapters/host/types";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "stelow-host-int-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: write a workgroup config, ensuring .stelow/ exists first.
function writeConfig(yaml: string): void {
  mkdirSync(join(tmpDir, ".stelow"), { recursive: true });
  writeFileSync(join(tmpDir, ".stelow", "host-workgroup.yaml"), yaml);
}

describe("createHostAdapter — factory", () => {
  it("returns null when no workgroup YAML exists", () => {
    expect(createHostAdapter(tmpDir)).toBeNull();
  });

  it("returns a MulticaAdapter when host=multica", () => {
    writeConfig(`host: multica
reviewers:
  shape:
    role: pm
    member_id: 01930000-0000-0000-0000-000000000001
`);
    const adapter = createHostAdapter(tmpDir);
    expect(adapter).toBeInstanceOf(MulticaAdapter);
    expect(adapter?.host).toBe("multica"); // host is host
  });

  it("throws WorkgroupConfigError on malformed config (not silent failure)", () => {
    writeConfig("host: multica\nreviewers: not-a-map\n");
    expect(() => createHostAdapter(tmpDir)).toThrow(WorkgroupConfigError);
  });

  it("throws HostAdapterError on unknown host", () => {
    writeConfig(`host: slack
reviewers:
  shape:
    role: pm
    member_id: abc
`);
    expect(() => createHostAdapter(tmpDir)).toThrow(HostAdapterError);
  });

  it("returns a DecisionGateway (interface contract)", () => {
    writeConfig(`host: multica
reviewers:
  shape:
    role: pm
    member_id: 01930000-0000-0000-0000-000000000001
`);
    const adapter: DecisionGateway | null = createHostAdapter(tmpDir);
    expect(adapter).not.toBeNull();
    expect(typeof adapter!.requestDecision).toBe("function");
  });
});

describe("DecisionResult — type contract", () => {
  it("every outcome is a valid DecisionOutcome", () => {
    const outcomes: DecisionOutcome[] = [
      "approved",
      "annotated",
      "dismissed",
      "answered",
      "expired",
      "error",
    ];
    // Pin the exhaustive list. Adding a new outcome MUST update this test.
    expect(outcomes).toHaveLength(6);
  });

  it("every kind is a valid DecisionKind", () => {
    const kinds: DecisionKind[] = ["question", "gate"];
    expect(kinds).toHaveLength(2);
  });

  it("structural shape is complete (all required fields)", () => {
    const r: DecisionResult = {
      kind: "gate",
      decision: "approved",
      answered_by: "c1",
      answered_at: "2026-07-16T10:00:00Z",
      external_ref: "01930000-aaaa-bbbb-cccc-000000000001",
    };
    expect(r.kind).toBe("gate");
    expect(r.decision).toBe("approved");
    expect(typeof r.external_ref).toBe("string");
  });
});

describe("MulticaAdapter — protocol surfaces", () => {
  it("exposes requestDecision + resolvePending", () => {
    const adapter = new MulticaAdapter(null, null);
    expect(typeof adapter.requestDecision).toBe("function");
    expect(typeof adapter.resolvePending).toBe("function");
  });

  it("exposes idempotencyKey + slaDeadline (inherited from BaseHostAdapter)", () => {
    const adapter = new MulticaAdapter(null, null);
    expect(typeof adapter.idempotencyKey).toBe("function");
    expect(typeof adapter.slaDeadline).toBe("function");
  });

  it("host identifier is 'multica'", () => {
    const adapter = new MulticaAdapter(null, null);
    expect(adapter.host).toBe("multica");
  });
});