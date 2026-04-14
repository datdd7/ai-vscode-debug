# Test Requirements — AI Debug Proxy v3.0.0 Stable

**Document Type:** Human Test Requirement & Execution Checklist  
**Version:** 1.0  
**Date:** 2026-04-13  
**Author:** QA Framework (Claude Code)  
**Target Release:** `v3.0.0` (Stable)  
**Prerequisite:** All Beta gates (B1-B5) PASS, automated test suite green

---

## 1. Purpose & Scope

This document defines the manual test requirements for **human testers** to verify that the AI Debug Proxy REST API is production-ready for stable release v3.0.0.

### What this document covers

| Category | Details |
|----------|---------|
| **Operations** | All 38 officially supported operations (100% coverage) |
| **Test types** | Positive paths, negative paths, edge cases, regression |
| **Format** | User journeys → specific HTTP requests → expected responses → pass/fail |
| **Regression** | Reproduces the 13-operation v3.a1 real-world session (must all re-pass) |

### What is NOT in scope

- Automated unit tests (handled by CI: `npm test`)
- E2E Playwright tests (handled by CI: `npm run test:e2e`)
- Performance benchmarks (handled by CI: `npm test` includes `performance.test.ts`)
- VS Code UI interactions beyond extension activation

### Operations Coverage Map

| Suite | Operations | v3.a1 Status | Priority |
|-------|-----------|--------------|----------|
| A — Session Lifecycle | launch, restart, terminate | ✅ Tested | Regression |
| B — Breakpoints | set_breakpoint, set_temp_breakpoint, remove_breakpoint, remove_all_breakpoints_in_file, get_active_breakpoints | Partial (set only) | HIGH |
| C — Execution Control | continue, next, step_in, step_out, pause, until | Partial (continue, next) | HIGH |
| D — Stack Navigation | stack_trace, goto_frame, up, down | Partial (trace, goto) | HIGH |
| E — Variable Inspection | get_variables, get_arguments, evaluate, whatis, pretty_print, list_all_locals, get_scope_preview | Partial (get_vars, get_args, eval) | HIGH |
| F — Source Navigation | list_source, get_source, get_last_stop_info | Partial (list only) | MEDIUM |
| G — Memory & Registers | get_registers, read_memory, write_memory | ❌ Untested | HIGH |
| H — Error Handling | All negative paths | Partial | HIGH |
| J — Threading | list_threads, switch_thread | ❌ Untested | MEDIUM |
| K — Extended Ops | execute_statement, get_globals, get_scope_preview, get_capabilities | Partial (caps) | MEDIUM |
| L — Remaining | write_memory, attach | ❌ Untested | MEDIUM |
| R — Regression | Full v3.a1 replay (13 ops) | ✅ Evidence exists | CRITICAL |

---

## 2. Test Environment Setup

### 2.1 Hardware / OS Requirements

| Item | Requirement |
|------|------------|
| OS | Linux (WSL2 acceptable) or macOS |
| VS Code | ≥ 1.85.0 with `ai-debug-proxy` extension installed |
| GDB | `gdb` on PATH, version ≥ 9.x |
| Target binary | Any ELF with debug symbols (`-g`). CycurHSM preferred for regression. |

### 2.2 Extension Activation

```bash
# Verify extension is installed
code --list-extensions | grep ai-debug-proxy

# Start proxy (proxy starts automatically when VS Code opens a debug session)
# Verify proxy is responding
curl -s http://localhost:9999/api/ping
# Expected: {"success":true,"data":{"message":"pong","version":"v3.0.0","operationCount":38}}
```

### 2.3 Test Binary (CycurHSM — for regression)

```bash
export BINARY="/home/<user>/working/cycurhsm-3.x/_build/PCx32_CLANG/PCx32_CLANG"
# Verify binary has debug symbols
file "$BINARY"     # should say "ELF 32-bit ... with debug_info"
gdb --batch --ex "info sources" "$BINARY" | head -5
```

For non-CycurHSM testers: any C program with a `main()` function and a loop works. A minimal
test binary is sufficient for suites A-K; suites requiring specific source files should note alternatives.

### 2.4 HTTP Request Format

Both endpoints are equivalent (both accepted by the proxy):
```
POST http://localhost:9999/api/debug
POST http://localhost:9999/api/debug/execute_operation
Content-Type: application/json
```

**Body format:** operation name at the top level, parameters nested under `"params"`:
```json
{
  "operation": "<op-name>",
  "params": {
    "param1": "value1"
  }
}
```

**Response envelope:**
```json
{
  "success": true,
  "operation": "<op-name>",
  "data": { ... },
  "timestamp": "2026-04-13T..."
}
```

