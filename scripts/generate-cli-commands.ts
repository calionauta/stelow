#!/usr/bin/env tsx
/**
 * generate-cli-commands.ts
 *
 * **Deprecated as of v0.45.0.**
 *
 * Prior to v0.45.0 this script generated per-harness command files (markdown)
 * in `cli-agents/{opencode,claude,codex}/commands/` from the dispatcher.
 * Those harness directories are now removed — see
 * `docs/archive/2026-07-09-deprecated-multi-cli-integration/README.md` for
 * the historical surface and the rationale for narrowing.
 *
 * The dispatcher (`extensions/stelow/adapters/commands/dispatcher.ts`)
 * still exports `WORKFLOW_COMMANDS` as the single source of truth; commands
 * are surfaced natively through the Pi extension. To restore per-harness
 * command files, a new adapter PR can reintroduce this generator along with
 * the corresponding `extensions/stelow/adapters/<harness>/` directory.
 *
 * This stub is kept (no-op) to preserve the `npm run generate-cli-commands`
 * script entry so existing automation does not break. It exits 0 silently.
 */

process.exit(0);
