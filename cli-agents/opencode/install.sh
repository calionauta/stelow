#!/bin/bash
# Install stelow for OpenCode (reduced support — commands delegate to skill)

set -e

echo "Installing stelow for OpenCode..."

OPENCODE_COMMANDS_DIR="${HOME}/.opencode/commands"
if [ -d "$OPENCODE_COMMANDS_DIR" ]; then
  echo "Copying commands to $OPENCODE_COMMANDS_DIR..."
  cp -r commands/* "$OPENCODE_COMMANDS_DIR/"
  echo "Installation complete!"
  echo ""
  echo "Commands delegate to the stelow orchestrator skill."
  echo "For full functionality (auto-sync, gates, TUI), use pi.dev."
else
  echo "Error: OpenCode commands directory not found at $OPENCODE_COMMANDS_DIR"
  echo "Please ensure OpenCode is installed."
  exit 1
fi