Shorthand helper used in this document (paste into shell):
```bash
# Single-arg helper: pass full JSON body
dbg() { curl -s -X POST http://localhost:9999/api/debug \
         -H 'Content-Type: application/json' \
         -d "$1" | python3 -m json.tool; }

# IMPORTANT: params must be nested under "params" key, NOT at the top level:
# CORRECT:  dbg '{"operation":"set_breakpoint","params":{"location":{"path":"f.c","line":42}}}'
# WRONG:    dbg '{"operation":"set_breakpoint","file":"f.c","line":42}'
```

### 2.5 Pass/Fail Criteria

- **PASS:** `"success": true` in response AND result matches expected fields
- **FAIL:** `"success": false`, unexpected error, or proxy is unreachable
- **BLOCKED:** Prerequisite step failed (note blocking step ID)

---

## 3. Suite A — Session Lifecycle

**Prerequisite:** Proxy running, target binary available.

### TC-A1: Launch a debug session

**Operation:** `launch`  
**User Journey:** Tester starts a new GDB debug session against a binary. Session must stop at entry point.

**Request:**
```bash
dbg '{"operation":"launch","params":{"program":"'"$BINARY"'","stopOnEntry":true}}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "sessionId": "<any string>",
    "status": "stopped"
  }
}
```

**Verification:**
- `success` is `true`
- `status` is `"stopped"` (not `"running"`)
- No GDB error message in result

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-A2: Launch without stopOnEntry (runs to first breakpoint)

**Operation:** `launch`  
**User Journey:** AI agent launches binary without stopping at entry; binary runs until manually paused.

**Prerequisite:** No active session (or call terminate first).

**Request:**
```bash
dbg '{"operation":"launch","params":{"program":"'"$BINARY"'","stopOnEntry":false}}'
```

**Expected:** `"success": true` and `"status": "running"` (or program exits if no breakpoints).

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-A3: Terminate active session

**Operation:** `terminate`  
**User Journey:** Tester cleanly ends the debug session. GDB process must exit.

**Prerequisite:** Active session (TC-A1 completed).

**Request:**
```bash
dbg '{"operation":"terminate"}'
```

**Expected Response:**
```json
{ "success": true, "result": { "terminated": true } }
```

**Verification:** After this call, a subsequent `get_last_stop_info` should return an error or indicate no session.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-A4: Restart active session

**Operation:** `restart`  
**User Journey:** Tester restarts the binary from the beginning without re-launching. Used to reset state after hitting a bad path.

**Prerequisite:** Active session stopped at a breakpoint (run TC-A1 + TC-B1 + TC-C1).

**Request:**
```bash
dbg '{"operation":"restart"}'
```

**Expected Response:**
```json
{ "success": true, "result": { "status": "stopped" } }
```

**Verification:** `stack_trace` after restart should show frame 0 near `main` or entry point, not the previous breakpoint location.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-A5: Launch with missing program field (validation)

**Operation:** `launch`  
**User Journey:** Tester verifies that missing required parameter returns HTTP 400.

**Request:**
```bash
dbg '{"operation":"launch"}'
```

**Expected Response:**
```json
{ "success": false, "error": "Missing required parameter: program" }
```

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 4. Suite B — Breakpoint Management

**Prerequisite:** Active stopped session (TC-A1 PASS).

### TC-B1: Set a line breakpoint

**Operation:** `set_breakpoint`  
**User Journey:** AI agent sets a breakpoint at a known source location.

**Request:**
```bash
# location.path must match the full source path GDB resolves
dbg '{"operation":"set_breakpoint","params":{"location":{"path":"src/main.c","line":42}}}'
```

**Expected Response:**
```json
{
  "success": true,
  "operation": "set_breakpoint",
  "data": { "id": "<breakpoint-id>", "verified": true, "line": 42 }
}
```

**Verification:** `data.verified === true` confirms GDB resolved the breakpoint to actual code. Note the `id` — you will need it for `remove_breakpoint`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B2: Set a temporary breakpoint

**Operation:** `set_temp_breakpoint`  
**User Journey:** AI agent sets a one-shot breakpoint that auto-deletes after first hit.

**Request:**
```bash
dbg '{"operation":"set_temp_breakpoint","params":{"location":{"path":"src/main.c","line":42}}}'
```

**Expected Response:** Same structure as TC-B1. `"verified": true`.

**Verification:** After `continue` hits the temp breakpoint, call `get_active_breakpoints`. The temp breakpoint ID must NOT appear in the list.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B3: Get active breakpoints

**Operation:** `get_active_breakpoints`  
**User Journey:** AI agent lists all current breakpoints to avoid duplicates.

**Prerequisite:** TC-B1 completed (at least one breakpoint set).

