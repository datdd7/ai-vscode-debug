# AI-First Debugging with CLI

**Document ID:** `DOC-CLI-001`  
**Version:** 3.2.0
**Last Updated:** 2026-03-14
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This guide demonstrates **AI-First debugging** workflows using command-line tools. Designed for LLM agents and automated debugging scripts.

[Satisfies $ARCH-HTTP-001, $ARCH-DAP-001]

---

## Available CLI Tools

This project provides **one primary CLI tool**:

| Tool | File | Best For | Example |
|------|------|----------|---------|
| **Bash Helper** | `ai-debug-proxy/resources/ai-debug.sh` | Interactive, AI agents | `ai_launch ./app` |

> **Note:** The Python CLI (`dbg.py`) was deprecated in v0.1.2. Use the Bash helper for all CLI debugging tasks.

---

## Quick Start

### Bash Helper (Recommended)

```bash
# Recommended: use the install command (Command Palette → "AI Debug Proxy: Install Debug CLI")
# This installs to ~/.local/lib/ai-debug-proxy/ and auto-sources from ~/.bashrc / ~/.zshrc
# After install, all ai_* functions are available in every new shell — no manual sourcing needed.

# Or source manually from project root:
source ai-debug-proxy/resources/ai-debug.sh

# Debug with simple commands
ai_launch ./build/app true
ai_bp main.c 42
ai_continue
ai_stack
ai_quit
```

---

## CLI Commands Reference

### Bash Helper Functions

All commands are available after sourcing `ai-debug-proxy/resources/ai-debug.sh`:

| Command | Description | Example |
|---------|-------------|---------|
| `ai_status` | Check proxy status | `ai_status` |
| `ai_launch <prog> [stop]` | Launch session | `ai_launch ./app true` |
| `ai_quit` | End session | `ai_quit` |
| `ai_restart` | Restart session | `ai_restart` |
| `ai_continue` | Continue execution | `ai_continue` |
| `ai_next` | Step over | `ai_next` |
| `ai_step_in` | Step into | `ai_step_in` |
| `ai_step_out` | Step out | `ai_step_out` |
| `ai_jump <line>` | Jump to line | `ai_jump 100` |
| `ai_until <line>` | Run until line | `ai_until 50` |
| `ai_bp <file> <line> [cond]` | Set breakpoint | `ai_bp main.c 42 "x>100"` |
| `ai_tbp <file> <line>` | Set temp breakpoint | `ai_tbp utils.c 25` |
| `ai_bps` | List breakpoints | `ai_bps` |
| `ai_clear_bps <file>` | Clear breakpoints | `ai_clear_bps main.c` |
| `ai_stack` | Get full stack trace | `ai_stack` |
| `ai_frame` | Compact top frame (token-efficient) | `ai_frame` |
| `ai_up` | Move one frame up | `ai_up` |
| `ai_down` | Move one frame down | `ai_down` |
| `ai_goto <frameId>` | Jump to specific frame | `ai_goto 1044` |
| `ai_vars [frameId]` | Get local variables | `ai_vars` |
| `ai_args` | Get function arguments | `ai_args` |
| `ai_source [lines]` | List source code | `ai_source 5` |
| `ai_eval <expr>` | Evaluate expression | `ai_eval "x+y"` |
| `ai_pretty <expr>` | Pretty print with field expansion | `ai_pretty "my_struct"` |
| `ai_type <expr>` | Get type | `ai_type "var"` |
| `ai_watch <var> [access]` | Set watchpoint | `ai_watch "errorCode" write` |
| `ai_last_stop` | Last stop info | `ai_last_stop` |
| `ai_threads` | List threads | `ai_threads` |
| `ai_switch_thread <id>` | Switch thread | `ai_switch_thread 2` |
| `ai_registers [frameId]` | Get registers | `ai_registers` |
| `ai_read_memory <addr>` | Read memory | `ai_read_memory "0x7fff"` |
| `ai_disasm <addr>` | Disassemble | `ai_disasm "0x400520"` |
| `ai_symbols <file>` | Get symbols (LSP) | `ai_symbols main.c` |
| `ai_help` | Show help | `ai_help` |

---

## Bash Helper Features

### Colored Output

The helper provides colored, formatted output:

```bash
$ ai_status
✓ Debug proxy is running at http://localhost:9999

$ ai_launch ./build/app true
ℹ Launching debug session for: ./build/app
✓ Debug session launched

$ ai_bp main.c 42
ℹ Setting breakpoint at main.c:42
✓ Breakpoint set
```

