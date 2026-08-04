# Fusion Integration Facts

> **Audience:** SW-002 (the executor of the host-agnostic refactor).
> **Provenance:** Every path and API name recorded here was extracted from
> the shallow clone at `tmp/fusion-inspect/` (commit `241a5c94ea7cc506088160f6649e9972922d0899`,
> `git ls-remote https://github.com/Runfusion/Fusion HEAD`). No path was
> inferred from training data. Where a fact could not be confirmed, it is
> labeled `unverified — needs SW-002 in-flight check`.
>
> **Companion:** `docs/design/host-agnostic-architecture.md`.
> **SW-002 brief:** this task's `key="plan"` document.

## 1. How Fusion consumes skills

**Empirical finding:** Fusion does not consume stelow skills directly. It
ships its own `fusion` skill at `packages/cli/skill/fusion/SKILL.md` and
mirrors it into consumer skill directories at install time. The relevant
mirror paths are:

| Path | Source | When |
|------|--------|------|
| `<project>/.claude/skills/fusion` | `packages/cli/skill/fusion/` | when `pi-claude-cli` is configured (see `packages/cli/src/commands/claude-skills.ts` "Install Fusion skill into project") |
| `~/.claude/skills/fusion` | global variant of the above | aggregate install at `fn init` |
| `~/.codex/skills/fusion` | same | Codex target |
| `~/.gemini/skills/fusion` | same | Gemini target |

**Mechanism:** `packages/cli/src/commands/claude-skills.ts:installFusionSkillIntoProject`
prefers a `symlinkSync` of the shipped `packages/cli/skill/fusion` into the
target, falling back to a recursive copy on platforms where symlinks fail
(typically Windows). The install is idempotent (already-installed symlink:
no-op; stale/foreign: replaced). Decision to install is gated by
`isPiClaudeCliConfigured(globalSettings)` — when `pi-claude-cli` is not
configured, **no `.claude/skills/` directory is created** (verified at
`packages/cli/src/commands/claude-skills.ts:97` and its callers).

**Plugin skills (stelow-style, vendored):** Plugins ship their own
`src/skills/<name>/SKILL.md` trees and install them into a plugin-local
target. Reference example:
`plugins/fusion-plugin-compound-engineering/src/skill-installation.ts`
uses `resolveDefaultInstallTargetRoot()` → `<pkg>/.fusion-ce-skills/` and
has a hard guard refusing to install into any global
`~/.claude/`, `~/.codex/`, or `~/.gemini/skills` tree (`GLOBAL_SKILL_DIR_PATTERN`).

**Engine ingestion:** The engine passes those installed skill body
directories into `DefaultResourceLoader` via `additionalSkillPaths`
(key at `packages/engine/src/pi.ts:2396`):
```ts
new DefaultResourceLoader({
  cwd: resolvedProjectRoot,
  agentDir: getFusionAgentDir(),
  settingsManager,
  ...
  additionalSkillPaths: normalizedAdditionalSkillPaths,
  skillsOverride: skillsOverrideFn,
});
```
The empirical reality (per the comment block at
`packages/engine/src/session-skill-context.ts:135` and the standalone
`plugins/fusion-plugin-compound-engineering/src/skill-installation.ts:13`):
**plugin skill bodies MUST be physically installed into a
`DefaultResourceLoader`-discoverable directory** — the engine never
re-scans plugin packages, so `PluginSkillContribution.skillFiles` only
contributes a *name* that the resolver then tries to match against
already-discovered skills. Name-only registration without a matching
`SKILL.md` on disk returns nothing.

**Stelow integration shape (conclusion):** Stelow ships as a **plugin**
in the Fusion sense. SW-002 must create `plugins/fusion-plugin-stelow/`
with:

- `manifest.json` — `id: "fusion-plugin-stelow"`, `name`, `version`,
  `dashboardViews[]` (optional), `uiSlots[]` (optional), `settingsSchema`.
  See `plugins/fusion-plugin-compound-engineering/manifest.json` for the
  canonical schema.
