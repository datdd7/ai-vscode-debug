# API Reference

Base URL: `http://localhost:9999`

All request/response bodies are JSON. All responses include a `timestamp` field (ISO 8601).

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ping` | Health check, returns available operations |
| GET | `/api/status` | Current session status |
| POST | `/api/debug` | Execute a debug operation |
| POST | `/api/subagents` | Spawn concurrent CLI subagents |
| POST | `/api/commands` | Execute a macro command |
| GET | `/api/symbols?fsPath=` | LSP document symbols |
| GET | `/api/references?fsPath=&line=&character=` | LSP find references |
| GET | `/api/call-hierarchy?fsPath=&line=&character=&direction=` | LSP call hierarchy |

---

## GET /api/ping

Health check. Always succeeds even when no debug session is active.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "0.1.6",
    "operations": ["launch", "restart", "quit", "continue", ...]
  },
  "timestamp": "2026-03-11T10:00:00.000Z"
}
```

---

## GET /api/status

Returns current debug session state.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveSession": true,
    "sessionId": "abc123-...",
    "sessionName": "AI Debug Proxy"
  },
  "timestamp": "..."
}
```

---

## POST /api/debug

Main debug operations endpoint.

**Request body:**
```json
{
  "operation": "<operation_name>",
  "params": { ... }
}
```

**Response body (success):**
```json
{
  "success": true,
  "operation": "<operation_name>",
  "data": { ... },
  "timestamp": "..."
}
```

**Response body (error):**
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
| `program` | string | * | Absolute path to binary. Preferred over `configName`. |
| `configName` | string | * | Named config from `.vscode/launch.json`. |
| `workspacePath` | string | no | Project root for resolving `configName` when the project folder is not open in VS Code. |
| `stopOnEntry` | boolean | no | Stop at program entry point (default: `false`) |
| `args` | string[] | no | CLI arguments |
| `cwd` | string | no | Working directory |
| `env` | object | no | Environment variables |
| `type` | string | no | Debugger type (default: `"cppdbg"`) |

*Either `program` or `configName` is required.

> **Recommendation:** Always use `program` for reliability. Use `configName` + `workspacePath` only when the launch config has complex settings that cannot be replicated inline.

**Example — program path:**
```json
{
  "operation": "launch",
  "params": {
    "program": "/home/user/project/build/my_app",
    "stopOnEntry": true,
    "type": "cppdbg"
  }
}
```

**Example — config name:**
```json
{
  "operation": "launch",
  "params": {
    "configName": "Debug on Linux",
    "workspacePath": "/home/user/project"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123",
  "stopReason": "entry"
}
```

---

#### `restart`

Restart the current debug session.

```json
{ "operation": "restart" }
```

---

#### `quit`

Stop and terminate the current debug session.

```json
{ "operation": "quit" }
```

---

### Execution Control

#### `continue`

Resume execution until the next breakpoint or program end.

```json
{ "operation": "continue" }
```

---

#### `next`

Step over — execute one source line, not stepping into function calls.

```json
{ "operation": "next" }
```

---

#### `step_in`

Step into — execute one source line, stepping into function calls.

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

#### `jump`

Jump execution to a specific line in the current file (no execution between current and target line).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `line` | number | yes | Target line number (1-based) |
| `frameId` | number | no | Frame to jump within (default: top frame) |

```json
{ "operation": "jump", "params": { "line": 42 } }
```

---

### Breakpoints

#### `set_breakpoint`

Set a persistent breakpoint.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Absolute path to source file |
| `location.line` | number | yes | Line number (1-based) |
| `condition` | string | no | Conditional expression (e.g., `"x > 5"`) |
| `hitCondition` | string | no | Hit count expression (e.g., `"10"`) |
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

#### `set_breakpoints`

Batch: set multiple breakpoints in a single file atomically. More efficient than multiple `set_breakpoint` calls.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | yes | Absolute path to source file |
| `breakpoints` | array | yes | Array of `{line, condition?, hitCondition?, logMessage?}` |

```json
{
  "operation": "set_breakpoints",
  "params": {
    "file": "/path/to/file.c",
    "breakpoints": [
      { "line": 42 },
      { "line": 100, "condition": "errorCode != 0" }
    ]
  }
}
```

---

#### `set_temp_breakpoint`

Set a breakpoint that auto-removes after the first hit.

Same params as `set_breakpoint`.

---

#### `watch`

Set a watchpoint (data breakpoint) on a variable. Stops execution when the variable is read/written.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Variable name |
| `accessType` | string | no | `"read"`, `"write"` (default), or `"readWrite"` |
| `condition` | string | no | Optional hit condition |

```json
{
  "operation": "watch",
  "params": { "name": "errorCode", "accessType": "write" }
}
```

> **Note:** Attempts DAP `dataBreakpointInfo` path first; falls back to GDB `watch`/`rwatch`/`awatch` command via repl if `vscode.DataBreakpoint` API is unavailable.

---

#### `remove_breakpoint`

Remove a breakpoint at a specific location.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Source file path |
| `location.line` | number | yes | Line number |

---

#### `toggle_breakpoint`

Enable or disable a breakpoint without removing it.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Source file path |
| `location.line` | number | yes | Line number |
| `enable` | boolean | yes | `true` to enable, `false` to disable |

---

#### `set_breakpoint_condition`

Update the condition on an existing breakpoint.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Source file path |
| `location.line` | number | yes | Line number |
| `condition` | string/null | yes | New condition, or `null` to clear |

---

#### `ignore_breakpoint`

Set an ignore (skip) count on a breakpoint.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `location.path` | string | yes | Source file path |
| `location.line` | number | yes | Line number |
| `ignoreCount` | number/null | yes | Skip N hits before stopping, or `null` to reset |

---

### Inspection

#### `stack_trace`

Get the current call stack.

```json
{ "operation": "stack_trace" }
```

**Response:**
```json
{
  "success": true,
  "frames": [
    { "id": 1, "name": "main", "sourcePath": "/path/file.c", "line": 42, "column": 0 },
    { "id": 2, "name": "caller", "sourcePath": "/path/file.c", "line": 10, "column": 0 }
  ],
  "totalFrames": 2
}
```

---

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

#### `evaluate`

Evaluate an expression in the current debug context.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | yes | Expression to evaluate |
| `frameId` | number | no | Frame context (default: top frame) |
| `context` | string | no | `"watch"` / `"repl"` / `"hover"` |

> **Security:** Expressions containing `=` (assignment) trigger a user approval dialog before execution.

```json
{
  "operation": "evaluate",
  "params": { "expression": "temperature + offset" }
}
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
  "type": "ecy_hsm_SymCipherDrv_JobContextT",
  "variablesReference": 1010,
  "fields": [
    { "name": "paddingMode", "type": "ecy_hsm_Csai_PaddingModeT", "value": "ecy_hsm_CSAI_PAD_NONE" },
    { "name": "errorState",  "type": "uint32",                    "value": "0" }
  ]
}
```

`fields` is omitted for scalar types or when expansion fails.

---

#### `whatis`

Show the type of an expression.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | string | yes | Variable or expression |

---

#### `execute_statement`

Execute a debug statement (e.g., call a function, assign a variable). Requires user approval.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `statement` | string | yes | Statement to execute |

---

#### `up` / `down`

Navigate to the calling/called frame in the stack. Updates the active frame context for subsequent `evaluate` and `get_stack_frame_variables` calls.

```json
{ "operation": "up" }
{ "operation": "down" }
```

---

#### `goto_frame`

Jump to a specific stack frame by ID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `frameId` | number | yes | Frame ID from `stack_trace` |

---

#### `get_last_stop_info`

Get information about the last stop event (breakpoint hit, exception, entry, etc.).

```json
{ "operation": "get_last_stop_info" }
```

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123",
  "stopInfo": {
    "reason": "breakpoint",
    "threadId": 1,
    "allThreadsStopped": true
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

**Task fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique task identifier |
| `command` | string | yes | Executable to run |
| `args` | string[] | no | CLI arguments |
| `stdin` | string | no | Data to pipe to stdin |
| `timeout` | number | no | Timeout in ms (default: 30000) |

**Limits:** Maximum 50 concurrent tasks. Output truncated at 1 MB per task.

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success (check `data.success` for operation-level result) |
| 400 | Bad request — missing or invalid parameters |
| 403 | User denied approval for a destructive operation |
| 404 | Unknown endpoint |
| 500 | Internal extension error |
