# Stelow Fusion plugin

A compiled, dependency-free external Fusion plugin for Stelow's product-planning
workflow. It contributes all 25 canonical Stelow skills, bundles validated
settings and v2 workflow resources, installs project-owned integration files,
and maintains one project-scoped workflow.

## Audited Fusion contract

The implementation was audited against Runfusion/Fusion commit
`d5df6fc63554149f392f84b12e49216e84f91e20` (2026-07-22), specifically the
public external-plugin loader/scaffold, `PluginSkillContribution.skillFiles`,
plugin skill-path resolver, reduced CLI loader, `PluginContext.taskStore`, and
workflow-definition create/update/delete paths. Emitted JavaScript imports no
private `@fusion/*` package, `workspace:*` range, or runtime SDK.

Fusion resolves every `skillFiles[0]` relative to this plugin root and threads
those paths into session skill discovery. The plugin does not copy skills to
`.claude`, `.codex`, `.gemini`, `.agents`, or user-global skill directories.

## Build, validate, and install

```bash
npm ci
npm run build
fn workflow validate --file plugins/fusion-plugin-stelow/artifacts/workflows/stelow-v2.json --json
fn plugin publish --dry-run plugins/fusion-plugin-stelow
fn plugin install ./plugins/fusion-plugin-stelow
fn plugin enable fusion-plugin-stelow
fn plugin list
```

`fn workflow validate` is a dry run and must succeed before registration. For a
packed Stelow release, extract the root tarball and install its nested
`package/plugins/fusion-plugin-stelow/` directory; Fusion does not install a raw
`.tgz` path.

## Lifecycle

1. `scripts/prepare-fusion-plugin.ts` validates every canonical `SKILL.md`
   frontmatter/name/description, copies each complete tree, and generates
   `src/skills.ts` deterministically.
2. The same preparation run builds settings and workflow data only through
   `buildFusionSettings`, `buildFusionWorkflowIR`, `stableStringify`,
   `validateFusionSettings`, and `validateFusionWorkflowIR`. It parses and
   validates the exact serialized bytes before atomically replacing resources.
3. TypeScript emits the loadable entry at `dist/index.js`.
4. Fusion loads the plugin's `hooks.onLoad`. A reduced install/publish loader
   has no workflow-definition APIs, so project integration is deferred without
   error.
5. A full project runtime validates bundled bytes, stages both project files,
   and creates or updates one managed workflow through
   `PluginContext.taskStore`. The marker
   `[managed-by:fusion-plugin-stelow]` is stored in the workflow description,
   because the public workflow definition has no arbitrary `managedBy` field.
6. Repeated loads leave byte-identical files and the same workflow ID. Stale
   managed IR updates that ID; an unrelated same-name workflow or multiple
   managed rows fail closed.

Set the plugin setting `installProjectIntegration` to `false` to defer project
artifact installation and workflow registration explicitly.

## Installed paths and ownership

| Owner | Path/data |
|---|---|
| Plugin package | `dist/index.js` |
| Plugin package | `skills/stelow-product-*/SKILL.md` plus nested references/assets |
| Plugin package | `artifacts/settings.json` |
| Plugin package | `artifacts/workflows/stelow-v2.json` |
| Plugin project integration | `.fusion/plugins/fusion-plugin-stelow/settings.json` |
| Plugin project integration | `.fusion/workflows/stelow-v2.json` |
| Fusion | project workflow/task rows and all other `.fusion/` engine state |
| Stelow | root `stelow.json` and `.stelow/` |

The plugin never overwrites `.fusion/settings.json`, `.fusion/engine.lock`,
`.fusion/tasks/`, agent configuration, `stelow.json`, or existing `.stelow/`
content.

## Failure and rollback behavior

All skill/settings/workflow bytes validate before final-path writes. Runtime
installation stages both project files before mutating the workflow. If
registration fails, no final file is committed. If either final rename fails,
prior file bytes are restored and the workflow mutation is compensated by
restoring the prior definition or deleting a newly created row. Temporary,
restore, and backup paths are cleaned on success and failure.

## Tool contract

The plugin contributes no tools and cannot shadow Fusion's built-ins.

| Canonical Stelow tool | Fusion-native tool |
|---|---|
| `ask_user_question` | `fn_ask_question` |
| `subagent` | `fn_spawn_agent` |
| `visual_review` | none |

`visual_review` remains the file fallback at
`.stelow/approvals/{dirHash}/{file}.approved.md`; it is never advertised as a
Fusion-native capability.

## Verification

- `tests/integration/fusion-plugin-contract.test.ts` — metadata, compiled
  contract, all skill bodies, mappings, and forbidden imports/tools.
- `tests/integration/fusion-plugin-installation.test.ts` — real filesystem
  preparation, reduced/full context, repeat/stale/collision states, and
  file/store compensation.
- `tests/integration/fusion-plugin-package.test.ts` — real `npm pack`, extracted
  entry load, resources, and `fn plugin publish --dry-run` when Fusion is
  installed.
