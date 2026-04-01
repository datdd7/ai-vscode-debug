"""Smoke test for MCP server tools using the playground cooling_ecu binary."""

import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import debug_mcp

_HERE   = os.path.dirname(os.path.abspath(__file__))
TARGET  = os.path.abspath(os.path.join(_HERE, "../playground/build/cooling_ecu"))
MAIN_C  = os.path.abspath(os.path.join(_HERE, "../playground/main.c"))

LINE_OS_SCHEDULER = 103   # Os_RunScheduler() in main.c


async def run_test():
    print("Running MCP Server playground smoke test...")

    print("\n1. Status...")
    print(json.loads(await debug_mcp.debug_status()))

    print(f"\n2. Launching: {TARGET}")
    res = json.loads(await debug_mcp.debug_launch(TARGET, stop_on_entry=True))
    print("Launch:", res)
    if not res.get("success"):
        print("Launch failed — is the proxy running?")
        return
    await asyncio.sleep(3.0)

    print(f"\n3. Breakpoint at main.c:{LINE_OS_SCHEDULER}...")
    print(json.loads(await debug_mcp.debug_set_breakpoint(MAIN_C, LINE_OS_SCHEDULER)))

    print("\n4. Continue to breakpoint...")
    print(json.loads(await debug_mcp.debug_continue()))
    await asyncio.sleep(2.0)

    print("\n5. Stack trace...")
    print(json.loads(await debug_mcp.debug_stack_trace()))

    print("\n6. Variables...")
    print(json.loads(await debug_mcp.debug_get_variables(0)))

    print("\n7. Evaluate 'iteration'...")
    print(json.loads(await debug_mcp.debug_evaluate("iteration")))

    print("\n8. Scope preview...")
    print(json.loads(await debug_mcp.debug_get_scope_preview()))

    print("\n9. Terminate...")
    print(json.loads(await debug_mcp.debug_terminate()))

    print("\n✓ Playground smoke test complete.")


if __name__ == "__main__":
    asyncio.run(run_test())
