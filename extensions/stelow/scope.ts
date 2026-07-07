/**
 * Scope execution — DAG scheduling + post-execution overlap audit.
 *
 * Pure functions over `Scope[]`. No filesystem reads except the
 * optional stale-lock scan, which is best-effort and silent on error.
 *
 * See `docs/scope-execution-strategy.md` for the 3-layer pipeline
 * (sequential default, optional file-reservation lock prevention,
 * mandatory post-hoc audit).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Scope } from "./types";

/**
 * Return scopes whose dependencies are all satisfied and status is `pending`.
 * Independent scopes (empty `blockedBy`) are always ready.
 *
 * KISS: no DAG library, no topological sort. Caller loops `readyScopes()`
 * until empty:
 *
 * ```
 * let ready = readyScopes(scopes);
 * while (ready.length > 0) {
 *   for (const s of ready) { await run(s); markCompleted(s); }
 *   ready = readyScopes(scopes);
 * }
 * ```
 */
export function readyScopes(scopes: Scope[]): Scope[] {
  const completed = new Set(
    scopes.filter((s) => s.status === "completed").map((s) => s.id)
  );
  return scopes.filter(
    (s) =>
      s.status === "pending" &&
      (s.blockedBy ?? []).every((dep) => completed.has(dep))
  );
}

/**
 * Match a single declared glob against a single actual file path.
 *
 * Convention (matches `cali-product-scope-executor` SKILL Step 8):
 *   - trailing `/**` ⇒ prefix match (e.g. `src/auth/**` matches `src/auth/foo.ts`)
 *   - trailing `/*`  ⇒ single-level match (e.g. `src/auth/*` matches
 *                      `src/auth/foo.ts` but not `src/auth/sub/bar.ts`)
 *   - otherwise exact match (e.g. `src/middleware/auth.ts` matches exactly)
 *
 * Pure function. Exported for unit testing + reuse in tooling.
 */
export function matchesDeclaredGlob(file: string, glob: string): boolean {
  if (glob.endsWith("/**")) return file.startsWith(glob.slice(0, -2));
  if (glob.endsWith("/*")) {
    const prefix = glob.slice(0, -1);
    if (!file.startsWith(prefix)) return false;
    const rest = file.slice(prefix.length);
    return !rest.includes("/");
  }
  return file === glob;
}

/**
 * 4-class overlap classification result. See `cali-product-scope-executor`
 * SKILL Step 8 for the user-facing rationale; this function computes the
 * underlying data.
 *
 * Classes (always returned, possibly empty):
 *   - (a) `undeclared` — a completed scope wrote to files outside its
 *                         declared `targetFiles` (contract drift / scope creep)
 *   - (b) `overlaps`   — two completed scopes share at least one file in
 *                         their `actualFiles` (parallel write collision)
 *   - (c) `staleLocks` — `.lock` files in `lockDir` with `expires_at` in
 *                         the past (crash recovery / orphan detection)
 *   - (d) `clean`      — completed scopes that touched no class (a)/(b) paths
 */
export interface OverlapReport {
  undeclared: Array<{
    id: string;
    declared: string[];
    actual: string[];
    undeclaredWrites: string[];
  }>;
  overlaps: Array<{ a: string; b: string; shared: string[] }>;
  staleLocks: Array<{ file: string; scope: string; expiresAt: string }>;
  clean: string[];
}

/** Shape of a `.lock` file in the locks directory. */
interface LockRecord {
  scope_id?: string;
  file?: string;
  expires_at?: string;
}

/**
 * Classify scopes for the post-execution 4-class overlap report.
 *
 * @param scopes  — typically `wf.scopes` from the current workflow.
 * @param lockDir — optional path to the directory of `.lock` files
 *                  (defaults to `.stelow/{date}/{dir}/locks`). If absent
 *                  or unreadable, `staleLocks` is empty (not an error).
 */
export function classifyOverlap(
  scopes: Scope[],
  lockDir?: string
): OverlapReport {
  const completed = scopes.filter(
    (s) => s.status === "completed" && Array.isArray(s.actualFiles)
  );

  // (a) undeclared writes — only when the scope declared a contract
  // (targetFiles). If targetFiles is absent/empty, no contract exists and
  // every write is "implicitly allowed"; we skip class (a) for that scope.
  const undeclared = completed
    .map((s) => {
      const declared = s.targetFiles ?? [];
      if (declared.length === 0) {
        return {
          id: s.id,
          declared,
          actual: s.actualFiles ?? [],
          undeclaredWrites: [],
        };
      }
      const writes = (s.actualFiles ?? []).filter(
        (f) => !declared.some((g) => matchesDeclaredGlob(f, g))
      );
      return {
        id: s.id,
        declared,
        actual: s.actualFiles ?? [],
        undeclaredWrites: writes,
      };
    })
    .filter((s) => s.undeclaredWrites.length > 0);

  // (b) pairwise real overlaps
  const overlaps: OverlapReport["overlaps"] = [];
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      const a = completed[i];
      const b = completed[j];
      const aFiles = a.actualFiles ?? [];
      const bFiles = b.actualFiles ?? [];
      const shared = aFiles.filter((f) => bFiles.includes(f));
      if (shared.length > 0) {
        overlaps.push({ a: a.id, b: b.id, shared });
      }
    }
  }

  // (d) clean (computed last, after (a) and (b) deductions)
  const tainted = new Set<string>();
  for (const u of undeclared) tainted.add(u.id);
  for (const o of overlaps) {
    tainted.add(o.a);
    tainted.add(o.b);
  }
  const clean = completed.filter((s) => !tainted.has(s.id)).map((s) => s.id);

  // (c) stale locks (best-effort — quietly skip on any error)
  const staleLocks: OverlapReport["staleLocks"] = [];
  if (lockDir) {
    try {
      const now = Date.now();
      for (const f of readdirSync(lockDir)) {
        try {
          const content = readFileSync(join(lockDir, f), "utf-8");
          const lock = JSON.parse(content) as LockRecord;
          const expires = new Date(lock.expires_at ?? "").getTime();
          if (
            Number.isFinite(expires) &&
            expires < now &&
            lock.file
          ) {
            staleLocks.push({
              file: lock.file,
              scope: lock.scope_id ?? "",
              expiresAt: lock.expires_at ?? "",
            });
          }
        } catch {
          // skip malformed / unreadable locks
        }
      }
    } catch {
      // lockDir missing / unreadable — return empty staleLocks
    }
  }

  return { undeclared, overlaps, staleLocks, clean };
}