- `src/agent-installation.ts` — copy vendored `stelow-product-orchestrator`
  + the 24 partner skills into a plugin-local `.fusion-stelow-skills/`
  directory at plugin load, guarded against global `.claude/`, `.codex/`,
  `.gemini/skills` writes.
- `src/skill-installation.ts` — same shape as the compound-engineering
  plugin's `installBundledCeSkills`.
- `src/index.ts` — plugin entry, registers `fn_*` tool wrappers through
  `definePlugin({...})` from `@fusion/plugin-sdk` (see
  `packages/plugin-sdk/src/index.ts`).

The plugin does NOT extend the host extension (`@runfusion/fusion`) —
**the host extension is already the right place for skill-routing tools**.
The plugin's role is to install the skills and add a dashboard surface;
the host extension handles `fn_skills_install` (which writes
`.fusion/skills/` for the consumer harness).

## 2. Skill source-of-truth directories

Fusion project-level and global locations:

| Path | Use |
|------|-----|
| `.fusion/project.json` | Canonical local project identity (verified at `packages/cli/skill/fusion/references/task-structure.md:13`) |
| `.fusion/config.json` | Project-scoped settings (e.g. `worktrunk.*`) |
| `.fusion/settings.json` | Project-tier overlay read by `skill-resolver.ts:141` (`getProjectSettings`) |
| `.fusion/tasks/<id>/PROMPT.md` | Per-task specification (auto-generated by triage AI) |
| `.fusion/tasks/<id>/agent.log` | Per-task execution log |
| `.fusion/tasks/<id>/attachments/` | Per-task attachments |
| `.fusion/skills/` | Project-level skills written by `fn_skills_install` |
| `~/.fusion/agent/settings.json` | Global user settings (chmod 600) |
| `~/.fusion/settings.json` | Same, lighter key set |
| `~/.fusion/memory/` | Project memory (parallels stelow's `.fusion/memory/`) |
| `~/.agents/skills/` | Generic agentskills.io target (also written by `fn_skills_install`) |

For stelow's `stelow.json` to remain stable across hosts, SW-002 should
**not** migrate stelow's tracking file under `.fusion/`. The two are
separate concerns: Fusion tracks **tasks** (work units); stelow tracks
**workflows** (Shape Up pipelines). They overlap conceptually but have
different lifecycle granularity. Recommendation: leave `stelow.json` at
project root, and have the Fusion plugin's `*.index.json` live in `.fusion/`.

## 3. Workflow registration format

Fusion's "workflow" is a **first-class entity** with its own tool surface,
not a hidden config file. The canonical surface:

| Tool | Signature | Purpose |
|------|-----------|---------|
| `fn_workflow_list` | `()` | List built-in + custom workflows |
| `fn_workflow_get` | `(workflow_id)` | Return full IR (nodes/edges/columns/artifacts/fields/settings) |
| `fn_workflow_validate` | `(workflow_id?, ir?, confirm_policy_escalation?)` | Dry-run validate IR |
| `fn_workflow_create` | `(name, description?, ir, layout?, confirm_policy_escalation?)` | Create custom workflow |
| `fn_workflow_update` | `(workflow_id, name?, description?, ir?, layout?, rehome_to?, confirm_policy_escalation?)` | Update + rehome on column removal |
| `fn_workflow_delete` | `(workflow_id)` | Delete custom (built-ins protected) |
| `fn_workflow_settings` | `(action, workflow_id, values?)` | Get/set per-(workflow,project) setting values |
| `fn_workflow_select` | `(workflow_id, task_id?)` | Assign workflow to a task |
| `fn_trait_list` | `()` | List column traits |

Reference: `packages/cli/skill/fusion/references/extension-tools.md:223-305`
and `packages/cli/skill/fusion/references/engine-tools.md:24-34`.

**Workflow IR shape (v2, the current version):** a JSON object with
`version: "v2"`, `name`, `columns[]`, `nodes[]`, `edges[]`, `artifacts[]`,
`fields[]`, `settings[]`. The v1 → v2 migration introduced step-inversion
constructs (`parse-steps`, `foreach`, `step-execute`, `step-review`,
`code` nodes, `rework` edges). Reference: `engine-tools.md:24` quotes the
full description produced by `createWorkflowCreateTool` in
`packages/engine/src/agent-tools.ts:2810`.

**Built-in workflow IDs:** `builtin:coding` is the canonical example
(used in `task-management.md:25` and `engine-tools.md:140`).

**Stelow's mapping:** Stelow's `stages.yaml` is currently a 17-stage
declarative machine. To map it into Fusion's IR, each stage becomes a
**column** (with `traits[]` for stage-guard semantics) and each transition
becomes an **edge**. The `tools:` field we're adding to `stages.yaml` maps
directly to **column traits** (which sit on the column object). The
Anthropic-style tool names (`ask_user_question`, `subagent`, `visual_review`,
`read`, `write`, `edit`, `bash`, `grep`, `ls`) become the *canonical* names;
the Fusion plugin's `fn_*` tools are the real implementation register
(`fn_ask_question`, `fn_spawn_agent`, no `visual_review` exists — the design
doc must address that).

**Important caveat for SW-002:** Fusion's `fn_workflow_create` is a host
runtime tool, not a generator script. The right pattern is:

1. **First ship:** a `scripts/generate-fusion-workflow.ts` that reads
   `stages.yaml` and emits a single `WF-XXX` IR payload (JSON) suitable
   for piping into `fn_workflow_create` from the dashboard terminal.
2. **Also ship:** a `scripts/generate-fusion-settings.ts` that emits
   `.fusion/settings.json` (matches the `.fusion/settings.json` overlay
   shape — but the actual content is mostly the plugin's `settingsSchema`
   defaults that the host already reads).
3. **Then call** `fn_workflow_create` once at install time (or instruct the
   user to click "Create workflow" in the dashboard).

The generator is stelow's contribution; the runtime registration is Fusion's
concern. **Stelow does not bypass Fusion's `fn_workflow_create` validation
gate** — it generates a payload that the host validates.

## 4. Native tools Fusion exposes

Per the canonical engine reference (`packages/cli/skill/fusion/references/engine-tools.md`),
Fusion exposes the following `fn_*` tools **at runtime** (engine has declared
which agents see which tools; the public extension surface is documented
in `extension-tools.md`):

| Tool | Agent types | Purpose |
|------|------------|---------|
| `fn_task_create` | triage, executor, heartbeat | Create a follow-up task |
| `fn_task_update` | executor | Update step status, custom fields, deps |
| `fn_task_log` | executor, heartbeat | Log entries |
| `fn_task_document_write` / `fn_task_document_read` | triage, executor, heartbeat | Save/load durable documents |
| `fn_task_prompt_write` | plan/spec review | Replace PROMPT.md during plan review |
| `fn_task_promote` | executor | Move held task out of hold column |
| `fn_task_file_scope_add` | executor | Add files beyond initial scope |
| `fn_task_done` | executor | End task (`completed` or `blocked`) |
| `fn_task_add_dep` | executor | Add dependency (confirmation-gated) |
| `fn_spawn_agent` | executor | Spawn child agent in separate worktree |
| `fn_acquire_repo_worktree` | executor (workspace) | Acquire worktree for sub-repo |
| `fn_delegate_task` | triage, executor, heartbeat | Create + assign task to agent |
| `fn_list_agents` / `fn_agent_show` / `fn_agent_org_chart` | executor, heartbeat | Agent discovery |
| `fn_send_message` / `fn_read_messages` / `fn_post_room_message` | execution/heartbeat | Inter-agent messaging |
| `fn_ask_question` | chat | Structured question to dashboard user |
| `fn_review_spec` | triage | Spawn spec reviewer (APPROVE/REVISE/RETHINK/UNAVAILABLE) |
| `fn_trait_list` / `fn_workflow_*` | executor, chat, planning | Workflow authoring |
| `fn_memory_search` / `fn_memory_get` / `fn_memory_append` | triage, executor, heartbeat | Memory layers |
| `fn_web_fetch` | many | HTTP fetch |
| `fn_research_*` | triage, executor | Bounded research runs |
| `fn_artifact_register` / `fn_artifact_list` / `fn_artifact_view` | many | Artifacts gallery |
| `fn_report_build_failure` | merger | Merge-time failure signal |

**Tools Fusion does NOT expose natively:**

- **`ask_user_question`** (Anthropic-style) — replaced by `fn_ask_question`
  (registered only for `chat` agent; an `await-input` sentinel
  `===FUSION_AWAIT_INPUT===...===END_FUSION_AWAIT_INPUT===` is the runtime
  alternative for `FUSION_WORKFLOW_STEP` lanes, verified at
  `packages/engine/src/__tests__/await-input-sentinel.test.ts:8`).
- **`subagent`** (Anthropic-style) — replaced by `fn_spawn_agent` (executor
  only). The legacy in-session `fn_review_step` is **DELETED in U10 (R9)**
  per `packages/engine/src/__tests__/legacy-tombstones.test.ts:59`. The
  `task`/`subagent`/`visual_review` tool names from stelow's `claude-tools`
  reference do NOT match Fusion's runtime vocabulary.
- **`visual_review`** — DOES NOT EXIST in Fusion as a standalone tool.
  The closest substitutes are:
  1. `fn_ask_question` for structured Q&A approval.
  2. **The workflow graph itself** — `step-review` nodes with `type:"plan"`
     or `type:"code"` surface verdicts (`approve`/`revise`/`rethink`/
     `unavailable`) as outcome edges. Reference:
     `engine-tools.md:24` quotes the full v2 IR spec.
  3. **`fn_review_spec`** (triage-only) for spec review at task creation.
  4. **For Plannotator-style visual review of markdown files:** Fusion has
     no native equivalent. The plugin must implement it itself (open a
     browser to a generated preview HTML, or call back to a local
     Plannotator binary via `fn_web_fetch` to a localhost server). The
     Fallback UX (no-op + receipt file in `.stelow/approvals/`) is the
     safe default for `visual_review` on Fusion.

**Implication for stelow:** `stages.yaml#tools:` needs a **canonical-name
PLUS host-implementation-name mapping table**. The names `ask_user_question`,
`subagent`, `visual_review`, `read`, `write`, `edit`, `bash`, `grep`, `ls`
are stelow's canonical vocabulary. The FusionAdapter implements:

| Canonical | Pi implementation | Fusion implementation |
|-----------|-------------------|----------------------|
| `ask_user_question` | `pi.ask_user_question` (registered or extension) | `fn_ask_question` for chat lanes; `===FUSION_AWAIT_INPUT===` sentinel for `FUSION_WORKFLOW_STEP` lanes |
| `subagent` | `pi.subagent` (or `start_supervision`) | `fn_spawn_agent` (executor only) |
| `visual_review` | `plannotator annotate --gate --json` via `pi.registerTool` | no-op + `.stelow/approvals/<dirHash>/<file>.approved.md` receipt |
| `read` / `write` / `edit` / `bash` / `grep` / `ls` | Pi builtins | Pi builtins (Fusion's `@earendil-works/pi-coding-agent` integration via `createFnAgent` already exposes them) |

## 5. Third-party workflow library plugin shape

Reference: `plugins/fusion-plugin-compound-engineering/`. Manifest:

```jsonc
{
  "id": "fusion-plugin-stelow",          // matches directory name
  "name": "Stelow",
  "version": "0.1.0",
  "description": "...",
  "author": "calionauta",
  "fusionVersion": ">=0.1.0",
  "dashboardViews": [
    {
      "viewId": "stelow",
      "label": "Stelow",
      "componentPath": "./dashboard-view",
      "icon": "Workflow",                 // lucide-react icon name
      "placement": "primary",
      "order": 36
    }
  ],
  "settingsSchema": {
    "skillTarget": {
      "type": "string",                   // verbatim from compound-engineering
      "label": "Skill install target",
      "description": "Plugin-local path where stelow skills are installed.",
      "group": "Skills",
      "defaultValue": ".fusion-stelow-skills/"
    },
    "defaultProvider":           { ... },
    "defaultModelId":            { ... },
    "disabledStages":            { ... },
    "reconcileOnHooks":          { ... },
    "reconcileIntervalMinutes":  { ... }
  }
}
```

Reference: `plugins/fusion-plugin-compound-engineering/manifest.json`.

**Distribution surface:**

- `package.json` of the plugin has `dependencies: { "@fusion/plugin-sdk": "workspace:*" }`.
- The plugin is referenced from the user project via `fn project add` or
  `fn settings set plugins` (the dashboard side of this is in
  `packages/dashboard/app/components/PluginsView.tsx`).
- The plugin's `src/index.ts` is what `definePlugin()` exports.

**For stelow:** the plugin's `src/index.ts` should:
1. Copy `skills/stelow-product-orchestrator/` + 24 partner skills from
   the plugin's `src/skills/` into `resolveDefaultInstallTargetRoot()`.
2. Register a `cwd-extension.ts` that mirrors `extensions/stelow/index.ts`
   for the host's `pi` extension (Fusion's host extension already wraps
   `createFnAgent`; the plugin only needs to add stelow's `fn_*` tools —
   IF they don't conflict with the host's). **Decision point for SW-002:**
   host extension vs plugin for the `fn_*` tool wrappers. The compound-
   engineering plugin uses a host extension for its `ce-*` tools; the
   same shape works for stelow.

## 6. Concrete copy-pasteable examples

Each example below is a real, path-grounded snippet from `tmp/fusion-inspect/`.

### 6.1 Skill install (reference)

```ts
// packages/cli/src/commands/claude-skills.ts:installFusionSkillIntoProject
const target = join(projectPath, ".claude", "skills", FUSION_SKILL_NAME);
if (options.enabled === false) {
  return { outcome: "skipped", target, reason: "pi-claude-cli not configured" };
}
// ... prefer symlinkSync, fall back to cpSync, never throw
```

### 6.2 DefaultResourceLoader wiring (reference)

```ts
// packages/engine/src/pi.ts:2393
const resourceLoader = new DefaultResourceLoader({
  cwd: resolvedProjectRoot,
  agentDir: getFusionAgentDir(),
  settingsManager,
  systemPromptOverride: () => options.systemPromptLayers?.stable ?? options.systemPrompt,
  appendSystemPromptOverride: () =>
    options.systemPromptLayers?.dynamic
      ? [options.systemPromptLayers.dynamic]
      : [],
  ...(effectiveExtensionPaths.length > 0
    ? { additionalExtensionPaths: [...effectiveExtensionPaths] }
    : {}),
  ...(normalizedAdditionalSkillPaths.length > 0
    ? { additionalSkillPaths: normalizedAdditionalSkillPaths }
    : {}),
  ...(skillsOverrideFn ? { skillsOverride: skillsOverrideFn } : {}),
});
await resourceLoader.reload();
```

### 6.3 Plugin skill install (reference)

```ts
// plugins/fusion-plugin-compound-engineering/src/skill-installation.ts:115
export function resolveDefaultInstallTargetRoot(): string {
  const here = fileURLToPath(import.meta.url);
  // <pkg>/(src|dist)/skill-installation.* -> <pkg>/.fusion-ce-skills
  return resolve(dirname(here), "..", ".fusion-ce-skills");
}
```

### 6.4 Workflow IR skeleton (reference)

```jsonc
// From engine-tools.md:118
{
  "version": "v2",
  "name": "Stelow",
  "columns": [
    { "id": "triage",    "name": "Triage", "traits": [] },
    { "id": "shape",     "name": "Shape",  "traits": [] },
    { "id": "gate",      "name": "Gate",   "traits": [] },
    { "id": "execution", "name": "Execution", "traits": [] }
  ],
  "nodes": [],
  "edges": [],
  "settings": [
    { "id": "reviewHandoffPolicy", "name": "Review handoff", "type": "enum",
      "default": "disabled", "options": [...] }
  ]
}
```

### 6.5 `fn_ask_question` (the canonical ask-user-question equivalent)

```ts
// From engine-tools.md:60
| `fn_ask_question` | chat | Ask the user a structured question that renders as
| an interactive chat card; after calling it, end the turn and wait for
| the user's next message
| `questions` (array of objects with `question`, optional `header`,
| optional `description`, optional `type`, optional `options`,
| optional `multiSelect`)
```

### 6.6 Await-input sentinel (workflow-step fallback)

```
===FUSION_AWAIT_INPUT===
Pick one:
1. A
2. B
===END_FUSION_AWAIT_INPUT===
```

Verified at `packages/engine/src/__tests__/await-input-sentinel.test.ts:17`.

## 7. Conclusion — stelow's integration shape

Synthesizing the empirical facts:

**Stelow integrates with Fusion as a plugin**, not as a host extension or
as a manual workflow author. The plugin's deliverables are:

1. **Skill trees** — `stelow-product-orchestrator` + 24 partner skills,
   installed at plugin load into a plugin-local `.fusion-stelow-skills/`
   directory; the plugin then exposes them via `additionalSkillPaths`
   (verified mechanism).
2. **Workflow IR generator** — `scripts/generate-fusion-workflow.ts` reads
   `stages.yaml` and emits a `WF-XXX` JSON IR; the user (or the plugin's
   install hook) calls `fn_workflow_create` once to register it.
3. **Settings emitter** — `scripts/generate-fusion-settings.ts` writes
   `.fusion/settings.json` with the plugin's defaults (the bulk of which
   is the host's own settings overlay).
4. **Command generators** — `scripts/generate-fusion-cli-commands.ts`
   revives the v0.45-removed file-based command generator, targeting
   `~/.fusion/commands/sw-*.md` (the new file-based destination for
   non-Pi hosts). This is the cross-host command surface.
5. **Tool wrappers** — the plugin's host extension (cwd-extension
   registered via `extensions/stelow/adapters/fusion/`) exposes the
   Anthropic-style `visual_review` tool as a no-op + receipt writer
   (because Fusion has no native visual review). For `ask_user_question`
   and `subagent`, the plugin reuses the host's `fn_ask_question` and
   `fn_spawn_agent` (canonical-name → host-name mapping).

