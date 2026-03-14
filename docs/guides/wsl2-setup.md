# WSL2 Debugging Setup Guide

**Document ID:** `DOC-WSL2-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This guide covers setting up and debugging C/C++ applications in WSL2 using the AI Debug Proxy extension.

[Satisfies $ARCH-DAP-001, $ARCH-HTTP-001]

---

## Prerequisites

### Required Software

| Component | Version | Installation |
|-----------|---------|--------------|
| Windows 10/11 | 2004+ (Build 19041+) | Windows Update |
| WSL2 | Latest | `wsl --install` |
| Linux Distribution | Ubuntu 20.04+ | Microsoft Store |
| VS Code | 1.85+ | [Download](https://code.visualstudio.com) |
| WSL Extension | Latest | VS Code Marketplace |
| C/C++ Extension | Latest | VS Code Marketplace |

### Verify WSL2 Installation

```powershell
# Check WSL version
wsl --list --verbose

# Should show VERSION 2 for your distro
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

---

## Step 1: Install WSL2 Development Tools

### Inside WSL2 Terminal

```bash
# Update package list
sudo apt update

# Install build essentials
sudo apt install -y build-essential gdb make

# Install additional debugging tools
sudo apt install -y gdbserver valgrind strace

# Verify installations
gcc --version
gdb --version
make --version
```

### Optional: Install CMake

```bash
sudo apt install -y cmake cmake-data
cmake --version
```

---

## Step 2: Install VS Code and Extensions

### On Windows Host

