# Getting Started

## Requirements

- VS Code 1.85+
- A C/C++ debugger: `cppdbg` (from the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)) or any DAP-compatible debugger
- The project to debug must be accessible from the VS Code machine (local or WSL2)

---

## Installation

### Option A — Install from .vsix (recommended for alpha)

```bash
code --install-extension ai-debug-proxy-0.1.0.vsix --force
```

After installation, **reload the VS Code window** (Command Palette → `Developer: Reload Window`).

> **WSL2 note:** After reload, the extension host process on the remote WSL2 side must restart.
> If you see stale behavior, kill the extension host:
> ```bash
> pkill -f extensionHost
> ```
> VS Code will automatically reconnect and load the new version.

### Option B — Build from source

```bash
git clone https://github.com/datdang-dev/ai-vscode-debug
cd ai-vscode-debug/ai-debug-proxy
npm install
npm run compile
npm run package        # produces ai-debug-proxy-0.1.0.vsix
code --install-extension ai-debug-proxy-0.1.0.vsix --force
```

---

## Verify the Extension is Running

```bash
curl http://localhost:9999/api/ping
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "0.1.0-alpha",
    "operations": ["launch", "quit", "continue", "next", ...]
  }
}
```

If the endpoint is not reachable, check:
1. **Extension is active** — look for "AI Debug Proxy: running on port 9999" in the VS Code status bar or Output panel (`AI Debug Proxy: Show Log`)
2. **Port conflict** — change port via `aiDebugProxy.port` in VS Code settings
3. **Extension host not started** — open Command Palette → `AI Debug Proxy: Start Server`

---

## First Debug Session

### Recommended: Launch by program path

Provide the absolute path to the compiled binary. This is the most reliable method and works regardless of which folder VS Code has open.

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/absolute/path/to/your/binary",
      "stopOnEntry": true,
      "type": "cppdbg"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "operation": "launch",
  "data": {
    "success": true,
    "sessionId": "abc123",
    "stopReason": "entry"
  }
}
```

### Alternative: Launch by config name

If your project has a `.vscode/launch.json`, you can launch by config name. Provide `workspacePath` so the extension can find `launch.json` even when VS Code has a different folder open.

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "configName": "Debug on Linux",
      "workspacePath": "/path/to/your/project"
    }
  }'
```

> **Alpha note:** Always prefer `program`-path launch. `configName` launch requires `workspacePath` if the project folder is not open in VS Code.

---

## Basic Debugging Workflow

```bash
# 1. Set a breakpoint
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"set_breakpoint","params":{"location":{"path":"/path/to/file.c","line":42}}}'

# 2. Continue execution
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"continue"}'

# 3. When stopped: inspect the stack
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"stack_trace"}'

# 4. Evaluate a variable
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"evaluate","params":{"expression":"my_variable"}}'

# 5. Step to next line
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"next"}'

# 6. Quit the session
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"quit"}'
```

---

## VS Code Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiDebugProxy.port` | number | `9999` | HTTP server port |
| `aiDebugProxy.autoStart` | boolean | `true` | Auto-start proxy on VS Code startup |
| `aiDebugProxy.logLevel` | string | `"info"` | Log verbosity: `debug` / `info` / `warn` / `error` |

Logs are written to `<extension-dir>/proxy.log` and visible via **AI Debug Proxy: Show Log** command.

---

## Try with the Training Project

```bash
cd playground
make clean && make          # builds build/cooling_ecu with debug symbols

curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"launch","params":{"program":"'$(pwd)'/build/cooling_ecu","stopOnEntry":true}}'
```

See [Debugging Guide](./debugging-guide.md) for the 10 intentional bugs to find.
