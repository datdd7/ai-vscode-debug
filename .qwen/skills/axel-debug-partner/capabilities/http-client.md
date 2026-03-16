# Capability: HTTP Client

**Purpose:** HTTP API integration for LSP and subagent operations

**Type:** External Capability
**Implementation:** HTTP REST API calls

---

## 🎯 Overview

This capability enables Axel to call HTTP API endpoints for operations that don't have CLI equivalents:
- **LSP Integration:** Document symbols, references, call hierarchy
- **Subagent Spawning:** Parallel task execution
- **System Operations:** Ping, status check

**Why HTTP:**
- No CLI equivalent for LSP operations
- Subagent API designed for HTTP
- Lightweight for simple queries
- JSON-native (no parsing needed)

---

## 📁 Configuration

**Base URL:**
```
http://localhost:9999
```

**Headers:**
```
Content-Type: application/json
```

**Timeout:**
```
30 seconds
```

---

## 🔧 Endpoints

### System Endpoints

#### GET /api/ping

**Purpose:** Health check and operation discovery

**Request:**
```bash
curl http://localhost:9999/api/ping
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "pong",
    "version": "1.0.0",
    "operations": [
      "launch", "continue", "next", "step_in", "step_out",
      "set_breakpoint", "stack_trace", "evaluate", ...
    ]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
async checkProxyHealth(): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/ping`);
    const data = await resp.json();
    return data.success === true;
}
```

---

#### GET /api/status

**Purpose:** Get current debug session status

**Request:**
```bash
curl http://localhost:9999/api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "hasActiveSession": true,
    "sessionId": "abc123-def456",
    "sessionName": "AI Debug Proxy"
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
async getSessionStatus(): Promise<SessionStatus> {
    const resp = await fetch(`${this.baseUrl}/api/status`);
    const data = await resp.json();
    return data.data;
}
```

---

### LSP Endpoints

#### GET /api/symbols

**Purpose:** Get document symbols (functions, variables, classes)

**Request:**
```bash
curl "http://localhost:9999/api/symbols?file=/path/to/file.c"
```

**Parameters:**
- `file` (optional): File path to get symbols for

**Response:**
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "name": "main",
        "kind": "Function",
        "range": {
          "start": {"line": 10, "character": 0},
          "end": {"line": 50, "character": 1}
        },
        "file": "/path/to/main.c"
      },
      {
        "name": "sensor_data",
        "kind": "Variable",
        "type": "struct sensor_t",
        "range": {
          "start": {"line": 5, "character": 0},
          "end": {"line": 5, "character": 20}
        },
        "file": "/path/to/main.c"
      }
    ]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
async getSymbols(filePath?: string): Promise<Symbol[]> {
    const url = filePath 
        ? `${this.baseUrl}/api/symbols?file=${encodeURIComponent(filePath)}`
        : `${this.baseUrl}/api/symbols`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    return data.data.symbols;
}
```

**Axel Use Cases:**
- Find all functions in file before setting breakpoints
- Locate variable declarations
- Understand code structure quickly

---

#### GET /api/references

**Purpose:** Find all references to a symbol

**Request:**
```bash
curl "http://localhost:9999/api/references?symbol=my_function&file=/path/to/file.c"
```

**Parameters:**
- `symbol` (required): Symbol name to find references for
- `file` (optional): Limit to specific file
- `includeDeclaration` (optional): Include declaration in results

**Response:**
```json
{
  "success": true,
  "data": {
    "references": [
      {
        "file": "/path/to/main.c",
        "line": 25,
        "character": 4,
        "context": "result = my_function(value);"
      },
      {
        "file": "/path/to/utils.c",
        "line": 42,
        "character": 0,
        "context": "void my_function(int x) {"
      }
    ]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
async findReferences(symbol: string, filePath?: string): Promise<Reference[]> {
    const params = new URLSearchParams({ symbol });
    if (filePath) params.append('file', filePath);
    
    const resp = await fetch(`${this.baseUrl}/api/references?${params}`);
    const data = await resp.json();
    return data.data.references;
}
```

**Axel Use Cases:**
- Find all call sites of a function
- Track variable usage across files
- Understand impact of a bug

---

#### GET /api/call-hierarchy

**Purpose:** Get call hierarchy (callers and callees)

**Request:**
```bash
curl "http://localhost:9999/api/call-hierarchy?symbol=my_function&file=/path/to/file.c"
```

**Parameters:**
- `symbol` (required): Symbol name
- `file` (optional): File path
- `direction` (optional): "incoming" | "outgoing" | "both" (default: "both")

**Response:**
```json
{
  "success": true,
  "data": {
    "callers": [
      {
        "name": "main",
        "file": "/path/to/main.c",
        "line": 15
      },
      {
        "name": "worker_thread",
        "file": "/path/to/worker.c",
        "line": 30
      }
    ],
    "callees": [
      {
        "name": "helper_function",
        "file": "/path/to/utils.c",
        "line": 50
      },
      {
        "name": "printf",
        "file": "<library>",
        "line": -1
      }
    ]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
async getCallHierarchy(symbol: string, filePath?: string): Promise<CallHierarchy> {
    const params = new URLSearchParams({ 
        symbol,
        direction: 'both'
    });
    if (filePath) params.append('file', filePath);
    
    const resp = await fetch(`${this.baseUrl}/api/call-hierarchy?${params}`);
    const data = await resp.json();
    return data.data;
}
```

