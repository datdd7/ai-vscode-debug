#!/usr/bin/env python3
"""MCP Server for AI Debug Proxy v3 — Exposes all 38 beta operations as MCP tools."""

import os
import json
import httpx
from mcp.server.fastmcp import FastMCP

PROXY_URL = os.getenv("DEBUG_PROXY_URL", "http://localhost:9999")

mcp = FastMCP("ai-debug-proxy")


def _strip_none(d: dict) -> dict:
    """Remove keys with None values so the proxy doesn't receive null params."""
    return {k: v for k, v in d.items() if v is not None}


async def _call_proxy(operation: str, params: dict | None = None) -> str:
    """Send an operation to the AI Debug Proxy HTTP API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{PROXY_URL}/api/debug/execute_operation",
            json={"operation": operation, "params": _strip_none(params or {})}
        )
        return json.dumps(resp.json(), indent=2)


# ── Session ──────────────────────────────────────────────────────────────────

@mcp.tool()
async def debug_launch(program: str, stop_on_entry: bool = False) -> str:
    """Launch a debug session for the given binary. Uses stopOnEntry to halt at program entry."""
    return await _call_proxy("launch", {"program": program, "stopOnEntry": stop_on_entry})


@mcp.tool()
async def debug_attach(process_id: int) -> str:
    """Attach to a running process by PID."""
    return await _call_proxy("attach", {"processId": process_id})


@mcp.tool()
async def debug_terminate() -> str:
    """Terminate the current debug session and stop the debugged process."""
    return await _call_proxy("terminate")


@mcp.tool()
async def debug_restart() -> str:
    """Restart the current debug session from the beginning."""
    return await _call_proxy("restart")


@mcp.tool()
async def debug_status() -> str:
    """Get current debug session status (active session, thread/frame context)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{PROXY_URL}/api/debug/status")
        return json.dumps(resp.json(), indent=2)


# ── Execution ─────────────────────────────────────────────────────────────────

@mcp.tool()
async def debug_continue() -> str:
    """Resume execution until the next breakpoint or program end."""
    return await _call_proxy("continue")


@mcp.tool()
async def debug_next() -> str:
    """Step over — execute one source line without entering function calls."""
    return await _call_proxy("next")


@mcp.tool()
async def debug_step_in() -> str:
    """Step into — execute one source line, entering function calls."""
    return await _call_proxy("step_in")


@mcp.tool()
async def debug_step_out() -> str:
    """Step out — run until the current function returns."""
    return await _call_proxy("step_out")


@mcp.tool()
async def debug_pause() -> str:
    """Interrupt execution and stop all threads."""
    return await _call_proxy("pause")


@mcp.tool()
async def debug_jump(line: int) -> str:
    """Jump execution to a specific line number (no code between current and target is executed)."""
    return await _call_proxy("jump", {"line": line})


@mcp.tool()
async def debug_until(line: int) -> str:
    """Run until the specified line is reached (like a one-shot breakpoint)."""
    return await _call_proxy("until", {"line": line})


# ── Breakpoints ───────────────────────────────────────────────────────────────

@mcp.tool()
async def debug_set_breakpoint(file: str, line: int, condition: str | None = None) -> str:
    """Set a persistent breakpoint at file:line. Optionally add a condition expression."""
    params: dict = {"location": {"path": file, "line": line}}
    if condition:
        params["condition"] = condition
    return await _call_proxy("set_breakpoint", params)


@mcp.tool()
async def debug_set_temp_breakpoint(file: str, line: int) -> str:
    """Set a temporary breakpoint that auto-removes after the first hit."""
    return await _call_proxy("set_temp_breakpoint", {"location": {"path": file, "line": line}})


@mcp.tool()
async def debug_remove_breakpoint(file: str, line: int) -> str:
    """Remove the breakpoint at file:line."""
    return await _call_proxy("remove_breakpoint", {"location": {"path": file, "line": line}})


@mcp.tool()
async def debug_remove_all_breakpoints_in_file(file: str) -> str:
    """Remove all breakpoints in the given source file."""
    return await _call_proxy("remove_all_breakpoints_in_file", {"filePath": file})


@mcp.tool()
async def debug_get_active_breakpoints() -> str:
    """List all currently active breakpoints with their file, line, and condition."""
    return await _call_proxy("get_active_breakpoints")


# ── Stack Navigation ──────────────────────────────────────────────────────────

@mcp.tool()
async def debug_stack_trace() -> str:
    """Get the current call stack frames for the active thread."""
    return await _call_proxy("stack_trace")


