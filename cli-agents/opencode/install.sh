#!/bin/bash
# Install cali-product-workflow for OpenCode

set -e

echo "Installing cali-product-workflow for OpenCode..."

# Build the plugin
cd "$(dirname "$0")/plugin"
npm install
npm run build

# Copy commands to OpenCode commands directory
OPENCODE_COMMANDS_DIR="${HOME}/.opencode/commands"
if [ -d "$OPENCODE_COMMANDS_DIR" ]; then
  echo "Copying commands to $OPENCODE_COMMANDS_DIR..."
  cp -r commands/* "$OPENCODE_COMMANDS_DIR/"
else
  echo "Note: OpenCode commands directory not found at $OPENCODE_COMMANDS_DIR"
  echo "Commands are available at: $(pwd)/commands/"
fi

echo "Installation complete!"
echo ""
echo "Add to your opencode.json:"
echo '{"plugin": ["@cali/cali-product-workflow-opencode"]}'