# AI Debug Proxy v3.0 - Architecture Overview

**Version:** 3.0.0  
**Date:** 2026-03-28 (Revised)  
**Status:** Design Phase

---

## 1. Problem Statement

### 1.1 Why v3.0 is Needed

AI Debug Proxy v2.x depends on Microsoft's **cppdbg** extension as its debug backend. This creates a **hard architectural coupling** that prevents supporting alternative debugger backends (e.g., Lauterbach TRACE32).

```
V2 Architecture (CURRENT — BLOCKED):

  HTTP API Request
       │
       ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────┐
  │   Router     │ ──▶ │ DebugController│ ──▶ │ vscode   │
  │  (689 LOC)   │     │  (450 LOC)   │     │ .debug.* │
  └──────────────┘     └──────────────┘     └────┬─────┘
                                                  │
                                     ┌────────────▼────────────┐
                                     │    cppdbg Extension     │
                                     │  (Microsoft, external)  │
                                     │  ┌──────────────────┐   │
                                     │  │   GDB / MI2      │   │
                                     │  └──────────────────┘   │
                                     └─────────────────────────┘
                                                  ▲
                                     HARD DEPENDENCY
                                     Cannot substitute for
                                     Lauterbach or other backends
```

**Evidence of coupling:**
- `session.ts:333` — hardcodes `type: "cppdbg"`
- `session.ts:359-369` — cppdbg-specific config (MIMode, environment format)
- `DebugController.ts:412` — cppdbg-specific variable handling
- **40+ calls** to `vscode.debug.*` API across 4 files — ALL routed through cppdbg

### 1.2 The Solution

Build a **custom DAP (Debug Adapter Protocol) server** — like cortex-debug does — that talks directly to GDB/MI2 and can be extended to support Lauterbach. This replaces the cppdbg dependency while preserving the existing HTTP proxy infrastructure.

```
V3 Architecture (TARGET — EXTENSIBLE):

  HTTP API Request                    VS Code Debug UI
       │                                    │
       ▼                                    ▼ (DAP)
  ┌──────────────┐              ┌───────────────────────┐
  │   Router     │              │     DebugAdapter      │
  │  (KEEP)      │              │  (NEW — own DAP impl) │
  └──────┬───────┘              └───────────┬───────────┘
         │                                  │
         └──────────┬───────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   BackendManager    │
         │   (NEW — factory)   │
         └──────────┬──────────┘
                    │ IDebugBackend interface
         ┌──────────┼──────────────────┐
         │          │                  │
  ┌──────▼─────┐ ┌─▼──────────┐ ┌────▼────────┐
  │ GDBBackend │ │ Lauterbach │ │ Future      │
  │  (NEW)     │ │  Backend   │ │ (LLDB, etc) │
  └──────┬─────┘ │  (NEW)     │ └─────────────┘
         │       └─┬──────────┘
  ┌──────▼─────┐   │
  │    MI2     │   │ Lauterbach API
  │ (cortex-   │   │
  │  debug)    │   │
  └──────┬─────┘   │
         │         │
  ┌──────▼─────┐ ┌─▼──────────┐
  │    GDB     │ │ TRACE32    │
  │  Process   │ │ Process    │
  └────────────┘ └────────────┘
```

> **Key Insight:** V3 is NOT a full rewrite of the extension. It replaces only the **debug layer** (session.ts, DebugController → cppdbg). The HTTP proxy, context aggregation, watch services, and LSP remain unchanged.

---

## 2. Design Goals

1. **Decouple from cppdbg** — Own DAP adapter, no external debug extension dependency
2. **Multi-backend support** — Easy to add GDB, Lauterbach, LLDB via `IDebugBackend` interface
3. **Reference cortex-debug** — Reuse battle-tested MI2 protocol layer and DAP patterns
4. **Preserve v2 features** — HTTP API, ContextAggregator, Watch services remain untouched
5. **Security by design** — InputValidator, CommandLogger for all user inputs
6. **Performance budgets** — <100ms latency for step operations

