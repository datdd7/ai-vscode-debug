# AI Agent Technical Guide

**Document ID:** `DOC-AI-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This guide provides comprehensive technical documentation for **AI/LLM agents** to interact with the AI VSCode Debug Proxy. This is an **AI-First debugging** system designed specifically for autonomous AI debugging workflows.

[Satisfies $ARCH-HTTP-001, $ARCH-DAP-001, $ARCH-AGT-001]

---

## Table of Contents

1. [Quick Start for AI Agents](#quick-start-for-ai-agents)
2. [Architecture Overview](#architecture-overview)
3. [HTTP API Reference](#http-api-reference)
4. [Debug Operations](#debug-operations)
5. [Debugging Workflow Patterns](#debugging-workflow-patterns)
6. [Error Handling](#error-handling)
7. [Session Management](#session-management)
8. [Advanced Features](#advanced-features)
9. [Integration Examples](#integration-examples)
10. [Best Practices](#best-practices)

---

## Quick Start for AI Agents

### Base Configuration

```json
{
  "base_url": "http://localhost:9999",
  "content_type": "application/json",
  "timeout_ms": 30000
}
```

### Minimal Debug Session

```python
import requests

BASE_URL = "http://localhost:9999"

# 1. Launch debug session
response = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "launch",
    "params": {
        "program": "/path/to/binary",
        "stopOnEntry": True
    }
})
assert response.json()["success"] == True

# 2. Set breakpoint
requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "set_breakpoint",
    "params": {
        "location": {"path": "/path/to/file.c", "line": 42}
    }
})

# 3. Continue to breakpoint
response = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "continue"
})

# 4. Inspect state
response = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "stack_trace"
})
print(response.json()["data"]["frames"])

# 5. Evaluate expression
response = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "evaluate",
    "params": {"expression": "my_variable"}
})
print(response.json()["data"]["result"])

# 6. Quit session
requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "quit"
})
```

---

## Architecture Overview

### System Components

```
┌─────────────────┐
│   AI Agent      │
│   (LLM/CLI)     │
└────────┬────────┘
         │ HTTP REST
         │ localhost:9999
         ▼
┌─────────────────────────────────┐
│  AI Debug Proxy (VS Code Ext)   │
│  ┌───────────────────────────┐  │
│  │  HTTP Server              │  │
│  │  - Router                 │  │
│  │  - Validation             │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  DebugController          │  │
│  │  - Operation Map (33 ops) │  │
│  │  - Session Management     │  │
│  │  - Breakpoint Tracking    │  │
│  └───────────┬───────────────┘  │
│              │ DAP              │
└──────────────┼──────────────────┘
               │
               ▼
      ┌────────────────┐
      │  GDB/LLDB      │
      │  Debugger      │
      └────────────────┘
```

### Key Design Patterns

1. **Operation Map Pattern**: All 33 debug operations are registered in a map for easy discovery
2. **Event Caching**: Stop events are cached for on-demand inspection
3. **Session Retention**: `_lastSession` pattern handles VS Code session lifecycle gaps
4. **Temp Breakpoint Tracking**: Automatic removal of temporary breakpoints

---

## HTTP API Reference

### System Endpoints

#### GET /api/ping

Health check and operation discovery.

**Request:**
```bash
curl http://localhost:9999/api/ping
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "0.1.2-beta",
    "operations": [
      "launch", "restart", "quit",
      "continue", "next", "step_in", "step_out", "jump", "until",
      "set_breakpoint", "set_temp_breakpoint", "remove_breakpoint",
      "remove_all_breakpoints_in_file", "disable_breakpoint",
      "enable_breakpoint", "ignore_breakpoint", "set_breakpoint_condition",
      "get_active_breakpoints", "get_data_breakpoint_info", "set_data_breakpoint",
      "list_threads", "switch_thread", "get_registers", "read_memory", "disassemble",
      "stack_trace", "list_source", "up", "down", "goto_frame", "get_source",
      "get_stack_frame_variables", "get_args", "evaluate", "pretty_print",
      "whatis", "execute_statement", "get_last_stop_info"
    ]
  },
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

#### GET /api/status

Get current debug session status.

