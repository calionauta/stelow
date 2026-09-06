# Scope Initialization Fallback (hosts without native scope sync)

> **Audience:** agents whose host does not sync scopes natively.
> Hosts with a native scope-sync hook use the shared `parseSpecTechScopes`
> path through their own integration; they do not need this fallback.
> All other agents run the snippet below before executing scopes.

## Contract

The snippet mirrors `syncScopesIfNeeded` in `extensions/stelow/state.ts`:

- It reads `$STELOW_ROOT/stelow.json` and selects `workflows[$WF_INDEX]`.
- It derives `.stelow/{date}/{dirHash}/plans/` from the workflow. A missing or
  invalid `created` timestamp uses today's UTC date, matching the canonical
  `isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate)`
  behavior.
- It selects the lexicographically latest `spec-tech_*.md` file.
- It skips a workflow whose non-empty `scopes[]` already records that filename,
  and re-syncs when a newer filename is present.
- It calls **only** the shipped compiled `parseSpecTechScopes` artifact. There is
  no inline parser and no parser-switching catch block: a missing or broken
  artifact is a hard, actionable error rather than a silent semantic fork.
- An absent/unreadable/malformed tracking file, missing plans file, unreadable
  spec-tech file, or spec-tech file with no scope blocks is a safe exit-0 no-op.
  Existing state is never replaced with an empty scope list.
- Successful writes use a same-directory temporary file followed by `rename`.

## Inputs

| Variable | Default | Meaning |
|---|---|---|
| `STELOW_ROOT` | `.` | Project root containing `stelow.json` |
| `WF_INDEX` | `0` | Index in `tracking.workflows[]` |
| `STELOW_PACKAGE_ROOT` | discovered | Root of an installed/checked-out Stelow package |
| `STELOW_PARSER_PATH` | discovered | Explicit path to the compiled `state.js` artifact (useful for package layouts or verification) |

The loader first honors `STELOW_PARSER_PATH`, then resolves the package root
from `STELOW_PACKAGE_ROOT`, the current checkout, or the installed package
entrypoint. It ultimately loads `build/extensions/stelow/state.js`; it never
silently substitutes another parser.

## Snippet

Copy this complete block into a shell. It requires Node.js 20+ and a Stelow
installation that includes the compiled build artifact.

