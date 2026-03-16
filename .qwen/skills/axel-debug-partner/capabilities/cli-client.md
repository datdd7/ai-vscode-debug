# Capability: CLI Client

**Purpose:** Execute debug operations via ai-debug.sh CLI script

**Type:** External Capability
**Implementation:** Bash script execution

---

## 🎯 Overview

This capability enables Axel to execute debug operations by calling functions from `ai-debug.sh` - the CLI helper script that wraps HTTP API calls.

**Why CLI:**
- Shorter, more concise code
- Direct execution without HTTP client overhead
- Pre-tested and reliable
- Built-in error handling and output formatting

---

## 📁 Prerequisites

1. **ai-debug.sh Location:**
   ```bash
   /path/to/ai-debug-proxy/resources/ai-debug.sh
   ```

2. **Environment:**
   - Bash shell available
   - curl installed
   - jq installed
   - Debug proxy running on localhost:9999

3. **Setup:**
   ```bash
   # Source the script once
   source /path/to/ai-debug.sh
   ```

---

## 🔧 Operations

### Session Management

#### launch
**Purpose:** Start debug session

**Command:**
```bash
ai_launch "<program>" [stopOnEntry] [workspacePath]
```

**Example:**
```bash
ai_launch "./build/app" true "/home/user/project"
```

**Expected Output:**
```
✓ Debug session launched
```

**Error Handling:**
- Check return code ($?)
- Parse error message from stderr
- Handle "proxy not running" case

---

#### restart
**Purpose:** Restart current debug session

**Command:**
```bash
ai_restart
```

**Expected Output:**
```
✓ Session restarted
```

---

#### quit
**Purpose:** End debug session

**Command:**
```bash
ai_quit
```

**Expected Output:**
```
✓ Debug session ended
```

---

### Execution Control

#### continue
**Purpose:** Resume execution until next breakpoint

**Command:**
```bash
ai_continue
```

**Expected Output:**
```
✓ Continued
→ main.c:42
```

**Parse Result:**
```bash
# Extract location
location=$(ai_continue | grep "→" | sed 's/→ //')
# Result: "main.c:42"
```

---

#### next
**Purpose:** Step over (execute one line)

**Command:**
```bash
ai_next
```

**Expected Output:**
```
✓ Stepped
→ main.c:43
```

---

#### step_in
**Purpose:** Step into function call

**Command:**
```bash
ai_step_in
```

**Expected Output:**
```
✓ Stepped in
→ utils.c:25
```

---

#### step_out
**Purpose:** Step out of current function

**Command:**
```bash
ai_step_out
```

**Expected Output:**
```
✓ Stepped out
→ main.c:50
```

---

#### until
**Purpose:** Run until specific line (sets temp BP)

**Command:**
```bash
ai_until <line>
```

**Example:**
```bash
ai_until 100
```

---

### Breakpoint Management

#### set_breakpoint
**Purpose:** Set persistent breakpoint

**Command:**
```bash
ai_bp "<file>" <line> [condition]
```

**Example:**
```bash
ai_bp "main.c" 42
ai_bp "ring_buffer.c" 25 "head >= size"
```

**Expected Output:**
```
✓ Breakpoint set
```

**Duplicate Detection:**
```bash
# Check if BP already exists
bps=$(ai_bps | jq -r '.[] | select(.location.path | contains("main.c")) | select(.location.line == 42)')
if [[ -n "$bps" ]]; then
    echo "Breakpoint already exists"
else
    ai_bp "main.c" 42
fi
```

---

#### set_temp_breakpoint
**Purpose:** Set temporary breakpoint (auto-removes on hit)

**Command:**
```bash
ai_tbp "<file>" <line>
```

**Example:**
```bash
ai_tbp "main.c" 42
```

**Expected Output:**
```
✓ Temporary breakpoint set (will auto-remove on hit)
```

---

#### clear_bps
**Purpose:** Remove all breakpoints in file

**Command:**
```bash
ai_clear_bps "<file>"
```

