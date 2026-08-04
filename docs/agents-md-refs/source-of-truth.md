# Skills, Extensions & Distribution

## Skills

See the **Source of Truth** section in AGENTS.md for how stage/skill counts
are derived. Skills live in `skills/*/SKILL.md` and install to
`~/.agents/skills/` for Pi, OpenCode, and Claude Code.

## Extensions

- Pi extension, Pi stub, CLI agents configs in `extensions/` and `cli-agents/`
- Skills install to `~/.agents/skills/` across Pi, OpenCode, Claude Code

## Distribution

Git-based primary distribution. npm publish is configured but not actively
used — see [docs/SECURITY.md](docs/SECURITY.md) for rationale.

**Reference from AGENTS.md:** When the user asks "where do skills come
from?", "how do I add a new skill?", or "is this on npm?", point here.
The `stages.yaml` and `ls skills/*/SKILL.md | wc -l` commands in
AGENTS.md are the source of truth for counts.