**Request:**
```bash
dbg '{"operation":"get_active_breakpoints"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "breakpoints": [
      { "id": "<id>", "file": "...", "line": 42, "verified": true }
    ]
  }
}
```

**Verification:** The breakpoint set in TC-B1 must appear in the list.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B4: Remove a specific breakpoint

**Operation:** `remove_breakpoint`  
**User Journey:** AI agent removes a breakpoint by ID after it is no longer needed.

**Prerequisite:** TC-B1 completed. Note the breakpoint ID from TC-B3.

**Request:**
```bash
BP_ID="<id from TC-B3 get_active_breakpoints>"
dbg '{"operation":"remove_breakpoint","params":{"id":"'"$BP_ID"'"}}'
```

**Expected Response:**
```json
{ "success": true, "result": { "removed": true } }
```

**Verification:** Call `get_active_breakpoints` — the removed ID must not appear.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B5: Remove all breakpoints in a file

**Operation:** `remove_all_breakpoints_in_file`  
**User Journey:** AI agent clears all breakpoints in a file when moving to a different module.

**Prerequisite:** Set 2+ breakpoints in the same file, then:

**Request:**
```bash
dbg '{"operation":"remove_all_breakpoints_in_file","params":{"filePath":"src/main.c"}}'
```

**Expected Response:**
```json
{ "success": true, "result": { "removed": <count> } }
```

**Verification:** `get_active_breakpoints` returns empty list (or no entries for that file).

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B6: Set breakpoint on invalid line (unresolvable)

**Operation:** `set_breakpoint`  
**User Journey:** Verifies graceful handling when GDB cannot resolve the location.

**Request:**
```bash
dbg '{"operation":"set_breakpoint","params":{"location":{"path":"src/main.c","line":999999}}}'
```

**Expected:** Either `"verified": false` with a warning, OR `"success": false` with an error message. Must NOT crash the proxy.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-B7: Set breakpoint — missing file parameter

**Operation:** `set_breakpoint`  
**User Journey:** Validates required parameter enforcement.

**Request:**
```bash
dbg '{"operation":"set_breakpoint","params":{"location":{"line":10}}}'
```

**Expected:** `"success": false`, `"error"` contains "Missing required parameter" or "file".

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 5. Suite C — Execution Control

**Prerequisite:** Active session with a breakpoint set and hit (TC-A1 + TC-B1 + TC-C1 setup).

**Setup for this suite:**
```bash
# Launch, set breakpoint, continue to hit it
dbg '{"operation":"launch","params":{"program":"'"$BINARY"'","stopOnEntry":true}}'
dbg '{"operation":"set_breakpoint","params":{"location":{"path":"src/main.c","line":50}}}'  # adjust
dbg '{"operation":"continue"}'   # runs to breakpoint; status = stopped
```

---

### TC-C1: Continue execution

**Operation:** `continue`  
**User Journey:** AI agent resumes execution after a breakpoint stop.

**Request:**
```bash
dbg '{"operation":"continue"}'
```

**Expected:** `"success": true`. If another breakpoint exists, `"status": "stopped"`. If no more breakpoints, program runs.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C2: Step over (next)

**Operation:** `next`  
**User Journey:** AI agent steps one source line without entering function calls.

**Prerequisite:** Session stopped at a breakpoint.

**Request:**
```bash
dbg '{"operation":"next"}'
```

**Expected:** `"success": true`, `"status": "stopped"`. Subsequent `get_last_stop_info` shows line incremented by ~1.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C3: Step into function

**Operation:** `step_in`  
**User Journey:** AI agent steps into a function call to inspect its internals.

**Prerequisite:** Session stopped on a line that calls a function.

**Request:**
```bash
dbg '{"operation":"step_in"}'
```

**Expected:** `"success": true`, `"status": "stopped"`. `stack_trace` shows a new innermost frame (different function name than before).

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C4: Step out of function

**Operation:** `step_out`  
**User Journey:** AI agent exits the current function and returns to caller.

**Prerequisite:** Session stopped inside a nested function (after TC-C3).

**Request:**
```bash
dbg '{"operation":"step_out"}'
```

**Expected:** `"success": true`. `stack_trace` shows caller frame at top.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C5: Pause a running session

**Operation:** `pause`  
**User Journey:** AI agent halts execution when binary is running (e.g. in an infinite loop).

**Setup:**
```bash
# Launch without stopOnEntry so binary is running
dbg '{"operation":"launch","params":{"program":"'"$BINARY"'","stopOnEntry":false}}'
# Immediately pause
dbg '{"operation":"pause"}'
```

**Expected:** `"success": true`, `"status": "stopped"` or `"paused"`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C6: Run until line

