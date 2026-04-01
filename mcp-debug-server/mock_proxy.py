#!/usr/bin/env python3
"""
Mock AI Debug Proxy — simulates the v3 REST API for unit testing MCP tools.

Usage:
    python3 mock_proxy.py          # runs on port 9998
    python3 mock_proxy.py 9997     # custom port
"""

import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if __name__ == "__main__" and len(sys.argv) > 1 else 9998

# ── Canned responses for each operation ───────────────────────────────────────

_CAPABILITIES = {
    "supportsLaunch": True, "supportsAttach": False,
    "supportsTerminate": True, "supportsReadMemory": True,
    "supportsWriteMemory": True,
}

_FRAMES = [
    {"id": 0, "name": "main",       "sourcePath": "/playground/main.c", "line": 103, "column": 0},
    {"id": 1, "name": "EcuM_Init",  "sourcePath": "/playground/services/EcuM.c", "line": 42, "column": 0},
]

_VARIABLES = [
    {"name": "iteration", "value": "5",    "type": "uint32"},
    {"name": "simTemp",   "value": "1500", "type": "uint16"},
]

_THREADS = [
    {"id": 1, "name": "main",              "state": "stopped", "frame": {"func": "main", "line": 91}},
    {"id": 2, "name": "worker_temp_monitor","state": "stopped", "frame": {"func": "worker_temp_monitor", "line": 37}},
    {"id": 3, "name": "worker_motor_control","state": "stopped","frame": {"func": "worker_motor_control", "line": 51}},
]

_STOP_INFO = {
    "reason": "breakpoint-hit", "threadId": 1,
    "allThreadsStopped": True, "bkptno": "1",
    "frame": {"func": "main", "file": "main.c", "line": "103"},
}

_BREAKPOINTS = [
    {"id": 1, "path": "/playground/main.c", "line": 103, "enabled": True, "condition": None},
    {"id": 2, "path": "/playground/main.c", "line": 63,  "enabled": True, "condition": None},
]

_REGISTERS = [
    {"name": "rax", "value": "0x0000000000000000"},
    {"name": "rbx", "value": "0x00007ffff7ffe2e0"},
    {"name": "rip", "value": "0x0000555555555195"},
    {"name": "rsp", "value": "0x00007fffffffe240"},
]

# Mutable state
_state = {
    "active":      False,
    "breakpoints": list(_BREAKPOINTS),
    "threads":     list(_THREADS),
    "current_thread": 1,
    "current_frame":  0,
    "iteration":   5,
}


def _ok(data: dict | list | None = None, **extra) -> dict:
    r = {"success": True, "timestamp": "2026-03-30T00:00:00.000Z"}
    if data is not None:
        r["data"] = data
    r.update(extra)
    return r


def _fail(msg: str) -> dict:
    return {"success": False, "error": msg, "timestamp": "2026-03-30T00:00:00.000Z"}