---

## 3. Architecture Layers

```
┌────────────────────────────────────────────────────────────┐
│                  Presentation Layer                        │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │  DebugAdapter (DAP) │  │  HTTP Router (v2, KEEP)     │ │
│  │  (NEW)              │  │  + ContextAggregator        │ │
│  └──────────┬──────────┘  │  + Watch Services           │ │
│             │             │  + LSP, Subagents            │ │
│             │             └──────────────┬──────────────┘ │
│             └──────────┬─────────────────┘                │
├────────────────────────┼──────────────────────────────────┤
│              Application Layer                            │
│  ┌─────────────────────▼──────────────────────────────┐   │
│  │       BackendManager (NEW)                         │   │
│  │  - Creates/destroys backends via factory           │   │
│  │  - Routes operations to active backend             │   │
│  │  - Manages backend lifecycle                       │   │
│  └──────────┬─────────────────────────────────────────┘   │
├─────────────┼─────────────────────────────────────────────┤
│              Domain Layer                                  │
│  ┌──────────▼──────────┐                                  │
│  │   IDebugBackend     │ ◄── Interface contract           │
│  └──────────┬──────────┘                                  │
│        ┌────┴──────────────┐                              │
│  ┌─────▼──────┐  ┌────────▼───────┐  ┌───────────────┐   │
│  │ GDBBackend │  │ Lauterbach     │  │ Future (LLDB) │   │
│  │  (NEW)     │  │   Backend      │  │               │   │
│  └─────┬──────┘  │  (NEW, v3.1)   │  └───────────────┘   │
│        │         └────────┬───────┘                       │
├────────┼──────────────────┼───────────────────────────────┤
│              Infrastructure Layer                          │
│  ┌─────▼──────┐  ┌───────▼────────┐                       │
│  │    MI2     │  │ Lauterbach API │                       │
│  │ (cortex-  │  │ (Vendor SDK)   │                       │
│  │  debug)    │  └────────────────┘                       │
│  └─────┬──────┘                                           │
│  ┌─────▼──────┐                                           │
│  │ MI Parser  │                                           │
│  └────────────┘                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Component Details

### 4.1 New Components (v3 Debug Layer)

| Component | File | Est. Lines | Responsibility | Reference |
|-----------|------|-----------|----------------|-----------|
| **DebugAdapter** | `src/adapter/DebugAdapter.ts` | ~2,000 | DAP server, handles all VS Code debug requests | cortex-debug `gdb.ts` (3,671 LOC) |
| **IDebugBackend** | `src/backend/IDebugBackend.ts` | ~80 | Backend interface contract | - |
| **BackendManager** | `src/backend/BackendManager.ts` | ~150 | Backend factory and lifecycle | - |
| **GDBBackend** | `src/backend/GDBBackend.ts` | ~500 | GDB implementation using MI2 | cortex-debug `gdb.ts` |
| **MI2** | `src/mi2/MI2.ts` | ~800 | GDB/MI protocol (simplified from cortex-debug) | cortex-debug `mi2.ts` (48KB) |
| **MI Parser** | `src/mi2/mi_parse.ts` | ~300 | MI output parser | cortex-debug `mi_parse.ts` (10KB) |
| **InputValidator** | `src/security/InputValidator.ts` | ~150 | Security: validate all user inputs | - |
| **CommandLogger** | `src/security/CommandLogger.ts` | ~80 | Security: audit trail | - |
| | | **~4,060** | | |

### 4.2 Existing Components (v2, KEEP)

| Component | File | Lines | Action |
|-----------|------|-------|--------|
| HTTP Router | `src/server/router.ts` | 689 | **MODIFY** — route through BackendManager |
| HTTP Server | `src/server/HttpServer.ts` | ~150 | **KEEP** |
| ContextAggregator | `src/context/` | ~500 | **KEEP** |
| Watch Services | `src/watch/` | ~400 | **KEEP** |
| LSP Integration | `src/lsp/` | ~300 | **KEEP** |
| Subagent Orchestrator | (in router) | ~200 | **KEEP** |
| Logging | `src/utils/logging.ts` | ~200 | **KEEP** |
| Error Handling | `src/utils/errors.ts` | ~100 | **KEEP** |

### 4.3 Deprecated Components (v2 → v3 replacement)

| Component | File | Lines | Replaced By |
|-----------|------|-------|-------------|
| session.ts | `src/debug/session.ts` | 454 | DebugAdapter (own DAP) |
| events.ts | `src/debug/events.ts` | 513 | DebugAdapter event handling |
| DebugController | `src/debug/DebugController.ts` | ~450 | BackendManager + IDebugBackend |
| breakpoints.ts | `src/debug/breakpoints.ts` | ~530 | GDBBackend breakpoint management |

---

## 5. Backend Interface Design

### 5.1 IDebugBackend Interface

```typescript
interface IDebugBackend {
    // Lifecycle
    initialize(config: BackendConfig): Promise<void>;
    terminate(): Promise<void>;
    isRunning(): boolean;
    
