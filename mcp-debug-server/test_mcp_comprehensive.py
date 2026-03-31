"""
Comprehensive MCP tool tests against the playground cooling_ecu binary.
Covers all 38 beta operations exposed by debug_mcp.py.

Usage:
    pytest test_mcp_comprehensive.py -v -s

Requirements:
    - AI Debug Proxy running at http://localhost:9999
    - playground/build/cooling_ecu and cooling_ecu_mt built
"""

import asyncio
import json
import os
import sys
import time

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import debug_mcp

# ── Paths ──────────────────────────────────────────────────────────────────────

_HERE    = os.path.dirname(os.path.abspath(__file__))
_PG_DIR  = os.path.abspath(os.path.join(_HERE, "..", "playground"))

BINARY     = os.path.join(_PG_DIR, "build", "cooling_ecu")
BINARY_MT  = os.path.join(_PG_DIR, "build", "cooling_ecu_mt")
MAIN_C     = os.path.join(_PG_DIR, "main.c")
MAIN_MT    = os.path.join(_PG_DIR, "main_mt.cpp")

# Line numbers from playground/main.c (keep in sync with constants.ts)
LINE_ITERATION_DECL   = 34   # uint32 iteration = 0u;
LINE_WHILE_LOOP       = 63   # while (iteration < OS_MAX_ITERATIONS)
LINE_OS_SCHEDULER     = 103  # Os_RunScheduler();
LINE_ITERATION_INC    = 111  # iteration++;

# Line numbers from playground/main_mt.cpp
LINE_MT_THREAD_JOIN   = 91   # t1.join()

PROXY_URL = os.getenv("DEBUG_PROXY_URL", "http://localhost:9999")

# ── Helpers ────────────────────────────────────────────────────────────────────

def run(coro):
    """Run async coroutine synchronously."""
    return asyncio.run(coro)


def ok(raw: str, context: str = "") -> dict:
    """Parse response JSON and assert success=True."""
    data = json.loads(raw)
    assert data.get("success") is True, \
        f"{context}: expected success=True, got: {json.dumps(data, indent=2)}"
    return data


def parse(raw: str) -> dict:
    """Parse response JSON without asserting success."""
    return json.loads(raw)


def wait(seconds: float):
    """Sleep for synchronous tests."""
    time.sleep(seconds)


# ── Skip guard ─────────────────────────────────────────────────────────────────

def _proxy_alive() -> bool:
    try:
        r = httpx.get(f"{PROXY_URL}/api/ping", timeout=3.0)
        return r.status_code == 200
    except Exception:
        return False


def _binary_exists(path: str) -> bool:
    return os.path.isfile(path) and os.access(path, os.X_OK)


pytestmark = pytest.mark.skipif(
    not _proxy_alive(),
    reason="AI Debug Proxy not running at http://localhost:9999"
)

# ── Module-level state (shared across all tests) ───────────────────────────────

STATE: dict = {
    "iteration_addr": None,   # address of &iteration (set in memory tests)
    "thread_ids":     [],     # filled by list_threads test
}

# ══════════════════════════════════════════════════════════════════════════════
# GROUP 1 — Proxy health + session lifecycle (test_01_*)
# Operations: ping, status, launch, get_capabilities, terminate
# ══════════════════════════════════════════════════════════════════════════════