### Error Handling

Built-in error messages with helpful suggestions:

```bash
$ ai_launch
✗ Usage: ai_launch <program> [stopOnEntry]

$ ai_status
✗ Debug proxy is NOT running at http://localhost:9999

Make sure the AI Debug Proxy extension is installed and active in VS Code.
You can start it with: Command Palette → AI Debug Proxy: Start Server
```

### JSON Output Parsing

All commands output parseable text. Use `jq` for JSON:

```bash
# Get stack trace as JSON
ai_stack | jq '.[0]'

# Get variable value
ai_vars | jq '.[] | select(.name=="temperature") | .value'

# Get stop reason
ai_last_stop | jq '.stopInfo.reason'
```

### Launch Session

```bash
# Launch with stop on entry (recommended)
ai_launch ./build/cooling_ecu true

# Launch without stopping
ai_launch ./build/cooling_ecu false

# Check result
ai_status
```

### Set Breakpoints

```bash
# Simple breakpoint
ai_bp ./src/main.c 42

# Conditional breakpoint
ai_bp ./src/main.c 42 "temperature > 100"

# Temporary breakpoint (auto-removes on hit)
ai_tbp ./src/utils.c 25

# List all breakpoints
ai_bps
```

### Execution Control

```bash
# Continue to next breakpoint
ai_continue

# Step over (next line)
ai_next

# Step into function
ai_step_in

# Step out of function
ai_step_out

# Jump to line (no execution between)
ai_jump 150

# Run until specific line
ai_until 100
```

### Inspection

```bash
# Get stack trace
ai_stack

# Get variables in current frame
ai_vars

# Get function arguments
ai_args

# List source code (±5 lines)
ai_source

# List source code (±10 lines)
ai_source 10

# Evaluate expression
ai_eval "temperature + offset"

# Pretty print struct
ai_pretty "sensor_data"

# Get type of expression
ai_type "my_variable"

# Get last stop information
ai_last_stop
```

### Advanced Operations

```bash
# List all threads
ai_threads

# Switch to thread 2
ai_switch_thread 2

# Get CPU registers
ai_registers

# Get registers for specific frame
ai_registers 1000

# Read 16 bytes of memory at address
ai_read_memory "0x7fff5fbff8ac"

# Disassemble 20 instructions at address
ai_disasm "0x400520"

# Get document symbols (LSP)
ai_symbols ./src/main.c
```

### Session Management

```bash
# Check if proxy is running
ai_status

# Restart current session
ai_restart

# End session
ai_quit
```

---

## Shell Script Examples

### Example 1: Basic Debug Session

```bash
#!/bin/bash
# debug-basic.sh - Basic debug session

source ai-debug-proxy/resources/ai-debug.sh

echo "🔍 Starting debug session..."

# Launch
ai_launch ./build/cooling_ecu true

# Set breakpoints
ai_bp ./src/main.c 42
ai_bp ./src/utils.c 25 "x > 100"

# Continue to breakpoint
ai_continue

# Inspect state
echo "=== Stack Trace ==="
ai_stack

echo "=== Variables ==="
ai_vars

echo "=== Source Code ==="
ai_source

# Evaluate expression
echo "=== Evaluation ==="
ai_eval "my_variable"

# Step through
ai_next
ai_step_in
ai_step_out

# End session
ai_quit

echo "✅ Debug session complete"
```

### Example 2: Automated Bug Investigation

```bash
#!/bin/bash
# debug-auto.sh - Automated bug investigation

source ai-debug-proxy/resources/ai-debug.sh

BINARY="$1"
SUSPECTED_FILE="$2"

echo "🔍 Auto-debugging: $BINARY"

# Check proxy
if ! ai_status > /dev/null 2>&1; then
    echo "❌ Debug proxy not running"
    exit 1
fi

# Launch
ai_launch "$BINARY" false

# Get function symbols and set breakpoints
echo "📍 Setting breakpoints at all functions..."
SYMBOLS=$(ai_symbols "$SUSPECTED_FILE" | jq -r '.[] | select(.kind=="Function") | .name')

for func in $SYMBOLS; do
    LINE=$(ai_symbols "$SUSPECTED_FILE" | jq -r ".[] | select(.name==\"$func\") | .line")
    echo "   Setting BP at $func (line $LINE)"
    ai_bp "$SUSPECTED_FILE" "$LINE"
done

# Continue and collect
echo "▶️  Running..."
ai_continue

# Get state
echo "=== Stopped ==="
ai_stack
ai_vars

# Cleanup
ai_quit
echo "✅ Complete"
```

