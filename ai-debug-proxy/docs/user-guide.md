# User Guide — AI Debug Proxy v3.0

This guide covers the installation, configuration, and practical usage of the AI Debug Proxy for both individual developers and AI coding agents.

---

## 1. Installation

### As a VS Code Extension

1.  Download the latest `ai-debug-proxy-3.0.0.vsix` from the releases page (planned).
2.  In VS Code, open the Extensions view (`Ctrl+Shift+X`).
3.  Click the `...` menu and select **Install from VSIX...**.
4.  Restart VS Code.

### As a Standalone Node.js App (Headless)

```bash
git clone https://github.com/datdang-dev/ai-vscode-debug-proxy.git
npm install
npm run compile
npm run start # Launches the HTTP server on default port 9999
```

---

## 2. Configuration

You can configure the proxy via VS Code settings or environment variables:

| Setting | Env Var | Default | Description |
|---------|---------|---------|-------------|
| `aiDebugProxy.port` | `PROXY_PORT` | `9999` | HTTP server port |
| `aiDebugProxy.autoStart` | `AUTO_START` | `true` | Start server on activation |
| `aiDebugProxy.logLevel` | `LOG_LEVEL` | `info` | verbose, info, warn, error |

---

## 3. Core Concepts

### The Single Endpoint Architecture

Unlike traditional REST APIs with dozens of endpoints, AI Debug Proxy uses a **Single-Endpoint Dispatch** model for operations. This reduces the cognitive load on LLMs and minimizes HTTP handshake overhead.

**Endpoint:** `POST /api/debug/execute_operation`

### Operation Context

The proxy maintains a **Stateful Backend Manager**. Once a session is launched, all subsequent operations are routed to the active debugger instance.

---

## 4. Common Workflows

### Scenario A: Launch and Break

1.  **Launch** the program:
    ```json
    { "operation": "launch", "params": { "program": "/usr/bin/ls", "stopOnEntry": true } }
    ```
2.  **Set a breakpoint**:
    ```json
    { "operation": "set_breakpoint", "params": { "location": { "path": "/src/main.c", "line": 42 } } }
    ```
3.  **Continue** to the breakpoint:
    ```json
    { "operation": "continue" }
    ```

### Scenario B: Post-Mortem Analysis

1.  **Attach** to a running process (planned):
    ```json
    { "operation": "attach", "params": { "pid": 1234 } }
    ```
2.  **Get stack trace**:
    ```json
    { "operation": "stack_trace" }
    ```
3.  **Inspect variables**:
    ```json
    { "operation": "get_stack_frame_variables", "params": { "frameId": 0 } }
    ```

---

## 5. Troubleshooting

*   **Port Collision**: If port 9999 is in use, the server will log an error. Change the port in settings.
*   **GDB Not Found**: Ensure `gdb` is in your environment PATH.
*   **MI2 Timeout**: Large binary files may take longer to load. Adjust timeout settings if necessary.

For detailed API specifications, see the [API Reference](api-reference.md).