**Example:**
```bash
ai_clear_bps "main.c"
```

---

#### list_bps
**Purpose:** List all active breakpoints

**Command:**
```bash
ai_bps
```

**Expected Output:**
```json
[
  {
    "id": "bp-001",
    "location": {
      "path": "/home/user/main.c",
      "line": 42
    },
    "enabled": true,
    "condition": null
  }
]
```

---

### State Inspection

#### stack_trace
**Purpose:** Get current call stack

**Command:**
```bash
ai_stack
```

**Expected Output:**
```json
[
  {
    "id": 1000,
    "name": "main",
    "file": "main.c",
    "path": "/home/user/main.c",
    "line": 42
  },
  {
    "id": 1001,
    "name": "init",
    "file": "init.c",
    "path": "/home/user/init.c",
    "line": 25
  }
]
```

---

#### frame
**Purpose:** Get current top frame only (lightweight)

**Command:**
```bash
ai_frame
```

**Expected Output:**
```json
{
  "id": 1000,
  "function": "main",
  "file": "main.c",
  "path": "/home/user/main.c",
  "line": 42
}
```

---

#### variables
**Purpose:** Get variables in current frame

**Command:**
```bash
ai_vars [frameId]
```

**Example:**
```bash
ai_vars
ai_vars 1000
```

**Expected Output:**
```json
[
  {"name": "temperature", "value": "95", "type": "int"},
  {"name": "offset", "value": "5", "type": "int"},
  {"name": "buf", "value": "0x7fff5fbff8a0", "type": "uint8_t *"}
]
```

---

#### evaluate
**Purpose:** Evaluate expression

**Command:**
```bash
ai_eval "<expression>"
```

**Example:**
```bash
ai_eval "temperature + offset"
ai_eval "buffer[0]"
ai_eval "*ptr"
```

**Expected Output:**
```
100
```

---

#### source
**Purpose:** List source code around current line

**Command:**
```bash
ai_source [lines_around]
```

**Example:**
```bash
ai_source 3
```

**Expected Output:**
```
  39: int x = 0;
  40: 
  41: // Process data
> 42: x = process_data(buf);
  43: 
  44: return x;
```

---

#### pretty_print
**Purpose:** Pretty-print struct/array

**Command:**
```bash
ai_pretty "<expression>"
```

**Example:**
```bash
ai_pretty "my_struct"
```

**Expected Output:**
```json
{
  "name": "my_struct",
  "type": "sensor_t",
  "value": "{...}",
  "fields": [
    {"name": "id", "type": "int", "value": "42"},
    {"name": "name", "type": "char[32]", "value": "\"sensor1\""},
    {"name": "value", "type": "float", "value": "3.14"}
  ]
}
```

---

#### type
**Purpose:** Get type of expression

**Command:**
```bash
ai_type "<expression>"
```

**Example:**
```bash
ai_type "my_variable"
```

**Expected Output:**
```
struct TemperatureSensor
```

---

#### args
**Purpose:** Get function arguments

**Command:**
```bash
ai_args
```

**Expected Output:**
```json
[
  {"name": "argc", "value": "3", "type": "int"},
  {"name": "argv", "value": "0x7fff5fbff8a0", "type": "char **"}
]
```

---

### Advanced Operations

#### watch
**Purpose:** Set watchpoint on variable

**Command:**
```bash
ai_watch "<varname>" [read|write|readWrite]
```

**Example:**
```bash
ai_watch "global_counter" write
ai_watch "shared_buffer" read
```

**Expected Output:**
```json
{
  "dataId": "watch-001",
  "accessType": "write"
}
```

---

#### threads
**Purpose:** List all threads

**Command:**
```bash
ai_threads
```

**Expected Output:**
```json
[
  {"id": 1, "name": "main", "state": "stopped"},
  {"id": 2, "name": "worker", "state": "running"}
]
```

---

#### last_stop
**Purpose:** Get last stop information

**Command:**
```bash
ai_last_stop
```