    // Execution Control
    launch(params: LaunchParams): Promise<void>;
    attach(params: AttachParams): Promise<void>;
    continue(): Promise<StopEvent>;
    stepOver(): Promise<StopEvent>;
    stepIn(): Promise<StopEvent>;
    stepOut(): Promise<StopEvent>;
    pause(): Promise<void>;
    jumpToLine(line: number): Promise<void>;
    
    // Breakpoints
    setBreakpoint(location: SourceLocation): Promise<Breakpoint>;
    removeBreakpoint(id: string): Promise<void>;
    
    // Inspection
    getStackTrace(threadId?: number): Promise<StackFrame[]>;
    getVariables(frameId?: number): Promise<Variable[]>;
    evaluate(expression: string, frameId?: number): Promise<Variable>;
    
    // Memory (for embedded/automotive)
    readMemory(address: number, length: number): Promise<Buffer>;
    writeMemory(address: number, data: Buffer): Promise<void>;
    getRegisters(): Promise<Register[]>;
    
    // Info
    getLastStopInfo(): Promise<StopEvent>;
    getCapabilities(): DebuggerCapabilities;
}
```

### 5.2 Adding New Backends

To add a new backend (e.g., LLDB):

1. Create `src/backend/LLDBBackend.ts`
2. Implement `IDebugBackend` interface
3. Register in `BackendManager`:

```typescript
// BackendManager.ts
case 'lldb':
    return new LLDBBackend();
```

That's it! No changes needed to DebugAdapter, HTTP Router, or other components.

---

## 6. MI2 Protocol Layer

### 6.1 Reuse Strategy

**Source:** cortex-debug `src/backend/mi2/mi2.ts` (48,533 bytes)

**What to keep:**
- GDB/MI command sending and response parsing
- Async event handling (stopped, running, exited)
- GDB process lifecycle management
- Variable/stack frame parsing

**What to remove:**
- Server controller integrations (JLink, OpenOCD, STLink, etc.)
- SWO/RTT trace handling
- RTOS thread support
- Server-specific configuration

**Estimated result:** ~800-1,000 lines (down from ~1,500 in cortex-debug)

### 6.2 MI2 Integration

```typescript
class GDBBackend implements IDebugBackend {
    private mi2: MI2;
    
    async initialize(config: BackendConfig) {
        this.mi2 = new MI2(config.gdbPath || 'gdb', []);
        await this.mi2.start(process.cwd(), []);
    }
    
