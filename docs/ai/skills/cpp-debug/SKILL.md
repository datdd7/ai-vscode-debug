---
name: cpp-debug
description: >
  Skill for autonomously debugging C/C++ applications using the AI Debug Proxy
  extension (GDB wrapped as MCP tools or HTTP REST API). Use this skill whenever
  the user asks to debug a binary, investigate a crash, trace a bug, inspect
  memory, find a segfault, or step through C/C++ code. Also triggers when the
  user says "run the debugger", "check what happens at line X", "why does this
  crash", "inspect variable Y", or "attach to process" on a compiled C/C++ program.
---

# C/C++ Debugging with AI Debug Proxy

The AI Debug Proxy wraps GDB into 38 operations accessible via **MCP tools**
(preferred) or HTTP REST (fallback). The MCP server script lives in
`scripts/debug_mcp.py` — start it before using MCP tools.

## References

- [`references/mcp-tools.md`](references/mcp-tools.md) — full tool list with signatures
- [`references/workflows.md`](references/workflows.md) — step-by-step workflows (bug hunt, crash, memory, threads)
- [`references/errors.md`](references/errors.md) — common errors and fixes

---

## Setup

**Start the MCP server** (if not already running):

```bash
cd scripts
pip install -r requirements.txt   # first time only
python debug_mcp.py               # stdio transport, auto-connects to localhost:9999
```

**Verify proxy is up:**

```bash
curl -s http://localhost:9999/api/ping
```

If refused — tell the user to reload VS Code (extension auto-starts the HTTP server).

**Binary needs debug symbols:** `gcc -g` / `g++ -g` / `cmake -DCMAKE_BUILD_TYPE=Debug`.

---

## Interface Priority

1. **MCP tools** (`debug_*`) — use when available in your tool list. See
   [`references/mcp-tools.md`](references/mcp-tools.md) for all 38 tools.
2. **HTTP API** — fallback: `POST http://localhost:9999/api/debug` with
   `{"operation": "<name>", "params": {...}}`. Strip `debug_` prefix from MCP
   tool name to get the operation name.

---

## Quick Reference

**Most common sequence:**

```python
debug_launch("/abs/path/to/binary", stop_on_entry=True)
debug_set_breakpoint("src/main.c", 42)
debug_continue()
debug_get_scope_preview()   # ← always start inspection here (locals + args)
debug_evaluate("suspect_var")
debug_next()                # step over
debug_terminate()
```

**Inspection rule:** always call `debug_get_scope_preview()` first — it
returns locals + args in one call. Only drill deeper with `debug_evaluate()`
or `debug_pretty_print()` for specific values. See
[`references/workflows.md`](references/workflows.md) for full patterns.

**Crash investigation shortcut:**

```python
debug_launch("/abs/path/to/binary", stop_on_entry=False)
debug_continue()                  # let it crash
debug_get_last_stop_info()        # signal, file, line
debug_stack_trace()               # full call stack
debug_up()                        # navigate to caller
```
