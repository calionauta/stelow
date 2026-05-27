#!/bin/bash
# test:ci.sh - CI-optimized test run with JUnit output
# 
# Usage:
#   npm run test:ci
# 
# Outputs:
#   test-results/junit.xml - JUnit XML for CI integration
#   test-results/coverage/ - Coverage HTML reports

# Create output directory
mkdir -p test-results/coverage

# Run tests with JUnit reporter
npx vitest run \
  --reporter=junit \
  --outputFile=test-results/junit.xml \
  --coverage \
  --coverage.reporter=html \
  --coverage.outputDir=test-results/coverage

# Capture exit code
EXIT_CODE=$?

# If failed, create failure summary
if [ $EXIT_CODE -ne 0 ]; then
  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" > test-results/summary.xml
  echo "<testsuites name=\"cali-product-workflow\" tests=\"300\" failures=\"N\" timestamp=\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\">" >> test-results/summary.xml
  echo "  <testsuite name=\"summary\" tests=\"300\" failures=\"N\">" >> test-results/summary.xml
  echo "    <testcase name=\"See full report in junit.xml\"/>" >> test-results/summary.xml
  echo "  </testsuite>" >> test-results/summary.xml
  echo "</testsuites>" >> test-results/summary.xml
fi

exit $EXIT_CODE