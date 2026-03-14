# Architecture

## Overview

The extension acts as a thin HTTP-to-DAP bridge running inside VS Code's Extension Host process. It does not spawn a separate server process — the extension itself listens on `127.0.0.1:9999` and translates REST calls into VS Code Debug API calls.

```
AI Agent (Claude, GPT, etc.)
        |
        | HTTP REST (localhost:9999)
        v
┌─────────────────────────────────────┐
│  VS Code Extension Host             │
│                                     │
│  HttpServer (Node http.Server)      │
│       |                             │
│  Router (handleRequest)             │
│       |                             │
│  DebugController (operation map)    │
│       |                             │
│  ┌────┴──────────────────────┐      │
│  │  session / breakpoints /  │      │
│  │  execution / inspection / │      │
│  │  events                   │      │
│  └────┬──────────────────────┘      │
│       |                             │
│  vscode.debug API (DAP wrapper)     │
└──────────────────────────────────────┘
        |
        | Debug Adapter Protocol (DAP)
        v
  GDB / LLDB / other debugger
```

---

## Module Map

### Entry Point — `src/extension.ts`

- Activates on `onStartupFinished`
- Creates `HttpServer` on the configured port (default 9999)
- Registers DAP event listeners via `debug/events.ts`
- Exposes commands: `start`, `stop`, `showLog`

### HTTP Server — `src/server/HttpServer.ts`

- Node.js `http.Server` bound to `127.0.0.1:{port}`
- CORS enabled for local access
- Reads full request body before routing
- Top-level try/catch ensures JSON error response even when extension APIs throw
- Guards `res.headersSent` + `res.destroyed` before writing error to prevent crash on early-closed connections (BUG-2 fix)

### Router — `src/server/router.ts`

Routes HTTP method + path to handlers:

| Route | Handler |
|-------|---------|
| `GET /api/ping` | Inline — returns version + operations list |
| `GET /api/status` | Inline — returns active session info |
| `POST /api/debug` | `handleDebugOperation` → `DebugController` |
| `POST /api/subagents` | `SubagentOrchestrator` (with user approval) |
| `POST /api/commands` | `CommandHandler` |
| `GET /api/symbols` | `LspClient` |
| `GET /api/references` | `LspClient` |
| `GET /api/call-hierarchy` | `LspClient` |

All operations pass through `validateOperationArgs` before execution.

### Debug Controller — `src/debug/DebugController.ts`

Implements the **operation map pattern**: a `Record<string, OperationFn>` mapping 31 operation names to handler functions. This decouples HTTP routing from debug logic and makes operations enumerable (returned in `/api/ping`).

Operations are organized by category:
- **Session**: `launch`, `restart`, `quit`
- **Execution**: `continue`, `next`, `step_in`, `step_out`, `jump`, `until`
- **Breakpoints**: `set_breakpoint`, `set_temp_breakpoint`, `remove_breakpoint`, `remove_all_breakpoints_in_file`, `toggle_breakpoint`, `set_breakpoint_condition`, `ignore_breakpoint`, `get_active_breakpoints`
- **Inspection**: `stack_trace`, `list_source`, `frame_up`, `frame_down`, `goto_frame`, `evaluate`, `pretty_print`, `whatis`, `execute_statement`, `get_source`, `get_stack_frame_variables`, `get_last_stop_info`

### Debug Modules

| Module | Responsibility |
|--------|---------------|
| `debug/session.ts` | `launchSession` (two-stage config resolution), `restartSession`, `quitSession`. Retains `_lastSession` reference for cross-request continuity (BUG-3 fix). |
| `debug/breakpoints.ts` | Create/remove/toggle/condition breakpoints via `vscode.debug.addBreakpoints()`. |
| `debug/execution.ts` | `continue`, `next`, `step_in`, `step_out`, `jump` via `session.customRequest()` to DAP. |
| `debug/inspection.ts` | Stack traces, variables, source listing, REPL evaluation. Handles `vscode-remote://` URI decoding for WSL2 paths. |
| `debug/events.ts` | Listens to `onDidStartDebugSession`, `onDidTerminateDebugSession`, stop events. Caches last stop event body. Calls `clearLastSession()` on termination. |

