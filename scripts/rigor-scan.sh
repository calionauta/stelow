#!/usr/bin/env bash
# scripts/rigor-scan.sh
#
# Downloads rigor (if missing) and scans tests/ for quality.
# Exit 0 if all tests score >= MIN_SCORE, exit 1 otherwise.
# Cache: ~/.cache/rigor/rigor (mac/linux) or $LOCALAPPDATA (windows).
#
# Usage:
#   ./scripts/rigor-scan.sh [min-score]
#   ./scripts/rigor-scan.sh 70   # fail if any test < 70

set -euo pipefail

MIN_SCORE="${1:-60}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RIGOR_VERSION="v1.1.0"

# ── Locate or install rigor ───────────────────────────────────────────
RIGOR_BIN=""
for path in "/usr/local/bin/rigor" "$HOME/.local/bin/rigor" "$HOME/bin/rigor"; do
  if [ -x "$path" ]; then
    RIGOR_BIN="$path"
    break
  fi
done

if [ -z "$RIGOR_BIN" ]; then
  CACHE_DIR="$HOME/.cache/rigor"
  mkdir -p "$CACHE_DIR"
  CACHED="$CACHE_DIR/rigor-$RIGOR_VERSION"
  if [ ! -x "$CACHED" ]; then
    echo "Downloading rigor $RIGOR_VERSION..." >&2
    case "$(uname -s)" in
      Darwin)
        if [ "$(uname -m)" = "arm64" ]; then
          ASSET="rigor-macos-aarch64"
        else
          ASSET="rigor-macos-x86_64"
        fi
        ;;
      Linux)
        if [ "$(uname -m)" = "aarch64" ]; then
          ASSET="rigor-linux-arm64"
        else
          ASSET="rigor-linux-x86_64"
        fi
        ;;
      *)
        echo "ERROR: unsupported platform $(uname -s)" >&2
        exit 1
        ;;
    esac
    URL="https://github.com/enriquesanchez-elastic/rigor/releases/download/$RIGOR_VERSION/$ASSET"
    curl -sSL -o "$CACHED" "$URL"
    chmod +x "$CACHED"
  fi
  RIGOR_BIN="$CACHED"
fi

# ── Run scan ─────────────────────────────────────────────────────────
cd "$PROJECT_ROOT"
echo "Running rigor (threshold=$MIN_SCORE) on tests/..." >&2
"$RIGOR_BIN" tests/ --no-cache --quiet 2>&1 | tee /tmp/rigor-output.txt

# ── Check threshold ──────────────────────────────────────────────────
FAILED=0
while IFS=: read -r path score_grade; do
  [ -z "$path" ] && continue
  score=$(echo "$score_grade" | awk '{print $1}' | tr -d '()')
  if [ -z "$score" ] || ! [ "$score" -ge 0 ] 2>/dev/null; then
    continue
  fi
  if [ "$score" -lt "$MIN_SCORE" ]; then
    echo "❌ $path: $score (below $MIN_SCORE)" >&2
    FAILED=1
  fi
done < /tmp/rigor-output.txt

if [ "$FAILED" -eq 1 ]; then
  echo "" >&2
  echo "Some test files score below $MIN_SCORE." >&2
  echo "Run '$RIGOR_BIN tests/ <file>' to see issues." >&2
  exit 1
fi

echo "All test files score >= $MIN_SCORE ✅"