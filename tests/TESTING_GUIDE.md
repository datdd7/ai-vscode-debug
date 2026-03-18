# Testing Guide - Phase 1 & Phase 2 Features

**Date:** 2026-03-18  
**Status:** Ready for Testing  
**Extension:** ai-debug-proxy-1.0.0.vsix  

---

## 🚀 Quick Start

### Step 1: Reload VS Code

```
Command Palette → Developer: Reload Window
```

This ensures the new operations are loaded.

### Step 2: Verify Proxy is Running

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
    "operations": [
      "launch", "continue", "next", "step_in", "step_out",
      "get_scope_preview",  // ← NEW (PROXY-004)
      "watch",              // ← NEW (PROXY-003)
      ...
    ]
  }
}
```

### Step 3: Build Playground

```bash
cd playground
make clean && make
# Output: build/cooling_ecu (with debug symbols -g)
```

---

## 🧪 Testing Each Feature

### PROXY-001: Smart Default Context

**What it does:** Auto-tracks thread/frame IDs, no need to specify manually.

**Test Commands:**
```bash
# Source the CLI library
source ai-debug-proxy/resources/ai-debug.sh

# Launch debug session
ai_launch ./build/cooling_ecu

# Set breakpoint
ai_bp main.c 20

# Continue to breakpoint
ai_continue

# Test: Get session state (should show current thread/frame)
ai_session_state

# Expected output:
{
  "success": true,
  "data": {
    "sessionId": "...",
    "threadId": 1,
    "frameId": 0,
    "location": {
      "file": "/path/to/main.c",
      "line": 20,
      "function": "main"
    },
    "stateValid": true
  }
}

# Test: Evaluate without specifying frame/thread (auto-resolved!)
ai_eval "argc"
ai_eval "argv"

# Should work without errors!
```

**Expected Behavior:**
- ✅ `ai_session_state` returns current thread/frame
- ✅ `ai_eval` works without `--frame` or `--thread` flags
- ✅ State persists across multiple commands

---

### PROXY-002: ai_context Snapshot

**What it does:** Single API call returns full debug context (stack, variables, source, threads).

**Test Commands:**
```bash
# Get full context snapshot
ai_context

# Expected output:
{
  "success": true,
  "data": {
    "location": { ... },
    "source": { ... },
    "stack": [ ... ],
    "variables": [ ... ],
    "threads": [ ... ],
    "metadata": {
      "latencyMs": 45,  // Should be < 100ms
      "compressionApplied": true
    }
  }
}

# Test with filters
ai_context --depth 3              # Limit to 3 stack frames
ai_context --include stack,variables  # Only stack and variables
ai_context --exclude source,threads   # Everything except source and threads
```

**Expected Behavior:**
- ✅ Returns within 100ms
- ✅ Contains all sections (location, source, stack, variables, threads)
- ✅ Filtering works correctly
- ✅ Metadata shows latency and compression

---

### PROXY-003: ai_watch_suggest

**What it does:** Suggests variables to watch based on heuristics (changes, boundary risks, FSM).

**Test Commands:**
```bash
# Get watch suggestions
ai_watch_suggest

# Expected output:
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "variable": "temp",
        "reason": "Changed 2 times in last 5 steps",
        "riskLevel": "medium",
        "riskScore": 2,
        "expression": "temp",
        "category": "recent_change"
      },
      {
        "variable": "duty",
        "reason": "Value 245 is 96% of uint8 max (255)",
        "riskLevel": "high",
        "riskScore": 3,
        "expression": "duty",
        "category": "boundary"
      }
    ],
    "autoWatch": ["temp", "duty"],
    "metadata": {
      "highRiskCount": 1,
      "mediumRiskCount": 1,
      "lowRiskCount": 0
    }
  }
}

# Enable auto-watch (placeholder)
ai_watch_auto_enable
```

**Expected Behavior:**
- ✅ Returns 3-10 suggestions
- ✅ Suggestions have risk levels (high/medium/low)
- ✅ Categories: recent_change, boundary, fsm, null_pointer
- ✅ Auto-watch list populated

---

### PROXY-004: Function Scope Preview

**What it does:** Auto-fetches function parameters and locals when stepping into a function.

**Test Commands:**
```bash
# Method 1: Auto-scope on step_in
ai_step_in

# Response includes scopePreview:
{
  "success": true,
  "stopReason": "step",
  "scopePreview": {
    "parameters": [
      {
        "name": "temp",
        "type": "Rte_TemperatureType",
        "value": "250",
        "status": "initialized"
      },
      {
        "name": "calib",
        "type": "const Rte_CalibDataType*",
        "value": "0x7fff5fbff8a0",
        "status": "initialized"
      }
    ],
    "locals": [
      {
        "name": "duty",
        "type": "uint8",
        "value": "optimized out",
        "status": "uninitialized"
      }
    ]
  }
}