**Operation:** `until`  
**User Journey:** AI agent runs to a specific line in the current function without setting a breakpoint.

**Prerequisite:** Session stopped in a function, target line is further down in same function.

**Request:**
```bash
dbg '{"operation":"until","params":{"line":65,"file":"src/main.c"}}'
```

**Expected:** `"success": true`. `get_last_stop_info` shows execution stopped at or near specified line.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-C7: Jump to line (UC7)

**Operation:** `jump`  
**User Journey:** AI agent moves the program counter to a specific line (skips code).

**Prerequisite:** Session stopped in a function.

**Request:**
```bash
dbg '{"operation":"jump","params":{"line":48,"file":"src/main.c"}}'
```

**Expected:** `"success": true`. `get_last_stop_info` shows new line position.

**Note:** Jump is GDB-specific and may fail if target line is in a different function. Document actual result.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 6. Suite D — Stack Navigation

**Prerequisite:** Session stopped inside a function call chain (at least 3 frames deep).

**Setup hint:**
```bash
# Set breakpoint in a deeply nested function call, then continue to hit it
# Verify depth: 
dbg '{"operation":"stack_trace"}'  # should show >= 3 frames
```

---

### TC-D1: Get stack trace

**Operation:** `stack_trace`  
**User Journey:** AI agent inspects the full call chain to understand how execution reached current point.

**Request:**
```bash
dbg '{"operation":"stack_trace"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "frames": [
      { "id": 0, "function": "current_function", "file": "...", "line": 42 },
      { "id": 1, "function": "caller_function",  "file": "...", "line": 88 }
    ]
  }
}
```

**Verification:** At least 2 frames. Frame 0 is innermost (current). `file` and `line` are present.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-D2: Navigate up in stack (frame_up / up)

**Operation:** `up`  
**User Journey:** AI agent moves context to the caller frame to inspect caller's variables.

**Prerequisite:** TC-D1 PASS, at least 2 frames.

**Request:**
```bash
dbg '{"operation":"up"}'
```

**Expected:** `"success": true`. Subsequent `get_variables` returns caller's locals, not callee's.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-D3: Navigate down in stack (frame_down / down)

**Operation:** `down`  
**User Journey:** AI agent moves context back toward the innermost frame.

**Prerequisite:** TC-D2 PASS (currently at frame 1 or higher).

**Request:**
```bash
dbg '{"operation":"down"}'
```

**Expected:** `"success": true`. Context returns to frame 0.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-D4: Navigate down at outermost frame (error path)

**Operation:** `down`  
**User Journey:** Verifies that navigating down below frame 0 returns a clear error.

**Prerequisite:** Session at frame 0 (innermost).

**Request:**
```bash
dbg '{"operation":"down"}'
```

**Expected:** `"success": false`, error message contains "outermost frame" or similar.  
**NOT acceptable:** Silent no-op, proxy crash, or undefined behavior.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-D5: Go to specific frame

**Operation:** `goto_frame`  
**User Journey:** AI agent jumps directly to a specific frame by ID without iterating up/down.

**Prerequisite:** TC-D1 PASS; note a frame ID from the trace (e.g. frame 2).

**Request:**
```bash
dbg '{"operation":"goto_frame","params":{"frameId":2}}'
```

**Expected:** `"success": true`. `get_variables` returns that frame's locals.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 7. Suite E — Variable Inspection

**Prerequisite:** Session stopped inside a function that has local variables and function arguments.

---

### TC-E1: Get local variables

**Operation:** `get_variables`  
**User Journey:** AI agent reads all local variables in the current frame to understand program state.

**Request:**
```bash
dbg '{"operation":"get_variables"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "variables": [
      { "name": "my_var", "value": "42", "type": "int" }
    ]
  }
}
```

**Verification:** Returns at least one variable. Each entry has `name`, `value`, `type`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E2: Get function arguments

**Operation:** `get_arguments`  
**User Journey:** AI agent reads the arguments passed to the current function.

**Prerequisite:** Session stopped inside a function that has parameters.

**Request:**
```bash
dbg '{"operation":"get_arguments"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "arguments": [
      { "name": "param1", "value": "...", "type": "..." }
    ]
  }
}
```

**Verification:** Returns the function's parameters. Different from `get_variables` (args vs locals).

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E3: Evaluate an expression

**Operation:** `evaluate`  
**User Journey:** AI agent evaluates an arbitrary C expression in the current debug context.

**Request:**
```bash
dbg '{"operation":"evaluate","params":{"expression":"sizeof(int)"}}'
```

**Expected:**
```json
{ "success": true, "result": { "value": "4", "type": "long unsigned int" } }
```

