# Traceability Matrix

| Field | Value |
|-------|-------|
| Document ID | TRACE-001 |
| Version | 1.0 |
| Project | AI Debug Proxy (`ai-debug-proxy`) |
| Status | Active |
| Last Updated | 2026-04-01 |

---

## Requirement ID Scheme

| Prefix | Domain | Example |
|--------|--------|---------|
| `REQ-CORE` | Core debug session lifecycle | `REQ-CORE-001` |
| `REQ-API` | REST API contract | `REQ-API-001` |
| `REQ-VAL` | Input validation | `REQ-VAL-001` |
| `REQ-ERR` | Error handling | `REQ-ERR-001` |
| `REQ-LOG` | Logging | `REQ-LOG-001` |
| `REQ-SEC` | Security | `REQ-SEC-001` |
| `REQ-AGENT` | Agent/Orchestration | `REQ-AGENT-001` |
| `REQ-PARSE` | MI2 protocol parsing | `REQ-PARSE-001` |
| `REQ-BACKEND` | GDB backend operations | `REQ-BACKEND-001` |

---

## Requirements and Test Mapping

### REQ-CORE — Session Lifecycle

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-CORE-001 | `initialize()` shall start GDB process and set up MI2 protocol | `GDBBackend.initialize.test.ts` | `initializes with backendType gdb` |
| REQ-CORE-002 | `initialize()` shall reject if GDB fails to start | `GDBBackend.initialize.test.ts` | `rejects when start() throws` |
| REQ-CORE-003 | `initialize()` shall reject if init command fails | `MI2.normalize.test.ts` | `rejects start() when an init command fails` |
| REQ-CORE-004 | `launch()` shall send `-exec-run` to GDB | `GDBBackend.operations.test.ts` | `restart() sends -exec-run` |
| REQ-CORE-005 | Backend manager shall track active session | `BackendManager.test.ts` | `getBackend returns active backend` |
| REQ-CORE-006 | `quit()` shall terminate the GDB process | `GDBBackend.operations.test.ts` | lifecycle tests |

### REQ-API — REST API Contract

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-API-001 | `POST /api/debug` shall dispatch to correct backend operation | `router.operations.test.ts` | all routing tests |
| REQ-API-002 | Router shall return HTTP 200 on success | `router.operations.test.ts` | `routes "continue" to backend.continue()` |
| REQ-API-003 | Router shall return HTTP 400 on validation failure | `router.operations.test.ts` | `returns 400 on invalid operation args` |
| REQ-API-004 | Router shall return HTTP 500 on backend error | `router.operations.test.ts` | `returns 500 on backend error` |
| REQ-API-005 | `read_memory` shall accept both `memoryReference` and `address` params | `router.operations.test.ts` | `read_memory accepts numeric address + length param` |
| REQ-API-006 | `write_memory` shall accept address as string or number | `router.operations.test.ts` | `write_memory accepts string address + no data` |
| REQ-API-007 | `launch` operation shall support VS Code delegate | `router.operations.test.ts` | `launch with delegate uses delegate` |
| REQ-API-008 | `GET /api/version` shall return extension version | `router.operations.test.ts` | version endpoint tests |

### REQ-VAL — Input Validation

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-VAL-001 | `launch` shall require `program` parameter | `validation.test.ts` | `fail when program missing` |
| REQ-VAL-002 | `set_breakpoint` shall require `file` and `line` | `validation.test.ts` | `fail when file or line missing` |
| REQ-VAL-003 | `evaluate` shall require `expression` | `validation.test.ts` | `fail when expression missing` |
| REQ-VAL-004 | `jump` shall require `file` and `line` | `validation.test.ts` | `fail when file or line missing` |
| REQ-VAL-005 | `goto_frame` shall require numeric `frameId` | `validation.test.ts` | `fail when frameId not a number` |
| REQ-VAL-006 | `switch_thread` shall require numeric `threadId` | `validation.test.ts` | `fail when threadId missing` |
| REQ-VAL-007 | `disassemble` shall require `address` | `validation.test.ts` | `fail when address missing` |
| REQ-VAL-008 | Validation shall pass when all required fields present | `validation.test.ts` | `ok with valid ...` tests |

### REQ-ERR — Error Handling

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-ERR-001 | `DebugError` shall carry `code` and `message` | `errors.test.ts` | `DebugError has correct code and message` |
| REQ-ERR-002 | `SessionNotActiveError` shall have code `SESSION_NOT_ACTIVE` | `errors.test.ts` | `SessionNotActiveError` tests |
| REQ-ERR-003 | `InvalidOperationError` shall have code `INVALID_OPERATION` | `errors.test.ts` | `InvalidOperationError` tests |
| REQ-ERR-004 | `executeStatement()` shall throw when GDB not initialized | `GDBBackend.operations.test.ts` | `throws when mi2 is null` |
| REQ-ERR-005 | Backend errors shall propagate as HTTP 500 | `router.operations.test.ts` | `returns 500 on backend error` |