def _handle_operation(op: str, params: dict) -> dict:
    s = _state

    # Session
    if op == "launch":
        if not params.get("program"):
            return _fail("'launch' requires 'program'")
        s["active"] = True
        return _ok(sessionId="mock-session-001", stopReason="entry")

    if op == "attach":
        if not isinstance(params.get("processId"), int):
            return _fail("'attach' requires 'processId' (number)")
        return _fail("attach not supported in mock")

    if op == "terminate":
        s["active"] = False
        return _ok()

    if op == "restart":
        s["iteration"] = 0
        return _ok()

    if op == "start":
        return _ok()

    # Execution
    if op in ("continue", "next", "step_in", "step_out", "pause"):
        return _ok()

    if op == "jump":
        if "line" not in params:
            return _fail("'jump' requires 'line'")
        return _ok()

    if op == "until":
        if "line" not in params:
            return _fail("'until' requires 'line'")
        return _ok()

    # Breakpoints
    if op == "set_breakpoint":
        loc = params.get("location", {})
        if not loc.get("path") or not loc.get("line"):
            return _fail("'set_breakpoint' requires 'location.path' and 'location.line'")
        bp = {"id": len(s["breakpoints"]) + 1, "path": loc["path"],
              "line": loc["line"], "enabled": True,
              "condition": params.get("condition")}
        s["breakpoints"].append(bp)
        return _ok(bp)

    if op == "set_temp_breakpoint":
        loc = params.get("location", {})
        if not loc.get("path") or not loc.get("line"):
            return _fail("'set_temp_breakpoint' requires 'location.path' and 'location.line'")
        return _ok({"id": 99, "path": loc["path"], "line": loc["line"], "temp": True})

    if op == "remove_breakpoint":
        loc = params.get("location", {})
        before = len(s["breakpoints"])
        s["breakpoints"] = [b for b in s["breakpoints"]
                            if not (b["path"] == loc.get("path") and b["line"] == loc.get("line"))]
        return _ok(removed=before - len(s["breakpoints"]))

    if op == "remove_all_breakpoints_in_file":
        fp = params.get("filePath")
        if not fp:
            return _fail("'remove_all_breakpoints_in_file' requires 'filePath'")
        before = len(s["breakpoints"])
        s["breakpoints"] = [b for b in s["breakpoints"] if b["path"] != fp]
        return _ok(removed=before - len(s["breakpoints"]))

    if op == "get_active_breakpoints":
        return _ok(s["breakpoints"])

    # Stack
    if op == "stack_trace":
        return _ok(_FRAMES, totalFrames=len(_FRAMES))

    if op in ("up", "frame_up"):
        s["current_frame"] = min(s["current_frame"] + 1, len(_FRAMES) - 1)
        return _ok(_FRAMES[s["current_frame"]])

    if op in ("down", "frame_down"):
        s["current_frame"] = max(s["current_frame"] - 1, 0)
        return _ok(_FRAMES[s["current_frame"]])

    if op == "goto_frame":
        fid = params.get("frameId")
        if fid is None:
            return _fail("'goto_frame' requires 'frameId'")
        s["current_frame"] = int(fid)
        return _ok(_FRAMES[min(int(fid), len(_FRAMES) - 1)])

    # Variables
    if op == "get_variables":
        return _ok(_VARIABLES)

    if op == "get_arguments":
        return _ok([])

    if op == "get_globals":
        return _ok([{"name": "g_shared", "value": "42", "type": "int"}])

    if op == "list_all_locals":
        return _ok(_VARIABLES)

    if op == "get_scope_preview":
        return _ok({"locals": _VARIABLES, "args": []})

    if op == "evaluate":
        expr = params.get("expression", "")
        if not expr:
            return _fail("'evaluate' requires 'expression'")
        if expr == "&iteration":
            return _ok(result="0x7fffffffe234", type="uint32 *")
        if expr == "iteration":
            return _ok(result=str(s["iteration"]), type="uint32")
        if expr == "iteration + 1":
            return _ok(result=str(s["iteration"] + 1), type="int")
        return _ok(result="0", type="int")

    if op == "pretty_print":
        expr = params.get("expression", "")
        if not expr:
            return _fail("'pretty_print' requires 'expression'")
        return _ok(result="1500", type="uint16", fields=[])

    if op == "whatis":
        expr = params.get("expression", "")
        if not expr:
            return _fail("'whatis' requires 'expression'")
        return _ok(result="uint32")

    if op == "execute_statement":
        stmt = params.get("statement", "")
        if not stmt:
            return _fail("'execute_statement' requires 'statement'")
        return _ok(result="iteration = 5\nsimTemp = 1500\n")

    # Source
    if op == "list_source":
        src = "  101:     Os_RunTime_Tick();\n  102:     Wdg_MainFunction();\n> 103:     Os_RunScheduler();\n  104:     Gpt_Sim_Tick();\n  105:     iteration++;\n"
        return _ok(sourceCode=src, currentLine=103)

    if op == "get_source":
        expr = params.get("expression", "")
        if not expr:
            return _fail("'get_source' requires 'expression'")
        return _ok(result=f"/* source of {expr} */\nvoid {expr}(void) {{ return; }}")

    if op == "get_last_stop_info":
        return _ok(_STOP_INFO)

    # Hardware
    if op == "get_registers":
        return _ok(_REGISTERS)

    if op == "read_memory":
        ref = params.get("memoryReference", "")
        cnt = params.get("count", 0)
        if not ref or not cnt:
            return _fail("'read_memory' requires 'memoryReference' and 'count'")
        data_hex = "05000000"[:cnt * 2].ljust(cnt * 2, "0")
        return _ok({"address": ref, "data": data_hex})

    if op == "write_memory":
        addr = params.get("address")
        if addr is None:
            return _fail("'write_memory' requires 'address'")
        data_hex = params.get("data", "")
        bytes_written = len(data_hex) // 2
        return _ok(address=hex(addr), bytesWritten=bytes_written)

    # Threads
    if op == "list_threads":
        return _ok(s["threads"])

    if op == "switch_thread":
        tid = params.get("threadId")
        if tid is None:
            return _fail("'switch_thread' requires 'threadId'")
        s["current_thread"] = tid
        s["current_frame"] = 0
        return _ok(threadId=tid)

    # Meta
    if op == "get_capabilities":
        return _ok(_CAPABILITIES)

    return _fail(f"Unknown operation: '{op}'")


