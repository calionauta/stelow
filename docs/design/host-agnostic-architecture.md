# Host-Agnostic Architecture for Stelow

> **Audience:** SW-002 (executor of the host-agnostic refactor).
> **Status:** Plan-of-record for the refactor. Build the index.ts, the adapters,
> the deletion of Muxy/Herdr, and the skill audit against this document.
> **Empirical substrate:** `docs/design/fusion-integration-facts.md` (Fusion
> clone facts) and `task key="scaffold-audit"` (Muxy/Herdr + current bootstrap
> inventory).
> **Out of scope:** Claude Code / Codex / OpenCode / Cursor adapters (terrain
> prepared via `BaseAdapter`; per-user decision to defer PRs).

## 1. Goal & non-goals (locked-in decisions)

**Goal:** Refactor stelow to be host-agnostic. The orchestrator skill + 24
partner skills work in any agent that reads
`~/.agents/skills/<name>/SKILL.md` (the agentskills.io standard adopted by
Pi, Claude Code, Codex, Cursor, Continue, OpenCode, and others). Three
specific host integrations ship natively:

- **(a) standalone** via the agentskills.io standard.
- **(b) Pi** via the existing in-process extension (`extensions/stelow/`).
- **(c) Fusion** via a plugin (`plugins/fusion-plugin-stelow/`) that
  installs the skills and emits a workflow IR.

**(d) Any future host** via the `BaseAdapter` contract.

**Non-goals (locked-in):**

- **Zero legacy / backward compat.** No `compat-v0` branches, no
  `legacy/` shims, no deprecation periods. The Muxy/Herdr integrations
  are deleted, not deprecated.
- **DRY.** Every shared piece of logic lives in one place. The duplicate
  `stages-guard.ts` (root + `adapters/`) is consolidated.
- **KISS.** No `monorepo-of-monorepos`. The Pi + Fusion shape is two
  small adapters, not a framework.
- **Convention over configuration.** Auto-discovery over explicit config.
- **Agent-agnostic by default.** The skill paths are
  `~/.agents/skills/<name>/SKILL.md`, never `~/.pi/...` or `~/.fusion/...`.
- **Fusion-first adapter surface.** Claude Code / Codex / OpenCode /
  Cursor ship via the same `BaseAdapter` shape but the implementations
  are out of scope for this refactor (tasks separated).
- **Tool names follow Anthropic-style vocabulary.** `stages.yaml#tools:`
  uses canonical names: `ask_user_question`, `subagent`, `visual_review`,
  `read`, `write`, `edit`, `bash`, `grep`, `ls`. Each adapter maps
  canonical → host.
- **Receipt files are host-agnostic.** Plannotator's
  `.plannotator/approvals/<dirHash>/...` pattern migrates to
  `.stelow/approvals/<dirHash>/<file>.approved.md` (same convention).
- **Fusion is host, stelow is workflow library.** Fusion's engine.lock is
  off-limits; stelow ships as a plugin that consumes the public `fn_*`
  surface.

## 2. Host detection contract

**Signature:**

```ts
// extensions/stelow/adapters/host-detection.ts
export type HostName = "pi" | "fusion" | "generic";

export interface HostDescriptor {
  name: HostName;
  version?: string;
  detectedAt: string;  // ISO timestamp
  signal: "env" | "fs-probe" | "default";
}

export function detectHost(): HostDescriptor;
```

**Detection order (first match wins):**

