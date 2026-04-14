# AI VSCode Debug — AI-First Debugging Platform

**Version:** 3.0.0  
**License:** MIT  
**Status:** Stable Release

[![CI](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/ci.yml/badge.svg)](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/ci.yml)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://marketplace.visualstudio.com/items?itemName=ai-debug-proxy)
[![API Status](https://img.shields.io/badge/API-Stable-green)](docs/guides/api-reference.md)
[![AI Ready](https://img.shields.io/badge/AI-Ready-purple)](docs/guides/ai-agent-technical-guide.md)

---

## Overview

**AI VSCode Debug** is an **AI-First debugging platform** that enables LLM agents (Claude Code, Cursor, Cline, etc.) to control a GDB debugger programmatically via HTTP REST APIs — without requiring a human at the keyboard.

Unlike traditional debuggers designed for human interaction, this platform is specifically architected for **autonomous AI debugging workflows**.

### Key Features

- **AI-Native REST API** — 38 debug operations over HTTP, JSON in/out, stateless calls
- **GDB/MI2 backend** — direct GDB integration via MI2 protocol, no VS Code DAP dependency
- **MCP Server** — exposes all 38 operations as MCP tools for Claude, LangChain, and other AI frameworks
- **VS Code integration** — full DAP support for use within VS Code debugger UI
- **Shell CLI** — `ai-debug.sh` helper library for shell-based AI agents
- **Security** — path sanitization, memory read limits, CORS restriction to localhost

---

## Quick Start

### 1. Install the VS Code Extension

```bash
# Build from source
cd ai-debug-proxy
npm install
npm run compile
npm run package
code --install-extension ai-debug-proxy-3.0.0.vsix --force

# Reload VS Code window
# Command Palette → Developer: Reload Window
```

### 2. Verify the Proxy is Running

```bash
curl http://localhost:9999/api/ping
```

Expected response:

```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "3.0.0",
    "operationCount": 38,
    "operations": ["launch", "continue", "next", "step_in", ...]
  }
}
```

### 3. Launch a Debug Session

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/path/to/binary",
      "stopOnEntry": true
    }
  }'
```

### 4. AI Agent Integration

**Python:**

```python
import requests

BASE = "http://localhost:9999/api/debug"

# Launch
requests.post(BASE, json={"operation": "launch",
    "params": {"program": "./build/app", "stopOnEntry": True}})

# Set breakpoint
requests.post(BASE, json={"operation": "set_breakpoint",
    "params": {"location": {"path": "main.c", "line": 42}}})

# Continue to breakpoint
requests.post(BASE, json={"operation": "continue"})

# Inspect state
stack = requests.post(BASE, json={"operation": "stack_trace"}).json()
variables = requests.post(BASE, json={"operation": "get_variables"}).json()

# Evaluate expression
result = requests.post(BASE, json={"operation": "evaluate",
    "params": {"expression": "my_struct->field"}}).json()
```

**Shell CLI:**

```bash
source ai-debug-proxy/resources/ai-debug.sh

ai_launch "./build/app"        # Start session, stop at entry
ai_bp "main.c" 42              # Set breakpoint
ai_continue                    # Resume
ai_stack                       # Print call stack
ai_vars                        # Print local variables
ai_eval "my_variable"          # Evaluate expression
ai_quit                        # End session
```

**MCP Server (Claude, LangChain, etc.):**

```bash
cd mcp-debug-server
pip install -r requirements.txt
python debug_mcp.py            # Starts MCP server on stdio
```

Configure in Claude Code or any MCP-compatible client — all 38 operations are available as MCP tools.

---

## Architecture

```text
┌─────────────────────────────┐
│  AI Agent / LLM / MCP Tool  │
└──────────────┬──────────────┘
               │ HTTP REST (localhost:9999)
               ▼
┌──────────────────────────────────────────┐
│  ai-debug-proxy  (VS Code Extension)     │
│                                          │
│  HttpServer → Router → Validation        │
│                   │                      │
│              BackendManager              │
│                   │                      │
│             GDBBackend (MI2)             │
└──────────────────┬───────────────────────┘
                   │ GDB/MI2 protocol
                   ▼
            ┌──────────────┐
            │  GDB process │
            └──────────────┘
```

### Components

| Component | Description |
| --- | --- |
| `ai-debug-proxy/` | VS Code extension — HTTP server + GDB/MI2 backend |
| `mcp-debug-server/` | Python MCP server exposing all 38 ops as MCP tools |
| `playground/` | AUTOSAR-style C project with 10 intentional bugs for AI training |
| `infrastructure/dashboard/` | CI/CD status dashboard (Vite + TypeScript) |

---

## Supported Operations (38)

| Group | Operations |
| --- | --- |
| Session | `launch` `attach` `terminate` `restart` `start` |
| Execution | `continue` `next` `step_in` `step_out` `pause` `jump` `until` |
| Frame | `up` `down` `goto_frame` |
| Breakpoints | `set_breakpoint` `set_temp_breakpoint` `remove_breakpoint` `remove_all_breakpoints_in_file` `get_active_breakpoints` |
| Inspection | `stack_trace` `get_variables` `get_arguments` `get_globals` `evaluate` `pretty_print` `whatis` `execute_statement` `list_all_locals` `get_scope_preview` `list_source` `get_source` |
| Hardware | `get_registers` `read_memory` `write_memory` |
| Threading | `list_threads` `switch_thread` |
| Info | `get_last_stop_info` `get_capabilities` |

---

## Documentation

### For New Users

| Document | Description |
|----------|-------------|
| [Getting Started](docs/guides/getting-started.md) | Installation and first debug session |
| [CLI Debug Guide](docs/guides/cli-debug-guide.md) | Shell CLI reference (`ai-debug.sh`) |
| [WSL2 Setup](docs/guides/wsl2-setup.md) | WSL2-specific configuration |
| [Troubleshooting](docs/guides/troubleshooting.md) | Common issues and solutions |

### For AI Agent Developers

| Document | Description |
|----------|-------------|
| [AI Agent Technical Guide](docs/guides/ai-agent-technical-guide.md) | Complete integration guide for LLMs |
| [API Reference](docs/guides/api-reference.md) | All 38 HTTP endpoints with examples |
| [Prompt Templates](docs/ai/prompt-templates.md) | Pre-built prompts for debugging tasks |
| [LLM Integration Examples](docs/ai/llm-integration-examples.md) | Code examples for major AI frameworks |

### Architecture & Development

| Document | Description |
|----------|-------------|
| [Architecture](docs/arch/01-architecture.md) | System design, layers, and decisions |
| [Coding Guidelines](docs/guidelines/CODING_GUIDELINES.md) | Coding standards and conventions |
| [Changelog](ai-debug-proxy/CHANGELOG.md) | Version history |

---

## Development

### Build from Source

```bash
cd ai-debug-proxy
npm install
npm run lint          # TypeScript type check
npm test              # Unit tests (541 tests, 100% coverage)
npm run compile       # Bundle with esbuild → out/extension.js
npm run package       # Package → ai-debug-proxy-3.0.0.vsix
```

### Run Tests

```bash
cd ai-debug-proxy
npm test                # Unit tests (vitest)
npm run test:coverage   # With coverage report
npm run test:e2e        # E2E tests (requires VS Code + GDB)
```

E2E results (v3.0.0 stable): **72/73 PASS** — see [test execution report](docs/release/v3/e2e-test-execution-report-stable-v1.md).

---

## Requirements

| Component | Version |
|-----------|---------|
| VS Code | 1.88+ |
| Node.js | 18+ |
| GDB | 9+ (Linux/macOS) |
| Python | 3.11+ (MCP server only) |
| OS | Linux, macOS, Windows (WSL2 supported) |

---

## Training with Playground

The `playground/` project contains 10 intentional bugs for AI debugging training:

```bash
cd playground
make clean && make    # Build with debug symbols

# Launch debug session against the playground binary
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"launch","params":{"program":"'"$(pwd)"'/build/cooling_ecu","stopOnEntry":true}}'
```

| Bug | Category | File |
|-----|----------|------|
| 1 | Ring Buffer Overflow | `utils/Utils_RingBuffer.c` |
| 2 | Uninitialized Filter | `utils/Utils_Filter.c` |
| 3 | Integer Overflow | `app/SWC_MotorControl.c` |
| 4 | Null Pointer (Read-Before-Write) | `services/NvM.c` |
| 5 | FSM Logic Error | `app/SWC_MotorControl.c` |
| 6 | Wrong CRC Polynomial | `utils/Utils_Crc.c` |
| 7 | Race Condition | Multiple files |
| 8 | Wrong ADC Channel | `ecual/IoHwAb_Adc.c` |
| 9 | Stack Overflow (Recursion) | `services/Det.c` |
| 10 | Use-After-Free | `services/CanIf.c` |

See [Debugging Guide](docs/guides/debugging-guide.md) for detailed scenarios.

---

## License

MIT License — see LICENSE file for details.

---

## Links

- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [GDB/MI Interface](https://sourceware.org/gdb/current/onlinedocs/gdb/GDB_002fMI.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Issues](https://github.com/datdang-dev/ai-vscode-debug/issues)