@mcp.tool()
async def debug_up() -> str:
    """Move one frame up (toward the caller). Updates variable/expression context."""
    return await _call_proxy("up")


@mcp.tool()
async def debug_down() -> str:
    """Move one frame down (toward the callee)."""
    return await _call_proxy("down")


@mcp.tool()
async def debug_goto_frame(frame_id: int) -> str:
    """Jump to a specific stack frame by its ID (from debug_stack_trace)."""
    return await _call_proxy("goto_frame", {"frameId": frame_id})


# ── Variable Inspection ───────────────────────────────────────────────────────

@mcp.tool()
async def debug_get_variables(frame_id: int | None = None) -> str:
    """Get local variables for the current (or specified) frame."""
    return await _call_proxy("get_variables", _strip_none({"frameId": frame_id}))


@mcp.tool()
async def debug_get_arguments(frame_id: int | None = None) -> str:
    """Get function argument variables for the current (or specified) frame."""
    return await _call_proxy("get_arguments", _strip_none({"frameId": frame_id}))


@mcp.tool()
async def debug_get_globals() -> str:
    """Get global variable values from the debugged process."""
    return await _call_proxy("get_globals")


@mcp.tool()
async def debug_list_all_locals() -> str:
    """Get all locals (variables + arguments) for the current frame as a flat list."""
    return await _call_proxy("list_all_locals")


@mcp.tool()
async def debug_get_scope_preview() -> str:
    """Get a compact scope snapshot (locals + arguments). Efficient for AI context gathering."""
    return await _call_proxy("get_scope_preview")


@mcp.tool()
async def debug_evaluate(expression: str, frame_id: int | None = None) -> str:
    """Evaluate an expression in the current debug context."""
    return await _call_proxy("evaluate", _strip_none({"expression": expression, "frameId": frame_id}))


@mcp.tool()
async def debug_pretty_print(expression: str) -> str:
    """Pretty-print a complex variable (struct/array/pointer) with one level of field expansion."""
    return await _call_proxy("pretty_print", {"expression": expression})


@mcp.tool()
async def debug_whatis(expression: str) -> str:
    """Get the type of a variable or expression."""
    return await _call_proxy("whatis", {"expression": expression})


@mcp.tool()
async def debug_execute_statement(statement: str) -> str:
    """Execute a GDB MI statement or command (e.g., 'info locals', 'info registers')."""
    return await _call_proxy("execute_statement", {"statement": statement})


# ── Source Navigation ─────────────────────────────────────────────────────────

@mcp.tool()
async def debug_list_source(lines_around: int | None = None) -> str:
    """Show source code around the current execution line. lines_around sets context size."""
    return await _call_proxy("list_source", _strip_none({"linesAround": lines_around}))


@mcp.tool()
async def debug_get_source(expression: str) -> str:
    """Get source code for a symbol name or file path."""
    return await _call_proxy("get_source", {"expression": expression})


@mcp.tool()
async def debug_get_last_stop_info() -> str:
    """Get details about the last stop event (breakpoint hit, step, exception, etc.)."""
    return await _call_proxy("get_last_stop_info")


# ── Hardware / Memory ─────────────────────────────────────────────────────────

@mcp.tool()
async def debug_get_registers() -> str:
    """Get CPU register values (rax, rip, rsp, etc.)."""
    return await _call_proxy("get_registers")


@mcp.tool()
async def debug_read_memory(memory_reference: str, count: int) -> str:
    """Read `count` bytes from address `memory_reference` (hex string, e.g. '0x7fff...')."""
    return await _call_proxy("read_memory", {"memoryReference": memory_reference, "count": count})


@mcp.tool()
async def debug_write_memory(address: int, data: str) -> str:
    """Write hex-encoded bytes `data` (e.g. 'deadbeef') to numeric address `address`."""
    return await _call_proxy("write_memory", {"address": address, "data": data})


# ── Multi-Thread Debugging ────────────────────────────────────────────────────

@mcp.tool()
async def debug_list_threads() -> str:
    """List all active threads with their ID, name, state, and current frame."""
    return await _call_proxy("list_threads")


@mcp.tool()
async def debug_switch_thread(thread_id: int) -> str:
    """Switch the active thread context. Subsequent stack/variable queries use this thread."""
    return await _call_proxy("switch_thread", {"threadId": thread_id})


# ── Capabilities ──────────────────────────────────────────────────────────────

@mcp.tool()
async def debug_get_capabilities() -> str:
    """Get the debugger backend's declared capabilities."""
    return await _call_proxy("get_capabilities")


if __name__ == "__main__":
    mcp.run(transport="stdio")