    async continue(): Promise<StopEvent> {
        return new Promise((resolve) => {
            this.mi2.once('stopped', (event) => {
                resolve(this.parseStopEvent(event));
            });
            this.mi2.sendCommand('-exec-continue');
        });
    }
}
```

---

## 7. Debug Session Lifecycle

### 7.1 Session States

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Idle   │ ──→ │ Running  │ ──→ │ Stopped  │ ──→ │ Exited   │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
                    ↑   ↓            ↑   ↓
                    │   └────────────┘   │
                    │   Step/Continue    │
                    └────────────────────┘
```

### 7.2 State Transitions

| From | To | Trigger | DAP Event |
|------|-----|---------|-----------| 
| Idle | Running | `launch()` | `initialized` |
| Running | Stopped | Breakpoint hit | `stopped(reason="breakpoint")` |
| Running | Stopped | Step complete | `stopped(reason="step")` |
| Stopped | Running | `continue()` | `continued` |
| Stopped | Running | `next()` | `continued` |
| Running | Exited | Program exit | `terminated` |
| Any | Exited | `terminate()` | `terminated` |

---

## 8. Security Architecture

### 8.1 Security Boundaries

```
┌─────────────────────────────────────────┐
│  Untrusted Input (User/HTTP API)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Input Validation Layer                 │
│  - Path validation                      │
│  - Expression validation                │
│  - Command sanitization                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Sandboxed Execution                    │
│  - Isolated GDB process                 │
│  - Minimal privileges                   │
│  - Resource limits                      │
└─────────────────────────────────────────┘
```

### 8.2 Input Validation Rules

| Input | Validation | Example |
|-------|------------|---------|
| File path | Alphanumeric + `./-_` | `src/main.c` ✅ |
| Line number | 1-99999 | `42` ✅ |
| Expression | No assignment operators | `x + y` ✅, `x = 5` ❌ |
| GDB path | Absolute path, exists | `/usr/bin/gdb` ✅ |

See: `SECURITY_ANALYSIS.md` for full security requirements.

---

## 9. Performance Architecture

### 9.1 Performance Budgets

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Launch session | <1s | <2s | <3s |
| Continue | <50ms | <100ms | <200ms |
| Step Over | <50ms | <100ms | <200ms |
| Stack Trace | <30ms | <50ms | <100ms |
| Variables | <50ms | <100ms | <200ms |
| Evaluate | <30ms | <50ms | <100ms |

### 9.2 Performance Optimization Strategies

1. **Lazy Loading**: Don't load variables until requested
2. **Command Pipelining**: Send independent commands in parallel
3. **Backend Pooling**: Pre-warm GDB for faster startup
4. **Event Batching**: Batch variable updates

See: `PERFORMANCE_ANALYSIS.md` for detailed benchmarks.

---

## 10. Implementation Plan (Hybrid Approach)

### 10.1 Migration Matrix

| Component | Action | Phase | Rationale |
|-----------|--------|-------|-----------|
| `src/adapter/DebugAdapter.ts` | **NEW** | Phase 1 | Own DAP server, replaces cppdbg |
| `src/backend/IDebugBackend.ts` | **NEW** | Phase 1 | Backend abstraction |
| `src/backend/BackendManager.ts` | **NEW** | Phase 1 | Backend factory |
| `src/backend/GDBBackend.ts` | **NEW** | Phase 1 | GDB via MI2, not vscode.debug.* |
| `src/mi2/` | **NEW** (from cortex-debug) | Phase 1 | Protocol layer |
| `src/security/` | **NEW** | Phase 1 | InputValidator, CommandLogger |
| `src/server/router.ts` | **MODIFY** | Phase 2 | Route through BackendManager |
| `src/server/HttpServer.ts` | **KEEP** | — | Works independently |
| `src/context/` | **KEEP** | — | Works independently |
| `src/watch/` | **KEEP** | — | Works independently |
| `src/lsp/` | **KEEP** | — | Works independently |
| `src/debug/session.ts` | **DEPRECATE** | Phase 2 | Replaced by DebugAdapter |
| `src/debug/events.ts` | **DEPRECATE** | Phase 2 | Replaced by DebugAdapter events |
| `src/debug/DebugController.ts` | **DEPRECATE** | Phase 2 | Replaced by BackendManager |
| `src/debug/breakpoints.ts` | **DEPRECATE** | Phase 2 | Replaced by GDBBackend |
| `src/backend/LauterbachBackend.ts` | **NEW** | Phase 3 | Lauterbach support |

