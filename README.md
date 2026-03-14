# AI VSCode Debug - AI-First Debugging Platform

**Version:** 1.0.0
**License:** MIT
**Status:** Stable Release

[![Quality Check](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/quality-check.yml/badge.svg)](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/quality-check.yml)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://marketplace.visualstudio.com/items?itemName=ai-debug-proxy)
[![API Status](https://img.shields.io/badge/API-Stable-green)](docs/guides/api-reference.md)
[![AI Ready](https://img.shields.io/badge/AI-Ready-purple)](docs/guides/ai-agent-technical-guide.md)

---

## 🎯 Overview

**AI VSCode Debug** is an **AI-First debugging platform** that enables LLM agents (Claude Code, Cursor, Cline, etc.) to control VS Code debugging programmatically via HTTP REST APIs.

Unlike traditional debuggers designed for human interaction, this platform is specifically architected for **autonomous AI debugging workflows**.

### Key Features

- 🤖 **AI-Native API**: RESTful HTTP interface designed for LLM agent consumption
- 🔌 **VS Code Integration**: Full DAP (Debug Adapter Protocol) support
- 📡 **Remote Debugging**: Debug WSL2, remote containers, embedded targets
- 🔄 **Batch Operations**: Execute multiple debug operations in parallel
- 🧠 **LSP Code Intelligence**: Symbol search, references, call hierarchy
- 🛡️ **Security**: User approval for destructive operations
- 📊 **Subagent Orchestration**: Spawn concurrent CLI tasks

---

## 🚀 Quick Start

### 1. Install Extension

```bash
# Download and install .vsix
code --install-extension ai-debug-proxy-0.1.2.vsix --force

# Reload VS Code window
# Command Palette → Developer: Reload Window
```

### 2. Verify Proxy is Running

```bash
curl http://localhost:9999/api/ping
```

Expected response:

```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "0.1.2-beta",
    "operations": ["launch", "continue", "next", "step_in", ...]
  }
}
```

### 3. Launch Debug Session

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

# Launch
requests.post("http://localhost:9999/api/debug", json={
    "operation": "launch",
    "params": {"program": "./build/app", "stopOnEntry": True}
})

# Set breakpoint
requests.post("http://localhost:9999/api/debug", json={
    "operation": "set_breakpoint",
    "params": {"location": {"path": "main.c", "line": 42}}
})

# Continue
requests.post("http://localhost:9999/api/debug", json={
    "operation": "continue"
})

# Inspect state
stack = requests.post("http://localhost:9999/api/debug", json={
    "operation": "stack_trace"
}).json()

# Evaluate
result = requests.post("http://localhost:9999/api/debug", json={
    "operation": "evaluate",
    "params": {"expression": "my_variable"}
}).json()
```

**CLI:**

```bash
# Source the helper library
source ai-debug-proxy/resources/ai-debug.sh

# Debug commands
ai_launch "./build/app"
ai_bp "main.c" 42
ai_continue
ai_stack
ai_eval "my_variable"
ai_quit
```

---

## 📚 Documentation

### For AI Agents

| Document | Description |
|----------|-------------|
| **[AI Agent Technical Guide](docs/guides/ai-agent-technical-guide.md)** | Complete API reference for LLM agents |
| **[CLI Debug Guide](docs/guides/cli-debug-guide.md)** | Shell scripts and CLI workflows |
| **[API Reference](docs/guides/api-reference.md)** | All 33 HTTP endpoints |
| **[Prompt Templates](docs/ai/prompt-templates.md)** | Pre-built prompts for debugging tasks |

### For Developers

| Document | Description |
|----------|-------------|
| **[Getting Started](docs/guides/getting-started.md)** | Installation and first debug session |
| **[Architecture](docs/arch/architecture.md)** | System design and module documentation |
| **[Troubleshooting](docs/guides/troubleshooting.md)** | Common issues and solutions |
| **[WSL2 Setup](docs/guides/wsl2-setup.md)** | WSL2 debugging configuration |
| **[Contributing](docs/contributing.md)** | How to contribute to the project |
| **[Coding Guidelines](docs/guidelines/CODING_GUIDELINES.md)** | Coding standards |

---

## 🏗️ Architecture

```
┌─────────────────┐
│   AI Agent      │
│   (LLM/CLI)     │
└────────┬────────┘
         │ HTTP REST
         │ localhost:9999
         ▼
┌─────────────────────────────────┐
│  AI Debug Proxy (VS Code Ext)   │
│  ┌───────────────────────────┐  │
│  │  HTTP Server              │  │
│  │  - Router                 │  │
│  │  - Validation             │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  DebugController          │  │
│  │  - 33 Debug Operations    │  │
│  │  - Session Management     │  │
│  │  - Breakpoint Tracking    │  │
│  └───────────┬───────────────┘  │
│              │ DAP              │
└──────────────┼──────────────────┘
               │
               ▼
      ┌────────────────┐
      │  GDB/LLDB      │
      │  Debugger      │
      └────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **ai-debug-proxy** | VS Code extension exposing DAP via HTTP |
| **playground** | AUTOSAR-style C project with 10 intentional bugs |
| **ai-debug.sh** | CLI helper library for shell-based debugging |

---

## 🔧 Supported Debug Operations

### Session Management

- `launch` - Start debug session
- `restart` - Restart session
- `quit` - Terminate session

### Execution Control

- `continue` - Resume execution
- `next` - Step over
- `step_in` - Step into
- `step_out` - Step out
- `jump` - Jump to line
- `until` - Run until line

### Breakpoints

- `set_breakpoint` - Set persistent breakpoint
- `set_temp_breakpoint` - Set temporary breakpoint
- `remove_breakpoint` - Remove breakpoint
- `set_breakpoint_condition` - Set condition
- `ignore_breakpoint` - Set ignore count
- `get_active_breakpoints` - List breakpoints

### Inspection

- `stack_trace` - Get call stack
- `list_source` - Show source code
- `evaluate` - Evaluate expression
- `pretty_print` - Pretty-print complex types
- `whatis` - Get type information
- `get_stack_frame_variables` - Get variables

### Advanced

- `list_threads` - List all threads
- `switch_thread` - Switch to thread
- `get_registers` - Get CPU registers
- `read_memory` - Read memory
- `disassemble` - Disassemble code
- `get_last_stop_info` - Get last stop event

### Code Intelligence (LSP)

- `GET /api/symbols` - Document symbols
- `GET /api/references` - Find references
- `GET /api/call-hierarchy` - Call hierarchy

### Subagents

- `POST /api/subagents` - Spawn concurrent CLI tasks

---

## 🎯 AI-First Design Patterns

### 1. Operation Map Pattern

All 33 debug operations are registered in a discoverable map:

```json
GET /api/ping
{
  "operations": [
    "launch", "continue", "next", "step_in", "step_out",
    "set_breakpoint", "set_temp_breakpoint", "remove_breakpoint",
    "stack_trace", "evaluate", "get_stack_frame_variables",
    ...
  ]
}
```

### 2. Event Caching

Stop events are cached for on-demand inspection:

```python
# AI agent can query last stop at any time
response = requests.post(BASE_URL + "/api/debug", json={
    "operation": "get_last_stop_info"
})
```

### 3. Batch Operations

Execute multiple operations efficiently:

```python
requests.post(BASE_URL + "/api/debug/batch", json={
    "operations": [
        {"operation": "set_breakpoint", "params": {...}},
        {"operation": "set_breakpoint", "params": {...}},
        {"operation": "continue"}
    ],
    "parallel": False
})
```

### 4. Session Continuity

`_lastSession` pattern handles VS Code session lifecycle gaps automatically.

---

## 🧪 Training with Playground

The `playground` project contains 10 intentional bugs for AI debugging training:

```bash
cd playground
make clean && make    # Build with debug symbols

# Launch debug session
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"launch","params":{"program":"'"$(pwd)"'/build/cooling_ecu","stopOnEntry":true}}'
```

### Bug Categories

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

## 🔒 Security Model

### User Approval Required

The following operations trigger user confirmation dialogs:

- `evaluate` with assignment operators (`=` but not `==`)
- `execute_statement` - Execute arbitrary debug statements
- `POST /api/subagents` - Spawn external processes

### Safe Expression Patterns

```python
# ✅ Safe (no approval needed)
evaluate("x + y")
evaluate("array[i]")
evaluate("struct.field")
evaluate("x == 5")  # Comparison, not assignment

# ⚠️ Requires approval
evaluate("x = 5")   # Assignment
evaluate("x++")     # Modification
execute_statement("x = 10")
```

---

## 🧰 Integration Examples

### Claude Code

```bash
# Add to ~/.claude/commands/debug.sh
#!/bin/bash
curl -s -X POST "http://localhost:9999/api/debug" \
  -H "Content-Type: application/json" \
  -d "$1" | jq .
```

### Cursor IDE

```json
// .cursor/rules/debugging.json
{
  "rules": [{
    "name": "debug-session",
    "pattern": "debug.*",
    "command": "curl -s http://localhost:9999/api/debug ..."
  }]
}
```

### Custom AI Agent

```python
class AIDebugAgent:
    def __init__(self, base_url="http://localhost:9999"):
        self.base_url = base_url
    
    def debug_loop(self, binary_path, suspected_bugs):
        # Launch
        self.launch(binary_path)
        
        # Set breakpoints
        for bug in suspected_bugs:
            self.set_breakpoint(bug["file"], bug["line"])
        
        # Iterative investigation
        while True:
            result = self.continue_exec()
            if result["stopReason"] == "exit":
                break
            
            state = self.inspect_state()
            analysis = self.llm_analyze(state)
            
            if analysis.confidence > 0.9:
                return analysis
            
            # Set new breakpoints based on analysis
            for loc in analysis.suspected_locations:
                self.set_breakpoint(loc["file"], loc["line"])
```

---

- **Execution Control** (6 tests)
- **State Inspection** (8 tests)
- **Edge Cases** (4 tests)

---

## 🛠️ Development

### Build from Source

```bash
cd ai-debug-proxy
npm install
npm run compile
npm run package    # Creates .vsix file
```

### Run Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run lint
```

### Debug the Extension

```bash
# Open in VS Code
code .

# Press F5 to launch Extension Development Host
# Test in the new VS Code window
```

---

## 📋 Requirements

| Component | Version |
|-----------|---------|
| VS Code | 1.85+ |
| Node.js | 18+ |
| TypeScript | 5.3+ |
| Debugger | cppdbg (C/C++ Extension) |
| OS | Linux, macOS, Windows (WSL2 supported) |

---

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](docs/contributing.md) for:

- Development setup
- Coding standards
- Documentation requirements
- Pull request process
- Code review guidelines

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🔗 Related Projects

- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

---

## 📞 Support

- **Documentation:** [docs/](docs/index.md)
- **Issues:** [GitHub Issues](https://github.com/datdang-dev/ai-vscode-debug/issues)
- **Discussions:** [GitHub Discussions](https://github.com/datdang-dev/ai-vscode-debug/discussions)

---

*Built with ❤️ for AI-powered debugging*