# Method 2: Explicit scope preview request
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{"operation":"get_scope_preview"}'
```

**Expected Behavior:**
- ✅ `step_in` response includes `scopePreview`
- ✅ Parameters separated from locals
- ✅ Uninitialized variables marked (optimized out)
- ✅ Works on any function step-in

---

## 🎯 Full Integration Test

**Scenario:** Debug the `CalculateFanDuty` function

```bash
# 1. Setup
cd playground
source ../ai-debug-proxy/resources/ai-debug.sh

# 2. Launch
ai_launch ./build/cooling_ecu

# 3. Set breakpoint at function entry
ai_bp SWC_MotorControl.c 35  # CalculateFanDuty line

# 4. Continue to breakpoint
ai_continue

# 5. Test PROXY-001: Session state
ai_session_state
# Should show current location at CalculateFanDuty

# 6. Test PROXY-002: Full context
ai_context --depth 5
# Should show stack, variables, source around line 35

# 7. Test PROXY-003: Watch suggestions
ai_watch_suggest
# Should suggest watching temp, calib, duty variables

# 8. Step into function (PROXY-004)
ai_step_in
# Should include scopePreview with parameters and locals

# 9. Evaluate variables (PROXY-001 auto-resolution)
ai_eval "temp"
ai_eval "calib"
ai_eval "duty"
# All should work without specifying frame/thread

# 10. Continue and watch suggestions update
ai_next
ai_watch_suggest
# Suggestions should update based on new state
```

---

## ✅ Test Checklist

### PROXY-001: Smart Default Context
- [ ] `ai_session_state` returns thread/frame/location
- [ ] `ai_eval` works without `--frame` or `--thread`
- [ ] State persists across 10+ commands
- [ ] `ai_set_context` can override defaults

### PROXY-002: Context Snapshot
- [ ] `ai_context` returns within 100ms
- [ ] Response includes all sections
- [ ] `--depth` filter works
- [ ] `--include` filter works
- [ ] `--exclude` filter works

### PROXY-003: Watch Suggestions
- [ ] `ai_watch_suggest` returns 3-10 suggestions
- [ ] Suggestions have risk levels
- [ ] Categories are correct
- [ ] Auto-watch list populated

### PROXY-004: Scope Preview
- [ ] `step_in` includes scopePreview
- [ ] Parameters separated from locals
- [ ] Uninitialized detection works
- [ ] `get_scope_preview` operation works

---

## 🐛 Troubleshooting

### "Proxy not running"
```bash
# Reload VS Code window
# Command Palette → Developer: Reload Window

# Check extension is active
# Look for "AI Debug Proxy: running" in status bar
```

### "Operation not found"
```bash
# Check available operations
curl http://localhost:9999/api/ping | jq '.data.operations'

# If new operations missing, reload VS Code
```

### "No session state"
```bash
# Ensure debugger is stopped at breakpoint
ai_status

# If running, continue to breakpoint first
ai_continue
```

### "Scope preview empty"
```bash
# Ensure stopped inside a function (not at global scope)
ai_stack

# If at frame 0 of main(), step into a function first
ai_step_in
```

---

## 📊 Performance Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| `ai_session_state` | < 10ms | TBD | ⏳ |
| `ai_context` | < 100ms | TBD | ⏳ |
| `ai_watch_suggest` | < 50ms | TBD | ⏳ |
| `step_in` with scope | < 200ms | TBD | ⏳ |

**Run benchmarks:**
```bash
cd tests
./benchmark-all.sh
```

---

## 📝 Test Report Template

```markdown
## Test Report - Phase 1 & 2

**Tester:** [Your name]
**Date:** 2026-03-18
**VS Code Version:** [version]
**OS:** [Linux/macOS/Windows]

### PROXY-001: Smart Default Context
- [ ] Pass / [ ] Fail
- Notes: ...

### PROXY-002: Context Snapshot
- [ ] Pass / [ ] Fail
- Notes: ...

### PROXY-003: Watch Suggestions
- [ ] Pass / [ ] Fail
- Notes: ...

### PROXY-004: Scope Preview
- [ ] Pass / [ ] Fail
- Notes: ...

### Overall Assessment
[Your feedback]

### Bugs Found
1. ...
2. ...

### Suggestions
1. ...
2. ...
```

---

**Ready to test!** Run `./tests/test-all-features.sh` to get started.