**Also test with a variable:**
```bash
dbg '{"operation":"evaluate","params":{"expression":"my_var + 1"}}'
```

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E4: Whatis — get type of expression

**Operation:** `whatis`  
**User Journey:** AI agent determines the type of a variable or expression without printing its value.

**Request:**
```bash
dbg '{"operation":"whatis","params":{"expression":"my_var"}}'
```

**Expected:**
```json
{ "success": true, "result": { "type": "int" } }
```

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E5: Pretty-print a struct/pointer

**Operation:** `pretty_print`  
**User Journey:** AI agent formats a complex variable (struct, pointer) for readable inspection.

**Prerequisite:** Session stopped where a struct variable is in scope.

**Request:**
```bash
dbg '{"operation":"pretty_print","params":{"expression":"my_struct"}}'
```

**Expected:**
```json
{
  "success": true,
  "result": {
    "value": "...",
    "fields": [
      { "name": "field1", "value": "..." },
      { "name": "field2", "value": "..." }
    ]
  }
}
```

**Verification:** Response includes `fields` array with named members.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E6: List all locals (including inner scopes)

**Operation:** `list_all_locals`  
**User Journey:** AI agent retrieves all variables visible in all nested scopes of the current frame.

**Request:**
```bash
dbg '{"operation":"list_all_locals"}'
```

**Expected:** `"success": true`, `"variables"` array. May include more entries than `get_variables` if inner blocks exist.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-E7: Get scope preview

**Operation:** `get_scope_preview`  
**User Journey:** AI agent gets a compact summary of the current frame's variables — used for quick context.

**Request:**
```bash
dbg '{"operation":"get_scope_preview"}'
```

**Expected:** `"success": true`, some form of variable summary. May be a condensed version of `get_variables`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 8. Suite F — Source Navigation

**Prerequisite:** Active stopped session with debug symbols loaded.

---

### TC-F1: List source lines around current position

**Operation:** `list_source`  
**User Journey:** AI agent reads the source code around the current execution point.

**Request:**
```bash
dbg '{"operation":"list_source"}'
```

**Alternative with explicit location:**
```bash
dbg '{"operation":"list_source","params":{"file":"src/main.c","line":40,"count":20}}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "lines": [
      { "number": 38, "text": "  int x = 0;" },
      { "number": 39, "text": "  if (x > 0) {" }
    ]
  }
}
```

**Verification:** Returns actual source text. Line numbers are sequential.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-F2: Get full source file content

**Operation:** `get_source`  
**User Journey:** AI agent reads a complete source file to understand the module context.

**Request:**
```bash
dbg '{"operation":"get_source","params":{"file":"src/main.c"}}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "content": "/* full file content */",
    "lines": 120
  }
}
```

**Verification:** `content` is non-empty, `lines` > 0.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-F3: Path traversal attempt blocked (security)

**Operation:** `get_source`  
**User Journey:** Verifies that path traversal attacks are rejected (ADP-024 compliance).

**Request:**
```bash
dbg '{"operation":"get_source","params":{"file":"../../../../etc/passwd"}}'
```

**Expected:** `"success": false`, error message. Must NOT return `/etc/passwd` contents.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-F4: Get last stop information

**Operation:** `get_last_stop_info`  
**User Journey:** AI agent queries why/where execution stopped (breakpoint hit, step completed, signal).

**Prerequisite:** Session stopped at any point.

**Request:**
```bash
dbg '{"operation":"get_last_stop_info"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "reason": "breakpoint-hit",
    "file": "src/main.c",
    "line": 42,
    "threadId": 1
  }
}
```

**Verification:** `reason` is present and informative. `file` and `line` match the current stop position.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 9. Suite G — Memory & Registers

**Prerequisite:** Active stopped session.

---

### TC-G1: Get CPU registers

**Operation:** `get_registers`  
**User Journey:** AI agent inspects CPU register state for low-level debugging (crash analysis, corruption detection).

**Request:**
```bash
dbg '{"operation":"get_registers"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "registers": [
      { "name": "eax", "value": "0x00000000" },
      { "name": "eip", "value": "0x08048456" }
    ]
  }
}
```

**Verification:** Returns at least the main integer registers (eax/rax, eip/rip or equivalent). Values are hex strings.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-G2: Read memory at address

**Operation:** `read_memory`  
**User Journey:** AI agent reads raw bytes at a memory address (e.g., to inspect a buffer).

**Prerequisite:** Get a valid address from `get_registers` (e.g., stack pointer `esp`/`rsp`) or `evaluate`.

**Request:**
```bash
# Replace address with a valid address from your session
dbg '{"operation":"read_memory","params":{"memoryReference":"0x08048000","count":16}}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "address": "0x08048000",
    "data": "7f454c46...",
    "bytes": 16
  }
}
```

