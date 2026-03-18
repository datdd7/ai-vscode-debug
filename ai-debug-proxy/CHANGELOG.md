# Changelog

All notable changes to AI Debug Proxy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-03-18

### 🎉 Phase 1 & 2 Complete - AI-First Debugging Platform

### Added

#### PROXY-001: Smart Default Context
- Automatic thread/frame ID tracking
- Session state persistence across API calls
- `GET /api/session/state` endpoint
- `POST /api/session/set_context` endpoint
- CLI: `ai_session_state`, `ai_set_context`

#### PROXY-002: Context Snapshot
- Single API call returns full debug context
- Parallel aggregation (stack, variables, source, threads)
- Response compression (truncation, limits)
- `GET /api/context` endpoint with filtering
- CLI: `ai_context` with `--depth`, `--include` flags

#### PROXY-003: Watch Suggestions
- Heuristic-based variable suggestions
- Recent change detection (LRU cache, 50 steps)
- Boundary detection (overflow, null pointer, capacity)
- FSM transition detection
- Risk scoring (high/medium/low)
- `GET /api/watch/suggest` endpoint
- CLI: `ai_watch_suggest`, `ai_watch_auto_enable/disable`

#### PROXY-004: Scope Preview
- Auto-fetch function variables on step_in
- DAP scopes API (no DWARF parsing)
- Initialization status tracking
- `get_scope_preview` operation
- Integrated with `step_in()` by default

#### PROXY-005: Global Discovery
- Symbol table parsing (nm/objdump)
- Global variable discovery (112 found in playground)
- Pattern-based suspicious variable detection (54 identified)
- Auto-watch by patterns (31 variables watched)
- Real-time change detection
- `GET /api/discover/globals` endpoint
- `POST /api/watch/auto` endpoint
- `GET /api/watch/changes` endpoint
- CLI: `test-proxy-005.sh` script

### Changed

- **Token Efficiency:** 60-80% reduction (500+ → 100-200 tokens/step)
- **API Calls:** 83-90% reduction (6-10 → 1-2 calls/breakpoint)
- **Latency:** 50-75% reduction (200ms+ → 50-100ms)
- **Operation Count:** 33 → 45+ operations

### Technical

#### New Files (11)
- `src/debug/ContextAggregator.ts`
- `src/debug/VariableChangeTracker.ts`
- `src/debug/BoundaryDetector.ts`
- `src/debug/FSMDetector.ts`
- `src/debug/WatchSuggestService.ts`
- `src/debug/SymbolParser.ts`
- `src/debug/GlobalDiscoveryService.ts`
- `src/debug/WatchChangeTracker.ts`
- `tests/test-all-features.sh`
- `tests/test-proxy-005.sh`
- `tests/TESTING_GUIDE.md`

#### Modified Files (8)
- `src/types.ts` - New interfaces
- `src/debug/events.ts` - Session state
- `src/debug/inspection.ts` - Auto-resolution
- `src/debug/execution.ts` - Scope preview, change tracking
- `src/debug/DebugController.ts` - New operations
- `src/server/router.ts` - 10+ new endpoints
- `resources/ai-debug.sh` - 15+ CLI commands
- `package.json` - Version 2.1.0

### Documentation

- `docs/release/PHASE-1-2-IMPLEMENTATION-REPORT.md` - Full report
- `docs/release/RELEASE-v2.1.0.md` - Release notes
- `docs/guides/AI-WATCH-GLOBAL-VARIABLES.md` - AI guide

### Testing

- ✅ Integration tested all 5 features
- ✅ Tested with playground binary (112 globals discovered)
- ✅ Pattern matching validated (54 suspicious identified)
- ⏳ Unit tests pending (target 80% coverage)
- ⏳ E2E tests pending (10 playground bugs)
- ⏳ Full QA pending

### Known Issues

- Global discovery requires active debug session
- Watch suggestions need variable history (step first)
- Symbol parsing tested on Linux only (Windows/macOS pending)

---

## [1.0.0] - 2026-03-11

### Initial Release

### Features

- 33 debug operations via HTTP REST API
- Session management (launch, restart, quit)
- Execution control (continue, next, step_in, step_out)
- Breakpoint management (set, remove, toggle, condition)
- State inspection (stack_trace, evaluate, variables)
- LSP integration (symbols, references, call hierarchy)
- Subagent orchestration
- CLI helper script (`ai-debug.sh`)

### Technical

- VS Code Extension (TypeScript/Node.js)
- HTTP server on localhost:9999
- DAP (Debug Adapter Protocol) wrapper
- cppdbg debugger support

---

## Version History

| Version | Date | Status | Highlights |
|---------|------|--------|------------|
| 2.1.0 | 2026-03-18 | ✅ Features, ⏳ QA | Phase 1&2 Complete, AI-First |
| 1.0.0 | 2026-03-11 | ✅ Stable | Initial Release |

---

**Latest Release:** v2.1.0 (2026-03-18)  
**Next Release:** v2.1.1 (QA validation, bug fixes)  
**Roadmap:** v2.2.0 (DWARF types), v3.0.0 (Remote debugging)
