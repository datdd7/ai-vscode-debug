"""
MCP tool unit tests — runs against mock_proxy.py, no VS Code required.

Usage:
    pytest test_mcp_unit.py -v
"""

import asyncio
import json
import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock_proxy
import debug_mcp

MOCK_PORT = 9998
MOCK_URL  = f"http://127.0.0.1:{MOCK_PORT}"


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def start_mock_server():
    """Start mock proxy once for the whole session."""
    mock_proxy.start(MOCK_PORT)
    os.environ["DEBUG_PROXY_URL"] = MOCK_URL
    # Patch debug_mcp module to point at mock
    debug_mcp.PROXY_URL = MOCK_URL
    yield
    mock_proxy.stop()


@pytest.fixture(autouse=True)
def reset_state():
    """Reset mock state before each test."""
    mock_proxy.reset_state()


# ── Helper ────────────────────────────────────────────────────────────────────

def run(coro):
    return asyncio.run(coro)


def ok(raw, ctx: str = "") -> dict:
    d = raw if isinstance(raw, dict) else json.loads(raw)
    assert d.get("success") is True, f"{ctx}: {d}"
    return d


def parse(raw) -> dict:
    return raw if isinstance(raw, dict) else json.loads(raw)


# ── GROUP 1: Proxy health + session ──────────────────────────────────────────

class TestGroup1Session:

    def test_ping_returns_39_operations(self):
        import httpx
        r = httpx.get(f"{MOCK_URL}/api/ping")
        d = r.json()
        assert d["success"] is True
        assert d["data"]["version"] == "3.0.0-b1-mock"
        assert len(d["data"]["operations"]) == 39
        assert "start" in d["data"]["operations"]

    def test_status_before_launch(self):
        raw = run(debug_mcp.debug_status())
        d = parse(raw)
        assert d["data"]["hasActiveSession"] is False

    def test_launch_success(self):
        raw = run(debug_mcp.debug_launch("/playground/build/cooling_ecu", stop_on_entry=True))
        d = ok(raw, "launch")
        assert d["sessionId"] == "mock-session-001"
        assert d["stopReason"] == "entry"

    def test_launch_missing_program(self):
        raw = run(debug_mcp.debug_launch(""))
        d = parse(raw)
        assert d["success"] is False

    def test_status_after_launch(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))
        raw = run(debug_mcp.debug_status())
        d = parse(raw)
        assert d["data"]["hasActiveSession"] is True

    def test_terminate(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))
        raw = run(debug_mcp.debug_terminate())
        ok(raw, "terminate")
        status = parse(run(debug_mcp.debug_status()))
        assert status["data"]["hasActiveSession"] is False

    def test_restart(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))
        raw = run(debug_mcp.debug_restart())
        ok(raw, "restart")

    def test_start(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))
        raw = run(debug_mcp.debug_start())
        ok(raw, "start")

    def test_get_capabilities(self):
        raw = run(debug_mcp.debug_get_capabilities())
        d = ok(raw, "get_capabilities")
        assert d["data"]["supportsLaunch"] is True
        assert "supportsReadMemory" in d["data"]

    def test_attach_missing_process_id_rejected(self):
        raw = run(debug_mcp.debug_attach(0))
        # attach is not supported in mock — should fail
        d = parse(raw)
        assert d["success"] is False


# ── GROUP 2: Execution control ────────────────────────────────────────────────

class TestGroup2Execution:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))

    def test_continue(self):
        ok(run(debug_mcp.debug_continue()), "continue")

    def test_next(self):
        ok(run(debug_mcp.debug_next()), "next")

    def test_step_in(self):
        ok(run(debug_mcp.debug_step_in()), "step_in")

    def test_step_out(self):
        ok(run(debug_mcp.debug_step_out()), "step_out")

    def test_pause(self):
        ok(run(debug_mcp.debug_pause()), "pause")

    def test_jump(self):
        ok(run(debug_mcp.debug_jump(103)), "jump(103)")

    def test_jump_missing_line(self):
        # Call proxy directly with empty params to hit validation
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "jump", "params": {}})
        assert r.json()["success"] is False

    def test_until(self):
        ok(run(debug_mcp.debug_until(111)), "until(111)")

    def test_until_missing_line(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "until", "params": {}})
        assert r.json()["success"] is False


# ── GROUP 3: Breakpoints ──────────────────────────────────────────────────────

MAIN_C = "/playground/main.c"