### Example 3: Iterative State Collection

```bash
#!/bin/bash
# state-collector.sh - Collect state at multiple points

source ai-debug-proxy/resources/ai-debug.sh

BINARY="$1"
CHECKPOINTS="$2"  # File with line numbers

echo "📋 State Collector"

# Launch stopped at entry
ai_launch "$BINARY" true

# Set temp breakpoints at checkpoints
while IFS= read -r line; do
    ai_tbp ./src/main.c "$line"
done < "$CHECKPOINTS"

echo "🏃 Running through checkpoints..."

# Continue and collect at each checkpoint
iteration=0
while true; do
    ((iteration++))
    
    ai_continue
    STOP_REASON=$(ai_last_stop | jq -r '.stopInfo.reason // "exit"')
    
    if [[ "$STOP_REASON" == "exit" ]]; then
        echo "✅ Program exited after $((iteration-1)) checkpoints"
        break
    fi
    
    echo ""
    echo "=== Checkpoint #$iteration ==="
    ai_stack | jq '.[0] | "\(.name) at line \(.line)"'
    echo "Variables:"
    ai_vars | jq '.[] | "\(.name) = \(.value)"'
done

# Cleanup
ai_quit
```

---

## Integration with AI Agents

### Claude Code

```bash
# Add to ~/.claude/commands/debug.sh
#!/bin/bash
source /path/to/ai-vscode-debug/ai-debug-proxy/resources/ai-debug.sh

case "$1" in
  launch) ai_launch "$2" ;;
  bp) ai_bp "$2" "$3" "$4" ;;
  continue) ai_continue ;;
  stack) ai_stack ;;
  vars) ai_vars ;;
  eval) ai_eval "$2" ;;
  quit) ai_quit ;;
  *) ai_help ;;
esac
```

Usage in Claude:
```
/debug launch ./build/app
/debug bp main.c 42
/debug continue
/debug stack
/debug eval my_variable
```

### Custom AI Agent Script

```python
#!/usr/bin/env python3
# ai-agent-debug.py - AI agent debugging script

import subprocess
import json

def ai_cmd(cmd):
    """Execute ai-debug.sh command and return result."""
    result = subprocess.run(
        ['bash', '-c', f'source ai-debug-proxy/resources/ai-debug.sh && {cmd}'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def ai_json(cmd):
    """Execute command and parse JSON output."""
    output = ai_cmd(cmd)
    try:
        return json.loads(output)
    except:
        return None

# Example: Automated debugging workflow
def debug_workflow(binary, suspected_bugs):
    print(f"🔍 Debugging {binary}")
    
    # Launch
    ai_cmd(f"ai_launch {binary} true")
    
    # Set breakpoints
    for bug in suspected_bugs:
        ai_cmd(f"ai_bp {bug['file']} {bug['line']}")
    
    # Debug loop
    while True:
        ai_cmd("ai_continue")
        
        # Get state
        stack = ai_json("ai_stack")
        variables = ai_json("ai_vars")
        
        print(f"Stopped at: {stack[0]['name']}:{stack[0]['line']}")
        print(f"Variables: {variables}")
        
        # AI analysis would go here
        # For now, just continue
        if len(stack) == 0:
            break
    
    ai_cmd("ai_quit")

if __name__ == "__main__":
    suspected_bugs = [
        {"file": "./src/main.c", "line": 42},
        {"file": "./src/utils.c", "line": 25}
    ]
    debug_workflow("./build/cooling_ecu", suspected_bugs)
```

---

## Advanced Debugging Patterns

### Pattern 1: Debug Session with Helper Functions

