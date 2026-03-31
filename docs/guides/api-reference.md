# API Reference — AI Debug Proxy v3

**Version:** 3.0.0-b1
**Base URL:** `http://localhost:9999`
**Last Updated:** 2026-03-30

All request/response bodies are JSON. All responses include a `timestamp` field (ISO 8601).

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ping` | Health check |
| GET | `/api/debug/status` | Session status |
| POST | `/api/debug/execute_operation` | Execute a debug operation |
| POST | `/api/subagents` | Spawn concurrent CLI subagents |

> `/api/debug` is a backward-compatible alias for `/api/debug/execute_operation`.

---

## GET /api/ping

Health check. Always succeeds even without an active session.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "3.0.0-b1",
    "operations": ["launch", "attach", "terminate", ...]
  },
  "timestamp": "2026-03-30T10:00:00.000Z"
}
```

---

## GET /api/debug/status

Returns the current debug session state.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveSession": true,
    "sessionId": "abc123-...",
    "sessionName": "AI Debug Proxy",
    "currentThreadId": 1,
    "currentFrameId": 0
  },
  "timestamp": "..."
}
```

---

## POST /api/debug/execute_operation

Execute any of the 38 supported debug operations.

**Request body:**
```json
{
  "operation": "<operation_name>",
  "params": { ... }
}
```

**Response (success):**
```json
{
  "success": true,
  "operation": "<operation_name>",
  "data": { ... },
  "timestamp": "..."
}
```

**Response (error):**
```json
{
  "success": false,
  "operation": "<operation_name>",
  "error": "Human-readable error message",
  "timestamp": "..."
}
```

---

## Debug Operations

### Session Management

#### `launch`

Start a debug session.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `program` | string | * | Absolute path to binary |
| `configName` | string | * | Named config from `.vscode/launch.json` |
| `workspacePath` | string | no | Project root when using `configName` |
| `stopOnEntry` | boolean | no | Stop at entry point (default: `false`) |
| `args` | string[] | no | CLI arguments |
| `cwd` | string | no | Working directory |
| `env` | object | no | Environment variables |
| `type` | string | no | Debugger type (default: `"cppdbg"`) |

*Either `program` or `configName` is required.

```json
{
  "operation": "launch",
  "params": {
    "program": "/home/user/project/build/my_app",
    "stopOnEntry": true
  }
}
```

**Response:**
```json
{ "success": true, "sessionId": "abc123", "stopReason": "entry" }
```

---

#### `attach`

Attach to a running process by PID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `processId` | number | yes | PID of the target process |

```json
{ "operation": "attach", "params": { "processId": 1234 } }
```

---

#### `terminate`

Terminate the active debug session and stop the debugged process.

```json
{ "operation": "terminate" }
```

---

#### `restart`

Restart the current debug session from the beginning.

```json
{ "operation": "restart" }
```

---

### Execution Control

#### `continue`

Resume execution until the next breakpoint or program end.

```json
{ "operation": "continue" }
```

---

#### `next` / `step_over`

Step over — execute one source line without stepping into calls.

```json
{ "operation": "next" }
```

---

#### `step_in`

Step into — execute one source line, entering function calls.

```json
{ "operation": "step_in" }
```

---

#### `step_out`

Step out — run until the current function returns.

```json
{ "operation": "step_out" }
```

---

#### `pause`

Interrupt execution and stop all threads.

```json
{ "operation": "pause" }
```

---

#### `jump`

Jump execution to a specific line (no code between current and target is executed).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `line` | number | yes | Target line number (1-based) |

```json
{ "operation": "jump", "params": { "line": 42 } }
```

---

#### `until`

Run until a specific line is reached (like a temporary breakpoint).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `line` | number | yes | Target line number |

```json
{ "operation": "until", "params": { "line": 100 } }
```

---

### Breakpoint Management

#### `set_breakpoint`

Set a persistent breakpoint.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Absolute path to source file |
| `location.line` | number | yes | Line number (1-based) |
| `condition` | string | no | Conditional expression, e.g., `"x > 5"` |
| `hitCondition` | string | no | Hit count expression, e.g., `"10"` |
| `logMessage` | string | no | Log message instead of stopping |

```json
{
  "operation": "set_breakpoint",
  "params": {
    "location": { "path": "/path/to/file.c", "line": 42 },
    "condition": "temperature > 100"
  }
}
```

---

#### `set_temp_breakpoint`

Set a breakpoint that auto-removes after the first hit. Same params as `set_breakpoint`.

---

#### `remove_breakpoint`

Remove a specific breakpoint.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Source file path |
| `location.line` | number | yes | Line number |

---

#### `remove_all_breakpoints_in_file`

Remove all breakpoints in a given source file.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | yes | Absolute path to source file |

```json
{ "operation": "remove_all_breakpoints_in_file", "params": { "filePath": "/path/to/file.c" } }
```

---

#### `get_active_breakpoints`

List all currently active breakpoints.

```json
{ "operation": "get_active_breakpoints" }
```

**Response:**
```json
{
  "success": true,
  "breakpoints": [
    { "id": 1, "path": "/path/to/file.c", "line": 42, "enabled": true, "condition": null }
  ]
}
```

---

### Stack Navigation

#### `stack_trace`

Get the current call stack.

```json
{ "operation": "stack_trace" }
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 0, "name": "main", "sourcePath": "/path/file.c", "line": 42, "column": 0 },
    { "id": 1, "name": "caller", "sourcePath": "/path/file.c", "line": 10 }
  ],
  "totalFrames": 2
}
```

---

#### `up` / `frame_up`

Move one frame up (toward the caller). Updates the active frame context for subsequent variable/expression calls.

```json
{ "operation": "up" }
```

---

#### `down` / `frame_down`

Move one frame down (toward the callee).

```json
{ "operation": "down" }
```

---

#### `goto_frame`

Jump to a specific stack frame by ID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `frameId` | number | yes | Frame ID from `stack_trace` |

```json
{ "operation": "goto_frame", "params": { "frameId": 3 } }
```

---

### Variable Inspection

#### `get_variables`

Get local variables for the current (or specified) frame.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `frameId` | number | no | Frame ID (default: active frame) |

**Response:**
```json
{
  "success": true,
  "data": [
    { "name": "x", "value": "42", "type": "int" },
    { "name": "ptr", "value": "0x55555557f2a0", "type": "char *" }
  ]
}
```

---

#### `get_arguments`

Get function argument variables for the current frame.

```json
{ "operation": "get_arguments" }
```

---

#### `get_globals`

Get global variable values. May return a large list for programs with many globals.

```json
{ "operation": "get_globals" }
```

---

#### `list_all_locals`

Get all locals (variables + arguments) for the current frame.

```json
{ "operation": "list_all_locals" }
```

---

#### `get_scope_preview`

Get a compact scope snapshot: locals + arguments combined. Useful for AI context gathering.

```json
{ "operation": "get_scope_preview" }
```

---

#### `evaluate`

Evaluate an expression in the current debug context.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | yes | Expression to evaluate |
| `frameId` | number | no | Frame context (default: active frame) |
| `context` | string | no | `"watch"` / `"repl"` / `"hover"` |

```json
{ "operation": "evaluate", "params": { "expression": "temperature + offset" } }
```

---

#### `pretty_print`

Pretty-print a complex variable (struct, array, pointer) with one level of field expansion.

Same params as `evaluate`.

**Response (struct):**
```json
{
  "success": true,
  "result": "{...}",
  "type": "MyStruct",
  "fields": [
    { "name": "field1", "type": "int", "value": "42" },
    { "name": "field2", "type": "char *", "value": "0x..." }
  ]
}
```

---

#### `whatis`

Show the type of an expression.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | yes | Variable or expression |

```json
{ "operation": "whatis", "params": { "expression": "myVar" } }
```

---

#### `execute_statement`

Execute a debug statement (e.g., call a function, GDB MI command).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `statement` | string | yes | Statement to execute (e.g., `"info locals"`) |

```json
{ "operation": "execute_statement", "params": { "statement": "info registers" } }
```

---

### Source Navigation

#### `list_source`

Show source code around the current execution line.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `frameId` | number | no | Frame to show (default: top frame) |
| `linesAround` | number | no | Lines of context on each side (default: 5) |

**Response:**
```json
{
  "success": true,
  "sourceCode": "  40: ...\n> 42: int x = foo();\n  43: ...",
  "currentLine": 42
}
```

---

#### `get_source`

Get the full source of a file or symbol.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | yes | Symbol name or file path (relative paths blocked) |

```json
{ "operation": "get_source", "params": { "expression": "main" } }
```

---

#### `get_last_stop_info`

Get information about the last stop event.

```json
{ "operation": "get_last_stop_info" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reason": "breakpoint-hit",
    "threadId": 1,
    "allThreadsStopped": true,
    "bkptno": "1",
    "frame": { "func": "main", "file": "main.c", "line": "42" }
  }
}
```

---

### Hardware / Memory

#### `get_registers`

Get CPU register values.

```json
{ "operation": "get_registers" }
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "name": "rax", "value": "0x0000000000000000" },
    { "name": "rip", "value": "0x0000555555555195" }
  ]
}
```

---

#### `read_memory`

Read raw bytes from a memory address.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryReference` | string | yes | Hex address, e.g., `"0x7fffffffe000"` |
| `count` | number | yes | Number of bytes to read |
| `offset` | number | no | Byte offset from `memoryReference` |