### Session Lifecycle & BUG-3 Fix

`vscode.debug.activeDebugSession` becomes `undefined` between the moment `startDebugging` resolves and the stop event fires. The `_lastSession` pattern retains the last launched session reference:

```
startDebugging() resolves
  → _lastSession = activeSession

stop event fires
  → operations use: activeDebugSession ?? _lastSession

onDidTerminateDebugSession fires
  → clearLastSession()
```

### Config Resolution & BUG-1 Fix

Named launch config (`configName`) resolution uses a two-stage lookup:

```
Stage 1: Try vscode.debug.startDebugging(folder, configName)
         for each VSCode workspace folder
         → succeeds if project IS open in VS Code

Stage 2: Read .vscode/launch.json directly via fs.promises.readFile
         (NOT vscode.workspace.fs — that is workspace-scoped)
         Candidate dirs:
           a. params.workspacePath (explicit)
           b. Walk up from params.program directory (up to 6 levels)
         Find config by name, substitute ${workspaceFolder} with dir,
         call startDebugging(syntheticWorkspaceFolder, resolvedConfig)
```

### Security — `src/security/ApprovalInterceptor.ts`

User confirmation dialogs guard destructive operations:
- `evaluate` with assignment operators (`=` but not `==`, `!=`, `<=`, `>=`)
- `execute_statement`
- Subagent spawning

Uses `vscode.window.showWarningMessage` with modal confirmation.

### Subagent Orchestrator — `src/agent/SubagentOrchestrator.ts`

Spawns concurrent `child_process` tasks with:
- Maximum 50 tasks per request
- Configurable concurrency (default: unlimited, controlled by task array size)
- Output truncation at 1 MB
- Per-task timeout with `exitCode: -1` on expiry
- `exitCode: -2` on spawn error

### LSP Client — `src/lsp/LspClient.ts`

Wraps VS Code LSP commands for code intelligence:
- `vscode.executeDocumentSymbolProvider` → `GET /api/symbols`
- `vscode.executeReferenceProvider` → `GET /api/references`
- `vscode.prepareCallHierarchy` + `vscode.provideIncomingCalls/outgoingCalls` → `GET /api/call-hierarchy`

---

## Key Design Patterns

### Operation Map Pattern (from Zentara-Code)

Instead of a large switch statement, operations are registered in a `Record<string, OperationFn>` at construction time. Benefits:
- Operations are enumerable (returned in `/api/ping` so agents can discover them)
- Easy to add/remove operations without touching routing code
- Each handler has a consistent `(args?: any) => Promise<any>` signature

### Event Caching Pattern

DAP stop events are ephemeral (fire once). `events.ts` caches the last stop event body and session ID so inspection operations can access them on demand via `get_last_stop_info`, `getCurrentTopFrameId`, etc.

### Temp Breakpoint Tracking

Temp breakpoints are tracked in a `Map<string, vscode.SourceBreakpoint>`. On each stop event, if the stop reason is `"breakpoint"`, the controller checks which temp breakpoints were hit and removes them via `vscode.debug.removeBreakpoints()`.

---

## Build System

The extension is bundled with **esbuild** (see `esbuild.js`):
- Single output: `out/extension.js`
- External: `vscode` (provided by VS Code at runtime)
- Format: CommonJS (required by VS Code extension host)
- Source maps enabled for debugging

TypeScript config (`tsconfig.json`): target ES2022, strict mode, CommonJS modules.

---

## Testing

Unit tests use **Jest + ts-jest**. All tests mock the `vscode` module using `jest.mock("vscode", factory, { virtual: true })`.

Test coverage targets:
- C0 (statement): all public operation paths
- C1 (branch): all conditional branches in validation, session, inspection

Run tests:
```bash
cd ai-debug-proxy
npm test       # Jest unit tests
npm run lint   # TypeScript type checking
```
