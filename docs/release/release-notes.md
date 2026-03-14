# Release Notes

---

## 0.1.b6 — 2026-03-14

### Summary

Feature + bugfix release. All 10 action items from the AI QA Agent design meeting are implemented and verified on a real CycurHSM embedded firmware target (PCx32_CLANG build). 100% pass rate across all CLI commands.

### New Commands

| Command | Description |
|---------|-------------|
| `ai_frame` | Compact current top frame: `{id, function, file, path, line}` |
| `ai_up` | Move one frame up the call stack |
| `ai_down` | Move one frame down the call stack |
| `ai_goto <frameId>` | Jump to specific frame by ID |
| `ai_watch <var> [access]` | Set watchpoint on a variable (`write` by default) |

### New API Operations

| Operation | Description |
|-----------|-------------|
| `watch` | Server-side watchpoint: find variable → dataBreakpointInfo → set (GDB fallback) |
| `set_breakpoints` | Batch set multiple breakpoints in one file atomically |

### Improvements

- **`ai_pretty`** — Returns `fields[]` array with one level of struct/array expansion
- **`ai_launch`** — Warns with current stop location before replacing active session
- **`ai_bp`** — Detects and skips duplicate breakpoints at same file:line
- **`ai_bps`** — Condition strings unescaped in output
- **Error messages** — All 20 failure paths include API error reason
- **Scope separation** — `ai_vars` returns Locals, `ai_args` returns Arguments (cppdbg fallback)
- **`installCLI`** — Installs to `~/.local/lib/ai-debug-proxy/` and auto-sources from `~/.bashrc`/`~/.zshrc`
- **Version** — `/api/ping` now reports correct version from `package.json`

### Bug Fixes

| Bug | Impact | Fix |
|-----|--------|-----|
| `ai_args` returns `null` on cppdbg | High | Fallback to Locals scope when no Arguments scope |
| `watch` "Unknown operation" | High | Added `watch` case to `validateOperationArgs()` |
| `watch` "Invalid VariableReference" | High | Pass scope's ref to `dataBreakpointInfo`, not variable's |
| `watch` `vscode.DataBreakpoint` constructor | High | GDB `watch`/`rwatch`/`awatch` fallback via raw DAP |
| Version string "unknown" | Medium | Fixed `package.json` path: `../` not `../../` |

### Verification

All commands tested live on **CycurHSM 3.x PCx32_CLANG** binary (`_build/PCx32_CLANG/PCx32_CLANG`):

```
✅ ai_launch / ai_quit / ai_restart
✅ ai_bp (plain + conditional) / ai_bps / ai_tbp / ai_clear_bps
✅ ai_continue / ai_next / ai_step_in / ai_step_out
✅ ai_stack / ai_frame / ai_up / ai_down / ai_goto
✅ ai_vars / ai_args / ai_eval / ai_type / ai_pretty (struct fields)
✅ ai_source / ai_last_stop / ai_watch
✅ ai_threads / ai_registers / ai_disasm
✅ ai_symbols (LSP)
```

---

## 0.1.b3 (Bugfix) — 2026-03-13

### Bugfix Release v0.1.b3

This is a **critical bugfix release** addressing 3 customer-reported issues from the `ISSUES_SPECIFICATIONS.md` document.

#### 🔴 AIVS-006: Multi-window Targeting (HIGH PRIORITY)

**Problem:**
When multiple VSCode windows are open, debug sessions open in the wrong window instead of the target workspace.

**Root Cause:**
Extension lacked mechanism to target specific workspace when launching debug sessions.

**Solution:**
- Added `workspacePath` parameter to `launch` operation
- Implemented workspace folder matching logic
- Added validation for workspace existence
- Created virtual workspace fallback for non-open folders

**API Change:**
```json
{
  "operation": "launch",
  "params": {
    "program": "/path/to/binary",
    "workspacePath": "/path/to/workspace"  // NEW parameter
  }
}
```

**Files Modified:**
- `src/debug/session.ts` - Added workspace matching logic
- `src/types.ts` - Added `workspacePath` to `LaunchParams`

#### 🟡 AIVS-002: Unclear Error Messages

**Problem:**
Generic error message "Failed to start debug session" for all failure scenarios.

**Root Cause:**
No error categorization or structured error responses.

**Solution:**
- Created `DebugError` class with error codes
- Implemented validation layer for binary, GDB, and workspace paths
- Updated router to return structured error responses
- Added actionable suggestions for each error type

