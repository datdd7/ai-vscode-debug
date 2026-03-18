#!/bin/bash
#===============================================================================
# Test Script for Phase 1 & Phase 2 Features
# 
# Usage: ./test-all-features.sh
#===============================================================================

set -e

BASE_URL="${AI_DEBUG_URL:-http://localhost:9999}"
PLAYGROUND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../playground" && pwd)"
BINARY="$PLAYGROUND_DIR/build/cooling_ecu"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  AI VSCode Debug - Phase 1 & 2 Features Test${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if proxy is running
echo -e "${YELLOW}[1/6] Checking proxy status...${NC}"
if curl -s "$BASE_URL/api/ping" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Proxy is running${NC}"
else
    echo -e "${RED}✗ Proxy is not running!${NC}"
    echo "Please reload VS Code window: Command Palette → Developer: Reload Window"
    exit 1
fi
echo ""

# Check new operations
echo -e "${YELLOW}[2/6] Checking new operations...${NC}"
OPERATIONS=$(curl -s "$BASE_URL/api/ping" | jq -r '.data.operations[]')

# PROXY-001 operations
if echo "$OPERATIONS" | grep -q "session/state"; then
    echo -e "${GREEN}✓ PROXY-001: Session state operations available${NC}"
else
    echo -e "${YELLOW}○ PROXY-001: Session state operations (may need reload)${NC}"
fi

# PROXY-002 operations  
if echo "$OPERATIONS" | grep -q "context"; then
    echo -e "${GREEN}✓ PROXY-002: Context snapshot available${NC}"
else
    echo -e "${YELLOW}○ PROXY-002: Context snapshot (may need reload)${NC}"
fi

# PROXY-003 operations
if echo "$OPERATIONS" | grep -q "watch"; then
    echo -e "${GREEN}✓ PROXY-003: Watch suggestions available${NC}"
else
    echo -e "${YELLOW}○ PROXY-003: Watch suggestions (may need reload)${NC}"
fi

# PROXY-004 operations
if echo "$OPERATIONS" | grep -q "scope"; then
    echo -e "${GREEN}✓ PROXY-004: Scope preview available${NC}"
else
    echo -e "${YELLOW}○ PROXY-004: Scope preview (may need reload)${NC}"
fi
echo ""

# Test PROXY-001: Session State
echo -e "${YELLOW}[3/6] Testing PROXY-001: Smart Default Context...${NC}"
echo "Commands to test:"
echo "  source ai-debug-proxy/resources/ai-debug.sh"
echo "  ai_session_state          # Get current session state"
echo "  ai_set_context --thread 1 # Set thread context"
echo ""

# Test PROXY-002: Context Snapshot
echo -e "${YELLOW}[4/6] Testing PROXY-002: Context Snapshot...${NC}"
echo "Commands to test:"
echo "  source ai-debug-proxy/resources/ai-debug.sh"
echo "  ai_context                # Get full context snapshot"
echo "  ai_context --depth 5      # Limit stack depth"
echo "  ai_context --include stack,variables  # Filter sections"
echo ""

# Test PROXY-003: Watch Suggestions
echo -e "${YELLOW}[5/6] Testing PROXY-003: Watch Suggestions...${NC}"
echo "Commands to test:"
echo "  source ai-debug-proxy/resources/ai-debug.sh"
echo "  ai_watch_suggest          # Get variable watch suggestions"
echo "  ai_watch_auto_enable      # Enable auto-watch"
echo ""

# Test PROXY-004: Scope Preview
echo -e "${YELLOW}[6/6] Testing PROXY-004: Function Scope Preview...${NC}"
echo "Commands to test:"
echo "  source ai-debug-proxy/resources/ai-debug.sh"
echo "  ai_step_in                # Step into function (auto scope)"
echo "  # OR via API:"
echo "  curl -X POST $BASE_URL/api/debug \\"
echo "    -d '{\"operation\":\"get_scope_preview\"}'"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}  Test script complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Reload VS Code window if operations not showing"
echo "2. Launch debug session: ai_launch $BINARY"
echo "3. Set breakpoint: ai_bp main.c 42"
echo "4. Continue: ai_continue"
echo "5. Test features when stopped at breakpoint"
echo ""
echo "For full feature demo:"
echo "  cd playground"
echo "  make clean && make  # Build with debug symbols"
echo "  source ../ai-debug-proxy/resources/ai-debug.sh"
echo "  ai_launch ./build/cooling_ecu"
echo "  ai_bp CalculateFanDuty 35"
echo "  ai_continue"
echo "  # Now test all features!"
echo ""
