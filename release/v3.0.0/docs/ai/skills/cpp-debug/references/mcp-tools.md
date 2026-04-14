# MCP Tools Reference — AI Debug Proxy

All tools are prefixed `debug_`. Call them directly — no JSON boilerplate needed.

## Session

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_launch` | `(program, stop_on_entry=False, env=None)` | Launch GDB session for a binary |
| `debug_attach` | `(process_id)` | Attach to a running process by PID |
| `debug_start` | `()` | Start execution after launch (`-exec-run`) |
| `debug_restart` | `()` | Restart session from the beginning |
| `debug_terminate` | `()` | End session and stop the debugged process |
| `debug_status` | `()` | Check session state (active, thread, frame) |

## Execution

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_continue` | `()` | Resume until next breakpoint |
| `debug_next` | `()` | Step over — one source line, no entry into calls |
| `debug_step_in` | `()` | Step into function calls |
| `debug_step_out` | `()` | Step out of current function |
| `debug_pause` | `()` | Interrupt execution |
| `debug_until` | `(line)` | Run until line (one-shot, no persistent BP) |
| `debug_jump` | `(line)` | Jump execution to line (skips intermediate code) |

## Frame Navigation

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_stack_trace` | `()` | Full call stack for active thread |
| `debug_up` | `()` | Move one frame toward caller |
| `debug_down` | `()` | Move one frame toward callee |
| `debug_goto_frame` | `(frame_id)` | Jump to specific frame by ID |

## Breakpoints

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_set_breakpoint` | `(file, line, condition=None)` | Persistent breakpoint, optional condition |
| `debug_set_temp_breakpoint` | `(file, line)` | One-shot breakpoint (auto-removes on hit) |
| `debug_remove_breakpoint` | `(file, line)` | Remove breakpoint at location |
| `debug_remove_all_breakpoints_in_file` | `(file)` | Clear all BPs in a source file |
| `debug_get_active_breakpoints` | `()` | List all active breakpoints |

## Inspection

| Tool | Signature | When to use |
| --- | --- | --- |
| `debug_get_scope_preview` | `()` | **Start here** — locals + args in one call |
| `debug_list_all_locals` | `()` | All locals + args as flat list |
| `debug_get_variables` | `(frame_id=None)` | Local variables only |
| `debug_get_arguments` | `(frame_id=None)` | Function arguments only |
| `debug_get_globals` | `()` | Global variable values |
| `debug_evaluate` | `(expression, frame_id=None)` | Evaluate any GDB expression |
| `debug_pretty_print` | `(expression)` | Expand struct / array / pointer |
| `debug_whatis` | `(expression)` | Get type of expression |
| `debug_execute_statement` | `(statement)` | Raw GDB MI command (escape hatch) |
| `debug_list_source` | `(lines_around=None, frame_id=None)` | Source lines around current position |
| `debug_get_source` | `(expression)` | Source for symbol or file path |
| `debug_get_last_stop_info` | `()` | Details of last stop (reason, signal, location) |

## Hardware

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_get_registers` | `()` | CPU register values (rip, rsp, rax, …) |
| `debug_read_memory` | `(memory_reference, count)` | Read `count` bytes from hex address |
| `debug_write_memory` | `(address, data)` | Write hex bytes to numeric address |

## Threading

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_list_threads` | `()` | All threads with state and current frame |
| `debug_switch_thread` | `(thread_id)` | Switch context — subsequent calls use this thread |

## Info

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_get_capabilities` | `()` | Backend capability flags |

---

## HTTP Fallback

When MCP is unavailable, every tool maps to an HTTP operation:

```bash
BASE="http://localhost:9999/api/debug"
curl -s -X POST $BASE -H "Content-Type: application/json" \
  -d '{"operation": "<name>", "params": {...}}'
```

Operation name = MCP tool name minus the `debug_` prefix.
Example: `debug_get_scope_preview()` → `"operation": "get_scope_preview"`.

All responses: `{"success": true, "data": {...}}` or `{"success": false, "error": "..."}`.
