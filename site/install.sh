#!/usr/bin/env bash
#
# Stelow quick install — checks for bb, then installs the Stelow plugin.
# Read before piping: https://github.com/calionauta/stelow/blob/main/site/install.sh
#
# Usage:
#   curl -fsSL https://calionauta.github.io/stelow/install.sh | bash
#
set -euo pipefail

PLUGIN_URL="git:https://github.com/calionauta/bb-plugin-stelow.git"

if ! command -v bb >/dev/null 2>&1; then
  cat <<'EOF'
bb not found on PATH, so there is nothing to plug into yet.

1. Install bb desktop (free): https://getbb.app
   macOS is a one-click download, anywhere else: npx bb-app@latest
2. Re-run this command. It will install the Stelow plugin into bb.
EOF
  exit 1
fi

bb plugin install "$PLUGIN_URL" --yes

echo
echo "Stelow plugin installed. Open bb, pick Stelow in the navigation, create a card."