```json
{ "operation": "read_memory", "params": { "memoryReference": "0x7fffffffe000", "count": 16 } }
```

**Response:**
```json
{ "success": true, "data": { "address": "0x7fffffffe000", "data": "48656c6c6f..." } }
```

---

#### `write_memory`

Write bytes to a memory address (use with caution).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | number | yes | Target address as integer |
| `data` | string | no | Hex-encoded bytes to write, e.g., `"deadbeef"` |

```json
{ "operation": "write_memory", "params": { "address": 6295552, "data": "01020304" } }
```

**Response:**
```json
{ "success": true, "address": "0x600000", "bytesWritten": 4 }
```

---

### Multi-Thread Debugging

#### `list_threads`

List all active threads with their current stack frame.

```json
{ "operation": "list_threads" }
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "main", "state": "stopped", "frame": { "func": "main", "line": 42 } },
    { "id": 2, "name": "worker_0", "state": "stopped", "frame": { "func": "worker", "line": 88 } }
  ]
}
```

---

#### `switch_thread`

Switch the active thread context. Subsequent `stack_trace`, `get_variables`, etc. operate on this thread.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `threadId` | number | yes | Thread ID from `list_threads` |

```json
{ "operation": "switch_thread", "params": { "threadId": 2 } }
```

> **Note:** Resets the active frame to 0 (top of the new thread's stack).

---

### Capabilities

#### `get_capabilities`

Return the backend's declared capabilities.

```json
{ "operation": "get_capabilities" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportsLaunch": true,
    "supportsAttach": false,
    "supportsTerminate": true,
    "supportsReadMemory": true,
    "supportsWriteMemory": true
  }
}
```

---

## POST /api/subagents

Spawn concurrent CLI tasks as subagents. Requires user approval via VS Code dialog.

**Request body:** Array of task objects.

```json
[
  { "id": "build", "command": "make", "args": ["-C", "/path/to/project"], "timeout": 30000 },
  { "id": "test", "command": "pytest", "args": ["tests/"], "timeout": 60000 }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique task identifier |
| `command` | string | yes | Executable to run |
| `args` | string[] | no | CLI arguments |
| `stdin` | string | no | Data to pipe to stdin |
| `timeout` | number | no | Timeout ms (default: 30000) |

**Limits:** Maximum 50 concurrent tasks. Output truncated at 1 MB per task.

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success (check `success` field for operation-level result) |
| 400 | Bad request — missing or invalid parameters |
| 403 | User denied approval for a destructive operation |
| 404 | Unknown endpoint |
| 500 | Internal extension error |

---

## Operation Summary (38 total)

| # | Operation | Category | No-param |
|---|-----------|----------|----------|
| 1 | `launch` | Session | |
| 2 | `attach` | Session | |
| 3 | `terminate` | Session | yes |
| 4 | `restart` | Session | yes |
| 5 | `continue` | Execution | yes |
| 6 | `next` | Execution | yes |
| 7 | `step_in` | Execution | yes |
| 8 | `step_out` | Execution | yes |
| 9 | `pause` | Execution | yes |
| 10 | `jump` | Execution | |
| 11 | `until` | Execution | |
| 12 | `set_breakpoint` | Breakpoints | |
| 13 | `set_temp_breakpoint` | Breakpoints | |
| 14 | `remove_breakpoint` | Breakpoints | |
| 15 | `remove_all_breakpoints_in_file` | Breakpoints | |
| 16 | `get_active_breakpoints` | Breakpoints | yes |
| 17 | `stack_trace` | Stack | yes |
| 18 | `up` | Stack | yes |
| 19 | `down` | Stack | yes |
| 20 | `goto_frame` | Stack | |
| 21 | `get_variables` | Variables | yes |
| 22 | `get_arguments` | Variables | yes |
| 23 | `get_globals` | Variables | yes |
| 24 | `list_all_locals` | Variables | yes |
| 25 | `get_scope_preview` | Variables | yes |
| 26 | `evaluate` | Variables | |
| 27 | `pretty_print` | Variables | |
| 28 | `whatis` | Variables | |
| 29 | `execute_statement` | Variables | |
| 30 | `list_source` | Source | yes |
| 31 | `get_source` | Source | |
| 32 | `get_last_stop_info` | Source | yes |
| 33 | `get_registers` | Hardware | yes |
| 34 | `read_memory` | Hardware | |
| 35 | `write_memory` | Hardware | |
| 36 | `list_threads` | Threads | yes |
| 37 | `switch_thread` | Threads | |
| 38 | `get_capabilities` | Meta | yes |
