# AI VSCode Debug - QWEN.md Context File

**Project:** AI VSCode Debug Platform  
**Version:** 1.0.0  
**Type:** VS Code Extension (TypeScript/Node.js)  
**License:** MIT  

---

## 📋 Project Overview

**AI VSCode Debug** is an **AI-First debugging platform** that enables LLM agents (Claude Code, Cursor, Cline, etc.) to control VS Code debugging programmatically via HTTP REST APIs.

### Core Architecture

```
AI Agent (LLM/CLI)
       | HTTP REST
       | localhost:9999
       ▼
┌─────────────────────────────┐
│  AI Debug Proxy             │
│  (VS Code Extension)        │
│  ┌───────────────────────┐  │
│  │  HTTP Server          │  │
│  │  Router               │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │  DebugController      │  │
│  │  33 Debug Operations  │  │
│  └───────────┬───────────┘  │
│              │ DAP          │
└──────────────┼──────────────┘
               ▼
      ┌────────────────┐
      │  GDB/LLDB      │
      │  Debugger      │
      └────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **ai-debug-proxy** | `ai-debug-proxy/` | VS Code extension exposing DAP via HTTP |
| **playground** | `playground/` | AUTOSAR-style C project with 10 intentional bugs |
| **docs** | `docs/` | Comprehensive documentation |
| **tests** | `tests/` | E2E test suite |

---

## 🏗️ Project Structure

```
ai-vscode-debug/
├── ai-debug-proxy/          # VS Code extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts     # Entry point
│   │   ├── server/          # HTTP server & router
│   │   ├── debug/           # Debug controller & operations
│   │   ├── lsp/             # LSP code intelligence
│   │   └── subagents/       # Subagent orchestration
│   ├── tests/               # Unit & E2E tests
│   ├── resources/           # CLI helpers (ai-debug.sh)
│   ├── package.json
│   └── tsconfig.json
├── playground/              # Training C project
│   ├── app/                 # Application layer
│   ├── services/            # Services layer
│   ├── utils/               # Utilities
│   ├── ecual/               # ECU abstraction
│   └── Makefile
├── docs/
│   ├── guides/              # User guides
│   ├── arch/                # Architecture docs
│   ├── guidelines/          # Coding standards
│   └── ai/                  # AI agent prompts
├── scripts/
│   └── setup.sh             # Automated setup script
└── tests/                   # E2E test suite
```

---

## 🚀 Building and Running

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Extension runtime |
| npm | 9+ | Package manager |
| TypeScript | 5.3+ | Type checking |
| VS Code | 1.85+ | Development IDE |
| GCC | 9+ | Playground compilation |
| Make | 4+ | Build system |

### Quick Setup

```bash
# Automated setup (recommended)
./scripts/setup.sh

# Manual setup
cd ai-debug-proxy
npm install
npm run compile
npm run package    # Creates .vsix file
```

### Install Extension

```bash
# Install from .vsix
code --install-extension ai-debug-proxy-1.0.0.vsix --force

# Reload VS Code
# Command Palette → Developer: Reload Window
```

### Verify Proxy is Running

```bash
curl http://localhost:9999/api/ping
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "1.0.0",
    "operations": ["launch", "continue", "next", ...]
  }
}
```

### Build Playground (for testing)

```bash
cd playground
make clean && make
# Output: build/cooling_ecu (debug binary)
```

---

## 🧪 Testing

### Unit Tests

```bash
cd ai-debug-proxy

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- DebugController.test.ts
```

### E2E Tests

```bash
cd ai-debug-proxy

# Run E2E tests (requires extension running)
npm run test:e2e

# Run benchmark
python ../tests/test_benchmark.py
```

### Test Categories

| Category | Coverage | Description |
|----------|----------|-------------|
| Session Management | 6 tests | Launch, restart, quit |
| Execution Control | 6 tests | Continue, step, next |
| State Inspection | 8 tests | Stack, variables, evaluate |
| Edge Cases | 4 tests | Error handling |

---

## 🔧 Development Commands

### Extension Development

```bash
cd ai-debug-proxy

# Watch mode (auto-rebuild)
npm run watch

# Compile once
npm run compile

# Package .vsix
npm run package

# Type checking
npm run lint

# Debug extension
# Press F5 in VS Code
```

### Playground Development

```bash
cd playground

# Build
make

# Run simulation
make run

# Debug mode
make debug

# Clean build
make clean
```

---

## 📐 Development Conventions

### TypeScript Style

- **Indentation:** 4 spaces
- **Naming:** `PascalCase` classes, `camelCase` functions
- **Line Length:** Max 100 characters
- **Semicolons:** Always required
- **Strict Mode:** Enabled in tsconfig.json

### Documentation Blocks

All public interfaces MUST have `$DD` blocks:

```typescript
/**
 * $DD DBG-001
 * @brief Launches a debug session
 *
 * [Satisfies $ARCH-DAP-001]
 *
 * @param [in] program
 *     Absolute path to the binary
 *
 * @returns
 *     Session ID and stop reason
 */
