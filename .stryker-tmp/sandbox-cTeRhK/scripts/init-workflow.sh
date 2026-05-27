#!/bin/bash
# Init workflow script for @cali/cali-product-workflow

TRACKING_FILE="cali-product-workflow.json"
SCHEMA_URL="https://raw.githubusercontent.com/cali/cali-product-workflow/main/cali-product-workflow.schema.json"

if [ -f "$TRACKING_FILE" ]; then
    echo "Tracking file already exists: $TRACKING_FILE"
    exit 0
fi

# Create tracking file
cat > "$TRACKING_FILE" << 'EOF'
{
  "$schema": "SCHEMA_URL_PLACEHOLDER",
  "version": "1.0",
  "created": "TIMESTAMP_PLACEHOLDER",
  "updated": "TIMESTAMP_PLACEHOLDER",
  "workflows": []
}
EOF

# Replace placeholders
sed -i '' "s|SCHEMA_URL_PLACEHOLDER|$SCHEMA_URL|g" "$TRACKING_FILE"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s|TIMESTAMP_PLACEHOLDER|$TIMESTAMP|g" "$TRACKING_FILE"

echo "✅ Created $TRACKING_FILE"
echo ""
echo "Run /skill:cali-product-workflow to start a workflow"