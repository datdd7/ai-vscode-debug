# LLM Integration Guide — AI Debug Proxy v3

**Version:** 3.0.0
**Date:** 2026-04-14
**Audience:** AI agents (Claude Code, GPT, Gemini) integrating with the debug proxy

---

## Overview

AI Debug Proxy exposes a single HTTP endpoint (`POST /api/debug/execute_operation`) with 38 operations. This guide covers recommended usage patterns, multi-thread workflows, and context efficiency tips.

---

## Quick Start

```bash
# 1. Check proxy is alive
curl http://localhost:9999/api/ping

# 2. Launch binary
curl -s http://localhost:9999/api/debug/execute_operation \
  -H "Content-Type: application/json" \
  -d '{"operation":"launch","params":{"program":"/path/to/binary","stopOnEntry":true}}'

# 3. Get current context
curl -s http://localhost:9999/api/debug/execute_operation \
  -d '{"operation":"get_scope_preview"}'
```

---

## Recommended Debug Workflow

### Step 1: Establish Context

After a stop event (breakpoint hit, step, etc.), collect state with minimal API calls:

```json
// 1. Where are we?
POST /api/debug/execute_operation
{ "operation": "get_last_stop_info" }

// 2. What's the stack?
{ "operation": "stack_trace" }

// 3. What are the locals?
{ "operation": "get_scope_preview" }
```

This 3-call sequence gives: stop reason, call stack, and all local variables.

### Step 2: Investigate

```json
// Evaluate a suspect expression
{ "operation": "evaluate", "params": { "expression": "myVar->field" } }

// Expand a struct
{ "operation": "pretty_print", "params": { "expression": "ctx" } }

// Check a type
{ "operation": "whatis", "params": { "expression": "status" } }
```

### Step 3: Navigate

```json
// Go up one frame to see caller context
{ "operation": "up" }

// Or jump to a specific frame
{ "operation": "goto_frame", "params": { "frameId": 2 } }

// Resume
{ "operation": "continue" }
```

---

## Multi-Thread Debugging

When debugging multi-threaded programs, use these operations:

### List and Inspect Threads

```json
// Get all threads with their current frame
{ "operation": "list_threads" }
```

Response example:
```json
{
  "data": [
    { "id": 1, "name": "main", "state": "stopped", "frame": { "func": "main", "line": 42 } },
    { "id": 2, "name": "worker_0", "state": "stopped", "frame": { "func": "processQueue", "line": 88 } },
    { "id": 3, "name": "worker_1", "state": "stopped", "frame": { "func": "idle_wait", "line": 15 } }
  ]
}
```

### Switch Thread Context

```json
// Switch to thread 2
{ "operation": "switch_thread", "params": { "threadId": 2 } }

// Now stack_trace, get_variables, evaluate all operate on thread 2
{ "operation": "stack_trace" }
{ "operation": "get_scope_preview" }
```

> **Important:** `switch_thread` resets the active frame to 0 (top of thread's stack). If you need a specific frame within the thread, call `goto_frame` afterward.

### Thread Investigation Pattern

```
1. list_threads           → identify suspicious thread
2. switch_thread          → change context
3. stack_trace            → see thread's call stack
4. get_scope_preview      → see thread's local variables
5. evaluate               → examine shared state
6. switch_thread(1)       → return to main thread
```

---

## Context Efficiency Tips

Minimize token usage and API calls with these patterns:

### Use `get_scope_preview` instead of multiple calls

```json
// Instead of:
{ "operation": "get_variables" }     // locals
{ "operation": "get_arguments" }     // args

// Use one call:
{ "operation": "get_scope_preview" }  // both, compact
```

### Set breakpoints before launching

```json
// Set all breakpoints before launch to avoid redundant stops
{ "operation": "set_breakpoint", "params": { "location": { "path": "/path/main.c", "line": 42 } } }
{ "operation": "launch", "params": { "program": "/path/binary" } }
```

### Use `until` for fast forward

```json
// Run to a specific line without setting a breakpoint
{ "operation": "until", "params": { "line": 200 } }
```

---

## Error Handling

All operations return `{ "success": false, "error": "..." }` on failure. Check the `success` field before using `data`.

Common errors:
| Error | Cause | Fix |
|-------|-------|-----|
| `No active debug session` | No session running | Call `launch` first |
| `Unknown operation` | Typo or unsupported op | Check op name against 38-op list |
| `'xxx' requires 'yyy'` | Missing required param | Add the required parameter |
| HTTP 400 | Validation failure | Check params per API reference |

---

## All 38 Operations (Quick Reference)

| Group | Operations |
|-------|-----------|
| Session | `launch`, `attach`, `terminate`, `restart` |
| Execution | `continue`, `next`, `step_in`, `step_out`, `pause`, `jump`, `until` |
| Breakpoints | `set_breakpoint`, `set_temp_breakpoint`, `remove_breakpoint`, `remove_all_breakpoints_in_file`, `get_active_breakpoints` |
| Stack | `stack_trace`, `up`, `down`, `goto_frame` |
| Variables | `get_variables`, `get_arguments`, `get_globals`, `list_all_locals`, `get_scope_preview`, `evaluate`, `pretty_print`, `whatis`, `execute_statement` |
| Source | `list_source`, `get_source`, `get_last_stop_info` |
| Hardware | `get_registers`, `read_memory`, `write_memory` |
| Threads | `list_threads`, `switch_thread` |
| Meta | `get_capabilities` |

---

## Security Notes

- The proxy binds to `localhost:9999` only — not accessible from outside the machine.
- Path traversal in `get_source` is blocked (absolute paths outside project rejected).
- `write_memory` and `execute_statement` can modify program state — use deliberately.
- Error messages are sanitized (no internal file paths in responses).