**What stelow does NOT do in the Fusion world:**

- Does not write to `~/.fusion/agent/settings.json` directly.
- Does not call `fn_workflow_create` itself (the user runs it via the
  dashboard CLI; the plugin's first-run hook can offer it).
- Does not run a `claude-skills.ts`-style mirror into `.claude/skills/`
  (the host's existing path already handles `pi-claude-cli` routing).
- Does not bypass `fn_workflow_create` validation — it generates IR
  payloads that pass the host's server-side validation.

**Unverified — needs SW-002 in-flight check:**

- Whether the plugin's host extension is the right place for the
  `fn_ask_question` / `fn_spawn_agent` wrappers, or whether the plugin's
  `src/index.ts` is the right place. The compound-engineering plugin
  uses a host extension (`extensions/stelow/...` analogue), but stelow
  has its own host extension (`extensions/stelow/index.ts`). Confirm
  no name collision with the host's `fn_*` tools.
- Whether `additionalSkillPaths` is the correct mechanism for the
  plugin's vendored skills, or whether `fn_skills_install` is preferred.
  The two paths appear mutually exclusive (the engine never re-scans
  plugin packages, but `fn_skills_install` writes to `.fusion/skills/`
  which the host's `DefaultResourceLoader` does scan). Pick one.
- The exact path the host reads for the skill body when the plugin
  installs to `.fusion-stelow-skills/`. The current evidence shows
  `additionalSkillPaths` is honored, but the runtime merge order with
  host's `DefaultResourceLoader` discovery is not exhaustively documented
  in the references I read.

---

**Companion:** `docs/design/host-agnostic-architecture.md`.
**SW-002 brief:** task document `key="plan"`.