**Verification:** `data` is a hex string of `count` bytes.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-G3: Write memory at address

**Operation:** `write_memory`  
**User Journey:** AI agent writes bytes to memory (used for fault injection or patching during debug sessions).

**Prerequisite:** TC-G2 PASS. Use the same address, write a known pattern, then read back.

**Request:**
```bash
ADDR="<valid writable address>"
dbg '{"operation":"write_memory","params":{"address":'"$ADDR"',"data":"DEADBEEF"}}'
```

**Expected:**
```json
{ "success": true, "result": { "written": 4 } }
```

**Verification:** Immediately call `read_memory` on the same address and verify the written bytes are returned.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-G4: Memory limit enforcement

**Operation:** `read_memory`  
**User Journey:** Verifies that excessively large memory reads are rejected (security gate S4).

**Request:**
```bash
dbg '{"operation":"read_memory","params":{"memoryReference":"0x08048000","count":99999999}}'
```

**Expected:** `"success": false`, error message about size limit.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 10. Suite H — Error Handling & Validation

**Prerequisite:** Proxy running. Some tests require NO active session.

---

### TC-H1: Missing operation field

**Request:**
```bash
dbg '{"program":"test"}'
```
**Expected:** HTTP 400, `"success": false`, error mentions `operation` field.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H2: Unknown operation

**Request:**
```bash
dbg '{"operation":"fly_to_moon"}'
```
**Expected:** HTTP 400, `"success": false`, error mentions unknown operation.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H3: Operations without active session

**Prerequisite:** Terminate any active session first.

**Request:**
```bash
dbg '{"operation":"get_variables"}'
```
**Expected:** `"success": false`, error indicates no active debug session.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H4: jump — missing line parameter

**Request:**
```bash
dbg '{"operation":"jump","params":{"file":"src/main.c"}}'
```

**Expected:** `"success": false`, error mentions missing `line` parameter.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H5: goto_frame — missing frameId parameter

**Request:**
```bash
dbg '{"operation":"goto_frame"}'
```

**Expected:** `"success": false`, error mentions missing `frameId`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H6: switch_thread — missing threadId

**Request:**
```bash
dbg '{"operation":"switch_thread"}'
```

**Expected:** `"success": false`, error mentions missing `threadId`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H7: write_memory — missing address

**Request:**
```bash
dbg '{"operation":"write_memory","params":{"data":"DEADBEEF"}}'
```

**Expected:** `"success": false`, error mentions missing `address`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H8: Malformed JSON body

**Request:**
```bash
curl -s -X POST http://localhost:9999/api/debug \
  -H 'Content-Type: application/json' \
  -d 'NOT_VALID_JSON'
```

**Expected:** HTTP 400, JSON error response. Proxy must NOT crash.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H9: Prototype pollution attempt

**Request:**
```bash
dbg '{"operation":"launch","__proto__":{"polluted":true},"program":"test"}'
```

**Expected:** Either `"success": true` (prototype field ignored) or validation error. `Object.prototype.polluted` must remain `undefined` after this call.

**Verification:** No crash, no prototype contamination.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H10: Info leak prevention (ADP-024)

**Prerequisite:** Session stopped. Trigger an error that would include a filesystem path.

**Request:**
```bash
dbg '{"operation":"get_source","params":{"file":"/home/tester/private/secrets.txt"}}'
```

**Expected:** Error response must NOT contain full `/home/` path. The path should be stripped or redacted per ADP-024.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H11: attach — missing processId

**Request:**

```bash
dbg '{"operation":"attach"}'
```

**Expected:** `"success": false`, error mentions missing `processId`.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-H12: remove_all_breakpoints_in_file — missing file

**Request:**

```bash
dbg '{"operation":"remove_all_breakpoints_in_file"}'
```

**Expected:** `"success": false`, error mentions missing `file` parameter.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

## 11. Suite J — Multi-Thread Debugging

**Prerequisite:** Binary must be multi-threaded. Use a pthread test binary if CycurHSM does not exhibit threading at your breakpoint.

**Alternative:** Use GDB's `set scheduler-locking on` to simulate multi-thread context.

---

### TC-J1: List threads

**Operation:** `list_threads`  
**User Journey:** AI agent enumerates all threads to identify which thread hit the breakpoint.

**Request:**

```bash
dbg '{"operation":"list_threads"}'
```

**Expected Response:**

```json
{
  "success": true,
  "result": {
    "threads": [
      { "id": 1, "name": "main", "status": "stopped" }
    ]
  }
}
```