**Axel Use Cases:**
- Understand call flow for debugging
- Find where function is called from
- Identify functions called by suspected buggy function

---

### Subagent Endpoints

#### POST /api/subagents

**Purpose:** Spawn concurrent CLI tasks (subagents)

**Request:**
```bash
curl -X POST http://localhost:9999/api/subagents \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "id": "1",
        "command": "qwen",
        "input": "Review main.c for memory leaks"
      },
      {
        "id": "2",
        "command": "cursor",
        "input": "Find all malloc calls without free"
      }
    ],
    "timeout": 60000,
    "maxConcurrency": 3
  }'
```

**Parameters:**
- `tasks` (required): Array of subagent tasks
  - `id`: Task identifier
  - `command`: CLI command (qwen, cursor, claude, etc.)
  - `input`: Task description/prompt
- `timeout` (optional): Timeout in ms (default: 60000)
- `maxConcurrency` (optional): Max parallel tasks (default: 5)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "1",
        "success": true,
        "stdout": "Found 2 potential memory leaks:\n- Line 45: malloc without free\n- Line 78: ...",
        "stderr": "",
        "exitCode": 0
      },
      {
        "id": "2",
        "success": true,
        "stdout": "Found 3 malloc calls:\n- Line 45: buffer = malloc(256)\n- ...",
        "stderr": "",
        "exitCode": 0
      }
    ]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Usage:**
```typescript
interface SubagentTask {
    id: string;
    command: string;
    input: string;
}

interface SubagentResult {
    id: string;
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}

async spawnSubagents(tasks: SubagentTask[]): Promise<SubagentResult[]> {
    const resp = await fetch(`${this.baseUrl}/api/subagents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tasks,
            timeout: 60000,
            maxConcurrency: 3
        })
    });
    
    const data = await resp.json();
    return data.data.results;
}
```

**Axel Use Cases:**
- Parallel code review (spawn multiple agents)
- Concurrent file analysis
- Background research while debugging

---

## 🛡️ Error Handling

### Pattern 1: HTTP Error
```typescript
async safeFetch(url: string): Promise<any> {
    try {
        const resp = await fetch(url, { timeout: 30000 });
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        return await resp.json();
    } catch (error) {
        console.error(`HTTP request failed: ${error.message}`);
        throw error;
    }
}
```

### Pattern 2: Parse Error Response
```typescript
async callEndpoint(endpoint: string): Promise<any> {
    const resp = await fetch(`${this.baseUrl}${endpoint}`);
    const data = await resp.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Unknown error');
    }
    
    return data.data;
}
```

### Pattern 3: Timeout Handling
```typescript
async fetchWithTimeout(url: string, timeoutMs: number = 30000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return await resp.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    }
}
```

---

## 📋 Implementation Template

### TypeScript Client
```typescript
class AxelHttpClient {
    private baseUrl: string;
    
    constructor(baseUrl: string = 'http://localhost:9999') {
        this.baseUrl = baseUrl;
    }
    
    async ping(): Promise<boolean> {
        const resp = await fetch(`${this.baseUrl}/api/ping`);
        const data = await resp.json();
        return data.success === true;
    }
    
    async getSymbols(filePath?: string): Promise<Symbol[]> {
        const url = filePath 
            ? `${this.baseUrl}/api/symbols?file=${encodeURIComponent(filePath)}`
            : `${this.baseUrl}/api/symbols`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        return data.data.symbols;
    }
    
    async findReferences(symbol: string, filePath?: string): Promise<Reference[]> {
        const params = new URLSearchParams({ symbol });
        if (filePath) params.append('file', filePath);
        
        const resp = await fetch(`${this.baseUrl}/api/references?${params}`);
        const data = await resp.json();
        return data.data.references;
    }
    
    async getCallHierarchy(symbol: string, filePath?: string): Promise<CallHierarchy> {
        const params = new URLSearchParams({ symbol, direction: 'both' });
        if (filePath) params.append('file', filePath);
        
        const resp = await fetch(`${this.baseUrl}/api/call-hierarchy?${params}`);
        const data = await resp.json();
        return data.data;
    }
    
    async spawnSubagents(tasks: SubagentTask[]): Promise<SubagentResult[]> {
        const resp = await fetch(`${this.baseUrl}/api/subagents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks, timeout: 60000, maxConcurrency: 3 })
        });
        
        const data = await resp.json();
        return data.data.results;
    }
}
```

---

## 🎯 Best Practices

### DO:
- Check proxy health before calling other endpoints
- Use timeout for all HTTP requests
- Handle 404 gracefully (endpoint might not exist)
- Parse JSON responses carefully
- Use URLSearchParams for query parameters

### DON'T:
- Call HTTP API for operations covered by CLI (use CLI instead)
- Forget to handle network errors
- Assume endpoints always return data
- Make synchronous HTTP calls (always async)

---

## 📊 Performance Notes

- **HTTP overhead:** ~5-20ms per call
- **LSP queries:** ~50-200ms depending on file size
- **Subagent spawning:** ~100-500ms + execution time
- **Recommendation:** Use for LSP/subagents only, not for debug ops

---

*This capability enables Axel to access LSP features and spawn subagents via HTTP API*
