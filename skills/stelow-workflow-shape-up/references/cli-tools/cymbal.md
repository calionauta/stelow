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
| `cymbal impact <symbol>` | `shape:12` (Complete) — blast radius, who breaks if X changes (symbols only, never filenames) |
| `cymbal importers <file>` | `shape:12` (Complete) — file-level dependents: who imports this file |
| `cymbal refs <symbol>` | `shape:12` — who references this symbol |
| `cymbal ls --stats` | Quick file tree + repo stats |

## Availability check

```bash
if command -v cymbal &>/dev/null; then
  echo "CYMBAL_AVAILABLE"
fi
```

## Fallback (no cymbal)

- `sem grep --json "<pattern>"` — rg-compatible indexed text search
- `sem log --json` — recent activity + hotspots
- `sem diff --format json` — change shape
- `ripwire --grep "<literal>" --json` — literal search when sem is unavailable

These preserve JSON-native, cross-referenced recon without cymbal
(the old find/wc/git-log/grep ladder covered ~50%: no refs, no impact).