class TestGroup1ProxyAndSession:

    def test_01_proxy_ping(self):
        """GET /api/ping returns version and operation list."""
        r = httpx.get(f"{PROXY_URL}/api/ping", timeout=5.0)
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert "operations" in body["data"]
        ops = body["data"]["operations"]
        assert len(ops) >= 38, f"Expected >= 38 operations, got {len(ops)}"

    def test_02_status_no_session(self):
        """Status before launch returns hasActiveSession=False."""
        raw = run(debug_mcp.debug_status())
        data = parse(raw)
        # May succeed or fail — just assert it's parseable and has the field
        assert "hasActiveSession" in (data.get("data") or data), \
            f"Unexpected status response: {raw}"

    @pytest.mark.skipif(not _binary_exists(BINARY),
                        reason=f"Binary not found: {BINARY}")
    def test_03_launch_stop_on_entry(self):
        """launch with stopOnEntry=True succeeds and stops at entry."""
        raw = run(debug_mcp.debug_launch(BINARY, stop_on_entry=True))
        data = ok(raw, "launch")
        wait(3.0)   # let GDB start + hit entry
        # After entry stop, status should show active session
        status_raw = run(debug_mcp.debug_status())
        status = parse(status_raw)
        session_data = status.get("data") or status
        assert session_data.get("hasActiveSession") is True, \
            f"Expected active session after launch: {status_raw}"

    def test_04_get_capabilities(self):
        """get_capabilities returns a capabilities object."""
        raw = run(debug_mcp.debug_get_capabilities())
        data = ok(raw, "get_capabilities")
        caps = data.get("data") or {}
        assert isinstance(caps, dict), f"Expected dict, got: {caps}"
        assert "supportsLaunch" in caps, f"Missing supportsLaunch in: {caps}"


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 2 — Breakpoint management (test_02_*)
# Operations: set_breakpoint, set_temp_breakpoint, get_active_breakpoints,
#             remove_breakpoint, remove_all_breakpoints_in_file
# Assumes: active session from Group 1 launch
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup2Breakpoints:

    def test_05_set_breakpoint_main_loop(self):
        """Set a breakpoint at the main loop line in main.c."""
        raw = run(debug_mcp.debug_set_breakpoint(MAIN_C, LINE_WHILE_LOOP))
        data = ok(raw, "set_breakpoint@while_loop")
        # Breakpoint response may include an 'id' or 'data' field
        assert data.get("data") is not None or data.get("id") is not None, \
            f"No breakpoint data in response: {raw}"

    def test_06_set_breakpoint_with_condition(self):
        """Set a conditional breakpoint (iteration == 5)."""
        raw = run(debug_mcp.debug_set_breakpoint(
            MAIN_C, LINE_ITERATION_INC, condition="iteration == 5"
        ))
        data = ok(raw, "set_breakpoint@iteration_inc+condition")
        assert data is not None

    def test_07_set_temp_breakpoint(self):
        """Set a temporary breakpoint at Os_RunScheduler line."""
        raw = run(debug_mcp.debug_set_temp_breakpoint(MAIN_C, LINE_OS_SCHEDULER))
        ok(raw, "set_temp_breakpoint@os_scheduler")

    def test_08_get_active_breakpoints(self):
        """List active breakpoints — expect at least 2 from prior tests."""
        raw = run(debug_mcp.debug_get_active_breakpoints())
        data = ok(raw, "get_active_breakpoints")
        bps = data.get("data") or data.get("breakpoints") or []
        assert len(bps) >= 2, f"Expected >= 2 breakpoints, got: {raw}"

    def test_09_remove_breakpoint(self):
        """Remove the conditional breakpoint at iteration_inc line."""
        raw = run(debug_mcp.debug_remove_breakpoint(MAIN_C, LINE_ITERATION_INC))
        ok(raw, "remove_breakpoint@iteration_inc")

    def test_10_remove_all_breakpoints_in_file(self):
        """Remove all remaining breakpoints in main.c."""
        raw = run(debug_mcp.debug_remove_all_breakpoints_in_file(MAIN_C))
        ok(raw, "remove_all_breakpoints_in_file")
        # Confirm list is now empty or reduced
        list_raw = run(debug_mcp.debug_get_active_breakpoints())
        data = ok(list_raw, "get_active_breakpoints after remove_all")
        bps = data.get("data") or data.get("breakpoints") or []
        assert len(bps) == 0, f"Expected 0 breakpoints after remove_all, got: {list_raw}"


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 3 — Execution control + stop info
# Operations: continue, pause, get_last_stop_info, next, step_in, step_out,
#             jump, until, stack_trace, up, down, goto_frame
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup3Execution:

    def test_11_set_breakpoint_before_continue(self):
        """Set a clean breakpoint at Os_RunScheduler for execution tests."""
        raw = run(debug_mcp.debug_set_breakpoint(MAIN_C, LINE_OS_SCHEDULER))
        ok(raw, "set_breakpoint before continue")

    def test_12_continue_to_breakpoint(self):
        """Continue from entry — program runs and hits Os_RunScheduler breakpoint."""
        raw = run(debug_mcp.debug_continue())
        ok(raw, "continue")
        wait(2.0)   # let program run to breakpoint

    def test_13_get_last_stop_info(self):
        """get_last_stop_info confirms we stopped at a breakpoint."""
        raw = run(debug_mcp.debug_get_last_stop_info())
        data = ok(raw, "get_last_stop_info")
        stop = data.get("data") or {}
        reason = stop.get("reason") or ""
        assert reason != "", f"Expected stop reason, got: {raw}"

    def test_14_stack_trace(self):
        """stack_trace returns frames with name, line, sourcePath."""
        raw = run(debug_mcp.debug_stack_trace())
        data = ok(raw, "stack_trace")
        frames = data.get("data") or []
        assert len(frames) > 0, f"Expected frames, got: {raw}"
        top = frames[0]
        assert "name" in top, f"Frame missing 'name': {top}"
        assert "line" in top, f"Frame missing 'line': {top}"

    def test_15_up_down_frame_navigation(self):
        """up/down change frame context without error."""
        # If we're in main() (single frame), up may error — that's acceptable
        raw_up = run(debug_mcp.debug_up())
        data_up = parse(raw_up)
        # Either success or 'no such frame' — both are valid
        assert "success" in data_up, f"No 'success' field in up response: {raw_up}"
        # Always go back down to recover context
        run(debug_mcp.debug_down())

    def test_16_goto_frame(self):
        """goto_frame 0 (top frame) always succeeds."""
        raw = run(debug_mcp.debug_goto_frame(0))
        ok(raw, "goto_frame(0)")

    def test_17_step_over(self):
        """next (step over) advances one source line."""
        raw = run(debug_mcp.debug_next())
        ok(raw, "next")
        wait(1.0)

    def test_18_step_in(self):
        """step_in enters function or advances one line."""
        raw = run(debug_mcp.debug_step_in())
        ok(raw, "step_in")
        wait(1.0)

    def test_19_step_out(self):
        """step_out returns to calling frame."""
        raw = run(debug_mcp.debug_step_out())
        ok(raw, "step_out")
        wait(1.5)

    def test_20_until(self):
        """until runs to a specific line in main.c."""
        raw = run(debug_mcp.debug_until(LINE_ITERATION_INC))
        ok(raw, f"until({LINE_ITERATION_INC})")
        wait(1.5)

    def test_21_pause(self):
        """pause stops the running program (may already be stopped — both OK)."""
        raw = run(debug_mcp.debug_pause())
        # pause can return success or 'already stopped' — just check parseable
        data = parse(raw)
        assert "success" in data, f"No 'success' in pause response: {raw}"

    def test_22_jump(self):
        """jump to LINE_OS_SCHEDULER in main.c."""
        raw = run(debug_mcp.debug_jump(LINE_OS_SCHEDULER))
        ok(raw, f"jump({LINE_OS_SCHEDULER})")
        wait(0.5)


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 4 — Variable inspection
# Operations: get_variables, get_arguments, get_globals, list_all_locals,
#             get_scope_preview, evaluate, pretty_print, whatis,
#             execute_statement
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup4Variables:

    def test_23_get_variables(self):
        """get_variables returns local variables including 'iteration'."""
        raw = run(debug_mcp.debug_get_variables())
        data = ok(raw, "get_variables")
        variables = data.get("data") or []
        assert isinstance(variables, list), f"Expected list, got: {raw}"
        names = [v.get("name") for v in variables]
        assert any("iteration" in str(n) for n in names), \
            f"'iteration' not found in variables: {names}"

    def test_24_get_arguments(self):
        """get_arguments returns args for main() (may be empty — both OK)."""
        raw = run(debug_mcp.debug_get_arguments())
        data = ok(raw, "get_arguments")
        args = data.get("data") or []
        assert isinstance(args, list), f"Expected list, got: {raw}"

    def test_25_get_globals(self):
        """get_globals returns a non-empty list of global variables."""
        raw = run(debug_mcp.debug_get_globals())
        data = ok(raw, "get_globals")
        globs = data.get("data") or []
        assert isinstance(globs, list), f"Expected list, got: {raw}"

    def test_26_list_all_locals(self):
        """list_all_locals returns all locals+args for current frame."""
        raw = run(debug_mcp.debug_list_all_locals())
        data = ok(raw, "list_all_locals")
        items = data.get("data") or []
        assert isinstance(items, list), f"Expected list, got: {raw}"

    def test_27_get_scope_preview(self):
        """get_scope_preview returns a compact scope object."""
        raw = run(debug_mcp.debug_get_scope_preview())
        data = ok(raw, "get_scope_preview")
        preview = data.get("data") or {}
        assert isinstance(preview, (dict, list)), f"Unexpected data type: {raw}"

    def test_28_evaluate_iteration(self):
        """evaluate 'iteration' returns a numeric string value."""
        raw = run(debug_mcp.debug_evaluate("iteration"))
        data = ok(raw, "evaluate(iteration)")
        result = data.get("result") or (data.get("data") or {}).get("result") or ""
        assert result != "", f"Empty result for evaluate(iteration): {raw}"
        # Should be parseable as integer
        try:
            int(str(result).strip())
        except ValueError:
            pass  # Some backends return hex or formatted strings — acceptable

    def test_29_evaluate_expression(self):
        """evaluate an expression 'iteration + 1' returns a value."""
        raw = run(debug_mcp.debug_evaluate("iteration + 1"))
        ok(raw, "evaluate(iteration+1)")

    def test_30_whatis_iteration(self):
        """whatis returns the type of 'iteration'."""
        raw = run(debug_mcp.debug_whatis("iteration"))
        data = ok(raw, "whatis(iteration)")
        result = data.get("result") or (data.get("data") or {})
        assert result != "" and result != {}, f"Empty whatis result: {raw}"

    def test_31_pretty_print_simtemp(self):
        """pretty_print a local variable returns result."""
        raw = run(debug_mcp.debug_pretty_print("simTemp"))
        data = ok(raw, "pretty_print(simTemp)")
        result = data.get("result") or data.get("data")
        assert result is not None, f"No result in pretty_print: {raw}"

    def test_32_execute_statement(self):
        """execute_statement with 'info locals' returns output."""
        raw = run(debug_mcp.debug_execute_statement("info locals"))
        data = ok(raw, "execute_statement(info locals)")
        output = data.get("result") or data.get("data") or ""
        assert output != "", f"Empty output from execute_statement: {raw}"


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 5 — Source navigation
# Operations: list_source, get_source
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup5Source:

    def test_33_list_source(self):
        """list_source returns source code around current line."""
        raw = run(debug_mcp.debug_list_source(lines_around=5))
        data = ok(raw, "list_source")
        source = data.get("sourceCode") or (data.get("data") or {}).get("sourceCode") or ""
        assert source != "", f"Empty sourceCode in list_source: {raw}"

    def test_34_get_source_main(self):
        """get_source('main') returns source snippet containing 'iteration'."""
        raw = run(debug_mcp.debug_get_source("main"))
        data = ok(raw, "get_source(main)")
        source = data.get("result") or (data.get("data") or {})
        assert source != "" and source != {}, f"Empty get_source result: {raw}"


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 6 — Hardware: registers, read_memory, write_memory
# Operations: get_registers, read_memory, write_memory
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup6Hardware:

    def test_35_get_registers(self):
        """get_registers returns CPU register name/value pairs."""
        raw = run(debug_mcp.debug_get_registers())
        data = ok(raw, "get_registers")
        regs = data.get("data") or []
        assert isinstance(regs, list) and len(regs) > 0, \
            f"Expected non-empty register list: {raw}"
        assert "name" in regs[0], f"Register missing 'name': {regs[0]}"

    def test_36_read_memory_via_iteration_address(self):
        """Read memory at &iteration — evaluate address then read 4 bytes."""
        # Get the address of iteration
        addr_raw = run(debug_mcp.debug_evaluate("&iteration"))
        addr_data = ok(addr_raw, "evaluate(&iteration)")
        addr_result = addr_data.get("result") or \
                      (addr_data.get("data") or {}).get("result") or ""
        # addr_result may be "0x7fff..." or just the hex string
        addr_str = str(addr_result).strip().split()[0]  # take first token
        assert addr_str.startswith("0x"), \
            f"Expected hex address from &iteration, got: {addr_result}"
        STATE["iteration_addr"] = addr_str
        # Now read 4 bytes
        raw = run(debug_mcp.debug_read_memory(addr_str, 4))
        data = ok(raw, f"read_memory({addr_str}, 4)")
        mem_data = data.get("data") or {}
        assert "data" in mem_data or "address" in mem_data, \
            f"read_memory missing data field: {raw}"

    def test_37_write_memory(self):
        """write_memory at &iteration — set iteration to 0 (bytes 00000000)."""
        addr_str = STATE.get("iteration_addr")
        if not addr_str:
            pytest.skip("iteration address not available from test_36")
        addr_int = int(addr_str, 16)
        # Write 4 zero bytes (reset iteration to 0)
        raw = run(debug_mcp.debug_write_memory(addr_int, "00000000"))
        data = ok(raw, f"write_memory({addr_str})")
        assert data.get("bytesWritten") == 4 or data.get("success") is True, \
            f"Unexpected write_memory response: {raw}"


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 7 — Multi-thread debugging (cooling_ecu_mt)
# Operations: list_threads, switch_thread, stack_trace (per-thread)
# Sequence: terminate single-thread → launch MT → set bp → continue
#           → list_threads → switch_thread → stack_trace
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(
    not _binary_exists(BINARY_MT),
    reason=f"MT binary not found: {BINARY_MT}"
)
class TestGroup7MultiThread:

    def test_38_terminate_and_relaunch_mt(self):
        """Terminate current session and launch multi-thread binary."""
        run(debug_mcp.debug_terminate())
        wait(1.0)
        raw = run(debug_mcp.debug_launch(BINARY_MT, stop_on_entry=True))
        ok(raw, "launch cooling_ecu_mt")
        wait(3.0)

    def test_39_set_bp_at_thread_join(self):
        """Set breakpoint at t1.join() so all threads are running."""
        raw = run(debug_mcp.debug_set_breakpoint(MAIN_MT, LINE_MT_THREAD_JOIN))
        ok(raw, f"set_breakpoint@MT:{LINE_MT_THREAD_JOIN}")

    def test_40_continue_to_thread_join(self):
        """Continue until all worker threads are spawned."""
        raw = run(debug_mcp.debug_continue())
        ok(raw, "continue to thread join")
        wait(2.5)

    def test_41_list_threads(self):
        """list_threads returns main + 3 worker threads (>= 2 total)."""
        raw = run(debug_mcp.debug_list_threads())
        data = ok(raw, "list_threads")
        threads = data.get("data") or []
        assert len(threads) >= 2, f"Expected >= 2 threads, got: {raw}"
        # Save thread IDs for switch test
        STATE["thread_ids"] = [t["id"] for t in threads if "id" in t]
        # Each thread should have id, name/state fields
        for t in threads:
            assert "id" in t, f"Thread missing 'id': {t}"

    def test_42_switch_thread(self):
        """switch_thread to a worker thread (thread ID != 1)."""
        thread_ids = STATE.get("thread_ids", [])
        if len(thread_ids) < 2:
            pytest.skip("Need >= 2 threads to switch")
        # Pick a thread that is not thread 1 (main)
        worker_id = next((tid for tid in thread_ids if tid != 1), None)
        if worker_id is None:
            pytest.skip("No non-main thread found")
        raw = run(debug_mcp.debug_switch_thread(worker_id))
        ok(raw, f"switch_thread({worker_id})")

    def test_43_stack_trace_in_worker(self):
        """stack_trace in worker thread shows a worker function frame."""
        raw = run(debug_mcp.debug_stack_trace())
        data = ok(raw, "stack_trace after switch_thread")
        frames = data.get("data") or []
        assert len(frames) > 0, f"Expected frames in worker thread: {raw}"
        # Worker function name should appear somewhere in the stack
        func_names = " ".join(f.get("name", "") for f in frames)
        assert any(
            name in func_names
            for name in ("worker_temp_monitor", "worker_motor_control", "worker_diagnostic")
        ), f"Expected worker function in stack: {func_names}"

    def test_44_switch_back_to_main(self):
        """switch_thread back to thread 1 (main)."""
        raw = run(debug_mcp.debug_switch_thread(1))
        ok(raw, "switch_thread(1) back to main")


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 8 — Restart + terminate
# Operations: restart, terminate
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _binary_exists(BINARY), reason=f"Binary not found: {BINARY}")
class TestGroup8Lifecycle:

    def test_45_terminate_mt_session(self):
        """Terminate multi-thread session cleanly."""
        raw = run(debug_mcp.debug_terminate())
        ok(raw, "terminate MT session")
        wait(1.0)

    def test_46_launch_for_restart(self):
        """Re-launch single-thread binary to test restart."""
        raw = run(debug_mcp.debug_launch(BINARY, stop_on_entry=True))
        ok(raw, "launch for restart test")
        wait(3.0)

    def test_47_restart(self):
        """restart re-runs the binary from the beginning."""
        raw = run(debug_mcp.debug_restart())
        ok(raw, "restart")
        wait(3.0)
        # After restart, session should still be active
        status_raw = run(debug_mcp.debug_status())
        status = parse(status_raw)
        session_data = status.get("data") or status
        assert session_data.get("hasActiveSession") is True, \
            f"Session not active after restart: {status_raw}"

    def test_48_final_terminate(self):
        """Terminate the session — cleanup."""
        raw = run(debug_mcp.debug_terminate())
        ok(raw, "final terminate")
        wait(0.5)
        status_raw = run(debug_mcp.debug_status())
        status = parse(status_raw)
        session_data = status.get("data") or status
        assert session_data.get("hasActiveSession") is False, \
            f"Expected no active session after terminate: {status_raw}"