# ── HTTP Handler ───────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # suppress default access log

    def _send(self, body: dict, status: int = 200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/ping":
            ops = [
                "launch","attach","terminate","restart","start","continue","next","step_in",
                "step_out","pause","jump","until","set_breakpoint","set_temp_breakpoint",
                "remove_breakpoint","remove_all_breakpoints_in_file","get_active_breakpoints",
                "stack_trace","up","down","goto_frame","get_variables","get_arguments",
                "get_globals","list_all_locals","get_scope_preview","evaluate","pretty_print",
                "whatis","execute_statement","list_source","get_source","get_last_stop_info",
                "get_registers","read_memory","write_memory","list_threads","switch_thread",
                "get_capabilities",
            ]
            self._send({"success": True, "data": {"message": "pong", "version": "3.0.0-b1-mock", "operations": ops}})
        elif path in ("/api/debug/status", "/api/status"):
            self._send({"success": True, "data": {
                "hasActiveSession": _state["active"],
                "sessionId": "mock-session-001" if _state["active"] else None,
                "currentThreadId": _state["current_thread"],
                "currentFrameId":  _state["current_frame"],
            }})
        else:
            self._send({"success": False, "error": f"Not found: GET {path}"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")

        if path not in ("/api/debug/execute_operation", "/api/debug"):
            self._send({"success": False, "error": f"Not found: POST {path}"}, 404)
            return

        op     = body.get("operation", "")
        params = body.get("params", {}) or {}

        if not op:
            self._send({"success": False, "error": "Missing 'operation' field"}, 400)
            return

        result = _handle_operation(op, params)
        status = 200 if result.get("success") else 400
        self._send(result, status)


# ── Server lifecycle ───────────────────────────────────────────────────────────

_server: HTTPServer | None = None


def start(port: int = PORT) -> HTTPServer:
    """Start the mock server in a background thread. Returns the server instance."""
    global _server
    _server = HTTPServer(("127.0.0.1", port), Handler)
    t = threading.Thread(target=_server.serve_forever, daemon=True)
    t.start()
    return _server


def stop():
    """Stop the mock server."""
    if _server:
        _server.shutdown()


def reset_state():
    """Reset mutable state between test runs."""
    _state["active"] = False
    _state["breakpoints"] = list(_BREAKPOINTS)
    _state["threads"] = list(_THREADS)
    _state["current_thread"] = 1
    _state["current_frame"] = 0
    _state["iteration"] = 5


if __name__ == "__main__":
    print(f"Mock AI Debug Proxy v3 running on http://127.0.0.1:{PORT}")
    print("Press Ctrl+C to stop.")
    srv = HTTPServer(("127.0.0.1", PORT), Handler)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