**Expected Output:**
```json
{
  "sessionId": "abc123",
  "stopInfo": {
    "reason": "breakpoint",
    "threadId": 1,
    "description": "Breakpoint hit at main.c:42"
  }
}
```

---

## 🛡️ Error Handling

### Pattern 1: Check Return Code
```bash
result=$(ai_launch "./build/app")
if [[ $? -ne 0 ]]; then
    echo "Failed to launch"
    # Handle error
fi
```

### Pattern 2: Parse Error Message
```bash
result=$(ai_eval "invalid_expr" 2>&1)
if [[ $? -ne 0 ]]; then
    error=$(echo "$result" | jq -r '.error // .data.errorMessage // empty')
    echo "Error: $error"
fi
```

### Pattern 3: Proxy Not Running
```bash
if ! ai_status > /dev/null 2>&1; then
    echo "Debug proxy not running"
    echo "Start with: Command Palette → AI Debug Proxy: Start Server"
    return 1
fi
```

### Pattern 4: Strip ANSI Codes
```bash
# Remove color codes from output
clean_output=$(echo "$colored_output" | sed 's/\x1b\[[0-9;]*m//g')
```

---

## 📋 Implementation Template

### Bash Function Wrapper
```bash
axel_launch() {
    local program="$1"
    local stop_on_entry="${2:-true}"
    local workspace="$3"
    
    # Source the script
    source /path/to/ai-debug.sh
    
    # Launch
    local result
    result=$(ai_launch "$program" "$stop_on_entry" "$workspace" 2>&1)
    local status=$?
    
    if [[ $status -ne 0 ]]; then
        echo "ERROR: Failed to launch debug session"
        echo "$result"
        return 1
    fi
    
    echo "$result"
    return 0
}

axel_eval() {
    local expr="$1"
    
    source /path/to/ai-debug.sh
    
    local result
    result=$(ai_eval "$expr" 2>&1)
    
    if [[ $? -ne 0 ]]; then
        echo "ERROR: Evaluation failed"
        return 1
    fi
    
    # Strip ANSI codes
    echo "$result" | sed 's/\x1b\[[0-9;]*m//g'
}
```

### TypeScript/Node.js Wrapper
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class AxelCliClient {
    private cliScript: string;
    
    constructor(cliPath: string) {
        this.cliScript = cliPath;
    }
    
    async launch(program: string, stopOnEntry: boolean = true): Promise<void> {
        const cmd = `source ${this.cliScript} && ai_launch "${program}" ${stopOnEntry}`;
        try {
            const { stdout, stderr } = await execAsync(cmd);
            if (stderr) throw new Error(stderr);
            console.log(stdout);
        } catch (error) {
            throw new Error(`Failed to launch: ${error.message}`);
        }
    }
    
    async evaluate(expr: string): Promise<string> {
        const cmd = `source ${this.cliScript} && ai_eval "${expr}"`;
        const { stdout } = await execAsync(cmd);
        // Strip ANSI codes
        return stdout.replace(/\x1b\[[0-9;]*m/g, '');
    }
    
    async getFrame(): Promise<any> {
        const cmd = `source ${this.cliScript} && ai_frame`;
        const { stdout } = await execAsync(cmd);
        return JSON.parse(stdout);
    }
}
```

---

## 🎯 Best Practices

### DO:
- Source the script once per session
- Check return codes
- Strip ANSI codes from output
- Handle "proxy not running" gracefully
- Use temp breakpoints for one-time stops

### DON'T:
- Hardcode absolute paths (use environment variables)
- Ignore error messages
- Forget to handle ANSI codes
- Call HTTP API directly when CLI is available

---

## 📊 Performance Notes

- **CLI overhead:** ~10-50ms per call (bash + curl)
- **HTTP overhead:** ~5-20ms per call (direct HTTP)
- **Recommendation:** CLI for interactive, HTTP for batch operations

---

*This capability enables Axel to execute all debug operations via ai-debug.sh*
