# CLI Commands Reference

**Source:** ai-debug.sh script
**Location:** /path/to/ai-debug-proxy/resources/ai-debug.sh
**Version:** 1.0.0

---

## 🎯 Overview

This document provides a quick reference for CLI commands from ai-debug.sh used by Axel.

**Usage Pattern:**
```bash
source /path/to/ai-debug.sh
# Then call commands
ai_launch "./build/app"
ai_bp "main.c" 42
ai_continue
```

---

## 📡 Session Management

### ai_launch

**Purpose:** Start debug session

**Syntax:**
```bash
ai_launch <program> [stopOnEntry] [workspacePath]
```

**Example:**
```bash
ai_launch "./build/app" true "/home/user/project"
```

---

### ai_restart

**Purpose:** Restart debug session

**Syntax:**
```bash
ai_restart
```

---

### ai_quit

**Purpose:** End debug session

**Syntax:**
```bash
ai_quit
```

---

## ▶️ Execution Control

### ai_continue

**Purpose:** Resume execution

**Syntax:**
```bash
ai_continue
```

**Output:**
```
✓ Continued
→ main.c:42
```

---

### ai_next

**Purpose:** Step over

**Syntax:**
```bash
ai_next
```

---

### ai_step_in

**Purpose:** Step into

**Syntax:**
```bash
ai_step_in
```

---

### ai_step_out

**Purpose:** Step out

**Syntax:**
```bash
ai_step_out
```

---

### ai_until

**Purpose:** Run until line

**Syntax:**
```bash
ai_until <line>
```

---

### ai_jump

**Purpose:** Jump to line

**Syntax:**
```bash
ai_jump <line>
```

---

## 🎯 Breakpoints

### ai_bp

**Purpose:** Set breakpoint

**Syntax:**
```bash
ai_bp <file> <line> [condition]
```

**Example:**
```bash
ai_bp "main.c" 42
ai_bp "ring_buffer.c" 25 "head >= size"
```

---

### ai_tbp

**Purpose:** Set temporary breakpoint

**Syntax:**
```bash
ai_tbp <file> <line>
```

---

### ai_bps

**Purpose:** List breakpoints

**Syntax:**
```bash
ai_bps
```

**Output:**
```json
[
  {"id": "bp-001", "location": {"path": "main.c", "line": 42}}
]
```

---

### ai_clear_bps

**Purpose:** Clear all breakpoints in file

**Syntax:**
```bash
ai_clear_bps <file>
```

---

## 🔍 State Inspection

### ai_stack

**Purpose:** Get stack trace

**Syntax:**
```bash
ai_stack
```

**Output:**
```json
[
  {"id": 1000, "name": "main", "file": "main.c", "line": 42}
]
```

---

### ai_frame

**Purpose:** Get current frame (lightweight)

**Syntax:**
```bash
ai_frame
```

**Output:**
```json
{
  "id": 1000,
  "function": "main",
  "file": "main.c",
  "line": 42
}
```

---

### ai_vars

**Purpose:** Get variables

**Syntax:**
```bash
ai_vars [frameId]
```

---

### ai_eval

**Purpose:** Evaluate expression

**Syntax:**
```bash
ai_eval <expression>
```

**Example:**
```bash
ai_eval "temperature + offset"
```

---

### ai_source

**Purpose:** List source code

**Syntax:**
```bash
ai_source [lines_around]
```

**Example:**
```bash
ai_source 3
```

---

### ai_pretty

**Purpose:** Pretty print struct/array

**Syntax:**
```bash
ai_pretty <expression>
```

---

### ai_type

**Purpose:** Get type

**Syntax:**
```bash
ai_type <expression>
```

---

### ai_args

**Purpose:** Get function arguments

**Syntax:**
```bash
ai_args
```

---

## 🔧 Advanced

### ai_watch

**Purpose:** Set watchpoint

**Syntax:**
```bash
ai_watch <varname> [read|write|readWrite]
```

---

### ai_threads

**Purpose:** List threads

**Syntax:**
```bash
ai_threads
```

---

### ai_last_stop

**Purpose:** Get last stop info

**Syntax:**
```bash
ai_last_stop
```

---

### ai_status

**Purpose:** Check proxy status

**Syntax:**
```bash
ai_status
```

**Output:**
```
✓ Debug proxy is running at http://localhost:9999
```

---

## 🛡️ Error Handling

### Check Return Code

```bash
result=$(ai_launch "./build/app")
if [[ $? -ne 0 ]]; then
    echo "Failed to launch"
fi
```

### Strip ANSI Codes

```bash
clean=$(echo "$colored" | sed 's/\x1b\[[0-9;]*m//g')
```

### Parse JSON Output

```bash
value=$(ai_eval "x" | jq -r '.')
```

---

## 📊 Performance

| Command | Typical Time |
|---------|-------------|
| ai_launch | 100-500ms |
| ai_bp | 50-100ms |
| ai_continue | 50-200ms |
| ai_step_in | 50-100ms |
| ai_stack | 50-100ms |
| ai_eval | 30-80ms |
| ai_frame | 30-50ms |

---

*Quick reference for Axel CLI integration*