**Request:**
```bash
curl http://localhost:9999/api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.1.2-beta",
    "hasActiveSession": true,
    "sessionId": "abc123-def456",
    "sessionName": "AI Debug Proxy"
  },
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

---

## Debug Operations

### Session Management ($DD-1.1)

#### launch

**$DD DD-1.1.1** - Start a debug session.

**Parameters:**
```typescript
interface LaunchParams {
  program?: string;        // Absolute path to binary (preferred)
  configName?: string;     // Named config from launch.json
  workspacePath?: string;  // For resolving configName
  stopOnEntry?: boolean;   // Stop at program entry (default: false)
  args?: string[];         // CLI arguments
  cwd?: string;            // Working directory
  env?: Record<string, string>; // Environment variables
  type?: string;           // Debugger type (default: "cppdbg")
}
```

**Request:**
```json
{
  "operation": "launch",
  "params": {
    "program": "/home/user/project/build/app",
    "stopOnEntry": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "operation": "launch",
  "data": {
    "success": true,
    "sessionId": "abc123",
    "stopReason": "entry"
  },
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

**AI Agent Notes:**
- Always prefer `program` over `configName` for reliability
- Use `stopOnEntry: true` to set initial breakpoints before execution
- Session ID is retained for cross-request continuity

#### restart

**$DD DD-1.1.2** - Restart current debug session.

```json
{
  "operation": "restart"
}
```

#### quit

**$DD DD-1.1.3** - Terminate debug session.

```json
{
  "operation": "quit"
}
```

---

### Execution Control ($DD-1.2)

#### continue

**$DD DD-1.2.1** - Resume execution until next breakpoint.

```json
{
  "operation": "continue"
}
```

**Response:**
```json
{
  "success": true,
  "stopReason": "breakpoint",
  "threadId": 1,
  "allThreadsStopped": true
}
```

#### next

**$DD DD-1.2.2** - Step over (execute one line, don't step into functions).

```json
{
  "operation": "next"
}
```

#### step_in

**$DD DD-1.2.3** - Step into (execute one line, step into function calls).

```json
{
  "operation": "step_in"
}
```

#### step_out

**$DD DD-1.2.4** - Step out (run until current function returns).

```json
{
  "operation": "step_out"
}
```

#### jump

**$DD DD-1.2.5** - Jump to specific line (no execution between).

**Parameters:**
```typescript
interface JumpParams {
  line: number;      // Target line (1-based)
  frameId?: number;  // Frame to jump within (default: top frame)
}
```

```json
{
  "operation": "jump",
  "params": {
    "line": 100
  }
}
```

#### until

**$DD DD-1.2.6** - Run until specific line (sets temp breakpoint).

```json
{
  "operation": "until",
  "params": {
    "line": 100
  }
}
```

---

### Breakpoint Management ($DD-1.3)

#### set_breakpoint

**$DD DD-1.3.1** - Set persistent breakpoint.

**Parameters:**
```typescript
interface SetBreakpointParams {
  location: {
    path: string;  // Absolute source path
    line: number;  // Line number (1-based)
  };
  condition?: string;    // Conditional expression
  hitCondition?: string; // Hit count (e.g., "10")
  logMessage?: string;   // Log message (don't stop)
}
```

**Request:**
```json
{
  "operation": "set_breakpoint",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    },
    "condition": "temperature > 100"
  }
}
```

#### set_temp_breakpoint

**$DD DD-1.3.2** - Set temporary breakpoint (auto-removes on hit).

```json
{
  "operation": "set_temp_breakpoint",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    }
  }
}
```

**AI Agent Notes:**
- Temp breakpoints are automatically tracked and removed
- Use for one-time stops (e.g., "run until line X")

#### remove_breakpoint

**$DD DD-1.3.3** - Remove breakpoint at location.

```json
{
  "operation": "remove_breakpoint",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    }
  }
}
```

#### remove_all_breakpoints_in_file

**$DD DD-1.3.4** - Remove all breakpoints in file.

```json
{
  "operation": "remove_all_breakpoints_in_file",
  "params": {
    "filePath": "/home/user/project/src/main.c"
  }
}
```

#### disable_breakpoint / enable_breakpoint

**$DD DD-1.3.5-6** - Toggle breakpoint without removing.

```json
{
  "operation": "disable_breakpoint",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    }
  }
}
```

#### set_breakpoint_condition

**$DD DD-1.3.7** - Update condition on existing breakpoint.

```json
{
  "operation": "set_breakpoint_condition",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    },
    "condition": "x > 5 && y < 10"
  }
}
```

#### ignore_breakpoint

**$DD DD-1.3.8** - Set ignore count (skip N hits).

```json
{
  "operation": "ignore_breakpoint",
  "params": {
    "location": {
      "path": "/home/user/project/src/main.c",
      "line": 42
    },
    "ignoreCount": 5
  }
}
```

#### get_active_breakpoints

**$DD DD-1.3.9** - List all active breakpoints.

```json
{
  "operation": "get_active_breakpoints"
}
```

**Response:**
```json
{
  "success": true,
  "breakpoints": [
    {
      "id": "bp-001",
      "location": {
        "path": "/home/user/project/src/main.c",
        "line": 42
      },
      "enabled": true,
      "condition": null,
      "hitCount": 3
    }
  ]
}
```

---

### State Inspection ($DD-1.4)

#### stack_trace

**$DD DD-1.4.1** - Get current call stack.

```json
{
  "operation": "stack_trace"
}
```

**Response:**
```json
{
  "success": true,
  "frames": [
    {
      "id": 1000,
      "name": "main",
      "sourcePath": "/home/user/project/src/main.c",
      "line": 42,
      "column": 0
    },
    {
      "id": 1001,
      "name": "init_system",
      "sourcePath": "/home/user/project/src/init.c",
      "line": 25,
      "column": 0
    }
  ],
  "totalFrames": 2
}
```

#### list_source

**$DD DD-1.4.2** - Show source code around current line.

**Parameters:**
```typescript
interface ListSourceParams {
  frameId?: number;     // Frame to show (default: top)
  linesAround?: number; // Context lines (default: 5)
}
```

```json
{
  "operation": "list_source",
  "params": {
    "linesAround": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "sourceCode": "  39: int x = 0;\n  40: \n  41: // Process data\n> 42: x = process_data(buf);\n  43: \n  44: return x;",
  "currentLine": 42
}
```

#### evaluate

**$DD DD-1.4.3** - Evaluate expression.

**Parameters:**
```typescript
interface EvaluateParams {
  expression: string;  // Expression to evaluate
  frameId?: number;    // Frame context (default: top)
  context?: string;    // "watch" | "repl" | "hover"
}
```

```json
{
  "operation": "evaluate",
  "params": {
    "expression": "temperature + offset"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": "95",
    "type": "int",
    "memoryReference": "0x7fff5fbff8ac"
  }
}
```

**AI Agent Security Note:**
- Expressions with `=` trigger user approval dialog
- Use `==` for comparisons to avoid approval
- For assignments, use `execute_statement` instead

#### pretty_print

**$DD DD-1.4.4** - Pretty-print complex variable (struct, array).

```json
{
  "operation": "pretty_print",
  "params": {
    "expression": "my_struct"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": "{\n  id = 42,\n  name = \"test\",\n  value = 3.14\n}"
  }
}
```

#### whatis

**$DD DD-1.4.5** - Get type of expression.

```json
{
  "operation": "whatis",
  "params": {
    "expression": "my_variable"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "struct TemperatureSensor"
  }
}
```

#### get_stack_frame_variables

**$DD DD-1.4.6** - Get variables in stack frame.

**Parameters:**
```typescript
interface GetVariablesParams {
  frameId?: number;           // Frame ID (default: top)
  filter?: 'all' | 'named' | 'indexed';
  scopeFilter?: string[];     // ['Locals', 'Arguments', 'Registers']
}
```

```json
{
  "operation": "get_stack_frame_variables",
  "params": {
    "frameId": 1000,
    "scopeFilter": ["Locals", "Arguments"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "variables": [
    {"name": "temperature", "value": "95", "type": "int"},
    {"name": "offset", "value": "5", "type": "int"},
    {"name": "buf", "value": "0x7fff5fbff8a0", "type": "uint8_t *"}
  ]
}
```

#### get_args

**$DD DD-1.4.7** - Get function arguments (shortcut for get_stack_frame_variables with Args filter).

```json
{
  "operation": "get_args"
}
```

#### get_last_stop_info

**$DD DD-1.4.8** - Get information about last stop event.

```json
{
  "operation": "get_last_stop_info"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123",
  "stopInfo": {
    "reason": "breakpoint",
    "threadId": 1,
    "allThreadsStopped": true,
    "description": "Breakpoint hit at main.c:42"
  }
}
```

---

### Hardware & Thread Management

#### list_threads

List all threads in debug session.

```json
{
  "operation": "list_threads"
}
```

#### switch_thread

Switch to specific thread.

```json
{
  "operation": "switch_thread",
  "params": {
    "threadId": 2
  }
}
```

#### get_registers

Get CPU registers for current frame.

```json
{
  "operation": "get_registers",
  "params": {
    "frameId": 1000
  }
}
```

#### read_memory

Read memory at address.

**Parameters:**
```typescript
interface ReadMemoryParams {
  memoryReference: string;  // Memory address (e.g., "0x7fff5fbff8ac")
  offset: number;           // Offset from address
  count: number;            // Bytes to read
}
```

```json
{
  "operation": "read_memory",
  "params": {
    "memoryReference": "0x7fff5fbff8ac",
    "offset": 0,
    "count": 16
  }
}
```

#### disassemble

Disassemble code at address.

```json
{
  "operation": "disassemble",
  "params": {
    "memoryReference": "0x400520",
    "instructionCount": 20
  }
}
```

---

## Debugging Workflow Patterns

### Pattern 1: Basic Debug Session

```python
class AIDebugSession:
    def __init__(self, base_url="http://localhost:9999"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def launch(self, program: str, stop_on_entry: bool = True) -> dict:
        """Launch debug session."""
        resp = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "launch",
            "params": {
                "program": program,
                "stopOnEntry": stop_on_entry
            }
        })
        return resp.json()
    
    def set_breakpoint(self, path: str, line: int, condition: str = None) -> dict:
        """Set breakpoint."""
        params = {
            "location": {"path": path, "line": line}
        }
        if condition:
            params["condition"] = condition
        
        resp = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "set_breakpoint",
            "params": params
        })
        return resp.json()
    
    def continue_to_breakpoint(self) -> dict:
        """Continue execution."""
        resp = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "continue"
        })
        return resp.json()
    
    def inspect_state(self) -> dict:
        """Get stack trace and variables."""
        stack = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "stack_trace"
        }).json()
        
        variables = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "get_stack_frame_variables"
        }).json()
        
        return {
            "stack": stack,
            "variables": variables
        }
    
    def evaluate(self, expression: str) -> str:
        """Evaluate expression."""
        resp = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "evaluate",
            "params": {"expression": expression}
        })
        return resp.json()["data"]["result"]
    
    def quit(self) -> dict:
        """End session."""
        resp = self.session.post(f"{self.base_url}/api/debug", json={
            "operation": "quit"
        })
        return resp.json()
```

### Pattern 2: Iterative Debugging Loop

```python
def ai_debug_loop(agent, binary_path, suspected_bugs):
    """
    AI-driven iterative debugging loop.
    
    Args:
        agent: LLM agent with reasoning capabilities
        binary_path: Path to debug binary
        suspected_bugs: List of suspected bug locations
    """
    debug = AIDebugSession()
    
    # Phase 1: Launch
    debug.launch(binary_path, stop_on_entry=False)
    
    # Phase 2: Set breakpoints at suspected locations
    for bug in suspected_bugs:
        debug.set_breakpoint(bug["file"], bug["line"])
    
    # Phase 3: Iterative investigation
    while True:
        # Continue to next breakpoint
        result = debug.continue_to_breakpoint()
        
        if result.get("stopReason") == "exit":
            print("Program exited")
            break
        
        # Inspect state
        state = debug.inspect_state()
        
        # AI reasoning
        analysis = agent.analyze_state(state)
        
        if analysis.confidence > 0.9:
            print(f"Bug found: {analysis.explanation}")
            break
        
        # Set new breakpoints based on analysis
        for new_loc in analysis.suspected_locations:
            debug.set_breakpoint(new_loc["file"], new_loc["line"])
    
    debug.quit()
```

### Pattern 3: Batch Operations

```python
def batch_debug_operations(operations: list) -> list:
    """Execute multiple operations in batch."""
    resp = requests.post(f"{BASE_URL}/api/debug/batch", json={
        "operations": operations,
        "parallel": False  # Sequential execution
    })
    return resp.json()["data"]

# Example: Set multiple breakpoints at once
batch_result = batch_debug_operations([
    {"operation": "set_breakpoint", "params": {"location": {"path": "main.c", "line": 10}}},
    {"operation": "set_breakpoint", "params": {"location": {"path": "main.c", "line": 25}}},
    {"operation": "set_breakpoint", "params": {"location": {"path": "utils.c", "line": 42}}},
])
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "operation": "launch",
  "error": "Human-readable error message",
  "timestamp": "2026-03-12T10:00:00.000Z"
}
```

### Common Error Codes

| HTTP Status | Meaning | AI Agent Action |
|-------------|---------|-----------------|
| 200 | Success (check `data.success`) | Proceed with workflow |
| 400 | Bad request | Fix parameters and retry |
| 403 | User denied approval | Request user confirmation |
| 404 | Unknown operation | Check operation name |
| 500 | Internal error | Log and retry or abort |

### Error Recovery Pattern

```python
def robust_debug_operation(operation: str, params: dict, max_retries: int = 3):
    """Execute debug operation with retry logic."""
    for attempt in range(max_retries):
        try:
            resp = requests.post(f"{BASE_URL}/api/debug", json={
                "operation": operation,
                "params": params
            }, timeout=30)
            
            result = resp.json()
            
            if result.get("success"):
                return result
            
            # Check if error is recoverable
            error = result.get("error", "")
            if "No active session" in error:
                # Session lost - relaunch
                requests.post(f"{BASE_URL}/api/debug", json={
                    "operation": "launch",
                    "params": params.get("launch_params", {})
                })
                continue
            
            # Non-recoverable error
            raise DebugError(f"Operation failed: {error}")
            
        except requests.Timeout:
            if attempt == max_retries - 1:
                raise
            time.sleep(1 * (attempt + 1))  # Exponential backoff
```

---

## Session Management

### Session Lifecycle

```
1. Launch
   → POST /api/debug {operation: "launch"}
   → Returns: sessionId, stopReason
   
2. Active Debugging
   → Multiple operations (breakpoints, step, evaluate)
   → Session retained via _lastSession pattern
   
3. Stop Event
   → Cached automatically by extension
   → Access via get_last_stop_info
   
4. Termination
   → POST /api/debug {operation: "quit"}
   → Session cleared
```

### Cross-Request Session Continuity

The extension uses `_lastSession` pattern to handle VS Code session lifecycle:

```typescript
// Extension internal behavior:
startDebugging() resolves
  → _lastSession = activeSession

stop event fires
  → operations use: activeDebugSession ?? _lastSession

onDidTerminateDebugSession fires
  → clearLastSession()
```

**AI Agent Notes:**
- You don't need to track session ID manually
- Extension handles session continuity automatically
- If "No active session" error occurs, relaunch the session

---

## Advanced Features

### LSP Code Intelligence

#### GET /api/symbols

Get document symbols.

**Request:**
```bash
curl "http://localhost:9999/api/symbols?fsPath=/path/to/file.c"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbols": [
      {"name": "main", "kind": "Function", "line": 10},
      {"name": "process_data", "kind": "Function", "line": 45},
      {"name": "TemperatureSensor", "kind": "Struct", "line": 5}
    ]
  }
}
```

#### GET /api/references

Find references to symbol.

**Request:**
```bash
curl "http://localhost:9999/api/references?fsPath=/path/to/file.c&line=10&character=5"
```

#### GET /api/call-hierarchy

Get call hierarchy.

**Request:**
```bash
curl "http://localhost:9999/api/call-hierarchy?fsPath=/path/to/file.c&line=10&character=5&direction=incoming"
```

### Subagent Orchestration

#### POST /api/subagents

Spawn concurrent CLI tasks.

**Request:**
```json
[
  {
    "id": "build",
    "command": "make",
    "args": ["-C", "/path/to/project"],
    "timeout": 30000
  },
  {
    "id": "test",
    "command": "ctest",
    "args": ["--output-on-failure"],
    "timeout": 60000
  }
]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "build",
        "exitCode": 0,
        "stdout": "Build succeeded",
        "stderr": ""
      },
      {
        "id": "test",
        "exitCode": 1,
        "stdout": "10 tests passed",
        "stderr": "2 tests failed"
      }
    ]
  }
}
```

**Limits:**
- Maximum 50 concurrent tasks
- Output truncated at 1 MB per task
- Requires user approval

---

## Integration Examples

### Python Integration

```python
import requests
import json
from typing import Optional, Dict, Any

class AIDebugProxy:
    """Python client for AI Debug Proxy."""
    
    def __init__(self, base_url: str = "http://localhost:9999"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def _post(self, operation: str, params: Optional[Dict] = None) -> Dict:
        """Execute debug operation."""
        payload = {"operation": operation}
        if params:
            payload["params"] = params
        
        resp = self.session.post(
            f"{self.base_url}/api/debug",
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()
    
    def launch(self, program: str, **kwargs) -> Dict:
        """Launch debug session."""
        return self._post("launch", {
            "program": program,
            **kwargs
        })
    
    def set_breakpoint(self, path: str, line: int, **kwargs) -> Dict:
        """Set breakpoint."""
        return self._post("set_breakpoint", {
            "location": {"path": path, "line": line},
            **kwargs
        })
    
    def continue_exec(self) -> Dict:
        """Continue execution."""
        return self._post("continue")
    
    def next_step(self) -> Dict:
        """Step over."""
        return self._post("next")
    
    def step_in(self) -> Dict:
        """Step into."""
        return self._post("step_in")
    
    def step_out(self) -> Dict:
        """Step out."""
        return self._post("step_out")
    
    def evaluate(self, expression: str, frame_id: Optional[int] = None) -> str:
        """Evaluate expression."""
        params = {"expression": expression}
        if frame_id:
            params["frameId"] = frame_id
        result = self._post("evaluate", params)
        return result["data"]["result"]
    
    def get_stack(self) -> Dict:
        """Get stack trace."""
        return self._post("stack_trace")
    
    def get_variables(self, frame_id: Optional[int] = None) -> Dict:
        """Get variables in frame."""
        params = {}
        if frame_id:
            params["frameId"] = frame_id
        return self._post("get_stack_frame_variables", params)
    
    def list_source(self, lines_around: int = 5) -> str:
        """List source code around current line."""
        result = self._post("list_source", {"linesAround": lines_around})
        return result["data"]["sourceCode"]
    
    def quit(self) -> Dict:
        """End session."""
        return self._post("quit")


# Usage example
if __name__ == "__main__":
    proxy = AIDebugProxy()
    
    # Launch
    proxy.launch("/path/to/binary", stopOnEntry=True)
    
    # Set breakpoints
    proxy.set_breakpoint("/path/to/main.c", 42)
    proxy.set_breakpoint("/path/to/utils.c", 25, condition="x > 100")
    
    # Continue to breakpoint
    proxy.continue_exec()
    
    # Inspect
    print("Stack:", proxy.get_stack())
    print("Variables:", proxy.get_variables())
    print("Source:", proxy.list_source())
    
    # Evaluate
    result = proxy.evaluate("my_variable + 10")
    print("Evaluation:", result)
    
    # Step through
    proxy.next_step()
    proxy.step_in()
    proxy.step_out()
    
    # Quit
    proxy.quit()
```

### Node.js Integration

```typescript
import axios, { AxiosInstance } from 'axios';

interface DebugOperation {
  operation: string;
  params?: Record<string, any>;
}

interface DebugResponse {
  success: boolean;
  operation?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

class AIDebugProxy {
  private client: AxiosInstance;
  
  constructor(baseUrl: string = 'http://localhost:9999') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {'Content-Type': 'application/json'}
    });
  }
  
  async execute(operation: string, params?: Record<string, any>): Promise<DebugResponse> {
    const response = await this.client.post<DebugResponse>('/api/debug', {
      operation,
      params
    });
    return response.data;
  }
  
  async launch(program: string, options: Record<string, any> = {}): Promise<DebugResponse> {
    return this.execute('launch', {
      program,
      ...options
    });
  }
  
  async setBreakpoint(path: string, line: number, condition?: string): Promise<DebugResponse> {
    return this.execute('set_breakpoint', {
      location: {path, line},
      ...(condition && {condition})
    });
  }
  
  async continue(): Promise<DebugResponse> {
    return this.execute('continue');
  }
  
  async next(): Promise<DebugResponse> {
    return this.execute('next');
  }
  
  async stepIn(): Promise<DebugResponse> {
    return this.execute('step_in');
  }
  
  async stepOut(): Promise<DebugResponse> {
    return this.execute('step_out');
  }
  
  async evaluate(expression: string, frameId?: number): Promise<string> {
    const response = await this.execute('evaluate', {
      expression,
      ...(frameId && {frameId})
    });
    return response.data?.result;
  }
  
  async getStackTrace(): Promise<DebugResponse> {
    return this.execute('stack_trace');
  }
  
  async getVariables(frameId?: number): Promise<DebugResponse> {
    return this.execute('get_stack_frame_variables', {
      ...(frameId && {frameId})
    });
  }
  
  async listSource(linesAround: number = 5): Promise<string> {
    const response = await this.execute('list_source', {linesAround});
    return response.data?.sourceCode;
  }
  
  async quit(): Promise<DebugResponse> {
    return this.execute('quit');
  }
}

// Usage
async function main() {
  const proxy = new AIDebugProxy();
  
  await proxy.launch('/path/to/binary', {stopOnEntry: true});
  await proxy.setBreakpoint('/path/to/main.c', 42);
  await proxy.continue();
  
  const stack = await proxy.getStackTrace();
  console.log('Stack:', stack);
  
  const result = await proxy.evaluate('my_variable');
  console.log('Result:', result);
  
  await proxy.quit();
}
```

---

## Best Practices

### 1. Session Management

```python
# ✅ GOOD: Always launch with stopOnEntry for initial setup
debug.launch(program, stopOnEntry=True)
# Set breakpoints before execution
debug.set_breakpoint(path, line)
# Then continue
debug.continue()

# ❌ BAD: Setting breakpoints after program runs
debug.launch(program, stopOnEntry=False)
debug.set_breakpoint(path, line)  # May miss the location
```

### 2. Error Recovery

```python
# ✅ GOOD: Handle session loss gracefully
try:
    result = debug.continue()
except DebugError as e:
    if "No active session" in str(e):
        debug.launch(program)  # Relaunch
        result = debug.continue()
    else:
        raise

# ❌ BAD: No error handling
result = debug.continue()  # May fail silently
```

### 3. Efficient Inspection

```python
# ✅ GOOD: Get all variables at once
variables = debug.get_stack_frame_variables()
for var in variables["variables"]:
    analyze(var)

# ❌ BAD: Evaluate each variable separately
for var_name in suspected_vars:
    result = debug.evaluate(var_name)  # Slow!
```

### 4. Conditional Breakpoints

```python
# ✅ GOOD: Use conditions for rare events
debug.set_breakpoint(path, line, condition="iteration_count == 1000")

# ❌ BAD: Manual counting in loop
for i in range(1000):
    debug.continue()  # Very slow!
```

### 5. Batch Operations

```python
# ✅ GOOD: Use batch for multiple operations
batch_result = debug.batch([
    {"operation": "set_breakpoint", "params": {...}},
    {"operation": "set_breakpoint", "params": {...}},
])

# ❌ BAD: Sequential individual calls
debug.set_breakpoint(...)
debug.set_breakpoint(...)
debug.set_breakpoint(...)  # Slower, more network overhead
```

---

## Related Documents

- [API Reference](./guides/api-reference.md)
- [Troubleshooting](./guides/troubleshooting.md)
- [WSL2 Setup](./guides/wsl2-setup.md)
- [Debugging Guide](./guides/debugging-guide.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
