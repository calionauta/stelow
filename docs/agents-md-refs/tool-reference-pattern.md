# Tool Reference Pattern

For skills development, see [docs/TOOL-REFERENCE-PATTERN.md](docs/TOOL-REFERENCE-PATTERN.md)
for the full pattern that ensures portability across CLIs.

## Rules

- Skills reference tools via `references/cli-tools/{tool}.md`, not direct calls
- Question templates come from `stages/ask-patterns.md`
- When adding a new tool, create the reference doc first following the pattern

## What this means for AGENTS.md and stage files

Stage files **must NEVER** call technical tools directly
(e.g. `ask_user_question({...})`, `subagent({...})`, `start_supervision({...})`).
Instead, reference the CLI-agnostic `.md` file in `references/cli-tools/`
that documents the tool. The exception is the `.md` files inside
`references/cli-tools/` themselves, which may document per-CLI syntax.

**Reference from AGENTS.md:** When writing/editing any stage file in
`skills/cali-product-workflow/stages/`, this is the rule. Violating it
breaks portability across Pi / OpenCode / Claude Code.
