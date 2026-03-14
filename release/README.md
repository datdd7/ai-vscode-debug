# Release — AI Debug Proxy

## 0.1.b3 (2026-03-13) - Bugfix Release

### Files

| File | Description |
|------|-------------|
| `ai-debug-proxy-v0.1.b3.vsix` | VS Code extension package (Bugfix v0.1.b3) |

### Install

```bash
code --install-extension ai-debug-proxy-v0.1.b3.vsix --force
```

After installing, reload the VS Code window (`Developer: Reload Window`).

### 🐛 Bug Fixes

This release addresses **3 critical issues** reported by customers:

#### 🔴 AIVS-006: Multi-window Targeting (HIGH PRIORITY)
- **Problem:** Debug session opens in wrong VSCode window when multiple windows are open
- **Solution:** Added `workspacePath` parameter to target specific workspace
- **Usage:** Add `"workspacePath": "/path/to/workspace"` to launch params

#### 🟡 AIVS-002: Unclear Error Messages
- **Problem:** Generic error message "Failed to start debug session"
- **Solution:** Structured error responses with codes, messages, and suggestions
- **Error Codes:** `BINARY_NOT_FOUND`, `GDB_NOT_FOUND`, `WORKSPACE_NOT_FOUND`, etc.

#### 🟢 AIVS-005: Batch Breakpoint API
- **Problem:** Need multiple API calls to set multiple breakpoints
- **Solution:** New `set_breakpoints` operation for batch setting
- **Usage:** Send array of breakpoints in single API call

### New API Features

#### 1. Workspace Targeting (AIVS-006)

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/path/to/binary",
      "workspacePath": "/path/to/workspace"
    }
  }'
```

#### 2. Structured Error Responses (AIVS-002)

```json
{
  "success": false,
  "error": {
    "code": "BINARY_NOT_FOUND",
    "message": "Binary not found: /path/to/binary",
    "suggestion": "Have you built the project? Check your build configuration.",
    "details": {
      "path": "/path/to/binary",
      "exists": false
    }
  }
}
```

#### 3. Batch Breakpoints (AIVS-005)

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "set_breakpoints",
    "params": {
      "file": "/path/to/file.c",
      "breakpoints": [
        {"line": 10},
        {"line": 20, "condition": "x > 5"},
        {"line": 30}
      ]
    }
  }'
```

### Testing

See `BUGFIX_VERIFICATION_TEST.md` for comprehensive test cases.

### Documentation

- **Release Notes:** See `BUGFIX_RELEASE_SUMMARY.md`
- **Test Script:** See `BUGFIX_VERIFICATION_TEST.md`
- **Original Issues:** See `ISSUES_SPECIFICATIONS.md`

---

## 0.1.b2 (2026-03-13)

### Files

| File | Description |
|------|-------------|
| `ai-debug-proxy-v0.1.b2.vsix` | VS Code extension package (Beta v0.b2) |

### Install

```bash
code --install-extension ai-debug-proxy-v0.1.b2.vsix --force
```

After installing, reload the VS Code window (`Developer: Reload Window`).

### What's New

- **LSP Service**: Enhanced Language Server Protocol integration
- **Hardware Debug Support**: New hardware debugging capabilities
- **Improved Subagent Orchestration**: Better concurrency control
- **CLI Helper**: Fixed workspace variable resolution in `ai-debug.sh`
- **Bug Fixes**: Session management, validation, and logging improvements

### CLI Helper

The extension includes `ai-debug.sh` - a shell-based CLI helper library:

```bash
# After installing the extension, run:
# Command Palette → AI Debug Proxy: Install Debug CLI (ai-debug.sh)

# Source the helper library
source ai-debug.sh

# Debug commands
ai_launch "./build/app"
ai_bp "main.c" 42
ai_continue
ai_stack
ai_eval "my_variable"
ai_quit
```

### Documentation

See [docs/](../docs/index.md) for full documentation including getting started guide, API reference, and architecture overview.

### Release Notes

See [docs/release/release-notes.md](../docs/release/release-notes.md).

---

## 0.1.b0 (2026-03-12)

### Files

| File | Description |
|------|-------------|
| `ai-debug-proxy-v0.1.b0.vsix` | VS Code extension package (Beta v0.b0) |

### Install

```bash
code --install-extension ai-debug-proxy-v0.1.b0.vsix --force
```

After installing, reload the VS Code window (`Developer: Reload Window`).

### Documentation

See [docs/](../docs/index.md) for full documentation including getting started guide, API reference, and architecture overview.

### Release notes

See [docs/release/release-notes.md](../docs/release/release-notes.md).
