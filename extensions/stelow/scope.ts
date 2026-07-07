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
 *   - in-segment `*` ⇒ matches any non-slash chars within a single
 *                      segment (e.g. `src/auth/*.ts` matches
 *                      `src/auth/foo.ts` but not `src/auth/sub/foo.ts`).
 *                      Always non-greedy and segment-bound.
 *   - `**` as a WHOLE segment ⇒ matches zero-or-more segments (e.g.
 *                      a pattern with src, slash, double-star, slash,
 *                      star-dot-{ts,tsx} matches any ts/tsx under
 *                      src/, at any depth). Useful combined with
 *                      brace expansion.
 *   - brace expansion (one level, comma-separated alternatives) ⇒
 *                      OR over alternatives. Single-level only (no
 *                      nesting); empty alternatives are skipped.
 *   - otherwise exact match (e.g. `src/middleware/auth.ts` matches exactly)
 *
 * Pure function. Exported for unit testing + reuse in tooling.
 *
 * Brace expansion semantics (KISS — covers the 90% case, no nesting):
 *   1. Find the leftmost brace group.
 *   2. Split on `,`, drop empty alternatives.
 *   3. Substitute the group with each alternative, recurse on each.
 *   4. Match succeeds if ANY alternative matches.
 */
export function matchesDeclaredGlob(file: string, glob: string): boolean {
  // Brace expansion: short-circuit before the structural checks below.
  // `expandBraces` returns the same glob in a list when it finds no
  // closable brace group (unclosed brace or empty group), in which
  // case we fall through to structural match on the original string.
  if (glob.includes("{")) {
    const alternatives = expandBraces(glob);
    // If expansion produced the input unchanged, no real expansion
    // happened (e.g. unclosed brace, all-empty group) — treat as
    // literal path with a `{` character.
    if (alternatives.length === 1 && alternatives[0] === glob) {
      // fall through to structural match below
    } else {
      return alternatives.some((alt) => matchesDeclaredGlob(file, alt));
    }
  }
  if (glob.endsWith("/**")) return file.startsWith(glob.slice(0, -2));
  if (glob.endsWith("/*")) {
    // Trailing `/*` ⇒ single-level match. Strip the final `*` and
    // require the next char to be `/` (segment boundary) — otherwise
    // `src/auth/*` would falsely match `src/authz/foo.ts`.
    const prefix = glob.slice(0, -1);
    if (!file.startsWith(prefix)) return false;
    const rest = file.slice(prefix.length);
    return !rest.includes("/");
  }
  // In-segment `*` wildcard: split glob on `/` and match segment-by-segment.
  // Each segment of the glob is matched as a regex where `*` becomes `[^/]*`
  // and other characters are escaped literally. Whole-glob match requires
  // both sides to have the same segment count.
  if (glob.includes("*")) {
    return matchWildcardSegments(file, glob);
  }
  return file === glob;
}

/**
 * Glob-style match with internal wildcards inside the path.
 *
 * Semantics (intentionally narrow, not a full bash glob):
 *   - single-star matches zero-or-more chars within a single segment
 *     (no slash). Example: a pattern ending in dot-ts after a star
 *     matches foo.ts but not a slash foo.ts.
 *   - double-star matches zero-or-more WHOLE segments. Example: a
 *     pattern with a double-star segment matches any depth under
 *     that point in the path.
 *   - Other chars match literally (regex-escaped).
 *
 * Algorithm: small DP over (fileSegs, globSegs). Each double-star
 * segment matches any number of file segments (including zero); the
 * regular segment cases use anchored regex.
 *
 * Pure. Linear in (fileSegs x globSegs) worst case; trivial for paths.
 */
function matchWildcardSegments(file: string, glob: string): boolean {
  const fileSegs = file.split("/");
  const globSegs = glob.split("/");
  // DP table: dp[i][j] = can globSegs[0..j) match fileSegs[0..i)?
  const FI = fileSegs.length;
  const GI = globSegs.length;
  const dp: boolean[][] = Array.from({ length: FI + 1 }, () =>
    new Array(GI + 1).fill(false)
  );
  dp[0][0] = true;
  // Seed: leading `**` segments match empty file path.
  for (let j = 1; j <= GI; j++) {
    if (globSegs[j - 1] === "**") dp[0][j] = dp[0][j - 1];
  }
  for (let i = 1; i <= FI; i++) {
    for (let j = 1; j <= GI; j++) {
      const g = globSegs[j - 1];
      if (g === "**") {
        // `**` matches zero segments (dp[i][j-1]) or one+ (dp[i-1][j]).
        dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
      } else {
        dp[i][j] = dp[i - 1][j - 1] && matchSingleSegment(fileSegs[i - 1], g);
      }
    }
  }
  return dp[FI][GI];
}

/**
 * Match one file segment against one glob segment where the glob
 * segment may contain `*`. Each `*` becomes `[^/]*` and other chars
 * are escaped literally. Segment-level only — caller must ensure
 * `file` here contains no `/`.
 *
 * **Convention:** `**` MUST be its own whole segment. Embedded `**`
 * inside a segment (e.g. `**.ts`) is REJECTED — returns false. This
 * matches gitignore and bash glob behavior, where `**` is reserved
 * as a "cross any depth" marker and only meaningful as a segment.
 * If you need `*`-style wildcard + literal suffix in one segment,
 * use `*.ts` instead.
 */
function matchSingleSegment(fileSeg: string, globSeg: string): boolean {
  // Fast path: exact match.
  if (!globSeg.includes("*")) return fileSeg === globSeg;
  // Reject embedded `**` — convention requires it be its own segment.
  // (The DP in `matchWildcardSegments` handles `**` as a whole segment
  // via the `g === "**"` branch; this function is only reached for
  // segments that are not pure `**`.)
  if (globSeg.includes("**")) return false;
  // Escape regex metacharacters in globSeg, then replace `\*` with `[^/]*`.
  // Order matters: escape first, THEN replace.
  const escaped = globSeg.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  const pattern = "^" + escaped.replace(/\*/g, "[^/]*") + "$";
  return new RegExp(pattern).test(fileSeg);
}

/**
 * Expand a single-level brace group into a list of alternatives.
 * Pure. No regex, no nested-brace expansion (out of scope per JSDoc on
 * `matchesDeclaredGlob`). The recursion in the caller handles single-level
 * cases correctly; nested braces would require a real parser.
 */
function expandBraces(glob: string): string[] {
  const open = glob.indexOf("{");
  // Defensive: callers only invoke when `{` is present, but guard anyway.
  if (open === -1) return [glob];
  const close = glob.indexOf("}", open + 1);
  if (close === -1) return [glob]; // unclosed brace — treat as literal
  const head = glob.slice(0, open);
  const tail = glob.slice(close + 1);
  const alternatives = glob
    .slice(open + 1, close)
    .split(",")
    .map((alt) => alt.trim())
    .filter((alt) => alt.length > 0);
  if (alternatives.length === 0) return [glob];
  const out: string[] = [];
  for (const alt of alternatives) {
    out.push(head + alt + tail);
  }
  return out;
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
