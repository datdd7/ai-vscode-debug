# Troubleshooting Guide

**Document ID:** `DOC-TS-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This guide provides solutions to common issues encountered when using the AI Debug Proxy extension.

[Satisfies $ARCH-HTTP-001, $ARCH-DAP-001]

---

## Installation Issues

### Extension Not Appearing in VS Code

**Symptom:** After running `code --install-extension`, the extension doesn't appear in the extensions list.

**Cause:** Extension host may not have reloaded, or installation failed silently.

**Solution:**

1. Check installation output for errors:
   ```bash
   code --install-extension ai-debug-proxy-0.1.0.vsix --force 2>&1
   ```

2. Reload VS Code window:
   - Command Palette → `Developer: Reload Window`

3. Verify extension is listed:
   - Extensions view (Ctrl+Shift+X) → Search "AI Debug Proxy"

4. If still missing, check extension logs:
   - Help → Toggle Developer Tools → Console tab

**Prevention:** Always reload VS Code after installing extensions.

**Related:**
- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)

---

### Port Already in Use

**Symptom:** Error message "Port 9999 is already in use" when starting the proxy.

**Cause:** Another instance of the extension or another application is using port 9999.

**Solution:**

1. Find process using port 9999:
   ```bash
   # Linux/Mac
   lsof -i :9999
   
   # Windows
   netstat -ano | findstr :9999
   ```

2. Kill the process or change the proxy port:
   ```json
   // VS Code settings.json
   {
     "aiDebugProxy.port": 9998
   }
   ```

3. Restart VS Code.

**Prevention:** Use unique ports for multiple VS Code instances.

---

## Connection Issues

### Cannot Connect to Proxy

**Symptom:** `curl: (7) Failed to connect to localhost port 9999`

**Cause:** Proxy server is not running or extension failed to activate.

**Solution:**

1. Check if extension is active:
   - Look for "AI Debug Proxy" in status bar
   - Output panel → Select "AI Debug Proxy" from dropdown

2. Manually start the server:
   - Command Palette → `AI Debug Proxy: Start Server`

3. Check extension logs for errors:
   - Command Palette → `AI Debug Proxy: Show Log`

4. Verify port configuration:
   ```json
   // VS Code settings.json
   {
     "aiDebugProxy.port": 9999,
     "aiDebugProxy.autoStart": true
   }
   ```

**Prevention:** Enable `autoStart` in VS Code settings.

---

### Connection Refused After VS Code Restart

**Symptom:** Proxy was working, but connection refused after restarting VS Code.

**Cause:** Extension may not have fully initialized on startup.

**Solution:**

1. Wait 5-10 seconds after VS Code starts for extension to activate.

2. If still failing, restart the proxy:
   - Command Palette → `AI Debug Proxy: Stop Server`
   - Command Palette → `AI Debug Proxy: Start Server`

3. Check for extension host errors in Developer Tools.

---

## Debug Session Issues

### Launch Fails with "Config Not Found"

**Symptom:** Launch operation returns error: `Launch config 'Debug' not found`

**Cause:** The specified launch configuration doesn't exist in `.vscode/launch.json` or workspace folder is not open.

**Solution:**

**Option 1: Use program path (recommended)**
```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/absolute/path/to/binary",
      "stopOnEntry": true
    }
  }'
```

**Option 2: Provide workspacePath**
```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "configName": "Debug",
      "workspacePath": "/path/to/project"
    }
  }'