export async function launch(program: string): Promise<LaunchResult>
```

### Error Handling

```typescript
// ✅ GOOD: Specific error types
throw new ValidationError('Invalid path', { path });

// ❌ BAD: Generic errors
throw new Error('Something went wrong');
```

### Testing Practices

- **Coverage Target:** ≥80%
- **Test Structure:** Arrange-Act-Assert pattern
- **E2E Tests:** Use Playwright
- **Contract Tests:** Pact for API contracts

---

## 🎯 Key Features

### 33 Debug Operations

| Category | Operations |
|----------|------------|
| **Session** | `launch`, `restart`, `quit` |
| **Execution** | `continue`, `next`, `step_in`, `step_out`, `jump`, `until` |
| **Breakpoints** | `set_breakpoint`, `set_temp_breakpoint`, `remove_breakpoint`, `toggle_breakpoint`, `set_breakpoint_condition` |
| **Inspection** | `stack_trace`, `list_source`, `evaluate`, `pretty_print`, `whatis`, `get_stack_frame_variables` |
| **Advanced** | `list_threads`, `switch_thread`, `get_registers`, `read_memory`, `disassemble` |
| **LSP** | `GET /api/symbols`, `GET /api/references`, `GET /api/call-hierarchy` |

### Security Model

- User approval required for destructive operations
- Safe expression patterns (no assignment operators)
- Subagent command whitelisting

---

## 📚 Documentation Index

### For AI Agents

| Document | Path |
|----------|------|
| AI Agent Technical Guide | `docs/guides/ai-agent-technical-guide.md` |
| CLI Debug Guide | `docs/guides/cli-debug-guide.md` |
| API Reference | `docs/guides/api-reference.md` |
| Prompt Templates | `docs/ai/prompt-templates.md` |

### For Developers

| Document | Path |
|----------|------|
| Getting Started | `docs/guides/getting-started.md` |
| Architecture | `docs/arch/architecture.md` |
| Contributing | `docs/contributing.md` |
| Coding Guidelines | `docs/guidelines/CODING_GUIDELINES.md` |
| Troubleshooting | `docs/guides/troubleshooting.md` |

---

## 🐛 Playground Bugs (Training)

The `playground` project contains 10 intentional bugs for AI debugging training:

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

See `playground/debug_scenarios.md` for detailed scenarios.

---

## 🔌 AI Agent Integration

### Python Example

```python
import requests

BASE_URL = "http://localhost:9999"

# Launch debug session
requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "launch",
    "params": {"program": "./build/app", "stopOnEntry": True}
})

# Set breakpoint
requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "set_breakpoint",
    "params": {"location": {"path": "main.c", "line": 42}}
})

# Continue execution
requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "continue"
})

# Get stack trace
stack = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "stack_trace"
}).json()

# Evaluate expression
result = requests.post(f"{BASE_URL}/api/debug", json={
    "operation": "evaluate",
    "params": {"expression": "my_variable"}
}).json()
```

### CLI Helper

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

## 🛠️ Configuration

### VS Code Settings

```json
{
    "aiDebugProxy.port": 9999,
    "aiDebugProxy.autoStart": true,
    "aiDebugProxy.logLevel": "info",
    "aiDebugProxy.subagents.allowedCommands": []
}
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
TEST_ENV=local
BASE_URL=http://localhost:9999
API_URL=http://localhost:9999
PACT_BROKER_BASE_URL=https://your-pactflow-instance.pactflow.io
PACT_BROKER_TOKEN=your-pactflow-api-token
```

---

## 📦 Package Management

### Dependencies (ai-debug-proxy)

```json
{
    "devDependencies": {
        "@types/vscode": "^1.88.0",
        "@types/node": "^20.0.0",
        "typescript": "^5.3.0",
        "@playwright/test": "^1.54.1",
        "jest": "^30.3.0",
        "esbuild": "^0.20.0"
    }
}
```

### Build Output

- **Compiled JS:** `ai-debug-proxy/out/`
- **Source Maps:** Enabled
- **Package:** `ai-debug-proxy/*.vsix`

---

## 🤝 Contributing

### Pull Request Process

1. Fork and create branch from `main`
2. Make changes with `$DD` documentation blocks
3. Write tests (≥80% coverage)
4. Run `npm run lint` and `npm test`
5. Submit PR with clear description

### Commit Message Format

```
<type>: <subject>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 🔗 Related Resources

- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

---

## 📞 Support

- **Documentation:** `docs/index.md`
- **Issues:** [GitHub Issues](https://github.com/datdang-dev/ai-vscode-debug/issues)
- **Discussions:** [GitHub Discussions](https://github.com/datdang-dev/ai-vscode-debug/discussions)

---

*Last Updated: 2026-03-18*