**Verification:** At least one thread. Each entry has `id`, `name` or status. For single-threaded binaries, one entry is acceptable.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-J2: Switch to a thread

**Operation:** `switch_thread`  
**User Journey:** AI agent changes the debug context to inspect a different thread's state.

**Prerequisite:** At least 2 threads visible in TC-J1 (or skip with BLOCKED if single-threaded binary).

**Request:**

```bash
THREAD_ID=2   # use an ID from TC-J1
dbg '{"operation":"switch_thread","params":{"threadId":'"$THREAD_ID"'}}'
```

**Expected:** `"success": true`. Subsequent `stack_trace` shows the switched thread's call stack.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-J3: list_threads when no session

**Prerequisite:** Terminate session first.

**Request:**

```bash
dbg '{"operation":"list_threads"}'
```

**Expected:** `"success": false`, error indicates no active session.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

## 12. Suite K — Extended Operations

**Prerequisite:** Active stopped session.

---

### TC-K1: Get global variables

**Operation:** `get_globals`  
**User Journey:** AI agent reads global/static variables to track module-level state.

**Request:**
```bash
dbg '{"operation":"get_globals"}'
```

**Expected:** `"success": true`, `"variables"` array (may be empty if no globals accessible, but no error).

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-K2: Execute a GDB statement

**Operation:** `execute_statement`  
**User Journey:** AI agent runs a raw GDB command for operations not covered by the standard API.

**Request:**
```bash
dbg '{"operation":"execute_statement","params":{"statement":"info registers eax"}}'
```

**Expected:** `"success": true`, `"result"` contains GDB output text.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-K3: Get capabilities

**Operation:** `get_capabilities`  
**User Journey:** AI agent queries which operations are supported by this proxy version.

**Request:**
```bash
dbg '{"operation":"get_capabilities"}'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "operations": ["launch", "continue", "next", "..."],
    "count": 38
  }
}
```

**Verification:** `count` is 38. All officially listed operations appear in `operations` array.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-K4: get_capabilities — no session required

**User Journey:** AI agent should be able to query capabilities without an active debug session (used for API discovery).

**Prerequisite:** Terminate any active session.

**Request:**
```bash
dbg '{"operation":"get_capabilities"}'
```

**Expected:** `"success": true` — capabilities do NOT require a session.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-K5: Pretty-print expression with no active session (error)

**Operation:** `pretty_print`  
**Prerequisite:** No active session.

**Request:**
```bash
dbg '{"operation":"pretty_print","params":{"expression":"myStruct"}}'
```

**Expected:** `"success": false`, error indicates no active session.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED

---

### TC-K6: Execute statement — dangerous command handling

**Operation:** `execute_statement`  
**User Journey:** Verify that obviously destructive GDB commands are either blocked or handled safely.

**Request:**
```bash
dbg '{"operation":"execute_statement","params":{"statement":"quit"}}'
```

**Expected:** Either rejected with an error, OR executed without crashing the proxy/session unexpectedly. Document actual behavior.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

## 13. Suite L — Remaining Operations

### TC-L1: Write memory round-trip (covered in TC-G3)

See TC-G3. This entry serves as a cross-reference to confirm `write_memory` is not duplicated or skipped.

**Result:** ☐ SEE TC-G3

---

### TC-L2: Terminate via quit alias

**Operation:** `quit` (alias for `terminate`)  
**User Journey:** Verify that `quit` is accepted as an alias.

**Prerequisite:** Active session.

**Request:**
```bash
dbg '{"operation":"quit"}'
```

**Expected:** `"success": true`, session terminated.

**Result:** ☐ PASS  ☐ FAIL  ☐ BLOCKED  
**Notes:** _______________

---

### TC-L3: Attach negative — missing processId (covered in TC-H11)

**Result:** ☐ SEE TC-H11

---

## 14. Suite R — Regression (v3.a1 Real-World Replay)

**Purpose:** Reproduce the exact debugging session documented in `docs/release/v3/quality-test-report-v3a1.md`. All 13 operations must PASS.

**Target binary:** CycurHSM 3.x — `_build/PCx32_CLANG/PCx32_CLANG`  
**Source file under test:** `arch/hsm/lib/src/keystore_base.c`

**Setup:**
```bash
export BINARY="/home/<user>/working/cycurhsm-3.x/_build/PCx32_CLANG/PCx32_CLANG"
export SRC="arch/hsm/lib/src/keystore_base.c"
```

---

### TC-R1: Health check

```bash
curl -s http://localhost:9999/api/ping
```

**Expected:** `"success": true`, `"version"` starts with `"v3"`, `"operationCount": 38` (or 39).

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R2: Launch with stopOnEntry

```bash
dbg '{"operation":"launch","params":{"program":"'"$BINARY"'","stopOnEntry":true}}'
```

