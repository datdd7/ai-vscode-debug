"""Basic smoke test for MCP server tools using the local test_target binary."""

import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import debug_mcp

TARGET = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_target"))


async def run_test():
    print("Running MCP Server smoke test...")

    print("\n1. Checking proxy status...")
    status = await debug_mcp.debug_status()
    print("Status:", json.loads(status))

    print(f"\n2. Launching target: {TARGET}")
    launch_res = await debug_mcp.debug_launch(TARGET, stop_on_entry=True)
    res = json.loads(launch_res)
    print("Launch:", res)
    if not res.get("success"):
        print("Launch failed — is the proxy running?")
        return

    await asyncio.sleep(2.0)

    print("\n3. Setting breakpoint at test_target.c:6...")
    bp_res = await debug_mcp.debug_set_breakpoint("test_target.c", 6)
    print("Breakpoint:", json.loads(bp_res))

    print("\n4. Continuing execution...")
    cont_res = await debug_mcp.debug_continue()
    print("Continue:", json.loads(cont_res))
    await asyncio.sleep(1.0)

    print("\n5. Stack trace...")
    stack_res = await debug_mcp.debug_stack_trace()
    print("Stack:", json.loads(stack_res))

    print("\n6. Variables...")
    vars_res = await debug_mcp.debug_get_variables()
    print("Variables:", json.loads(vars_res))

    print("\n7. Terminating...")
    term_res = await debug_mcp.debug_terminate()
    print("Terminate:", json.loads(term_res))

    print("\n✓ Smoke test complete.")


if __name__ == "__main__":
    asyncio.run(run_test())