**Error Codes:**
- `BINARY_NOT_FOUND` - Binary file doesn't exist
- `GDB_NOT_FOUND` - GDB debugger not found at specified path
- `WORKSPACE_NOT_FOUND` - Workspace path is invalid
- `MISSING_PARAMETER` - Required parameter not provided
- `INVALID_PARAMETER` - Parameter value is invalid
- `INTERNAL_ERROR` - Unexpected internal error

**New Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "BINARY_NOT_FOUND",
    "message": "Binary not found: /path/to/binary",
    "suggestion": "Have you built the project? Check your build configuration.",
    "details": {
      "path": "/path/to/binary",
      "exists": false
    }
  }
}
```

**Files Modified:**
- `src/utils/errors.ts` - New `DebugError` class and error codes
- `src/types.ts` - Added `ErrorInfo` interface
- `src/debug/session.ts` - Added validation layer
- `src/server/router.ts` - Updated error handling

#### 🟢 AIVS-005: Batch Breakpoint API

**Problem:**
Setting multiple breakpoints requires multiple separate API calls, causing inefficiency.

**Root Cause:**
No batch operation support for breakpoints.

**Solution:**
- Added `set_breakpoints` (plural) operation
- Implemented batch breakpoint creation
- Returns array of breakpoint results

**New API Endpoint:**
```bash
POST /api/debug
{
  "operation": "set_breakpoints",
  "params": {
    "file": "/path/to/file.c",
    "breakpoints": [
      {"line": 10},
      {"line": 20, "condition": "x > 5"},
      {"line": 30}
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "breakpoints": [
      {"id": 1, "line": 10, "verified": true, "source": "/path/to/file.c"},
      {"id": 2, "line": 20, "verified": true, "condition": "x > 5", "source": "/path/to/file.c"},
      {"id": 3, "line": 30, "verified": true, "source": "/path/to/file.c"}
    ]
  }
}
```

**Files Modified:**
- `src/types.ts` - Added `SetBreakpointsParams`, `BreakpointLineParams`, `BreakpointResult`
- `src/debug/breakpoints.ts` - New `setBreakpoints()` function
- `src/debug/DebugController.ts` - Added `set_breakpoints` operation

### Technical Changes

#### New Types

```typescript
interface ErrorInfo {
  code: string;
  message: string;
  suggestion?: string;
  details?: Record<string, any>;
}

interface SetBreakpointsParams {
  file: string;
  breakpoints: BreakpointLineParams[];
}

interface BreakpointLineParams {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

interface BreakpointResult {
  id?: number;
  line: number;
  verified: boolean;
  condition?: string;
  source?: string;
}
```

#### Updated Types

```typescript
// LaunchParams - Added workspace targeting
interface LaunchParams {
  workspacePath?: string;  // NEW
  miDebuggerPath?: string; // NEW
  MIMode?: "gdb" | "lldb"; // NEW
}

// DebuggerResponse - Added structured error
interface DebuggerResponse {
  success: boolean;
  errorMessage?: string;
  error?: ErrorInfo;  // NEW
}

// ApiResponse - Support structured errors
interface ApiResponse {
  error?: string | ErrorInfo;  // UPDATED
}
```

### Backward Compatibility

✅ **All changes are backward compatible:**

- `workspacePath` is optional - existing code continues to work
- Old error format (string) still supported in `ApiResponse`
- `set_breakpoint` (singular) still works alongside `set_breakpoints`
- No breaking changes to existing API endpoints

### Testing

**Test Coverage:**

- ✅ Error validation for binary not found
- ✅ Error validation for GDB not found
- ✅ Error validation for workspace not found
- ✅ Error validation for missing parameters
- ✅ Batch breakpoint setting
- ✅ Multi-window targeting with workspacePath
- ✅ Backward compatibility tests

**Test Script:**
See `BUGFIX_VERIFICATION_TEST.md` for comprehensive test cases.

### Known Limitations

1. **AIVS-006:** If workspace is not open in VS Code, a virtual workspace is created. This works but may not have full launch.json support.

2. **AIVS-005:** Batch operations are atomic - if one breakpoint fails, all fail. Individual error handling not supported.

3. **AIVS-002:** Some legacy operations may still return string errors during migration period.

### Migration Guide

**No migration required** - all changes are backward compatible.

**Optional improvements:**

1. **Use workspacePath for multi-window scenarios:**
   ```bash
   # Before
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"launch","params":{"program":"/path/to/binary"}}'

   # After (recommended for multi-window)
   curl -X POST http://localhost:9999/api/debug \
     -d '{
       "operation":"launch",
       "params":{
         "program":"/path/to/binary",
         "workspacePath":"/path/to/workspace"
       }
     }'
   ```

2. **Use batch API for multiple breakpoints:**
   ```bash
   # Before (3 API calls)
   curl -X POST http://localhost:9999/api/debug -d '{"operation":"set_breakpoint",...}'
   curl -X POST http://localhost:9999/api/debug -d '{"operation":"set_breakpoint",...}'
   curl -X POST http://localhost:9999/api/debug -d '{"operation":"set_breakpoint",...}'

   # After (1 API call)
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"set_breakpoints","params":{"file":"...","breakpoints":[...]}}'
   ```

3. **Handle structured errors:**
   ```python
   # Before
   if not response['success']:
       print(f"Error: {response['error']}")

   # After
   if not response['success']:
       error = response.get('error', {})
       if isinstance(error, dict):
           print(f"Error {error['code']}: {error['message']}")
           if 'suggestion' in error:
               print(f"Suggestion: {error['suggestion']}")
       else:
           print(f"Error: {error}")
   ```

### Files Changed

| File | Changes |
|------|---------|
| `src/utils/errors.ts` | New `DebugError` class, error codes |
| `src/types.ts` | New interfaces, updated types |
| `src/debug/session.ts` | Validation layer, workspace targeting |
| `src/debug/breakpoints.ts` | Batch breakpoint function |
| `src/debug/DebugController.ts` | Batch operation routing |
| `src/server/router.ts` | Structured error handling |

### Version Info

- **Technical Version:** 0.1.5
- **Release Name:** 0.1.b3
- **Release Date:** 2026-03-13
- **Git Tag:** `0.1.b3`

---

## 0.1.b2 (Beta) — 2026-03-13

### What's new in Beta v0.b2

#### New Features

**LSP Service Enhancement**
- New `LspService.ts` module providing enhanced Language Server Protocol integration
- Improved code intelligence features: document symbols, find references, call hierarchy
- Better integration with DebugController for seamless code navigation during debugging

**Hardware Debug Support**
- New `hardware.ts` module enabling hardware-level debugging capabilities
- Support for hardware breakpoints and register inspection
- Foundation for embedded systems debugging workflows

**Improved Subagent Orchestration**
- Dedicated routing for subagent API endpoints (`subagents.routes.ts`)
- Enhanced concurrency control with configurable parallelism limits
- Better output truncation and timeout handling

#### Improvements

**CLI Helper (`ai-debug.sh`)**
- Fixed workspace variable resolution in inspection commands
- Enhanced error handling with detailed error messages
- Better integration with the proxy API batch endpoint

**Debug Controller**
- Enhanced session management to prevent stale session references
- Improved temporary breakpoint tracking for `until` operations
- Better event caching for on-demand state inspection

**HTTP Server**
- Improved request routing with better error response handling
- Enhanced validation with specific error classes
- Better CORS handling for local development access

**Logging System**
- Fixed synchronized logging to prevent race conditions
- Better structured logging with consistent tags and context
- Improved output channel integration

#### Bug Fixes

- **CLI Inspection**: Fixed workspace variable resolution when debugging binaries outside the open workspace
- **Session Lifecycle**: Fixed `_lastSession` reference handling to prevent session leaks
- **Command Handler**: Fixed macro command execution edge cases
- **Validation**: Enhanced parameter validation with better error messages for all 33 operations

### Documentation Updates

- **AI Agent Technical Guide**: Complete API reference for LLM agent integration
- **CLI Debug Guide**: Full command reference for `ai-debug.sh` helper
- **API Reference**: Updated with all 33 HTTP endpoints
- **Troubleshooting Guide**: Enhanced with common issues and solutions

### Known Limitations

- Remote debugging is still disabled by design (localhost only).
- Multi-session support is deferred to the 0.2.x cycle.
- `configName` launch requires `workspacePath` when the project folder is not open in VS Code.
- WSL2: "Developer: Reload Window" does not restart the WSL2 extension host — kill the `extensionHost` process manually after installing an update.

---

## 0.1.b0 (Beta) — 2026-03-12

### What's new in Beta

#### Major Refactoring & Architectural Compliance

The entire codebase has been refactored to align with the project's **Technical Coding Guidelines**. This release focuses on stability, maintainability, and enterprise-grade code quality:

- **Operation-Specific Errors**: Introduced a robust error hierarchy for precise failure reporting.
- **Improved API Stability**: Function signatures now use extensible options objects to avoid breaking changes.
- **Structured Logging**: Production-ready logging with consistent tags and context.
- **100% Traceability**: Every core function is now explicitly linked to architectural and software requirements ($SW/$DD).

#### Documentation & Project Reorganization

We've cleaned up the project root and structured the `docs/` folder to scale with the project:

- Foundational docs moved to `docs/arch/`, `docs/guides/`, and `docs/guidelines/`.
- **CLI Consolidation**: `dbg.py` has been removed and replaced by an enhanced `ai-debug.sh`.
- `ai-debug.sh` relocated to `ai-debug-proxy/resources/` for better integration with the extension.
- Redundant POC files, `__pycache__` directories, and temporary logs have been purged.
- Simplified Pact contract testing scripts and removed redundant sourcing.

### Known limitations in Beta

- Remote debugging is still disabled by design (localhost only).
- Multi-session support is deferred to the 0.2.x cycle.

---

## 0.1.1-alpha — 2026-03-11

### What's new

#### `ai-debug.sh` — Debug CLI helper (Enhanced)

A shell-based CLI helper library that makes interacting with the AI Debug Proxy easy. Now supports the `/api/debug/batch` endpoint and includes several bug fixes for memory/disassembly commands.

```bash
# Source the helper library
source ai-debug-proxy/resources/ai-debug.sh