### REQ-LOG — Logging

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-LOG-001 | Output channel shall be initialized on module load | `logging.test.ts` | `outputChannel is initialized on module load` |
| REQ-LOG-002 | `logger.info` shall write to output channel and log file | `logging.test.ts` | `logger.info writes to outputChannel and file` |
| REQ-LOG-003 | Debug messages shall be suppressed when level is `info` | `logging.test.ts` | `logger.debug is suppressed at info level` |
| REQ-LOG-004 | Log level filtering shall respect severity ordering | `logging.test.ts` | level filtering tests |
| REQ-LOG-005 | File write errors shall be silently ignored | `logging.test.ts` | `fs.appendFileSync error is silently swallowed` |

### REQ-SEC — Security

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-SEC-001 | No high-severity npm dependencies | CI: `security` job | `npm audit` |
| REQ-SEC-002 | Subagent commands must be whitelisted | `SubagentOrchestrator.test.ts` | `returns exitCode -3 for non-whitelisted command` |
| REQ-SEC-003 | Subagent stdout is capped at 1MB | `SubagentOrchestrator.test.ts` | `truncates stdout at 1MB` |

### REQ-AGENT — Agent Orchestration

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-AGENT-001 | `subagentCreatorPrompt` shall export a non-empty string | `prompts.test.ts` | `exports a non-empty string prompt` |
| REQ-AGENT-002 | `runParallelSubagents` shall reject when task count > 50 | `SubagentOrchestrator.test.ts` | `throws when task count exceeds MAX_TASKS` |
| REQ-AGENT-003 | `runParallelSubagents` shall respect concurrency limit | `SubagentOrchestrator.test.ts` | `runs 10 tasks with concurrency=2` |
| REQ-AGENT-004 | Timed-out tasks shall return `exitCode: -1` | `SubagentOrchestrator.test.ts` | `kills process and returns exitCode -1 on timeout` |
| REQ-AGENT-005 | Spawn failures shall return `exitCode: -2` | `SubagentOrchestrator.test.ts` | `spawn error handler resolves with exitCode -2` |

### REQ-PARSE — MI2 Protocol Parsing

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-PARSE-001 | `parseMI` shall parse result records (`^done`, `^error`) | `mi_parse.test.ts` | MI result record tests |
| REQ-PARSE-002 | `parseMI` shall parse async records (`*stopped`, `*running`) | `mi_parse.test.ts` | async record tests |
| REQ-PARSE-003 | `parseMI` shall parse stream records (`~`, `@`, `&`) | `mi_parse.test.ts` | stream record tests |
| REQ-PARSE-004 | `MINode.valueOf` shall return `undefined` for falsy start | `mi_parse.test.ts` | `valueOf returns undefined when start is falsy` |
| REQ-PARSE-005 | `MINode.valueOf` shall return start for empty path | `mi_parse.test.ts` | `valueOf returns start immediately when path is empty string` |
| REQ-PARSE-006 | `normalizeMI` shall flatten nested MI result to plain object | `MI2.normalize.test.ts` | normalizeMI tests |

### REQ-BACKEND — GDB Backend Operations

| ID | Requirement | Test File | Test Name |
|----|-------------|-----------|-----------|
| REQ-BACKEND-001 | `whatis()` shall return type from `-var-create` | `GDBBackend.operations.test.ts` | `whatis() sends whatis command` |
| REQ-BACKEND-002 | `whatis()` shall fall back to `interpreter-exec` on error | `GDBBackend.operations.test.ts` | `whatis() falls back to interpreter-exec` |
| REQ-BACKEND-003 | `whatis()` fallback shall prefer `consoleOutput` over `value` | `GDBBackend.operations.test.ts` | `whatis() fallback returns consoleOutput` |
| REQ-BACKEND-004 | `executeStatement()` shall return empty string when GDB has no output | `GDBBackend.operations.test.ts` | `executeStatement() returns empty string` |
| REQ-BACKEND-005 | Frame navigation (`up`/`down`/`goto_frame`) shall send MI commands | `GDBBackend.operations.test.ts` | frame navigation tests |
| REQ-BACKEND-006 | Breakpoint operations shall map to MI commands | `GDBBackend.operations.test.ts` | breakpoint tests |

---

## Coverage Summary

| Module | REQs | Tests | Status |
|--------|------|-------|--------|
| `validation.ts` | REQ-VAL-001..008 | 30+ | 100% covered |
| `router.ts` | REQ-API-001..008 | 25+ | 100% covered |
| `GDBBackend.ts` | REQ-BACKEND-001..006 + REQ-CORE-001..004 | 40+ | 100% covered |
| `MI2.ts` | REQ-PARSE-001..006 + REQ-CORE-003 | 30+ | 100% covered |
| `mi_parse.ts` | REQ-PARSE-001..006 | 25+ | 100% covered |
| `errors.ts` | REQ-ERR-001..003 | 6+ | 100% covered |
| `logging.ts` | REQ-LOG-001..005 | 10+ | ≥ 97% covered |
| `SubagentOrchestrator.ts` | REQ-AGENT-002..005 + REQ-SEC-002..003 | 10+ | ≥ 97% covered |

---

## Maintenance

This document must be updated when:
- A new requirement is identified
- A new test is added that covers an existing requirement
- A requirement is modified or removed
- A test is renamed or moved

Failure to update this document is a blocking issue at PR review.
