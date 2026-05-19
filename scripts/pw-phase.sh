#!/bin/bash
# Update workflow phase in tracking.json
# Usage: pw-phase <phase_number> (0-indexed, e.g., 0 for Setup, 1 for Context)

WORKFLOW_DIR=".cali-product-workflow"
TRACKING_FILE="cali-product-workflow.json"

if [ ! -f "$WORKFLOW_DIR/$TRACKING_FILE" ]; then
  echo "Not in a workflow directory"
  exit 1
fi

PHASE="$1"
if [ -z "$PHASE" ]; then
  echo "Usage: pw-phase <phase_number> (0-indexed)"
  exit 1
fi

# Use node to update JSON safely
node -e "
const fs = require('fs');
const path = '$WORKFLOW_DIR/$TRACKING_FILE';
const tracking = JSON.parse(fs.readFileSync(path, 'utf8'));
const idx = tracking.workflows.findIndex(w => w.status === 'in-progress');
if (idx === -1) { console.error('No active workflow'); process.exit(1); }
tracking.workflows[idx].currentPhase = $PHASE;
tracking.workflows[idx].phases.forEach((p, i) => {
  p.status = i < $PHASE ? 'completed' : i === $PHASE ? 'in-progress' : 'pending';
});
tracking.updated = new Date().toISOString();
fs.writeFileSync(path, JSON.stringify(tracking, null, 2));
console.log('Phase set to $PHASE');
"