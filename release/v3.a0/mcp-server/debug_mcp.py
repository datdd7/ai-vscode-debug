#!/usr/bin/env python3
"""MCP Server for AI Debug Proxy - Allows AI agents to debug programs."""

import os
import json
import httpx
from mcp.server.fastmcp import FastMCP

PROXY_URL = os.getenv("DEBUG_PROXY_URL", "http://localhost:9999")

mcp = FastMCP("ai-debug-proxy")

async def _call_proxy(operation: str, params: dict = None) -> str:
    """Send operation to AI Debug Proxy HTTP API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{PROXY_URL}/api/debug/execute_operation",
            json={"operation": operation, "params": params or {}}
        )
        return json.dumps(resp.json(), indent=2)

# ── Session ─────────────────────────────────────────
@mcp.tool()
async def debug_launch(program: str, stop_on_entry: bool = False) -> str:
    """Launch a debug session for the given program."""
    return await _call_proxy("launch", {
        "program": program, "stopOnEntry": stop_on_entry
    })

@mcp.tool()
async def debug_attach(process_id: int) -> str:
    """Attach to a running process."""
    return await _call_proxy("attach", {"processId": process_id})

@mcp.tool()
async def debug_terminate() -> str:
    """Terminate the current debug session."""
    return await _call_proxy("terminate")

@mcp.tool()
async def debug_restart() -> str:
    """Restart the current debug session."""
    return await _call_proxy("restart")

@mcp.tool()
async def debug_status() -> str:
    """Get current debug session status."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{PROXY_URL}/api/status")
        return json.dumps(resp.json(), indent=2)

# ── Execution ───────────────────────────────────────
@mcp.tool()
async def debug_continue() -> str:
    """Continue program execution until next breakpoint."""
    return await _call_proxy("continue")

@mcp.tool()
async def debug_next() -> str:
    """Step over to next line."""
    return await _call_proxy("next")

@mcp.tool()
async def debug_step_in() -> str:
    """Step into function call."""
    return await _call_proxy("step_in")

@mcp.tool()
async def debug_step_out() -> str:
    """Step out of current function."""
    return await _call_proxy("step_out")

@mcp.tool()
async def debug_jump(line: int) -> str:
    """Jump to specified line number."""
    return await _call_proxy("jump", {"line": line})

@mcp.tool()
async def debug_up() -> str:
    """Move frame up (toward caller)."""
    return await _call_proxy("up")

@mcp.tool()
async def debug_down() -> str:
    """Move frame down (toward callee)."""
    return await _call_proxy("down")

@mcp.tool()
async def debug_goto_frame(frame_id: int) -> str:
    """Select a specific frame."""
    return await _call_proxy("goto_frame", {"frameId": frame_id})

@mcp.tool()
async def debug_pause() -> str:
    """Pause execution."""
    return await _call_proxy("pause")

@mcp.tool()
async def debug_until(line: int) -> str:
    """Continue execution until specified line."""
    return await _call_proxy("until", {"line": line})

# ── Breakpoints ─────────────────────────────────────
@mcp.tool()
async def debug_set_breakpoint(file: str, line: int) -> str:
    """Set a breakpoint at the specified file and line."""
    return await _call_proxy("set_breakpoint", {
        "location": {"path": file, "line": line}
    })

@mcp.tool()
async def debug_remove_breakpoint(bp_id: str) -> str:
    """Remove a breakpoint by ID."""
    return await _call_proxy("remove_breakpoint", {"id": bp_id})

@mcp.tool()
async def debug_list_breakpoints() -> str:
    """List all active breakpoints."""
    return await _call_proxy("get_active_breakpoints")

@mcp.tool()
async def debug_set_temp_breakpoint(file: str, line: int) -> str:
    """Set a temporary breakpoint."""
    return await _call_proxy("set_temp_breakpoint", {
        "location": {"path": file, "line": line}
    })

@mcp.tool()
async def debug_remove_all_breakpoints_in_file(file: str) -> str:
    """Remove all breakpoints in a given file."""
    return await _call_proxy("remove_all_breakpoints_in_file", {"filePath": file})

# ── Inspection ──────────────────────────────────────
@mcp.tool()
async def debug_stack_trace(thread_id: int | None = None) -> str:
    """Get the current stack trace."""
    return await _call_proxy("stack_trace", {"threadId": thread_id})

@mcp.tool()
async def debug_variables(frame_id: int | None = None) -> str:
    """Get local variables in the current or specified frame."""
    return await _call_proxy("get_variables", {"frameId": frame_id})

@mcp.tool()
async def debug_evaluate(expression: str, frame_id: int | None = None) -> str:
    """Evaluate an expression in the current debug context."""
    return await _call_proxy("evaluate", {"expression": expression, "frameId": frame_id})

@mcp.tool()
async def debug_whatis(expression: str) -> str:
    """Get the type of an expression."""
    return await _call_proxy("whatis", {"expression": expression})

@mcp.tool()
async def debug_pretty_print(expression: str) -> str:
    """Pretty print an expression value."""
    return await _call_proxy("pretty_print", {"expression": expression})

@mcp.tool()
async def debug_registers() -> str:
    """Get CPU registers."""
    return await _call_proxy("get_registers")

@mcp.tool()
async def debug_scope_preview() -> str:
    """Get scope preview (locals + arguments)."""
    return await _call_proxy("get_scope_preview")

@mcp.tool()
async def debug_arguments(frame_id: int | None = None) -> str:
    """Get arguments for the current or specified frame."""
    return await _call_proxy("get_arguments", {"frameId": frame_id})

@mcp.tool()
async def debug_globals() -> str:
    """Get global variables."""
    return await _call_proxy("get_globals")

@mcp.tool()
async def debug_read_memory(address: str, length: int) -> str:
    """Read memory from the debugged process."""
    return await _call_proxy("read_memory", {"address": address, "length": length})

@mcp.tool()
async def debug_write_memory(address: str, data: str) -> str:
    """Write string/data to memory."""
    return await _call_proxy("write_memory", {"address": address, "data": data})

@mcp.tool()
async def debug_list_source(file: str, line: int | None = None, lines: int | None = None) -> str:
    """List source code around a specific file and line. Pass `lines` for surrounding context lines count."""
    params: dict = {"file": file}
    if line is not None:
        params["line"] = line
    if lines is not None:
        params["customParams"] = {"lines": lines}
    return await _call_proxy("list_source", params)

@mcp.tool()
async def debug_get_source(expression: str) -> str:
    """Get source snippet for a given expression/function."""
    return await _call_proxy("get_source", {"expression": expression})

@mcp.tool()
async def debug_execute_statement(statement: str) -> str:
    """Execute a statement/command in GDB."""
    return await _call_proxy("execute_statement", {"statement": statement})

@mcp.tool()
async def debug_list_all_locals() -> str:
    """List all local variables in a flat dictionary."""
    return await _call_proxy("list_all_locals")

# ── Info ────────────────────────────────────────────
@mcp.tool()
async def debug_get_last_stop_info() -> str:
    """Get the last stop info."""
    return await _call_proxy("get_last_stop_info")

@mcp.tool()
async def debug_get_capabilities() -> str:
    """Get debugger backend capabilities."""
    return await _call_proxy("get_capabilities")

if __name__ == "__main__":
    mcp.run(transport="stdio")