1. **Install VS Code** from [code.visualstudio.com](https://code.visualstudio.com)

2. **Install Extensions:**
   - **WSL** (`ms-vscode-remote.remote-wsl`)
   - **C/C++** (`ms-vscode.cpptools`)
   - **AI Debug Proxy** (from .vsix file)

3. **Configure WSL connection:**
   - Press `F1` → Type "WSL: New Window"
   - Or click green icon in bottom-left → "New WSL Window"

### Verify Extension Installation in WSL

```bash
# List VS Code extensions from WSL
code --list-extensions --show-versions

# Should show:
# ms-vscode-remote.remote-wsl
# ms-vscode.cpptools
# <your-extension-id>.ai-debug-proxy
```

---

## Step 3: Configure Launch Settings

### Create launch.json in WSL2 Project

```bash
# Navigate to project
cd ~/project

# Create .vscode directory
mkdir -p .vscode

# Create launch.json
cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug on WSL2",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/cooling_ecu",
      "args": [],
      "cwd": "${workspaceFolder}",
      "stopOnEntry": true,
      "externalConsole": false,
      "MIMode": "gdb",
      "miDebuggerPath": "/usr/bin/gdb",
      "setupCommands": [
        {
          "description": "Enable pretty-printing",
          "text": "-enable-pretty-printing",
          "ignoreFailures": true
        }
      ],
      "preLaunchTask": "Build"
    }
  ]
}
EOF
```

### Create tasks.json for Build

```bash
cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build",
      "type": "shell",
      "command": "make",
      "args": [
        "-C",
        "${workspaceFolder}"
      ],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$gcc"],
      "detail": "Build the project with make"
    }
  ]
}
EOF
```

---

## Step 4: Configure AI Debug Proxy

### VS Code Settings (WSL2)

Open VS Code settings in WSL2 context:
- `Ctrl+,` → Click "Remote (WSL)" tab

```json
{
  "aiDebugProxy.port": 9999,
  "aiDebugProxy.autoStart": true,
  "aiDebugProxy.logLevel": "info"
}
```

### Verify Proxy is Running

```bash
# From WSL2 terminal
curl http://localhost:9999/api/ping

# Expected response:
# {"success":true,"data":{"message":"pong",...}}
```

---

## Step 5: Build Project with Debug Symbols

### Configure Makefile for Debug Build

```makefile
# In project Makefile or Makefile.debug

CC = gcc
CFLAGS = -g -O0 -Wall -Wextra
LDFLAGS = -g

# Debug build target
debug: CFLAGS += -DDEBUG
debug: build

build:
	$(CC) $(CFLAGS) -o build/cooling_ecu src/*.c

clean:
	rm -rf build/*
```

### Build the Project

```bash
cd ~/project

# Clean previous build
make clean

# Build with debug symbols
make debug

# Verify debug symbols
file build/cooling_ecu
# Should show: "ELF 64-bit LSB executable, ... with debug_info"

# Or use readelf
readelf -S build/cooling_ecu | grep debug
# Should show .debug_* sections
```

---

## Step 6: Start Debugging

### Launch Debug Session

```bash
# Using program path (recommended)
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "launch",
    "params": {
      "program": "/home/username/project/build/cooling_ecu",
      "stopOnEntry": true
    }
  }'
```

### Set Breakpoints

```bash
# Set breakpoint at main function
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "set_breakpoint",
    "params": {
      "location": {
        "path": "/home/username/project/src/main.c",
        "line": 42
      }
    }
  }'
```

### Debug Workflow

```bash
# Continue to breakpoint
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"continue"}'

# Inspect stack trace
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"stack_trace"}'

# Evaluate variable
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"evaluate","params":{"expression":"temperature"}}'

# Step to next line
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"next"}'
```

---

## Common WSL2 Issues

### Issue: Path Mismatch

**Symptom:** Breakpoints don't bind, source not found.

**Solution:** Always use WSL2 paths, not Windows paths:
```bash
# ✅ Correct
/home/username/project/src/main.c

# ❌ Incorrect
//wsl$/home/username/project/src/main.c
/mnt/c/Users/username/project/src/main.c
```

---

### Issue: Extension Not Loading in WSL2

**Symptom:** AI Debug Proxy commands not available in WSL2 window.

**Solution:**

1. Check extension installation location:
   ```bash
   code --list-extensions --show-versions
   ```

2. If not listed, install in WSL2 context:
   ```bash
   code --install-extension ai-debug-proxy-0.1.0.vsix --force
   ```

3. Reload VS Code window in WSL2:
   - Command Palette → `Developer: Reload Window`

---

### Issue: GDB Not Found

**Symptom:** Launch fails with "gdb not found".

**Solution:**

1. Install gdb in WSL2:
   ```bash
   sudo apt install -y gdb
   ```

2. Verify gdb path:
   ```bash
   which gdb
   # Should output: /usr/bin/gdb
   ```

3. Update launch.json with correct path:
   ```json
   {
     "miDebuggerPath": "/usr/bin/gdb"
   }
   ```

---

### Issue: Port Already in Use

**Symptom:** "Port 9999 is already in use" error.

**Solution:**

1. Find process using port:
   ```bash
   sudo lsof -i :9999
   ```

2. Kill process or change port in settings:
   ```json
   {
     "aiDebugProxy.port": 9998
   }
   ```

---

## WSL2 Performance Tips

### 1. Store Project in WSL2 Filesystem

```bash
# ✅ Fast - WSL2 filesystem
/home/username/project/

# ❌ Slow - Windows filesystem accessed from WSL2
/mnt/c/Users/username/project/
```

### 2. Use WSL2 Native Tools

```bash
# Install tools in WSL2, not Windows
sudo apt install -y git curl wget
```

### 3. Configure WSL2 Memory

Create/edit `%USERPROFILE%\.wslconfig` on Windows:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

---

## Quick Reference

### Common Commands

```bash
# Start WSL2
wsl

# Open VS Code in WSL2
code .

# Check WSL2 version
wsl --list --verbose

# Restart WSL2
wsl --shutdown
wsl

# Access WSL2 from Windows
\\wsl$\Ubuntu\home\username\project
```

### Debug Shortcuts

| Operation | Command |
|-----------|---------|
| Launch | `POST /api/debug` with `launch` |
| Continue | `POST /api/debug` with `continue` |
| Step Over | `POST /api/debug` with `next` |
| Step In | `POST /api/debug` with `step_in` |
| Stack | `POST /api/debug` with `stack_trace` |
| Evaluate | `POST /api/debug` with `evaluate` |
| Quit | `POST /api/debug` with `quit` |

---

## Related Documents

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)
- [Debugging Guide](./debugging-guide.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
