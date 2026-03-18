#!/bin/bash
#===============================================================================
# Test PROXY-005: Global Variable Discovery + Auto-Watch
#===============================================================================

set -e

BASE_URL="${AI_DEBUG_URL:-http://localhost:9999}"
BINARY="/home/datdang/working/common_dev/ai_vscode_debug/playground/build/cooling_ecu"

echo "========================================="
echo "  PROXY-005: Global Discovery Test"
echo "========================================="
echo ""

# Step 1: Launch debug session
echo "1. Launch debug session..."
SESSION_ID=$(curl -s -X POST "$BASE_URL/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":true}}" | jq -r '.data.sessionId')

if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
    echo "✗ Failed to launch session"
    exit 1
fi
echo "✓ Session: $SESSION_ID"
echo ""
sleep 2

# Step 2: Discover globals
echo "2. Discover global variables..."
DISCOVERY=$(curl -s "$BASE_URL/api/discover/globals")
TOTAL=$(echo "$DISCOVERY" | jq '.data.allGlobals | length')
SUSPICIOUS=$(echo "$DISCOVERY" | jq '.data.suspiciousGlobals | length')

echo "   Total globals: $TOTAL"
echo "   Suspicious: $SUSPICIOUS"
echo ""

if [ "$TOTAL" -eq 0 ]; then
    echo "⚠ No globals discovered - check binary path"
    exit 1
fi

# Step 3: Show sample globals
echo "3. Sample global variables:"
echo "$DISCOVERY" | jq '.data.allGlobals[0:10] | .[] | "   \(.name) (\(.section))"'
echo ""

# Step 4: Show suspicious variables
echo "4. Suspicious variables (auto-detected):"
echo "$DISCOVERY" | jq '.data.suspiciousGlobals[0:10] | .[] | "   \(.name) (\(.section))"'
echo ""

# Step 5: Auto-watch suspicious variables
echo "5. Auto-watch suspicious variables..."
WATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/watch/auto" \
  -H "Content-Type: application/json" \
  -d '{"patterns":["*status*","*error*","*count*","*temp*","*state*"]}')

WATCHED_COUNT=$(echo "$WATCH_RESPONSE" | jq '.data.watchedCount // 0')
echo "   Watched: $WATCHED_COUNT variables"
echo ""

# Step 6: Continue to breakpoint
echo "6. Continue execution..."
curl -s -X POST "$BASE_URL/api/debug" \
  -H "Content-Type: application/json" \
  -d '{"operation":"continue"}' | jq '.data.stopReason'
sleep 1
echo ""

# Step 7: Check for changes
echo "7. Check for variable changes..."
CHANGES=$(curl -s "$BASE_URL/api/watch/changes")
CHANGE_COUNT=$(echo "$CHANGES" | jq '.data.changes | length')
echo "   Changes detected: $CHANGE_COUNT"
echo ""

# Step 8: Evaluate some globals
echo "8. Evaluate global variables:"
for var in "Rte_ErrorCount" "Rte_AmbientTemp" "Rte_SystemStatus"; do
    VALUE=$(curl -s -X POST "$BASE_URL/api/debug" \
      -H "Content-Type: application/json" \
      -d "{\"operation\":\"evaluate\",\"params\":{\"expression\":\"$var\"}}" | jq -r '.data.result // "N/A"')
    echo "   $var = $VALUE"
done
echo ""

# Step 9: Step and check for changes
echo "9. Step over and check for changes..."
curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"next"}' > /dev/null
sleep 1

CHANGES_AFTER=$(curl -s "$BASE_URL/api/watch/changes")
CHANGE_COUNT_AFTER=$(echo "$CHANGES_AFTER" | jq '.data.changes | length')
echo "   Changes after step: $CHANGE_COUNT_AFTER"

if [ "$CHANGE_COUNT_AFTER" -gt 0 ]; then
    echo ""
    echo "   Changed variables:"
    echo "$CHANGES_AFTER" | jq '.data.changes[] | "     \(.variable): \(.oldValue) → \(.newValue)"'
fi
echo ""

# Step 10: Quit session
echo "10. Quit session..."
curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"quit"}' > /dev/null
echo "✓ Session terminated"
echo ""

echo "========================================="
echo "  Test Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Discovered $TOTAL global variables"
echo "  - $SUSPICIOUS suspicious variables identified"
echo "  - $WATCHED_COUNT variables added to watch"
echo "  - $CHANGE_COUNT_AFTER changes detected"
echo ""