### 10.2 Phased Timeline

```
Phase 1: New Debug Layer (2-3 weeks)
├── Copy & simplify MI2 from cortex-debug
├── Implement IDebugBackend + GDBBackend
├── Implement DebugAdapter (LoggingDebugSession)
├── Register as custom debug type "ai-debug-gdb"
└── Basic integration test with VS Code

Phase 2: Integrate with v2 Proxy (1 week)
├── Update Router to use BackendManager
├── Keep HTTP API, ContextAggregator, Watch as-is
├── Deprecate session.ts, events.ts, DebugController
└── Remove cppdbg dependency

Phase 3: Lauterbach Backend (1-2 weeks)
├── Implement LauterbachBackend (IDebugBackend)
├── Add Lauterbach-specific launch config
└── Test with real TRACE32 hardware

Phase 4: Polish (1 week)
├── InputValidator + CommandLogger
├── Performance benchmarking
└── Documentation update
```

**Total estimated: 5-7 weeks**

---

## 11. Package Structure

```
ai-debug-proxy/
├── src/
│   ├── adapter/
│   │   └── DebugAdapter.ts          # NEW: ~2,000 lines
│   ├── backend/
│   │   ├── IDebugBackend.ts         # NEW: ~80 lines
│   │   ├── BackendManager.ts        # NEW: ~150 lines
│   │   ├── GDBBackend.ts            # NEW: ~500 lines
│   │   └── LauterbachBackend.ts     # NEW: ~500 lines (Phase 3)
│   ├── mi2/
│   │   ├── MI2.ts                   # NEW (from cortex-debug): ~800 lines
│   │   └── mi_parse.ts              # NEW (from cortex-debug): ~300 lines
│   ├── security/
│   │   ├── InputValidator.ts        # NEW: ~150 lines
│   │   └── CommandLogger.ts         # NEW: ~80 lines
│   ├── server/                      # KEEP from v2
│   │   ├── HttpServer.ts
│   │   └── router.ts               # MODIFY to use BackendManager
│   ├── context/                     # KEEP from v2
│   ├── watch/                       # KEEP from v2
│   ├── lsp/                         # KEEP from v2
│   ├── utils/                       # KEEP from v2
│   └── extension.ts                 # MODIFY: register DebugAdapter
├── package.json
├── tsconfig.json
└── docs/arch/
    └── (this directory)
```

---

## 12. Dependencies

### Core Dependencies (NEW)

```json
{
  "dependencies": {
    "@vscode/debugadapter": "^1.65.0",
    "@vscode/debugprotocol": "^1.65.0"
  }
}
```

### Reused from cortex-debug (copied, not runtime dependency)

- `src/mi2/MI2.ts` — Simplified from cortex-debug `src/backend/mi2/mi2.ts`
- `src/mi2/mi_parse.ts` — From cortex-debug `src/backend/mi_parse.ts`

---

## 13. Related Documents

| Document | Purpose |
|----------|---------|
| `SECURITY_ANALYSIS.md` | Security threat model, input validation |
| `PERFORMANCE_ANALYSIS.md` | Performance benchmarks, optimization |
| `02-component-diagram.puml` | Visual component architecture |
| `03-backend-interface.puml` | Backend interface design |
| `04-dap-adapter.puml` | DebugAdapter implementation |
| `05-debug-session-flow.puml` | Session lifecycle sequence |

---

*Revised: 2026-03-28*  
*Version: 3.0.0*  
*Strategy: Hybrid (new debug layer + existing v2 proxy)*