1. **Explicit env override.** `process.env.STELOW_HOST === "pi"` or
   `"fusion"` or `"generic"` — wins unconditionally. (Used by tests +
   CI + the Fusion plugin's install hook to force the `fusion` path.)
2. **Filesystem probe** for `~/.pi/agent/registry.json` (or any
   `~/.pi/agent/...` path) → `"pi"`.
3. **Filesystem probe** for `~/.fusion/agent/settings.json` (or any
   `~/.fusion/...` path) → `"fusion"`.
4. **Default:** `"generic"` (no host-specific behavior, skills-only).

**Migration from `detectCLI()`:** The current `detectCLI()` in
`extensions/stelow/state.ts:98` returns `CLI = "pi" | "generic"`. SW-002
**renames the function to `detectHost()`**, extends the return type to
include `"fusion"`, and adds the env override + the `~/.fusion/` probe.
`getCLICapabilities(cli: CLI)` becomes `getHostCapabilities(host: HostName)`.
The `CLI` union expands to `HostName` (type alias for clean diff).

The `CLI_DETECTION_SIGNALS` constant in `state.ts` is renamed
`HOST_DETECTION_SIGNALS` and gains the `~/.fusion/` entry.

**Env var rename (also part of this migration):** the existing override
env var `PRODUCT_WORKFLOW_CLI` (see `extensions/stelow/state.ts:100` and
the test pinning at `tests/cli-detection.test.ts:22-65,172-182` plus
`tests/integration/adapters.test.ts:63,73,446-455`) is renamed to
`STELOW_HOST` to match the new vocabulary. No backward-compat alias — per
the locked-in "zero legacy" decision, the old name is dropped at the
same commit that lands the rename. SW-002 step 4 must update **both** the
production code and **all** of these test references in the same PR;
running `grep -rn "PRODUCT_WORKFLOW_CLI" extensions/ tests/` after the
rename must return empty.

**Adapter factory wiring:**

```ts
// extensions/stelow/adapters/index.ts
export function createAdapter(host?: HostName): BaseAdapter {
  const detected = host ?? detectHost().name;
  switch (detected) {
    case "pi":     return createPiAdapter();
    case "fusion": return createFusionAdapter();
    default:       return createGenericCLIAdapter();
  }
}
```

## 3. Adapter directory layout

```
extensions/stelow/
├── index.ts                            # <50 lines, host-agnostic bootstrap
├── adapters/
│   ├── base.ts                         # BaseAdapter (existing, kept + extended)
│   ├── cli-adapter.ts                  # (existing, kept + renamed to host-adapter.ts)
│   ├── generic.ts                      # GenericAdapter (existing, kept)
│   ├── host-detection.ts               # NEW — detectHost(), HostDescriptor
│   ├── pi/                             # moved from index.ts
│   │   ├── index.ts                    # PiAdapter (covers 100% of BaseAdapter)
│   │   ├── tools/
│   │   │   └── plannotator.ts          # plannotator tool registration
│   │   ├── sync-skills-runtime.ts      # ~/.pi/agent/git/* sync
│   │   ├── commands.ts                 # /sw-* slash commands (native)
│   │   ├── ui.ts                       # TUI footer, overlays
│   │   └── hooks.ts                    # session_start/tool_call/turn_end/agent_end/input
│   ├── fusion/                         # NEW — built in SW-002 step 6
│   │   ├── index.ts                    # FusionAdapter (covers BaseAdapter)
│   │   ├── generators/
│   │   │   ├── settings.ts             # .fusion/settings.json emitter
│   │   │   ├── workflow.ts             # workflow IR JSON emitter
│   │   │   └── cli-commands.ts         # file-based /sw-* command markdown
│   │   └── tools/
│   │       └── visual_review.ts        # no-op + receipt writer
│   ├── event-dispatcher.ts             # (existing, kept)
│   ├── ui-factory.ts                   # (existing, kept)
│   ├── commands/                       # (existing, kept — dispatcher etc.)
│   └── stages-guard.ts                 # (existing, kept; DELETED copy at root)
```

**Net file count after refactor:**

- `extensions/stelow/index.ts` shrinks from ~602 lines to <50.
- `extensions/stelow/adapters/pi/` grows from 2 files to 6.
- `extensions/stelow/adapters/fusion/` is new (3 generator files + 1 tool).
- `extensions/stelow/stages-guard.ts` (root copy) is deleted; the
  `adapters/stages-guard.ts` version keeps the canonical name.
- `integrations/muxy/stelow/` and `integrations/herdr/stelow/` are deleted.

## 4. BaseAdapter surface (per-method matrix)

The `BaseAdapter` abstract class lives at `extensions/stelow/adapters/base.ts`.
Current methods (carried over unchanged) plus the per-adapter implementation:

| Method | PiAdapter | FusionAdapter | GenericAdapter |
|--------|-----------|---------------|----------------|
| `name` | `"pi"` | `"fusion"` | `"generic"` |
| `setAPI(handle)` | `pi` instance (sets `_pi`, calls `initialize()`) | no-op (Fusion handle is read-only) | no-op |
| `initialize()` | wires `pi.on (...)` for 4 events; `super.initialize()` | no-op (skills pre-installed by plugin) | log + `super.initialize()` |
| `registerCommands()` | returns command descriptors for Pi's `pi.registerCommand` (called in `commands.ts`) | returns [ ] (commands are file-based, generated) | returns [ ] |
| `getCommandPrefix()` | `"/"` | `"/"` (for generated `.fusion/commands/sw-*.md`) | `"/"` |
| `onToolCall(handler)` | stored + dispatched via `pi.on("tool_call")` | stored + dispatched via `fn_*` proxy | console.warn + stored |
| `onSessionStart(handler)` | stored + dispatched via `pi.on("session_start")` | stored + dispatched via `fn_*` proxy | no-op |
| `onTurnEnd(handler)` | stored + dispatched via `pi.on("turn_end")` | stored + dispatched via `fn_*` proxy | stored |
| `onInput(handler)` | stored + dispatched via `pi.on("input")` | stored + dispatched via `fn_*` proxy | stored |
| `getAvailableTools()` | returns all 10 Pi tools mapped to canonical names | returns just the canonical names (read/write/edit/bash/grep/ls/`fn_ask_question`/`fn_spawn_agent`) | returns read/write/edit/bash/grep/ls (no question/subagent/visual) |
| `toAgnosticName(cliName)` | `ask_user_question→ask`, `plannotator→plannotator`, else identity | identity (`fn_*` names are already canonical-named via the mapping) | identity |
| `execHeadless(task, cwd)` | `pi --print "<task>"` via `execSync` | `fn_task_create` via `fn` CLI (Fusion's published CLI) | throws |
| `showNotification(msg, type)` | `pi.notify(msg, kind)` | `fn_send_message(...)` with `type: "agent-to-user"` | `console.log` |
| `showSelectList(options)` | Pi's `pi.select` (best-effort; fallback to first) | structured `fn_ask_question` with `options[].value` | first option |
| `showStatusLine(info)` | TUI footer | TUI footer (when available) | no-op |
| `clearStatusLine()` | TUI footer clear | TUI footer clear | no-op |
| `hasCapability(c)` | boolean from `CLICapabilities` | boolean from `HostCapabilities` | boolean (most false) |

**Explicitly NOT host-portable:**

- The raw `pi.registerTool` API handle (PiAdapter only).
- The raw `pi.on` event names (`"session_start"`, `"tool_call"`,
  `"turn_end"`, `"agent_end"`, `"input"`) — these are Pi-specific.
- The raw `fn_*` runtime gate calls (FusionAdapter only).
- The `init.defaultApp` and related `pi` global handle (PiAdapter only).

These remain in their respective adapter files and never reach the
host-agnostic `index.ts`.

## 5. Tool-name vocabulary

`stages.yaml#tools:` will use these canonical names everywhere:

```yaml
# anchors at the top of skills/stelow-product-orchestrator/stages.yaml
tools:
  # canonical names (used in allowed_tools, blocked_tools, preferred_tools,
  # primary_actions, and references/cli-tools/*.md)
  - ask_user_question
  - subagent
  - visual_review
  - read
  - write
  - edit
  - bash
  - grep
  - ls
```

**Mapping from current `stages.yaml` names → canonical (rename scope):**

| Current | Canonical | Notes |
|---------|-----------|-------|
| `ask` | `ask_user_question` | Rename — current `stages.yaml` uses `ask` shorthand |
| `plannotator` | `visual_review` | Rename — `plannotator` is the Pi implementation, not the canonical |
| `subagent` | `subagent` | Unchanged |
| `read` | `read` | Unchanged |
| `write` | `write` | Unchanged |
| `edit` | `edit` | Unchanged |
| `bash` | `bash` | Unchanged |
| `grep` | `grep` | Unchanged |
| `ls` | `ls` | Unchanged |
| `goal` | (drop — not core workflow) | Optional `goal` tool — out of scope |
| `intercom` | (drop — not core workflow) | Optional cross-agent — out of scope |
| `supervise` | (drop — covered by `subagent`) | Legacy alias |
| `agent_browser` | (drop — not core workflow) | Specialized browser tool — out of scope |

**Adapter mapping (canonical → host):**

| Canonical | Pi | Fusion |
|-----------|----|----|
| `ask_user_question` | `pi.ask_user_question` (via `@juicesharp/rpiv-ask-user-question`) | `fn_ask_question` (chat lane) / `===FUSION_AWAIT_INPUT===` sentinel (workflow-step lane) |
| `subagent` | `pi.subagent` (via `pi-subagents`) / `pi.supervise` (via `pi-supervisor`) | `fn_spawn_agent` (executor lane) |
| `visual_review` | `plannotator annotate --gate --json` via `pi.registerTool` | no-op + `.stelow/approvals/<dirHash>/<file>.approved.md` |
| `read`/`write`/`edit`/`bash`/`grep`/`ls` | Pi builtins | Pi builtins (Fusion's `createFnAgent` pins `@earendil-works/pi-coding-agent`) |

**Skill consumers to update:**

- `skills/stelow-product-orchestrator/stages.yaml` — replace `ask` →
  `ask_user_question`, `plannotator` → `visual_review` everywhere.
- `skills/stelow-product-orchestrator/references/cli-tools/ask.md` —
  rename to `ask-user-question.md` (or keep filename, update content).
- `skills/stelow-product-orchestrator/references/cli-tools/plannotator.md`
  — rename to `visual-review.md` (or keep filename, update content).
- `skills/stelow-product-orchestrator/references/cli-tools/README.md` —
  update the tool index table.
- `skills/stelow-product-tech-planning/SKILL.md` (lines 471-495) — replace
  `plannotator` references with `visual_review`.
- `skills/stelow-product-interface-alternatives/SKILL.md` (lines 138-147) —
  same.
- `skills/stelow-product-scope-executor/SKILL.md` (line 1019 reference
  table) — same.
- `skills/stelow-product-orchestrator/references/capabilities.md` (line 11)
  — same.
- `skills/stelow-product-orchestrator/references/cli-tools/todo.md`
  (lines 145, 154) — same.

**Confirm none of the existing `references/cli-tools/*.md` files break:**

- `references/cli-tools/ask.md` — the only "ask" occurrence is the tool name;
  rename to `ask_user_question` everywhere in the file.
- `references/cli-tools/plannotator.md` — keep the filename (it's a "tool
  reference" for the Pi implementation), but rename the tool calls to
  `visual_review` and add a note that the canonical name is `visual_review`.
- `references/cli-tools/subagents.md` — already uses `subagent`; no change.
- `references/cli-tools/goals.md`, `intercom.md`, `supervise.md` —
  out-of-scope tools; leave the files, but mark them as `not part of the
  canonical vocabulary` in their headers.

## 6. `stelow.json#host` field

**Current `Workflow` interface** (in `extensions/stelow/types.ts`):

```ts
export interface Workflow {
  // ... existing fields ...
  detectedCLI?: string;   // current CLI harness name
}
```

**After:**

```ts
/**
 * Optional host registration. The adapter that wrote this workflow record
 * sets this field on first write. Pure additive — readers that pre-date
 * the field see `undefined` and fall back to the legacy `detectedCLI`
 * heuristic (or assume `generic`).
 */
export interface HostRegistration {
  /** The host that detected/owned this workflow record. */
  name: "pi" | "fusion" | "generic";
  /** The host runtime version (e.g. "0.80.6" for Pi, "0.1.31" for Fusion). */
  version?: string;
  /** ISO timestamp of when the adapter registered this field. */
  registeredAt: string;
}

export interface Workflow {
  // ... existing fields ...
  detectedCLI?: string;        // legacy (kept for back-compat reads)
  host?: HostRegistration;     // new — preferred by readers post-refactor
}
```

**JSON schema snippet** (additive to `stelow.schema.json`):

```jsonc
{
  "properties": {
    "workflows": {
      "items": {
        "properties": {
          "host": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "name":       { "enum": ["pi", "fusion", "generic"] },
              "version":    { "type": "string" },
              "registeredAt": { "type": "string", "format": "date-time" }
            },
            "required": ["name", "registeredAt"]
          }
        }
      }
    }
  }
}
```

**Migration:** No migration needed. Existing `stelow.json` files without
`host` field read as `host: undefined` and the adapter falls back to the
filesystem probe + `detectedCLI` field. Authors who want the new field
can re-run `/sw-start` from any host to set it on the next write.

**Where the field is written:**

- `extensions/stelow/state.ts` `writeTracking()` — set `host` to the
  current `detectHost()` result if not already set.
- The Fusion plugin's `installBundledStelowSkills()` — sets `host: { name: "fusion", version: ... }` on first run.

## 7. **`stages.yaml#tools:` section**

Add to `skills/stelow-product-orchestrator/stages.yaml` (right after the
existing `allowed_tools` / `blocked_tools` / `preferred_tools` machinery):

```yaml
# Canonical tool vocabulary (host-agnostic). Each stage's allowed_tools,
# blocked_tools, preferred_tools, primary_actions reference these names.
# Adapters map canonical → host.
tools:
  - ask_user_question
  - subagent
  - visual_review
  - read
  - write
  - edit
  - bash
  - grep
  - ls

# Optional: per-host aliases (validated by stages-guard at boot).
tool_aliases:
  pi:
    ask_user_question: ask_user_question   # native in pi
    subagent: subagent                     # native in pi
    visual_review: plannotator             # implementation name
  fusion:
    ask_user_question: fn_ask_question
    subagent: fn_spawn_agent
    visual_review: visual_review           # no-op + receipt
  generic:
    ask_user_question: ask_user_question   # no-op
    subagent: subagent                     # no-op
    visual_review: visual_review           # no-op
```

**Stage guard updates:** `stages-guard.ts` already validates against the
canonical names; the rename is purely a `stages.yaml` edit. The guard
load on `createStagesGuardFromPaths` (verified at `stages-guard.ts`)
loads the YAML and validates each stage's `allowed_tools` against the
canonical set.

## 8. Command generators

Revive and rewrite `scripts/generate-cli-commands.ts` (currently a no-op
stub, see the current file's `process.exit(0)`). New behavior:

```ts
// scripts/generate-cli-commands.ts (target shape)
const TARGETS = {
  pi:      { kind: "native",    outDir: null /* uses pi.registerCommand */ },
  fusion:  { kind: "file",      outDir: ".fusion/commands/" },
  generic: { kind: "file",      outDir: ".stelow/commands/" },
} as const;

export function generateCliCommands(target: keyof typeof TARGETS, outDir?: string): {
  generated: number;
  target: string;
};
```

**Output for `fusion` target:** one markdown file per `WORKFLOW_COMMANDS`
entry (12 commands: `/sw-start`, `/sw-next`, `/sw-prev`, `/sw-info`,
`/sw-inbox`, `/sw-abort`, `/sw-archive`, `/sw-pause`, `/sw-resume`,
`/sw-status`, `/sw-ls`, `/sw-setphase`, `/sw-complete`, `/sw-rename`,
`/sw-clean`). Each file is a `===FUSION_AWAIT_INPUT===` question
template that the user can double-click in the dashboard's chat UI.

**Output for `generic` target:** same shape; the consumer (any
agentskills-compatible host) reads the markdown as a skill named
`/sw-<name>`.

**Output for `pi` target:** no file output (Pi uses native
`pi.registerCommand`); the script prints a "0 generated, native" line so
the prepublish lifecycle hook doesn't break.

**Lifecycle:** `npm run generate-cli-commands` runs for all targets
(`pi`, `fusion`, `generic`). The prepublish hook (`prepublishOnly`) calls
it. Build artifacts in `extensions/stelow/adapters/fusion/commands/` are
gitignored (`build/` is already gitignored).

## 9. Muxy/Herdr deletion

**Verifier:** these are substantive, versioned implementations being
removed by user mandate for maintenance/no-legacy scope, not unused
scaffolds. The full evidence is in `task key="scaffold-audit"`.

**SW-002 step 1 deletion commands (executed in order):**

```bash
# 1. Remove the integration trees
rm -rf integrations/muxy/
rm -rf integrations/herdr/

# 2. Update package.json
#    - Remove "integrations/muxy/stelow/" from files[]
#    - Remove "integrations/herdr/stelow/" from files[]
#    - In scripts.version: remove "git add -f integrations/herdr/stelow/herdr-plugin.toml"

# 3. Update scripts/version-sync.mjs
#    - JSON_TARGETS is already empty; leave it
#    - TOML_TARGETS: remove the herdr entry
#    - Update the header comment block to reflect the empty state

# 4. Update .release.yml
#    - Remove "integrations/herdr/stelow/herdr-plugin.toml" from version_files

# 5. Update setup.sh
#    - Remove lines 617-691 (the herdr + muxy install sections)

# 6. Delete test files that import the deleted modules
rm tests/unit/muxy-manifest-schema.test.ts
rm tests/unit/muxy-workflow-data.test.ts
rm tests/unit/parse-scopes-from-spec-tech.test.ts
rm tests/unit/scope-panel-data.test.ts
rm tests/unit/herdr-cwd-matches.test.ts

# 7. Update doc references
#    - AGENTS.md lines 20-26: remove the "Critical Muxy extension knowledge" section
#    - AGENTS.md line 39: rewrite the "Top-level layout" table (remove integrations/muxy/, integrations/herdr/)
#    - extensions/stelow/state.ts line 788: remove the @mirror comment
#    - extensions/stelow/workflow-root.ts line 20: remove the herdr pointer

# 8. CHANGELOG.md: do NOT edit (append-only history)
```

**Verification:** after deletion, run:
```bash
grep -rn "integrations/muxy\|integrations/herdr" --include="*.ts" --include="*.json" --include="*.mjs" --include="*.sh" --include="*.md" --include="*.yml" --include="*.toml" . | grep -v node_modules | grep -v CHANGELOG.md
```
Expected output: empty (or only CHANGELOG.md entries).

## 10. Migration sequencing (SW-002's task list)

The order below is derived from the dependencies between changes. Bold
items are required; the rest are sequenced for reviewability.

1. **Delete `integrations/muxy/` and `integrations/herdr/`** (per §9).
   Why first: reduces the surface area the rest of the refactor has to
   keep in sync. No other change touches these files.
2. **Slim `extensions/stelow/index.ts` to <50 lines** (host-agnostic
   bootstrap). The Pi-specific code is moved to `extensions/stelow/adapters/pi/`.
   Why second: the consolidated Pi code becomes the source of truth for
   the adapter's tests.
3. **Split `extensions/stelow/adapters/pi/`** per the §3 layout.
   `tools/plannotator.ts`, `sync-skills-runtime.ts`, `commands.ts`,
   `ui.ts`, `hooks.ts`. Why third: the Pi adapter becomes the reference
   for Fusion adapter shape.
4. **Add `extensions/stelow/adapters/host-detection.ts`** with
   `detectHost()` + `HostDescriptor`. Update `extensions/stelow/state.ts`
   to rename `detectCLI` → `detectHost` and `CLI` → `HostName`. Why
   fourth: the host-agnostic index.ts needs detection.
5. **Add `stages.yaml#tools:` section** + alias table. Update all
   `stages.yaml` references (`ask` → `ask_user_question`, `plannotator`
   → `visual_review`). Update `references/cli-tools/*.md` to match the
   canonical vocabulary. Why fifth: the canonical vocabulary gates the
   Fusion adapter's tool mapping.
6. **Add `extensions/stelow/adapters/fusion/`** per the §3 layout.
   `generators/settings.ts`, `generators/workflow.ts`,
   `generators/cli-commands.ts`, `tools/visual_review.ts`. Why sixth: the
   generators need both the canonical vocabulary and the host-detection
   contract.
7. **Add `Workflow#host` field** to `types.ts` + `stelow.schema.json`.
   Update `state.ts` `writeTracking()` to set `host` on first write. Why
   seventh: the field is purely additive; the rest of the refactor must
   land first to avoid mix-in races.
8. **Skill audit framework** — for each of the 25 skills, flag:
   - Plannotator hard-coding → needs `visual_review` rename.
   - Pi-specific paths (`~/.pi/...`) → strip or relocate.
   - agentskills.io standard compliance (`~/.agents/skills/<name>/SKILL.md`).
   - Market-standard idiom alignment.
   This is **NOT a code change** in SW-002 — it spawns ~10 follow-up
   tasks for SW-003+ to do skill-by-skill rewrites.
9. **Ship the Fusion plugin** at `plugins/fusion-plugin-stelow/` with
   `manifest.json`, `src/skill-installation.ts`, `src/index.ts`,
   `package.json`. Why ninth: the plugin is separate from the
   extension; ships as a follow-up after the extension refactor is
   stable.
10. **Docs & verification** — update `architecture.md` "Adding a Harness
    Adapter" section to point at the new layout. Update `AGENTS.md` to
    reflect the new directory structure. Run `npm run build`,
    `npm run typecheck`, `npm test`.

Each step is expected to be a single PR (or single commit if the
worktree workflow allows it). Review gates run at the configured plan
positions.

## 11. Skill audit framework

For each of the 25 skills, run this checklist (clone from existing
`/home/deploy/projects/stelow/.worktrees/sandy-ridge/skills/`):

| Check | What to look for | Action |
|-------|------------------|--------|
| **Plannotator hard-coding** | References to `plannotator annotate --gate`, `.plannotator/approvals/...`, the `plannotator` tool name | Replace `plannotator` → `visual_review`; replace `.plannotator/...` → `.stelow/approvals/...` (same receipt contract, generic path) |
| **Pi-specific paths** | `~/.pi/`, `~/.pi/agent/git/...`, `.pi-subagents` | Strip; replace with `~/.agents/skills/...` (agentskills.io standard) |
| **agentskills.io compliance** | `~/.agents/skills/<name>/SKILL.md` format, frontmatter (`name`, `description`, `argument-hint`) | Verify and fix |
| **Market-standard idiom** | Use Anthropic-style tool names (`ask_user_question`, `subagent`, `visual_review`, `read`, `write`, `edit`, `bash`, `grep`, `ls`) | Rename in skill body + `references/cli-tools/*.md` |
| **Receipt-path portability** | Hard-coded `.plannotator/approvals/<dirHash>/...` paths | Switch to `.stelow/approvals/<dirHash>/<file>.approved.md` |
| **Tool-block documentation** | `references/cli-tools/*.md` files | Update names per the §5 rename table |

**Out of scope for SW-002 step 8 (the audit framework itself):** SW-002
just writes the audit framework and **spawns one task per skill class**
(e.g. "Audit shape/ skills for plannotator hard-coding"). The actual
skill rewrites are downstream tasks.

---

**Empirical Fusion facts:** `docs/design/fusion-integration-facts.md`.
**Integration audit:** this task's `key="scaffold-audit"` document
(key retained for compatibility).
**SW-002 brief:** this task's `key="plan"` document.