**Expected:** `"success": true`, `"status": "stopped"`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R3: get_capabilities (confirm 38-39 ops)

```bash
dbg '{"operation":"get_capabilities"}'
```

**Expected:** `count` >= 38.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R4: get_last_stop_info after launch

```bash
dbg '{"operation":"get_last_stop_info"}'
```

**Expected:** `reason` is `"entry"` or `"breakpoint-hit"`, `file` and `line` present.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R5: Set breakpoint at keystore_base.c:442

```bash
dbg '{"operation":"set_breakpoint","params":{"location":{"path":"'"$SRC"'","line":442}}}'
```

**Expected:** `"success": true`, `"verified": true`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R6: Set second breakpoint at keystore_base.c:471

```bash
dbg '{"operation":"set_breakpoint","params":{"location":{"path":"'"$SRC"'","line":471}}}'
```

**Expected:** `"success": true`, `"verified": true`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R7: Continue to first breakpoint

```bash
dbg '{"operation":"continue"}'
```
**Expected:** `"success": true`, `"status": "stopped"`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R8: stack_trace at breakpoint

```bash
dbg '{"operation":"stack_trace"}'
```
**Expected:** `"success": true`, frame 0 in `keystore_base.c` near line 442, at least 3 frames.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R9: get_variables at frame 0

```bash
dbg '{"operation":"get_variables"}'
```
**Expected:** `"success": true`, variables include `object_id` and/or `p_object`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R10: goto_frame to caller (frame 1 or higher)

```bash
dbg '{"operation":"goto_frame","params":{"frameId":1}}'
```
**Expected:** `"success": true`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R11: get_arguments at caller frame

```bash
dbg '{"operation":"get_arguments"}'
```
**Expected:** `"success": true`, arguments reflect the caller's parameters.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R12: evaluate expression

```bash
dbg '{"operation":"evaluate","params":{"expression":"sizeof(uint32_t)"}}'
```
**Expected:** `"success": true`, `"value"` is `"4"`.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

### TC-R13: step + list_source

```bash
dbg '{"operation":"next"}'
dbg '{"operation":"list_source"}'
```
**Expected:** Both `"success": true`. `list_source` returns source lines with `number` and `text` fields.

**Result:** ☐ PASS  ☐ FAIL  
**Notes:** _______________

---

## 15. Summary Scorecard

Fill in after completing all suites.

| Suite | Total TCs | PASS | FAIL | BLOCKED | Pass Rate |
|-------|-----------|------|------|---------|-----------|
| A — Session Lifecycle | 5 | | | | |
| B — Breakpoints | 7 | | | | |
| C — Execution Control | 7 | | | | |
| D — Stack Navigation | 5 | | | | |
| E — Variable Inspection | 7 | | | | |
| F — Source Navigation | 4 | | | | |
| G — Memory & Registers | 4 | | | | |
| H — Error Handling | 12 | | | | |
| J — Threading | 3 | | | | |
| K — Extended Ops | 6 | | | | |
| L — Remaining | 2 | | | | |
| R — Regression | 13 | | | | |
| **TOTAL** | **75** | | | | |

**Release Decision:**

| Threshold | Required | Actual | Status |
|-----------|----------|--------|--------|
| All Suite R (regression) | 13/13 PASS | | ☐ |
| Suites A-D (core ops) | >= 90% | | ☐ |
| Suites E-K (extended) | >= 80% | | ☐ |
| Suite H (error paths) | >= 10/12 | | ☐ |
| No CRITICAL failures | 0 | | ☐ |

---

## 16. Known Limitations (Do Not Block Release)

| Item | Description | Workaround |
|------|-------------|------------|
| `attach` positive path | Full attach to running process requires external setup. Only negative path (TC-H11) is required for stable. | Schedule as post-stable item |
| `switch_thread` multi-thread | Requires a multi-threaded binary. Single-threaded BLOCKED is acceptable. | Test with pthread demo if available |
| `jump` GDB specifics | Jump within different function may be rejected by GDB. Document actual GDB behavior. | Acceptable if error response is clean |
| `execute_statement` dangerous cmds | Behavior for `quit`/`kill` statements is implementation-defined. Document, do not block. | Record in TC-K6 notes |

---

## 17. Stable Release Sign-Off (Gate S5)

Complete after all suites pass the release thresholds above.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Architect | | | ☐ |
| QA Engineer | | | ☐ |
| Product Owner | | | ☐ |

**Release Tag:** `v3.0.0`  
**Evidence Archive Location:** `docs/release/v3/evidence/`  
**Test Report Author:** _______________  
**Test Execution Date:** _______________

---

*End of Document*
