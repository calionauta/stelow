#!/bin/bash
# Install cali-product-workflow commands for Claude

set -e

echo "Installing cali-product-workflow for Claude..."

# Copy commands to Claude commands directory
CLAUDE_COMMANDS_DIR="${HOME}/.claude/commands"
if [ -d "$CLAUDE_COMMANDS_DIR" ]; then
  echo "Copying commands to $CLAUDE_COMMANDS_DIR..."
  cp -r commands/* "$CLAUDE_COMMANDS_DIR/"
  echo "Installation complete!"
else
  echo "Error: Claude commands directory not found at $CLAUDE_COMMANDS_DIR"
  echo "Please ensure Claude Code is installed."
  exit 1
fi