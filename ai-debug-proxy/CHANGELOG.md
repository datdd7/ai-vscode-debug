# Changelog

All notable changes to AI Debug Proxy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v3.0.0] - 2026-03-31

### Stable Release — Full Coverage, Production-Ready

### Added
- **Comprehensive unit test suite** (369 tests, 100% pass rate): MI2 class, GDBBackend operations, errors, router, validation, MI parser — full coverage with injection-based testing (no real GDB/child process required)
- **Coverage infrastructure**: `vitest.config.ts` with `v8` provider, per-module exclusions for VS Code runtime code, `npm run test:coverage` command
- **RELEASE_MANIFEST.md**: Formal release sign-off document at `docs/release/RELEASE_MANIFEST.md`
- **test-matrix.html**: Full 38-operation test coverage map at `docs/testing/test-matrix.html`
- **CI/CD dashboard** (`infrastructure/dashboard/`): Black-pink theme Vite+TypeScript SPA showing pipeline status, metrics, and run history

### Coverage Achievements (Gate S1 — all PASS)
| Module | Target | Achieved |
|--------|--------|----------|
| `GDBBackend.ts` | 85% | **92.97%** |
| `router.ts` | 85% | **98.28%** |
| `validation.ts` | 90% | **99.09%** |
| `MI2.ts` | 80% | **99.09%** |
| `mi_parse.ts` | 80% | **81.27%** |
| `errors.ts` | — | **100%** |
| **Overall** | **70%** | **91.08%** |

### Test Suite Growth
- Unit tests: 207 → **369** tests (+162)
- New suites: `errors.test.ts` (21), expanded `GDBBackend.operations.test.ts` (83), expanded `MI2.normalize.test.ts` (44), expanded `mi_parse.test.ts`, `router.operations.test.ts`

---

## [v3.0.0-alpha.1] - 2026-03-30

### Beta Release — Complete Operation Coverage + Release Framework

### Added
- **Suite K (6 E2E tests)**: `get_arguments`, `get_globals`, `pretty_print`, `execute_statement`, `get_scope_preview`, `get_capabilities`
- **Suite L (3 E2E tests)**: `write_memory`, `terminate` via API, `attach` negative path
- **Suite H expanded (H6-H12)**: 7 additional negative/error path tests
- **Security tests (10 real tests)**: Path traversal (S1), info leak (S2), input fuzzing (S3), memory limits (S4), prototype pollution (S5)
- **Performance benchmarks (10 real tests)**: Ping < 5ms p95, MI2 parser throughput, validation speed, heap stability
- **Release criteria document**: `docs/release/release-criteria.md` — formal gate definitions for Beta and Stable
- **Multi-thread debugging** (v3.a1): `list_threads`, `switch_thread`, per-thread `stack_trace`
- **Playground multi-threaded binary**: `playground/main_mt.cpp` with 3 worker threads

### Fixed
- **validation.ts**: Added missing cases for `terminate`, `get_capabilities`, `attach`, `write_memory`, `frame_up`, `frame_down` — previously returned HTTP 400 "Unknown operation" despite being in router
- **write_memory router**: Properly converts hex string → Buffer before passing to backend
- **listThreads ID parsing**: `parseInt(id, 10)` + `isNaN` check instead of `|| 1` fallback
- **switchThread**: Resets `currentFrameId = 0` after context switch
- **MI2 pendingConsoleOutput**: `record.type === 'console'` (was `'~'`) — fixes list_source, get_source, whatis fallback

### Test Coverage
- E2E: 53 → 69 tests (A-L suites + UC7-UC9)
- Unit: 183 → 207 tests
- Operation coverage: 26/38 (68%) → 38/38 (100%)
- Security: 3 stubs → 10 real tests
- Performance: 4 stubs → 10 real benchmarks

---

## [v3.a0] - 2026-03-30

### 🚀 Alpha Release - High-Performance Layered Architecture

### Added
- **6-Layer Architecture**: Complete restructuring into `core`, `protocol`, `backend`, `server`, `vscode`, and `agent` layers.
- **REST API v3**: Unified `/api/debug` endpoint with operation-based dispatch system.
- **Enhanced GDB/MI Protocol**: Robust parsing and `target-async` support for reliable execution control.
- **Backend Manager**: Singleton-based lifecycle management for debug backends.
- **Security Suite**: Path traversal protection, malformed request handling, and fuzzing benchmarks.
- **Performance Benchmarks**: Response time monitoring (<200ms p95) and JS heap snapshot analysis.
- **Comprehensive Documentation**: Full TSDoc coverage and 6 PlantUML architecture diagrams.
- **AI-Specific Docs**: New `docs/ai/` directory for LLM integration guides and system prompts.

### Fixed
- **Buffer Overflow**: Fixed critical off-by-one error in `KeystoreService` (discovered during HSM testing).
- **Memory Leaks**: Resolved raw pointer leaks in `HsmApiImpl`.
- **Race Conditions**: Improved interrupt handling for asynchronous stops.

---


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