```

**Prevention:** Always prefer `program` parameter over `configName`.

---

### Debugger Not Stopping at Breakpoints

**Symptom:** Breakpoints are set but execution doesn't stop.

**Cause:** Possible causes:
- Binary compiled without debug symbols
- Source file paths don't match
- Breakpoint set after program started

**Solution:**

1. Verify binary has debug symbols:
   ```bash
   # Check for debug info
   file build/cooling_ecu
   # Should show: "with debug_info"
   ```

2. Recompile with debug flags:
   ```makefile
   CFLAGS += -g -O0
   ```

3. Set breakpoints before launching:
   ```bash
   # Set breakpoint first
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"set_breakpoint","params":{"location":{"path":"/path/to/file.c","line":42}}}'
   
   # Then launch
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"launch","params":{"program":"/path/to/binary","stopOnEntry":true}}'
   ```

4. Verify breakpoint is active:
   ```bash
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"get_active_breakpoints"}'
   ```

---

### Session Lost Between Operations

**Symptom:** First operation succeeds, but subsequent operations fail with "No active session".

**Cause:** This is a known issue (BUG-3) where `vscode.debug.activeDebugSession` becomes undefined between operations.

**Solution:**

1. The extension should automatically handle this via `_lastSession` caching. If not:

2. Re-launch the session:
   ```bash
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"launch","params":{"program":"/path/to/binary"}}'
   ```

3. Check extension logs for session lifecycle events.

**Related:**
- [Architecture](../arch/architecture.md#session-lifecycle--bug-3-fix)

---

## WSL2 Specific Issues

### Breakpoints Not Binding in WSL2

**Symptom:** Breakpoints show as "unbound" when debugging WSL2 binaries.

**Cause:** Path mismatch between Windows VS Code and WSL2 filesystem.

**Solution:**

1. Use WSL2-style paths in breakpoint requests:
   ```bash
   # Correct for WSL2
   /home/user/project/src/file.c
   
   # Incorrect (Windows path)
   //wsl$/home/user/project/src/file.c
   ```

2. The extension automatically decodes `vscode-remote://` URIs. If issues persist:

3. Restart extension host in WSL2:
   ```bash
   pkill -f extensionHost
   ```

**Prevention:** Always use native WSL paths when working in WSL2 remote.

---

### Binary Not Found in WSL2

**Symptom:** Launch fails with "Binary not found" even though file exists.

**Cause:** Windows paths are not accessible from WSL2 context.

**Solution:**

1. Use WSL2 absolute path:
   ```bash
   # Correct
   /home/user/project/build/cooling_ecu
   
   # Incorrect
   /mnt/c/Users/user/project/build/cooling_ecu
   ```

2. If binary is on Windows filesystem, copy to WSL2:
   ```bash
   cp /mnt/c/path/to/binary ~/project/build/
   ```

---

## Performance Issues

### Slow Response Times

**Symptom:** API requests take >5 seconds to respond.

**Cause:** Large stack traces, many breakpoints, or complex expressions.

**Solution:**

1. Reduce scope of operations:
   - Use `frameId` to limit variable inspection to current frame
   - Limit `linesAround` in `list_source` operation

2. Remove unused breakpoints:
   ```bash
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"remove_all_breakpoints_in_file","params":{"path":"/path/to/file.c"}}'
   ```

3. Simplify expressions in watch/evaluate.

---

### High Memory Usage

**Symptom:** VS Code memory usage increases during debug session.

**Cause:** Event caching or large variable inspections.

**Solution:**

1. Quit and restart debug session periodically:
   ```bash
   curl -X POST http://localhost:9999/api/debug \
     -d '{"operation":"quit"}'
   ```

2. Avoid inspecting large data structures:
   - Use `evaluate` for specific fields instead of entire structs

3. Restart VS Code extension host if memory exceeds 500MB.

---

## Error Messages Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `No active debug session` | Session not launched or terminated | Launch session first |
| `Invalid operation` | Unknown operation name | Check [API Reference](./api-reference.md) |
| `Breakpoint not bound` | Source path mismatch | Verify file paths match debug symbols |
| `User denied approval` | Security dialog cancelled | Approve destructive operation |
| `Timeout waiting for response` | Debugger not responding | Check debugger is attached |

---

## Getting Help

If your issue is not covered in this guide:

1. **Check existing issues:** [GitHub Issues](https://github.com/datdang-dev/ai-vscode-debug/issues)

2. **Review extension logs:**
   - Command Palette → `AI Debug Proxy: Show Log`

3. **Enable debug logging:**
   ```json
   {
     "aiDebugProxy.logLevel": "debug"
   }
   ```

4. **Report a new issue:** Include:
   - VS Code version
   - Extension version
   - OS and debugger type
   - Extension logs
   - Steps to reproduce

---

## Related Documents

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Debugging Guide](./debugging-guide.md)
- [Architecture](../arch/architecture.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
