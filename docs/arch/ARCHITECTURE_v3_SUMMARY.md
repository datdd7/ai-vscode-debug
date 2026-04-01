# Architecture v3.0 — Design Summary

**Version:** 3.0.0  
**Date:** 2026-03-28 (Revised)  
**Status:** ✅ DESIGN REVISED  
**Strategy:** Hybrid (new debug layer + existing v2 proxy)

---

## 🎯 EXECUTIVE SUMMARY

AI Debug Proxy v3.0 replaces the **cppdbg-coupled debug layer** with a custom DAP implementation to enable **multi-backend support** (GDB, Lauterbach, future LLDB). This is NOT a full rewrite — the HTTP proxy, context aggregation, watch services, and LSP remain from v2.

### Why v3.0 is Needed

| Problem | Evidence |
|---------|----------|
| cppdbg is a hard dependency | `session.ts:333` hardcodes `type: "cppdbg"` |
| All debug ops route through cppdbg | 40+ `vscode.debug.*` calls across 4 files |
| Cannot swap for Lauterbach | `vscode.debug.startDebugging()` only talks to cppdbg |
| cppdbg-specific logic scattered | MIMode config, environment format, variable handling |

### What Changed from v2.0

| Aspect | v2.0 | v3.0 |
|--------|------|------|
| **Debug Layer** | Routes through cppdbg | Own DebugAdapter (DAP) |
| **Backend** | Locked to GDB via cppdbg | Multi-backend via IDebugBackend |
| **MI2 Protocol** | Hidden inside cppdbg | Own (from cortex-debug) |
| **HTTP API** | ✅ Working | ✅ KEPT, routes to BackendManager |
| **Context/Watch/LSP** | ✅ Working | ✅ KEPT unchanged |
| **Security** | Ad-hoc | InputValidator + CommandLogger |

---

## 🏗️ ARCHITECTURE

```
VS Code Debug UI          HTTP API (AI Agents)
      │                         │
      ▼ (DAP)                   ▼
┌──────────────┐      ┌─────────────────────┐
│ DebugAdapter │      │ Router (v2, KEEP)   │
│   (NEW)      │      │ + Context, Watch,   │
└──────┬───────┘      │   LSP, Subagents    │
       │              └──────────┬──────────┘
       └───────────┬─────────────┘
                   │
          ┌────────▼────────┐
          │  BackendManager │ (NEW)
          └────────┬────────┘
                   │ IDebugBackend
          ┌────────┼──────────────┐
    ┌─────▼────┐ ┌▼──────────┐ ┌─▼──────────┐
    │ GDB      │ │ Lauterbach│ │ Future     │
    │ Backend  │ │ Backend   │ │ (LLDB)     │
    └─────┬────┘ └───────────┘ └────────────┘
    ┌─────▼────┐
    │   MI2    │ (from cortex-debug)
    └─────┬────┘
    ┌─────▼────┐
    │   GDB    │
    └──────────┘
```

---

## 📊 COMPONENT SUMMARY (Realistic Estimates)

### New Components

| Component | Lines | Reference |
|-----------|-------|-----------|
| DebugAdapter | ~2,000 | cortex-debug `gdb.ts` = 3,671 LOC |
| IDebugBackend | ~80 | — |
| BackendManager | ~150 | — |
| GDBBackend | ~500 | — |
| MI2 + Parser | ~1,100 | cortex-debug MI2 = 48KB |
| Security (Validator + Logger) | ~230 | — |
| **Total New** | **~4,060** | |

### Kept from v2

| Component | Lines | Action |
|-----------|-------|--------|
| HTTP Router | 689 | **MODIFY** (route to BackendManager) |
| HTTP Server | ~150 | **KEEP** |
| ContextAggregator | ~500 | **KEEP** |
| Watch Services | ~400 | **KEEP** |
| LSP / Subagents | ~500 | **KEEP** |
| Utils / Logging | ~300 | **KEEP** |

### Deprecated (replaced by v3 debug layer)

| Component | Lines | Replaced By |
|-----------|-------|-------------|
| session.ts | 454 | DebugAdapter |
| events.ts | 513 | DebugAdapter events |
| DebugController.ts | ~450 | BackendManager + IDebugBackend |
| breakpoints.ts | ~530 | GDBBackend |

---

## 🔑 KEY DESIGN DECISIONS

### Decision 1: Decouple from cppdbg ✅
- **Why:** cppdbg blocks multi-backend support
- **How:** Build own DebugAdapter extending `LoggingDebugSession` from `@vscode/debugadapter`
- **Reference:** cortex-debug does exactly this

### Decision 2: Hybrid, NOT Clean-Slate ✅
- **Why:** v2 has 10,681 LOC of working features (HTTP API, context, watch, LSP)
- **How:** Replace only the debug layer (~2,000 LOC), keep everything else
- **Risk Reduction:** No feature regression

### Decision 3: Backend Abstraction ✅
- **Why:** Support GDB + Lauterbach + future backends
- **How:** `IDebugBackend` interface + `BackendManager` factory
- **Impact:** Adding a new backend = 1 file + 1 line in factory

### Decision 4: MI2 from cortex-debug ✅
- **Why:** Battle-tested GDB/MI protocol implementation
- **How:** Copy & simplify (remove server controllers, SWO/RTT, RTOS)
- **Realistic size:** ~800-1,000 lines (not the originally estimated ~200)

### Decision 5: Security Layer ✅
- **Why:** HTTP API accepts untrusted input from AI agents
- **How:** InputValidator for all paths/expressions + CommandLogger audit trail

---

## 📅 IMPLEMENTATION TIMELINE

| Phase | Duration | Scope |
|-------|----------|-------|
| **Phase 1:** Debug Layer | 2-3 weeks | MI2, IDebugBackend, GDBBackend, DebugAdapter |
| **Phase 2:** v2 Integration | 1 week | Update Router, deprecate old debug/ files |
| **Phase 3:** Lauterbach | 1-2 weeks | LauterbachBackend implementation |
| **Phase 4:** Polish | 1 week | Security, performance, docs |
| **Total** | **5-7 weeks** | |

---

## 📦 PERFORMANCE BUDGETS

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Launch | <1000ms | <2000ms | <3000ms |
| Continue | <50ms | <100ms | <200ms |
| Step Over | <50ms | <100ms | <200ms |
| Stack Trace | <30ms | <50ms | <100ms |
| Variables | <50ms | <100ms | <200ms |

---

## 📚 RELATED DOCUMENTS

| Document | Purpose |
|----------|---------|
| `01-architecture.md` | Full architecture + problem statement |
| `02-component-diagram.puml` | Component relationships |
| `03-backend-interface.puml` | Backend abstraction design |
| `04-dap-adapter.puml` | DebugAdapter design |
| `05-debug-session-flow.puml` | Session lifecycle |
| `SECURITY_ANALYSIS.md` | Threat model |
| `PERFORMANCE_ANALYSIS.md` | Benchmarks |

---

*Revised: 2026-03-28*  
*Strategy: Hybrid approach — new debug layer + existing v2 proxy*