```bash
STELOW_ROOT="${STELOW_ROOT:-.}" WF_INDEX="${WF_INDEX:-0}" node -e '
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.env.STELOW_ROOT || ".");
const workflowIndex = Number.parseInt(process.env.WF_INDEX || "0", 10);
const trackingPath = path.join(root, "stelow.json");

function message(text) {
  process.stderr.write(`[scope-init-fallback] ${text}\n`);
}
function stop(text, code = 0) {
  message(text);
  process.exit(code);
}
function packageRootFrom(start) {
  let current = path.resolve(start);
  while (true) {
    try {
      const metadata = JSON.parse(fs.readFileSync(path.join(current, "package.json"), "utf8"));
      if (metadata && metadata.name === "@calionauta/stelow") return current;
    } catch {
      // Keep walking. A project directory can have no package.json or an
      // unrelated/malformed package manifest.
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function parserPath() {
  if (process.env.STELOW_PARSER_PATH) return path.resolve(process.env.STELOW_PARSER_PATH);
  const explicitRoot = process.env.STELOW_PACKAGE_ROOT;
  const packageRoot = explicitRoot
    ? path.resolve(explicitRoot)
    : packageRootFrom(process.cwd());
  if (packageRoot) return path.join(packageRoot, "build", "extensions", "stelow", "state.js");
  try {
    const entry = require.resolve("@calionauta/stelow");
    const installedRoot = packageRootFrom(path.dirname(entry));
    if (installedRoot) return path.join(installedRoot, "build", "extensions", "stelow", "state.js");
  } catch {
    // The final diagnostic below explains how to provide the package root.
  }
  return "@calionauta/stelow/build/extensions/stelow/state.js";
}

let tracking;
try {
  tracking = JSON.parse(fs.readFileSync(trackingPath, "utf8"));
} catch (error) {
  stop(`could not read or parse ${trackingPath}; leaving state unchanged (${error && error.message ? error.message : String(error)})`);
}

const workflow = tracking && Array.isArray(tracking.workflows)
  ? tracking.workflows[workflowIndex]
  : undefined;
if (!workflow) stop(`no workflow at index ${workflowIndex}; leaving state unchanged`);
if (!workflow.dirHash) stop("workflow has no dirHash; leaving state unchanged");

let created;
try {
  created = new Date(workflow.created);
} catch {
  // A legacy/non-coercible timestamp follows the same today fallback.
  created = new Date(Number.NaN);
}
const dateStamp = Number.isNaN(created.getTime())
  ? new Date().toISOString().slice(0, 10)
  : created.toISOString().slice(0, 10);
const plansDir = path.join(root, ".stelow", dateStamp, workflow.dirHash, "plans");

let files;
try {
  files = fs.readdirSync(plansDir)
    .filter((name) => name.startsWith("spec-tech_") && name.endsWith(".md"))
    .sort();
} catch (error) {
  stop(`could not read plans directory ${plansDir}; leaving state unchanged (${error && error.message ? error.message : String(error)})`);
}
if (files.length === 0) stop(`no spec-tech_*.md under ${plansDir}; leaving state unchanged`);

const latest = files[files.length - 1];
if (Array.isArray(workflow.scopes) && workflow.scopes.length > 0 && workflow.specTechFile === latest) {
  stop(`scopes already in sync with ${latest}`);
}

let content;
try {
  content = fs.readFileSync(path.join(plansDir, latest), "utf8");
} catch (error) {
  stop(`could not read ${latest}; leaving state unchanged (${error && error.message ? error.message : String(error)})`);
}

let parseSpecTechScopes;
const selectedParser = parserPath();
try {
  const parserModule = require(selectedParser);
  parseSpecTechScopes = parserModule && parserModule.parseSpecTechScopes;
} catch (error) {
  stop(`could not load the canonical parser at ${selectedParser}. Build or install Stelow first, or set STELOW_PARSER_PATH to a compatible compiled state.js (${error && error.message ? error.message : String(error)})`, 1);
}
if (typeof parseSpecTechScopes !== "function") {
  stop(`canonical parser at ${selectedParser} does not export parseSpecTechScopes`, 1);
}

let scopes;
try {
  scopes = parseSpecTechScopes(content);
} catch (error) {
  stop(`canonical parser failed for ${latest}; state was not written (${error && error.message ? error.message : String(error)})`, 1);
}
if (!Array.isArray(scopes) || scopes.length === 0) {
  stop(`${latest} had no [SCOPE-N] blocks; scopes left as-is`);
}

workflow.scopes = scopes;
workflow.specTechFile = latest;
workflow.updated = new Date().toISOString();
const temporaryPath = `${trackingPath}.${process.pid}.tmp`;
try {
  fs.writeFileSync(temporaryPath, JSON.stringify(tracking, null, 2) + "\n", "utf8");
  fs.renameSync(temporaryPath, trackingPath);
} catch (error) {
  try { fs.rmSync(temporaryPath, { force: true }); } catch { /* preserve write error */ }
  stop(`could not persist ${trackingPath}; state was not intentionally changed (${error && error.message ? error.message : String(error)})`, 1);
}
process.stdout.write(`[scope-init-fallback] synced ${scopes.length} scopes from ${latest}\n`);
'
```

## Runtime-state matrix

| Input state | Result |
|---|---|
| Empty `wf.scopes[]`, latest `spec-tech_v1.md` present | Parse and populate; set `wf.specTechFile` |
| Populated scopes and `wf.specTechFile === latest` | Exit 0 without writing |
| Populated scopes and a newer latest filename | Parse and replace the entire array |
| No `spec-tech_*.md` | Exit 0 with a stderr warning; preserve tracking |
| No `[SCOPE-N]` blocks | Exit 0 with a stderr warning; preserve scopes and version |
| Multiple versions | Use the lexicographically latest filename |
| Invalid/legacy `wf.created` | Look under today's UTC date |
| Malformed `stelow.json` | Exit 0 with a stderr warning; preserve the bytes |
| Canonical artifact unavailable or invalid | Exit 1 with an actionable diagnostic; never run a second parser |

## Host boundary

- **Native hook:** the host persists tracking through the shared state module.
- **Managed write path:** a compiled host plugin uses the same host-agnostic parser path.
- **Explicit fallback:** run this reference, needed only when the host provides
  no native `writeTracking`/scope-sync hook.

Canonical implementation: `extensions/stelow/state.ts`,
`parseSpecTechScopes` and `syncScopesIfNeeded`. This reference does not modify
those functions or maintain a parser mirror.
