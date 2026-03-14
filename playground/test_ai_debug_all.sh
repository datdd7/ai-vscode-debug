#!/bin/bash
# test_ai_debug_all.sh - Comprehensive testing for ai-debug.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAYGROUND_DIR="$REPO_ROOT/playground"
BINARY="$PLAYGROUND_DIR/build/cooling_ecu"
SCRIPT="$REPO_ROOT/ai-debug-proxy/resources/ai-debug.sh"

# Switch to playground dir
cd "$PLAYGROUND_DIR"

source "$SCRIPT"

# Helper for testing
test_cmd() {
    echo "--- Testing: $1 ---"
    eval "$1"
    local ret=$?
    if [ $ret -eq 0 ]; then
        echo "✓ Success"
    else
        echo "✗ Failed (exit code: $ret)"
    fi
    echo ""
    return $ret
}

echo "=== Setup ==="
ai_quit >/dev/null 2>&1 || true

echo "=== System Management ==="
test_cmd "ai_status"
test_cmd "ai_launch \"$BINARY\" true"

echo "=== Breakpoints ==="
test_cmd "ai_bp main.c 43"
test_cmd "ai_bps"
test_cmd "ai_clear_bps main.c"
test_cmd "ai_bps"

echo "=== Execution Control (Stepping) ==="
test_cmd "ai_restart"
test_cmd "ai_next"
test_cmd "ai_next"
test_cmd "ai_stack"

echo "=== Inspection ==="
test_cmd "ai_vars"
test_cmd "ai_source 5"
test_cmd "ai_eval \"iteration\""
test_cmd "ai_last_stop"

echo "=== Advanced ==="
test_cmd "ai_threads"
test_cmd "ai_registers"
test_cmd "ai_read_memory \"0x600000\" 32"
test_cmd "ai_disasm \"0x401000\" 10"
test_cmd "ai_symbols \"main.c\""
test_cmd "ai_batch '[{\"operation\":\"get_last_stop_info\"},{\"operation\":\"get_active_breakpoints\"}]'"

echo "=== Finalize ==="
test_cmd "ai_quit"
echo "Tests completed!"
