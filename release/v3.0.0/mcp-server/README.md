# MCP Debug Server

MCP (Model Context Protocol) server for AI Debug Proxy v3.0.0. Exposes all 38 debug operations as MCP tools for AI agents (Claude Code, LangChain, etc.).

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python debug_mcp.py
```

## Configuration

```bash
export DEBUG_PROXY_URL=http://localhost:9999  # default
```

## MCP Client Config

Add to your MCP client config (e.g. `~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ai-debug-proxy": {
      "command": "python3",
      "args": ["/path/to/mcp-debug-server/debug_mcp.py"],
      "env": { "DEBUG_PROXY_URL": "http://localhost:9999" }
    }
  }
}
```

## Available Tools (38)

### Session

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_launch` | `(program, stop_on_entry=False, env=None)` | Launch debug session for a binary |
| `debug_attach` | `(process_id)` | Attach to a running process by PID |
| `debug_terminate` | `()` | Terminate the current debug session |
| `debug_restart` | `()` | Restart the current debug session |
| `debug_start` | `()` | Start execution after launch (`-exec-run`) |
| `debug_status` | `()` | Get current session status |

### Execution

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_continue` | `()` | Resume until next breakpoint |
| `debug_next` | `()` | Step over (one source line) |
| `debug_step_in` | `()` | Step into function calls |
| `debug_step_out` | `()` | Step out of current function |
| `debug_pause` | `()` | Interrupt execution |
| `debug_jump` | `(line)` | Jump to line (no code between runs) |
| `debug_until` | `(line)` | Run until line (one-shot breakpoint) |

### Frame Navigation

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_stack_trace` | `()` | Get current call stack frames |
| `debug_up` | `()` | Move one frame up (toward caller) |
| `debug_down` | `()` | Move one frame down (toward callee) |
| `debug_goto_frame` | `(frame_id)` | Jump to specific frame by ID |

### Breakpoints

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_set_breakpoint` | `(file, line, condition=None)` | Set persistent breakpoint |
| `debug_set_temp_breakpoint` | `(file, line)` | Set one-shot breakpoint |
| `debug_remove_breakpoint` | `(file, line)` | Remove breakpoint at location |
| `debug_remove_all_breakpoints_in_file` | `(file)` | Remove all breakpoints in a file |
| `debug_get_active_breakpoints` | `()` | List all active breakpoints |

### Inspection

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_get_variables` | `(frame_id=None)` | Get local variables for frame |
| `debug_get_arguments` | `(frame_id=None)` | Get function arguments for frame |
| `debug_get_globals` | `()` | Get global variables |
| `debug_list_all_locals` | `()` | Get locals + args as flat list |
| `debug_get_scope_preview` | `()` | Compact scope snapshot (AI-efficient) |
| `debug_evaluate` | `(expression, frame_id=None)` | Evaluate expression |
| `debug_pretty_print` | `(expression)` | Expand struct/array/pointer |
| `debug_whatis` | `(expression)` | Get type of expression |
| `debug_execute_statement` | `(statement)` | Execute raw GDB MI command |
| `debug_list_source` | `(lines_around=None, frame_id=None)` | Show source around current line |
| `debug_get_source` | `(expression)` | Get source for symbol or file |
| `debug_get_last_stop_info` | `()` | Details of last stop event |

### Hardware

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_get_registers` | `()` | Get CPU register values |
| `debug_read_memory` | `(memory_reference, count)` | Read bytes from address (hex string) |
| `debug_write_memory` | `(address, data)` | Write hex bytes to address |

### Threading

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_list_threads` | `()` | List all active threads |
| `debug_switch_thread` | `(thread_id)` | Switch active thread context |

### Info

| Tool | Signature | Description |
| --- | --- | --- |
| `debug_get_capabilities` | `()` | Get backend capabilities |

## Testing

```bash
pytest test_mcp_unit.py -v    # 69 unit tests (mock proxy)
pytest test_mcp.py            # integration tests (requires proxy + GDB)
```

## License

MIT
