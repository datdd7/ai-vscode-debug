# AI Guide: Watching Global Variables

**Date:** 2026-03-18  
**Feature:** PROXY-003 + Watch Operations  

---

## 📋 Overview

Extension hỗ trợ **watch variables** (bao gồm cả global variables) thông qua các operations:

| Operation | Method | Description |
|-----------|--------|-------------|
| `watch` | POST `/api/debug` | Add variable to watch list (data breakpoint) |
| `evaluate` | POST `/api/debug` | Evaluate variable expression |
| `get_scope_preview` | POST `/api/debug` | Get available variables in current scope |

---

## 🔧 How to Watch Global Variables

### Method 1: Using `evaluate` (Recommended for AI)

**Best for:** Reading global variable values at breakpoint

```bash
# Evaluate global variable
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{"operation":"evaluate","params":{"expression":"g_system_state"}}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": "SYSTEM_STATE_RUNNING",
    "type": "SystemState",
    "variablesReference": 0
  }
}
```

### Method 2: Using `watch` (Data Breakpoint)

**Best for:** Monitoring when global variable changes (hardware watchpoint)

```bash
# Add watchpoint on global variable
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{"operation":"watch","params":{"name":"g_system_state","accessType":"write"}}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Watchpoint set on g_system_state"
  }
}
```

---

## ⚠️ Important Notes

### 1. Scope Visibility

Global variables may not be visible in all stack frames. If you get error:

```json
{
  "success": false,
  "errorMessage": "Variable 'g_system_state' not found in current scope"
}
```

**Solution:** Try evaluating from different stack frames:

```bash
# Get stack trace first
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"stack_trace"}'

# Then evaluate with specific frameId
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"evaluate","params":{"expression":"g_system_state","frameId":0}}'
```

### 2. When Variables Are Not Available

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "optimized out" | Variable optimized by compiler | Use `-O0` flag when compiling |
| "not in current scope" | Wrong stack frame | Try different `frameId` |
| "No frame available" | Not stopped at breakpoint | Ensure debugger is stopped |

### 3. Best Practices for AI Agents

**Recommended workflow:**

```bash
# 1. Stop at breakpoint
ai_continue

# 2. Get available variables in current scope
ai_scope_preview

# 3. Evaluate variables of interest
ai_eval "variable_name"

# 4. For global variables, try direct evaluate
ai_eval "g_global_variable"

# 5. If fails, check stack trace and try different frame
ai_stack
ai_eval --frame 0 "g_global_variable"
```

---

## 🤖 AI Agent Integration Example

### Python Example

```python
import requests

BASE_URL = "http://localhost:9999"

def watch_global_variable(var_name):
    """Add a global variable to watch list"""
    response = requests.post(f"{BASE_URL}/api/debug", json={
        "operation": "watch",
        "params": {
            "name": var_name,
            "accessType": "write"  # or "read" or "readWrite"
        }
    })
    return response.json()

def evaluate_global_variable(var_name, frame_id=None):
    """Evaluate a global variable at current breakpoint"""
    params = {"expression": var_name}
    if frame_id:
        params["frameId"] = frame_id
    
    response = requests.post(f"{BASE_URL}/api/debug", json={
        "operation": "evaluate",
        "params": params
    })
    return response.json()

def get_available_variables():
    """Get list of variables in current scope"""
    response = requests.post(f"{BASE_URL}/api/debug", json={
        "operation": "get_scope_preview"
    })
    return response.json()

# Usage example
if __name__ == "__main__":
    # Get available variables
    scope = get_available_variables()
    print("Available variables:", scope['data']['scopePreview']['locals'])
    
    # Try to evaluate global variable
    result = evaluate_global_variable("g_system_state")
    if result['success']:
        print(f"g_system_state = {result['data']['result']}")
    else:
        print(f"Failed: {result['data']['errorMessage']}")
        # Try with frame 0
        result = evaluate_global_variable("g_system_state", frame_id=0)
        print(f"Retry with frame 0: {result}")
```

---

## 📊 CLI Commands

```bash
# Source the CLI library
source ai-debug-proxy/resources/ai-debug.sh

# Evaluate global variable
ai_eval "g_system_state"

# Evaluate with specific frame
ai_eval --frame 0 "g_global_config"

# Get scope preview (see available variables)
ai_scope_preview

# Add watchpoint (hardware breakpoint on variable change)
# Note: This requires the variable to be in current scope
curl -X POST http://localhost:9999/api/debug \
  -d '{"operation":"watch","params":{"name":"my_var","accessType":"write"}}'
```

---

## 🔍 Troubleshooting

### Problem: "Variable not found in current scope"

**Cause:** Global variable not visible from current stack frame

**Solutions:**
1. Try evaluating from frame 0 (top of stack):
   ```bash
   ai_eval --frame 0 "g_global_variable"
   ```

2. Check if variable exists in binary:
   ```bash
   # Using GDB directly
   gdb ./build/cooling_ecu -ex "info variables g_global_variable" -ex "quit"
   ```

3. Compile with debug symbols:
   ```bash
   make CFLAGS="-g -O0"
   ```

### Problem: "Variable optimized out"

**Cause:** Compiler optimized away the variable

**Solution:** Recompile with `-O0` flag:
```bash
make clean && make CFLAGS="-g -O0"
```

### Problem: Watch operation fails

**Cause:** Hardware watchpoints require variable to be in scope

**Solution:** Use `evaluate` instead of `watch` for global variables:
```bash
# Instead of watch (which sets hardware breakpoint)
ai_eval "g_global_variable"  # Just read the value
```

---

## 📝 Summary

| Use Case | Recommended Operation |
|----------|----------------------|
| Read global variable value | `evaluate` |
| Monitor variable changes | `watch` (if in scope) |
| See available variables | `get_scope_preview` |
| Debug global state | `evaluate` + `stack_trace` |

**For AI Agents:** Use `evaluate` for reading global variables, `get_scope_preview` to discover available variables in current scope.

---

**Last Updated:** 2026-03-18