class TestGroup3Breakpoints:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))
        mock_proxy.reset_state()
        mock_proxy._state["active"] = True

    def test_set_breakpoint(self):
        raw = run(debug_mcp.debug_set_breakpoint(MAIN_C, 103))
        d = ok(raw, "set_breakpoint")
        bp = d["data"]
        assert bp["path"] == MAIN_C
        assert bp["line"] == 103

    def test_set_breakpoint_with_condition(self):
        raw = run(debug_mcp.debug_set_breakpoint(MAIN_C, 63, condition="iteration == 5"))
        d = ok(raw, "set_breakpoint+condition")
        assert d["data"]["condition"] == "iteration == 5"

    def test_set_breakpoint_missing_location(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "set_breakpoint", "params": {}})
        assert r.json()["success"] is False

    def test_set_temp_breakpoint(self):
        raw = run(debug_mcp.debug_set_temp_breakpoint(MAIN_C, 103))
        d = ok(raw, "set_temp_breakpoint")
        assert d["data"]["temp"] is True

    def test_get_active_breakpoints(self):
        raw = run(debug_mcp.debug_get_active_breakpoints())
        d = ok(raw, "get_active_breakpoints")
        assert isinstance(d["data"], list)
        assert len(d["data"]) == 2   # 2 pre-loaded in mock state

    def test_remove_breakpoint(self):
        raw = run(debug_mcp.debug_remove_breakpoint(MAIN_C, 103))
        d = ok(raw, "remove_breakpoint")
        assert d["removed"] == 1
        # Confirm it's gone
        list_raw = run(debug_mcp.debug_get_active_breakpoints())
        remaining = ok(list_raw)["data"]
        assert all(b["line"] != 103 for b in remaining)

    def test_remove_breakpoint_nonexistent(self):
        raw = run(debug_mcp.debug_remove_breakpoint(MAIN_C, 999))
        d = ok(raw, "remove non-existent bp")
        assert d["removed"] == 0

    def test_remove_all_breakpoints_in_file(self):
        raw = run(debug_mcp.debug_remove_all_breakpoints_in_file(MAIN_C))
        ok(raw, "remove_all_breakpoints_in_file")
        list_raw = run(debug_mcp.debug_get_active_breakpoints())
        assert ok(list_raw)["data"] == []

    def test_remove_all_missing_filepath(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "remove_all_breakpoints_in_file", "params": {}})
        assert r.json()["success"] is False


# ── GROUP 4: Stack navigation ─────────────────────────────────────────────────

class TestGroup4Stack:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))

    def test_stack_trace(self):
        raw = run(debug_mcp.debug_stack_trace())
        d = ok(raw, "stack_trace")
        frames = d["data"]
        assert len(frames) == 2
        assert frames[0]["name"] == "main"
        assert frames[0]["line"] == 103

    def test_up(self):
        raw = run(debug_mcp.debug_up())
        d = ok(raw, "up")
        assert d["data"]["id"] == 1

    def test_down_after_up(self):
        run(debug_mcp.debug_up())
        raw = run(debug_mcp.debug_down())
        d = ok(raw, "down")
        assert d["data"]["id"] == 0

    def test_goto_frame_0(self):
        raw = run(debug_mcp.debug_goto_frame(0))
        d = ok(raw, "goto_frame(0)")
        assert d["data"]["id"] == 0

    def test_goto_frame_1(self):
        raw = run(debug_mcp.debug_goto_frame(1))
        d = ok(raw, "goto_frame(1)")
        assert d["data"]["id"] == 1

    def test_goto_frame_missing_id(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "goto_frame", "params": {}})
        assert r.json()["success"] is False


# ── GROUP 5: Variable inspection ──────────────────────────────────────────────

class TestGroup5Variables:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))

    def test_get_variables(self):
        raw = run(debug_mcp.debug_get_variables())
        d = ok(raw, "get_variables")
        names = [v["name"] for v in d["data"]]
        assert "iteration" in names
        assert "simTemp" in names

    def test_get_variables_with_frame_id(self):
        raw = run(debug_mcp.debug_get_variables(frame_id=0))
        ok(raw, "get_variables(frame_id=0)")

    def test_get_arguments(self):
        raw = run(debug_mcp.debug_get_arguments())
        d = ok(raw, "get_arguments")
        assert isinstance(d["data"], list)

    def test_get_globals(self):
        raw = run(debug_mcp.debug_get_globals())
        d = ok(raw, "get_globals")
        assert len(d["data"]) >= 1
        assert d["data"][0]["name"] == "g_shared"

    def test_list_all_locals(self):
        raw = run(debug_mcp.debug_list_all_locals())
        d = ok(raw, "list_all_locals")
        assert len(d["data"]) >= 2

    def test_get_scope_preview(self):
        raw = run(debug_mcp.debug_get_scope_preview())
        d = ok(raw, "get_scope_preview")
        assert "locals" in d["data"]
        assert "args" in d["data"]

    def test_evaluate_iteration(self):
        raw = run(debug_mcp.debug_evaluate("iteration"))
        d = ok(raw, "evaluate(iteration)")
        assert d["result"] == "5"
        assert d["type"] == "uint32"

    def test_evaluate_address_of_iteration(self):
        raw = run(debug_mcp.debug_evaluate("&iteration"))
        d = ok(raw, "evaluate(&iteration)")
        assert d["result"].startswith("0x")

    def test_evaluate_expression(self):
        raw = run(debug_mcp.debug_evaluate("iteration + 1"))
        d = ok(raw, "evaluate(iteration+1)")
        assert d["result"] == "6"

    def test_evaluate_missing_expression(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "evaluate", "params": {}})
        assert r.json()["success"] is False

    def test_pretty_print(self):
        raw = run(debug_mcp.debug_pretty_print("simTemp"))
        d = ok(raw, "pretty_print")
        assert d["result"] == "1500"
        assert "fields" in d

    def test_pretty_print_missing_expression(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "pretty_print", "params": {}})
        assert r.json()["success"] is False

    def test_whatis(self):
        raw = run(debug_mcp.debug_whatis("iteration"))
        d = ok(raw, "whatis")
        assert d["result"] == "uint32"

    def test_whatis_missing_expression(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "whatis", "params": {}})
        assert r.json()["success"] is False

    def test_execute_statement(self):
        raw = run(debug_mcp.debug_execute_statement("info locals"))
        d = ok(raw, "execute_statement")
        assert "iteration" in d["result"]

    def test_execute_statement_missing_stmt(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "execute_statement", "params": {}})
        assert r.json()["success"] is False


