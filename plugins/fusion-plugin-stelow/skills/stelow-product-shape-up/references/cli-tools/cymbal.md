# cymbal — Codebase Navigation CLI

Fast, language-agnostic code indexer (tree-sitter + SQLite). Designed for AI agents.

## Installation

```bash
# macOS / Linux (Homebrew)
brew install 1broseidon/tap/cymbal

# Windows (PowerShell)
irm https://raw.githubusercontent.com/1broseidon/cymbal/main/install.ps1 | iex

# Binary from releases
# https://github.com/1broseidon/cymbal/releases
```

## Commands relevant to stelow

| Command | Use in stelow |
|---------|---------------|
| `cymbal structure` | `shape:12` — entry points, hotspots, central packages |
| `cymbal search <name>` | `shape:12` — find where a concept lives in codebase |
| `cymbal search --text <pattern>` | `shape:12` — full-text grep across indexed code |
| `cymbal impact <file>` | `shape:12` (Complete) — blast radius, who breaks if X changes |
| `cymbal refs <symbol>` | `shape:12` — who references this symbol |
| `cymbal ls --stats` | Quick file tree + repo stats |

## Availability check

```bash
if command -v cymbal &>/dev/null; then
  echo "CYMBAL_AVAILABLE"
fi
```

## Fallback (no cymbal)

- `find . -maxdepth 3 -type f | head -30` — basic file tree
- `wc -l $(find . -name "*.go" -o -name "*.ts" -o -name "*.py" 2>/dev/null)` — basic size
- `git log --oneline -20` — recent activity
- Standard `grep` / `ffgrep` — text search

These cover ~50% of what cymbal provides (no cross-references, no impact analysis).