```bash
#!/bin/bash
# debug-session.sh - Reusable debug session functions

BASE_URL="http://localhost:9999"

debug_launch() {
  local program=$1
  curl -s -X POST "$BASE_URL/api/debug" \
    -H "Content-Type: application/json" \
    -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$program\",\"stopOnEntry\":true}}" | jq .
}

debug_bp() {
  local file=$1
  local line=$2
  curl -s -X POST "$BASE_URL/api/debug" \
    -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"$file\",\"line\":$line}}}" | jq .
}

debug_continue() {
  curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"continue"}' | jq .
}

debug_stack() {
  curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"stack_trace"}' | jq .data.frames
}

debug_eval() {
  local expr=$1
  curl -s -X POST "$BASE_URL/api/debug" \
    -d "{\"operation\":\"evaluate\",\"params\":{\"expression\":\"$expr\"}}" | jq -r .data.result
}

debug_quit() {
  curl -s -X POST "$BASE_URL/api/debug" -d '{"operation":"quit"}' > /dev/null
}

# Usage:
# source debug-session.sh
# debug_launch ./build/app
# debug_bp ./src/main.c 42
# debug_continue
# debug_stack
# debug_eval "my_variable"
# debug_quit
```

### Pattern 2: Automated Bug Investigation

```bash
#!/bin/bash
# auto-debug.sh - Automated debugging script

set -e

BINARY="$1"
SUSPECTED_FILES=("${@:2}")

echo "🔍 Starting automated debug session for: $BINARY"

# Launch
echo "🚀 Launching debug session..."
LAUNCH_RESULT=$(curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":false}}")

if [ "$(echo $LAUNCH_RESULT | jq -r .success)" != "true" ]; then
  echo "❌ Failed to launch: $LAUNCH_RESULT"
  exit 1
fi

echo "✅ Session launched"

# Set breakpoints at function entries
for file in "${SUSPECTED_FILES[@]}"; do
  echo "📍 Setting breakpoints in $file..."
  
  # Get function locations using LSP
  SYMBOLS=$(curl -s "http://localhost:9999/api/symbols?fsPath=$file" | jq -r '.data.symbols[] | select(.kind=="Function") | .line')
  
  for line in $SYMBOLS; do
    curl -s -X POST "http://localhost:9999/api/debug" \
      -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"$file\",\"line\":$line}}}" > /dev/null
    echo "   Set breakpoint at line $line"
  done
done

# Continue and collect data
echo "▶️  Running to first breakpoint..."
STOP_RESULT=$(curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}')

STOP_REASON=$(echo $STOP_RESULT | jq -r '.data.stopReason // "exit"')

if [ "$STOP_REASON" == "exit" ]; then
  echo "✅ Program completed without hitting breakpoints"
else
  echo "🛑 Stopped at: $STOP_REASON"
  
  # Collect state
  echo "📊 Collecting state..."
  echo "Stack trace:"
  curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"stack_trace"}' | jq .data.frames
  
  echo "Variables:"
  curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"get_stack_frame_variables"}' | jq .data.variables
fi

# Cleanup
echo "👋 Ending session..."
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"quit"}' > /dev/null

echo "✅ Debug session complete"
```

### Pattern 3: Iterative State Collection

```bash
#!/bin/bash
# state-collector.sh - Collect state at multiple points

BINARY="$1"
CHECKPOINTS="$2"  # File with line numbers to check

echo "📋 State Collector - Collecting state at checkpoints"

# Launch stopped at entry
curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":true}}" > /dev/null

# Set temp breakpoints at checkpoints
while IFS= read -r line; do
  curl -s -X POST "http://localhost:9999/api/debug" \
    -d "{\"operation\":\"set_temp_breakpoint\",\"params\":{\"location\":{\"path\":\"main.c\",\"line\":$line}}}" > /dev/null
done < "$CHECKPOINTS"

echo "🏃 Running through checkpoints..."

# Continue and collect at each checkpoint
while true; do
  RESULT=$(curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}')
  
  STOP_REASON=$(echo $RESULT | jq -r '.data.stopReason // "exit"')
  
  if [ "$STOP_REASON" == "exit" ]; then
    echo "✅ Reached program end"
    break
  fi
  
  # Get current location
  STACK=$(curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"stack_trace"}')
  LINE=$(echo $STACK | jq -r '.data.frames[0].line')
  FUNC=$(echo $STACK | jq -r '.data.frames[0].name')
  
  echo ""
  echo "📍 Checkpoint at $FUNC (line $LINE)"
  echo "Variables:"
  curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"get_stack_frame_variables"}' | jq '.data.variables[] | "\(.name) = \(.value)"'
done

# Cleanup
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"quit"}' > /dev/null
```

---

## Shell Scripts for AI Agents

### AI Debug Helper Library