# Debug commands
ai_launch "./build/app"
ai_bp "main.c" 42
ai_continue
ai_stack
ai_eval "my_variable"
ai_quit
```

The previously used `dbg.py` has been deprecated and removed in favor of this shell helper which provides much richer functionality.

#### Approval dialogs removed

The `ApprovalInterceptor` has been removed. Previous versions showed a blocking VS Code modal for `evaluate` expressions containing `=` and for `/api/subagents` calls. These dialogs interrupted AI agent workflows and required manual user interaction. AI agents now run without interruption.

#### `list_source` cross-workspace fix

`list_source` now returns correct source context when the binary being debugged is outside the currently open VS Code workspace.

### Known limitations

- `configName` launch requires `workspacePath` when the project folder is not open in VS Code.
- `/api/status` does not yet return binary path, workspace root, or stop reason.
- The extension only listens on `127.0.0.1`. Remote access not supported by design.
- WSL2: "Developer: Reload Window" does not restart the WSL2 extension host — kill the `extensionHost` process manually after installing an update.

---

## 0.1.0-alpha — 2026-03-11

**First public alpha release.**

This release is suitable for evaluation and AI agent integration testing. APIs are stable but may change before 1.0.

### What's included

**AI Debug Proxy VSCode Extension**

- HTTP REST server on `localhost:9999` for AI agent control of VS Code debugging
- 31 debug operations covering session management, execution control, breakpoints, and code inspection
- Subagent orchestrator for concurrent CLI task spawning (with user approval)
- LSP integration: document symbols, find references, call hierarchy
- Approval interceptor for destructive operations (assignment evaluation, subagent spawning)
- Unit test suite with C0/C1 coverage across all 31 operations (193 tests)

**Embedded Debug Training Project**

- AUTOSAR-style C cooling ECU simulation with 10 intentional bugs
- Complete layered architecture: app / rte / services / ecual / mcal
- GDB-compatible build with `-g -O0` debug symbols
- Documented debug scenarios for each bug (`debug_scenarios.md`)

**Benchmark Suite**

- `test_benchmark.py` — 33 E2E test cases for API correctness and bug detection

### Known limitations (alpha)

- `configName` launch requires `workspacePath` when the project folder is not open in VS Code. This is by design — VS Code does not expose an API to search arbitrary filesystem paths for launch configs.
- `/api/status` returns session ID and name but not binary path, workspace root, or stop reason. This will be improved in a future release (IMPROVEMENT-2).
- The extension currently only listens on `127.0.0.1` (loopback). Remote access is not supported by design.
- `vscode-remote://` URI handling in `list_source` resolves paths relative to the open workspace. Cross-workspace source display may show incorrect context if the binary and the open workspace are in different locations.
- WSL2: "Developer: Reload Window" does **not** restart the WSL2 extension host. Kill the `extensionHost` process manually if the old version remains active after installing an update.

### Recommended workflow for alpha users

1. **Always launch by `program` path.** Use `configName` only when the launch config has complex settings (custom environment, attach mode, etc.).
2. **Verify the extension is active** with `GET /api/ping` before issuing operations.
3. **Check `/api/status`** to confirm a session is active before stepping.
4. **Use `get_last_stop_info`** after `continue` to confirm where execution stopped before inspecting variables.
