# MCP Debug Server

MCP (Model Context Protocol) server for AI Debug Proxy. Allows AI agents (Claude, Gemini, etc.) to debug programs through structured tool calls.

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python debug_mcp.py
```

## Configuration

Set environment variable:
```bash
export DEBUG_PROXY_URL=http://localhost:9999
```

## MCP Config (for AI clients)

```json
{
  "mcpServers": {
    "ai-debug-proxy": {
      "command": "python3",
      "args": ["path/to/mcp-debug-server/debug_mcp.py"],
      "env": { "DEBUG_PROXY_URL": "http://localhost:9999" }
    }
  }
}
```

## Available Tools

### Session
- `debug_launch(program, stop_on_entry)` - Launch debug session
- `debug_terminate()` - Terminate session
- `debug_restart()` - Restart session
- `debug_status()` - Get session status

### Execution
- `debug_continue()` - Continue execution
- `debug_next()` - Step over
- `debug_step_in()` - Step into
- `debug_step_out()` - Step out
- `debug_jump(line)` - Jump to line
- `debug_up()` - Frame up
- `debug_down()` - Frame down

### Breakpoints
- `debug_set_breakpoint(file, line)` - Set breakpoint
- `debug_remove_breakpoint(bp_id)` - Remove breakpoint
- `debug_list_breakpoints()` - List breakpoints

### Inspection
- `debug_stack_trace(thread_id)` - Get stack trace
- `debug_variables(frame_id)` - Get variables
- `debug_evaluate(expression)` - Evaluate expression
- `debug_whatis(expression)` - Get type
- `debug_pretty_print(expression)` - Pretty print
- `debug_registers()` - Get registers
- `debug_scope_preview()` - Get scope preview

## Testing

```bash
pytest tests/
```

## License

MIT
