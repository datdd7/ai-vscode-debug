# HTTP API Reference

**Source:** AI Debug Proxy Extension
**Base URL:** http://localhost:9999
**Version:** 1.0.0

---

## 🎯 Overview

This document provides a quick reference for HTTP API endpoints used by Axel. For complete documentation, see:
- `/home/datdang/working/common_dev/ai_vscode_debug/docs/guides/ai-agent-technical-guide.md`

---

## 📡 System Endpoints

### GET /api/ping

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
    "operations": ["launch", "continue", "next", ...]
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

---

### GET /api/status

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
    "sessionId": "abc123"
  },
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

---

## 🔍 LSP Endpoints

### GET /api/symbols

**Purpose:** Get document symbols

**Request:**
```bash
curl "http://localhost:9999/api/symbols?file=/path/to/file.c"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "name": "main",
        "kind": "Function",
        "file": "/path/to/file.c",
        "line": 10
      }
    ]
  }
}
```

---

### GET /api/references

**Purpose:** Find references to symbol

**Request:**
```bash
curl "http://localhost:9999/api/references?symbol=my_function"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "references": [
      {
        "file": "/path/to/file.c",
        "line": 25
      }
    ]
  }
}
```

---

### GET /api/call-hierarchy

**Purpose:** Get call hierarchy

**Request:**
```bash
curl "http://localhost:9999/api/call-hierarchy?symbol=my_function"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callers": [...],
    "callees": [...]
  }
}
```

---

## 🤖 Subagent Endpoint

### POST /api/subagents

**Purpose:** Spawn concurrent CLI tasks

**Request:**
```bash
curl -X POST http://localhost:9999/api/subagents \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id": "1", "command": "qwen", "input": "Review this code"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "1",
        "success": true,
        "stdout": "...",
        "stderr": "",
        "exitCode": 0
      }
    ]
  }
}
```

---

## 📋 Debug Operations (via HTTP)

**Note:** Axel uses CLI (ai-debug.sh) for debug operations. HTTP API is available but not primary.

### POST /api/debug

**Purpose:** Execute debug operation

**Request:**
```json
{
  "operation": "launch",
  "params": {
    "program": "/path/to/binary",
    "stopOnEntry": true
  }
}
```

**Operations:**
- Session: `launch`, `restart`, `quit`
- Execution: `continue`, `next`, `step_in`, `step_out`, `jump`, `until`
- Breakpoints: `set_breakpoint`, `set_temp_breakpoint`, `remove_breakpoint`, ...
- Inspection: `stack_trace`, `list_source`, `evaluate`, `pretty_print`, `whatis`, ...
- Advanced: `list_threads`, `switch_thread`, `get_registers`, `read_memory`, `disassemble`

---

## 🛡️ Error Responses

**Format:**
```json
{
  "success": false,
  "operation": "launch",
  "error": "Error message",
  "timestamp": "2026-03-17T10:00:00.000Z"
}
```

**Common Errors:**
- `400 Bad Request` - Invalid parameters
- `403 Forbidden` - User denied approval
- `404 Not Found` - Unknown operation
- `500 Internal Error` - Server error

---

## 📊 Performance

| Endpoint | Typical Latency | Timeout |
|----------|----------------|---------|
| /api/ping | <10ms | 5s |
| /api/status | <10ms | 5s |
| /api/symbols | 50-200ms | 30s |
| /api/references | 50-200ms | 30s |
| /api/subagents | 100-500ms | 60s |
| /api/debug | 10-100ms | 30s |

---

*Quick reference for Axel HTTP API integration*
