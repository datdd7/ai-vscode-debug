# AI Debug Proxy

HTTP proxy that exposes VS Code debugger (DAP) operations as a REST API — built for AI agents that need to control debugging programmatically.

---

## What it does

The extension starts an HTTP server on `localhost:9999` when VS Code launches. AI agents (Claude Code, custom scripts, etc.) call the API to drive the full debug lifecycle without any GUI interaction.

```
AI Agent  →  POST /api/debug  →  VS Code DAP  →  GDB / LLDB / cppdbg
```

---

## Quick start

### 1. Install the extension

Install from VSIX via Command Palette → **Extensions: Install from VSIX…**

### 2. Verify the server is running

```bash
curl http://localhost:9999/api/ping
```

```json
{ "success": true, "data": { "message": "pong", "version": "0.1.6" } }
```

### 3. Use the CLI helper (recommended)

Source the helper script from project root:

```bash
source ai-debug-proxy/resources/ai-debug.sh
```

All API calls become simple commands:

```bash
ai_launch ./build/app true
ai_bp ./src/main.c 42
ai_continue
ai_stack
ai_eval "my_variable"
ai_quit
```

See [CLI Debug Guide](https://github.com/datdang-dev/ai-vscode-debug/blob/master/docs/guides/cli-debug-guide.md) for full command reference.

---

## API overview

All debug operations go through a single endpoint:

```
POST http://localhost:9999/api/debug
Content-Type: application/json

{ "operation": "<name>", "params": { ... } }
```

### Session management

| Operation | Description |
|-----------|-------------|
| `launch` | Start a debug session (by program path or named config) |
| `restart` | Restart the current session |
| `quit` | Terminate the session |

### Execution control

| Operation | Description |
|-----------|-------------|
| `continue` | Resume execution |
| `next` | Step over |
| `step_in` | Step into |
| `step_out` | Step out |
| `until` | Run to line (temp breakpoint + continue) |
| `jump` | Jump to line without executing |

### Breakpoints

| Operation | Description |
|-----------|-------------|
| `set_breakpoint` | Set breakpoint at file:line (supports conditions, hit counts) |
| `set_breakpoints` | Batch: set multiple breakpoints in one file atomically |
| `set_temp_breakpoint` | One-shot breakpoint, auto-removed after first hit |
| `remove_breakpoint` | Remove specific breakpoint |
| `remove_all_breakpoints_in_file` | Clear all breakpoints in a file |
| `enable_breakpoint` / `disable_breakpoint` | Toggle without removing |
| `set_breakpoint_condition` | Update condition on existing breakpoint |
| `ignore_breakpoint` | Skip first N hits |
| `get_active_breakpoints` | List all active breakpoints |
| `watch` | Set a watchpoint (data breakpoint) on a variable |

### Inspection

| Operation | Description |
|-----------|-------------|
| `stack_trace` | Get current call stack |
| `get_stack_frame_variables` | Variables in a specific frame |
| `get_args` | Function arguments in a frame |
| `evaluate` | Evaluate any expression in the current context |
| `pretty_print` | Pretty-print structs/arrays |
| `whatis` | Get type of an expression |
| `execute_statement` | Execute a statement (mutation) |
| `list_source` | Show source lines around current position |
| `get_source` | Source lines around a specific file:line |
| `get_last_stop_info` | Stop reason after `continue` |

### Frame navigation

| Operation | Description |
|-----------|-------------|
| `up` / `down` | Move one frame up/down |
| `goto_frame` | Jump to specific frame by ID |

### LSP code intelligence (no active session needed)

```
GET /api/symbols?fsPath=/abs/path/file.c
GET /api/references?fsPath=/abs/path/file.c&line=10&character=5
GET /api/call-hierarchy?fsPath=/abs/path/file.c&line=10&character=5&direction=incoming
```

### Other endpoints

```
GET  /api/ping      — health check + operation list
GET  /api/status    — active session info
POST /api/subagents — spawn concurrent CLI tasks
```

---

## Launch a program

**By program path (recommended):**

```json
{
  "operation": "launch",
  "params": {
    "program": "/abs/path/to/binary",
    "stopOnEntry": true
  }
}
```

**By named config from `.vscode/launch.json`:**

```json
{
  "operation": "launch",
  "params": {
    "configName": "Debug on Linux",
    "workspacePath": "/abs/path/to/project"
  }
}
```

> Always provide `workspacePath` when the project folder is not currently open in VS Code.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `aiDebugProxy.port` | `9999` | HTTP server port |
| `aiDebugProxy.autoStart` | `true` | Start server on VS Code launch |
| `aiDebugProxy.logLevel` | `info` | Log verbosity: `debug` / `info` / `warn` / `error` |

---

## WSL2 notes

- The server binds to `127.0.0.1` inside WSL2 — accessible from the WSL2 shell directly.
- If a corporate proxy intercepts `localhost` requests, unset proxy env vars:
  ```bash
  no_proxy='*' ALL_PROXY='' http_proxy='' https_proxy='' python3 dbg.py ping
  ```
- After installing a new VSIX, **Developer: Reload Window** may not restart the extension host in WSL2. If the old version is still active, kill the `extensionHost` process and reload again.

---

## Commands

| Command | Description |
|---------|-------------|
| AI Debug Proxy: Start Server | Start the HTTP server manually |
| AI Debug Proxy: Stop Server | Stop the HTTP server |
| AI Debug Proxy: Show Log | Open the proxy output log |
| AI Debug Proxy: Install Debug CLI | Install `ai-debug.sh` to `~/.local/lib/ai-debug-proxy/` and auto-source from `~/.bashrc` / `~/.zshrc` |

---

## AI-First Design Principles

This extension is **designed for AI agents**, not adapted for them. The following principles guide every API and CLI decision:

### 1. Every response is machine-readable first

The structured JSON body (`.data`) is the primary contract. Human-readable status lines (`✓ Stepped`, `⚠ Active session`) are supplemental — AI agents should parse `.data`, not screen-scrape text.

### 2. Token cost is a first-class constraint

Verbose output is not just inconvenient — it consumes the AI agent's finite context budget. Design choices driven by this constraint:
- `ai_frame` returns only the top frame (~80 chars) instead of the full stack (~6000 chars)
- Function signatures stripped from frame names in compact output
- `ai_stack` path normalization removes `vscode-remote://` prefixes

### 3. Errors must be self-diagnosing

An AI agent receiving `✗ Failed to evaluate` and making 3 follow-up calls to understand why is a broken tool. Every failure path includes the reason extracted from the API:

```
✗ Failed to evaluate "plainText" — Symbol not found. Check variable name and scope.
✗ Failed to step in — No active debug session
```

### 4. Stateless invocation is a first-class use case

Each command runs in isolation. The `installCLI` command sets up `ai-debug.sh` as a shell-sourced library so any new shell can immediately use `ai_launch`, `ai_bp`, etc. without per-invocation setup boilerplate.

### 5. Batch operations reduce round-trips

`set_breakpoints` sets multiple breakpoints atomically. The `/api/subagents` endpoint runs concurrent CLI tasks. AI agents should prefer batch paths where available.