```bash
#!/bin/bash
# ai-debug-lib.sh - Library for AI agent debugging

AI_DEBUG_URL="${AI_DEBUG_URL:-http://localhost:9999}"

# Execute debug operation
ai_debug_op() {
  local operation=$1
  local params=$2
  
  curl -s -X POST "$AI_DEBUG_URL/api/debug" \
    -H "Content-Type: application/json" \
    -d "{\"operation\":\"$operation\",\"params\":$params}" | jq .
}

# Launch session
ai_launch() {
  local program=$1
  local stop_on_entry=${2:-true}
  
  ai_debug_op "launch" "{\"program\":\"$program\",\"stopOnEntry\":$stop_on_entry}"
}

# Set breakpoint
ai_bp() {
  local file=$1
  local line=$2
  local condition=${3:-null}
  
  if [ "$condition" == "null" ]; then
    ai_debug_op "set_breakpoint" "{\"location\":{\"path\":\"$file\",\"line\":$line}}"
  else
    ai_debug_op "set_breakpoint" "{\"location\":{\"path\":\"$file\",\"line\":$line},\"condition\":\"$condition\"}"
  fi
}

# Continue
ai_continue() {
  ai_debug_op "continue" "{}"
}

# Step over
ai_next() {
  ai_debug_op "next" "{}"
}

# Step in
ai_step_in() {
  ai_debug_op "step_in" "{}"
}

# Step out
ai_step_out() {
  ai_debug_op "step_out" "{}"
}

# Stack trace
ai_stack() {
  ai_debug_op "stack_trace" "{}"
}

# Evaluate
ai_eval() {
  local expr=$1
  ai_debug_op "evaluate" "{\"expression\":\"$expr\"}"
}

# Get variables
ai_vars() {
  ai_debug_op "get_stack_frame_variables" "{}"
}

# List source
ai_source() {
  local lines=${1:-5}
  ai_debug_op "list_source" "{\"linesAround\":$lines}"
}

# Quit
ai_quit() {
  ai_debug_op "quit" "{}"
}

# Check if session is active
ai_status() {
  curl -s "$AI_DEBUG_URL/api/status" | jq .data
}

# Get last stop info
ai_last_stop() {
  ai_debug_op "get_last_stop_info" "{}"
}

# Batch operations
ai_batch() {
  local operations=$1
  curl -s -X POST "$AI_DEBUG_URL/api/debug/batch" \
    -H "Content-Type: application/json" \
    -d "{\"operations\":$operations}" | jq .
}
```

### Usage Example for AI Agents

```bash
#!/bin/bash
# AI agent debugging workflow

source ai-debug-lib.sh

# Start debugging
echo "Starting AI debug session..."
ai_launch "/path/to/binary" "true"

# Set breakpoints based on analysis
ai_bp "/path/to/main.c" 42
ai_bp "/path/to/utils.c" 25 "x > 100"

# Continue to breakpoint
ai_continue

# Analyze state
echo "=== Stack Trace ==="
ai_stack | jq .data.frames

echo "=== Variables ==="
ai_vars | jq .data.variables

echo "=== Source Code ==="
ai_source 5 | jq .data.sourceCode

# Evaluate expressions
echo "=== Evaluation ==="
ai_eval "temperature + offset" | jq .data.result

# Step through
ai_next
ai_step_in
ai_step_out

# End session
ai_quit
```

---

## Integration with LLM Tools

### Claude Code Integration

```bash
# .claude/commands/debug.sh
#!/bin/bash

case "$1" in
  launch)
    curl -s -X POST "http://localhost:9999/api/debug" \
      -H "Content-Type: application/json" \
      -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$2\",\"stopOnEntry\":true}}" | jq .
    ;;
  bp)
    curl -s -X POST "http://localhost:9999/api/debug" \
      -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"$2\",\"line\":$3}}}" | jq .
    ;;
  continue)
    curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}' | jq .
    ;;
  stack)
    curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"stack_trace"}' | jq .
    ;;
  eval)
    curl -s -X POST "http://localhost:9999/api/debug" \
      -d "{\"operation\":\"evaluate\",\"params\":{\"expression\":\"$2\"}}" | jq .
    ;;
  *)
    echo "Usage: debug {launch|bp|continue|stack|eval} [args]"
    ;;
esac
```

### Cursor IDE Integration

```json
// .cursor/rules/debugging.json
{
  "rules": [
    {
      "name": "debug-session",
      "pattern": "debug.*",
      "command": "curl -s -X POST http://localhost:9999/api/debug -H 'Content-Type: application/json' -d '{}'"
    }
  ]
}
```