# ── GROUP 6: Source navigation ────────────────────────────────────────────────

class TestGroup6Source:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))

    def test_list_source(self):
        raw = run(debug_mcp.debug_list_source())
        d = ok(raw, "list_source")
        assert "Os_RunScheduler" in d["sourceCode"]
        assert d["currentLine"] == 103

    def test_list_source_with_lines_around(self):
        raw = run(debug_mcp.debug_list_source(lines_around=10))
        ok(raw, "list_source(lines_around=10)")

    def test_get_source_main(self):
        raw = run(debug_mcp.debug_get_source("main"))
        d = ok(raw, "get_source(main)")
        assert "main" in d["result"]

    def test_get_source_missing_expression(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "get_source", "params": {}})
        assert r.json()["success"] is False

    def test_get_last_stop_info(self):
        raw = run(debug_mcp.debug_get_last_stop_info())
        d = ok(raw, "get_last_stop_info")
        assert d["data"]["reason"] == "breakpoint-hit"
        assert d["data"]["threadId"] == 1


# ── GROUP 7: Hardware ─────────────────────────────────────────────────────────

class TestGroup7Hardware:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu"))

    def test_get_registers(self):
        raw = run(debug_mcp.debug_get_registers())
        d = ok(raw, "get_registers")
        assert len(d["data"]) == 4
        assert d["data"][0]["name"] == "rax"

    def test_read_memory(self):
        raw = run(debug_mcp.debug_read_memory("0x7fffffffe234", 4))
        d = ok(raw, "read_memory")
        assert d["data"]["address"] == "0x7fffffffe234"
        assert len(d["data"]["data"]) == 8   # 4 bytes → 8 hex chars

    def test_read_memory_missing_params(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "read_memory", "params": {}})
        assert r.json()["success"] is False

    def test_write_memory(self):
        raw = run(debug_mcp.debug_write_memory(0x7fffffffe234, "05000000"))
        d = ok(raw, "write_memory")
        assert d["bytesWritten"] == 4

    def test_write_memory_missing_address(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "write_memory", "params": {}})
        assert r.json()["success"] is False


# ── GROUP 8: Multi-thread ─────────────────────────────────────────────────────

class TestGroup8Threads:

    def setup_method(self):
        run(debug_mcp.debug_launch("/playground/build/cooling_ecu_mt"))

    def test_list_threads(self):
        raw = run(debug_mcp.debug_list_threads())
        d = ok(raw, "list_threads")
        threads = d["data"]
        assert len(threads) == 3
        names = [t["name"] for t in threads]
        assert "main" in names
        assert "worker_temp_monitor" in names

    def test_switch_thread_to_worker(self):
        raw = run(debug_mcp.debug_switch_thread(2))
        d = ok(raw, "switch_thread(2)")
        assert d["threadId"] == 2
        # Frame should reset to 0
        status = parse(run(debug_mcp.debug_status()))
        assert status["data"]["currentFrameId"] == 0

    def test_switch_thread_back_to_main(self):
        run(debug_mcp.debug_switch_thread(2))
        raw = run(debug_mcp.debug_switch_thread(1))
        d = ok(raw, "switch_thread(1)")
        assert d["threadId"] == 1

    def test_switch_thread_missing_id(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "switch_thread", "params": {}})
        assert r.json()["success"] is False

    def test_stack_trace_after_thread_switch(self):
        run(debug_mcp.debug_switch_thread(2))
        raw = run(debug_mcp.debug_stack_trace())
        d = ok(raw, "stack_trace after switch")
        assert len(d["data"]) > 0


# ── GROUP 9: Unknown / error paths ────────────────────────────────────────────

class TestGroup9ErrorPaths:

    def test_unknown_operation(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"operation": "nonexistent_op", "params": {}})
        d = r.json()
        assert d["success"] is False
        assert "nonexistent_op" in d["error"]

    def test_missing_operation_field(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/debug/execute_operation",
                       json={"params": {}})
        assert r.json()["success"] is False

    def test_unknown_get_endpoint(self):
        import httpx
        r = httpx.get(f"{MOCK_URL}/api/nonexistent")
        assert r.json()["success"] is False

    def test_unknown_post_endpoint(self):
        import httpx
        r = httpx.post(f"{MOCK_URL}/api/nonexistent", json={})
        assert r.json()["success"] is False