---

## Examples

### Example 1: Debug Ring Buffer Bug

```bash
#!/bin/bash
# Debug ring buffer overflow bug

BINARY="./build/cooling_ecu"
RING_BUFFER_FILE="/home/user/project/utils/Utils_RingBuffer.c"

echo "🔍 Debugging ring buffer overflow..."

# Launch
curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":false}}" > /dev/null

# Set breakpoint at RingBuffer_Push
curl -s -X POST "http://localhost:9999/api/debug" \
  -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"$RING_BUFFER_FILE\",\"line\":25}}}" > /dev/null

echo "▶️  Running to RingBuffer_Push..."

# Run and collect data at each hit
for i in {1..20}; do
  RESULT=$(curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}')
  
  STOP_REASON=$(echo $RESULT | jq -r '.data.stopReason')
  
  if [ "$STOP_REASON" == "exit" ]; then
    echo "✅ Program exited after $((i-1)) iterations"
    break
  fi
  
  # Get Head and Tail values
  HEAD=$(curl -s -X POST "http://localhost:9999/api/debug" \
    -d '{"operation":"evaluate","params":{"expression":"buf->Head"}}' | jq -r .data.result)
  
  TAIL=$(curl -s -X POST "http://localhost:9999/api/debug" \
    -d '{"operation":"evaluate","params":{"expression":"buf->Tail"}}' | jq -r .data.result)
  
  SIZE=$(curl -s -X POST "http://localhost:9999/api/debug" \
    -d '{"operation":"evaluate","params":{"expression":"buf->Size"}}' | jq -r .data.result)
  
  echo "Hit #$i: Head=$HEAD, Tail=$TAIL, Size=$SIZE"
  
  # Check for overflow condition
  if [ "$HEAD" -ge "$SIZE" ] 2>/dev/null; then
    echo "❌ OVERFLOW DETECTED! Head ($HEAD) >= Size ($SIZE)"
    
    # Get full state
    echo "Stack trace:"
    curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"stack_trace"}' | jq .
    
    break
  fi
done

# Cleanup
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"quit"}' > /dev/null
```

### Example 2: Memory Leak Investigation

```bash
#!/bin/bash
# Debug memory leak

BINARY="./build/app"

echo "🔍 Investigating memory leak..."

# Launch with stop on entry
curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "{\"operation\":\"launch\",\"params\":{\"program\":\"$BINARY\",\"stopOnEntry\":true}}" > /dev/null

# Set breakpoint at allocation function
curl -s -X POST "http://localhost:9999/api/debug" \
  -d "{\"operation\":\"set_breakpoint\",\"params\":{\"location\":{\"path\":\"main.c\",\"line\":50}}}" > /dev/null

echo "▶️  Running to allocation point..."
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}' > /dev/null

# Get initial pointer value
PTR1=$(curl -s -X POST "http://localhost:9999/api/debug" \
  -d '{"operation":"evaluate","params":{"expression":"allocated_ptr"}}' | jq -r .data.result)

echo "Initial allocation: $PTR1"

# Continue to next iteration
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"continue"}' > /dev/null

# Get pointer after second allocation
PTR2=$(curl -s -X POST "http://localhost:9999/api/debug" \
  -d '{"operation":"evaluate","params":{"expression":"allocated_ptr"}}' | jq -r .data.result)

echo "Second allocation: $PTR2"

# Check if pointers are different (potential leak)
if [ "$PTR1" != "$PTR2" ]; then
  echo "⚠️  Different pointers - checking if first was freed..."
  
  # Try to evaluate first pointer (may be invalid)
  RESULT=$(curl -s -X POST "http://localhost:9999/api/debug" \
    -d "{\"operation\":\"evaluate\",\"params\":{\"expression\":\"*((int*)$PTR1)\"}}")
  
  if echo $RESULT | jq -e '.error' > /dev/null; then
    echo "❌ First allocation not accessible - may have been freed"
  else
    echo "⚠️  First allocation still accessible - potential leak at $PTR1"
  fi
fi

# Cleanup
curl -s -X POST "http://localhost:9999/api/debug" -d '{"operation":"quit"}' > /dev/null
```

---

## Related Documents

- [AI Agent Technical Guide](./ai-agent-technical-guide.md)
- [API Reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
