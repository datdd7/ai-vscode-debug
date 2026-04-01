# Release Criteria — AI Debug Proxy v3

**Document Version:** 1.0
**Date:** 2026-03-30
**Author:** QA Framework (Claude Code)
**Applies to:** v3.0.0-alpha.1 (Beta) and v3.0.0 (Stable)

---

## 1. Release Tiers

| Tier | Version | Description |
|------|---------|-------------|
| **Alpha** | `3.0.0-alpha.1` | Core functionality verified, not production-ready |
| **Beta** | `3.0.0-alpha.1` | Team-testable, >= 80% operation coverage |
| **Stable** | `3.0.0` | Production-ready, 100% coverage, performance certified |

---

## 2. Beta Release Gates (v3.0.0-alpha.1)

All gates must PASS before the beta tag is created.

### Gate B1: Code Quality
| Check | Command | Requirement |
|-------|---------|-------------|
| Type safety | `npm run lint` | Zero errors |
| Unit tests | `npm test` | 100% pass (no skip allowed) |
| E2E tests | `npm run test:e2e` | 100% pass |
| Build | `npm run compile && npm run package` | Clean VSIX produced |

**Current status:** 207/207 unit, 69/69 E2E — **PASS**

### Gate B2: Operation Coverage >= 80%
- **Requirement:** >= 31 of 38 supported operations have an automated test
- **Current coverage:** 38/38 = **100% — EXCEEDS requirement**

Operations and their test locations:

| # | Operation | Suite | Test |
|---|-----------|-------|------|
| 1 | launch | A1 | E2E |
| 2 | attach (negative) | L3 | E2E |
| 3 | terminate | L2 | E2E |
| 4 | restart | A3 | E2E |
| 5 | continue | B2 | E2E |
| 6 | next/step_over | C1 | E2E |
| 7 | step_in | C2 | E2E |
| 8 | step_out | C3 | E2E |
| 9 | pause | C5 | E2E |
| 10 | jump | UC7 | E2E |
| 11 | until | C4 | E2E |
| 12 | up | D2 | E2E |
| 13 | down | D2 | E2E |
| 14 | goto_frame | D3 | E2E |
| 15 | set_breakpoint | B1 | E2E |
| 16 | set_temp_breakpoint | B6 | E2E |
| 17 | remove_breakpoint | B3 | E2E |
| 18 | remove_all_breakpoints_in_file | B7 | E2E |
| 19 | get_active_breakpoints | B3 | E2E |
| 20 | stack_trace | D1 | E2E |
| 21 | get_variables | E1 | E2E |
| 22 | get_arguments | K1 | E2E |
| 23 | get_globals | K2 | E2E |
| 24 | evaluate | E2 | E2E |
| 25 | get_registers | G1 | E2E |
| 26 | read_memory | G2 | E2E |
| 27 | write_memory | L1 | E2E |
| 28 | list_source | F1 | E2E |
| 29 | get_source | F2 | E2E |
| 30 | pretty_print | K3 | E2E |
| 31 | whatis | E5 | E2E |
| 32 | execute_statement | K4 | E2E |
| 33 | list_all_locals | E6 | E2E |
| 34 | get_scope_preview | K5 | E2E |
| 35 | list_threads | J1 | E2E |
| 36 | switch_thread | J3 | E2E |
| 37 | get_last_stop_info | F3 | E2E |
| 38 | get_capabilities | K6 | E2E |

### Gate B3: Error Path Coverage >= 12 negative tests
- **Requirement:** Suite H covers >= 12 negative/error test cases
- **Current:** H1-H12 = **12 tests — PASS**

Key negative paths covered:
- Missing `operation` field → HTTP 400
- Unknown operation → HTTP 400
- Operations without active session → error response
- Missing required parameters (jump/line, goto_frame/frameId, etc.) → HTTP 400
- Path traversal in `get_source` → rejected
- Info leak prevention (ADP-024) → `/home/` paths stripped

### Gate B4: Security Baseline
| Check | Location | Status |
|-------|----------|--------|
| Path traversal prevention (S1) | `security.test.ts:S1.1-S1.2` | PASS |
| Info leak prevention (S2, ADP-024) | `security.test.ts:S2.1-S2.2` | PASS |
| Malformed input handling (S3) | `security.test.ts:S3.1-S3.5` | PASS |
| Memory limit enforcement (S4) | `security.test.ts:S4.1-S4.2` | PASS |
| Prototype pollution prevention (S5) | `security.test.ts:S5.1-S5.2` | PASS |
| npm audit | `npm audit --audit-level=high` | Required |

### Gate B5: Documentation — **PASS**
- [x] `docs/guides/api-reference.md` reflects 38 operations
- [x] `CHANGELOG.md` has v3.0.0-alpha.1 entry
- [x] `docs/release/release-criteria.md` exists (this document)
- [x] `ai-debug-proxy/README.md` is current

---

## 3. Stable Release Gates (v3.0.0)

All Beta gates must pass PLUS:

### Gate S1: Code Coverage >= 70% — **PASS**
Run: `npm run test:coverage`

| Module | Minimum | Actual | Status |
|--------|---------|--------|--------|
| `GDBBackend.ts` | >= 85% | **92.97%** | ✅ PASS |
| `router.ts` | >= 85% | **98.28%** | ✅ PASS |
| `validation.ts` | >= 90% | **99.09%** | ✅ PASS |
| `MI2.ts` | >= 80% | **99.09%** | ✅ PASS |
| `mi_parse.ts` | >= 80% | **81.27%** | ✅ PASS |
| `DebugAdapter.ts` | >= 60% | N/A (excluded — requires VS Code DAP runtime) | ✅ EXEMPT |
| Overall | >= 70% | **91.08%** | ✅ PASS |

Notes:
- `DebugAdapter.ts` exempted: extends `LoggingDebugSession` from `@vscode/debugadapter`, cannot be instantiated outside VS Code extension host.
- Test suite: 369 tests (334 unit + 35 MI2 class tests), 100% pass rate.

### Gate S2: Performance Benchmarks PASS
Run: `npm test` (includes performance.test.ts)

| Benchmark | SLA |
|-----------|-----|
| Ping endpoint p95 | < 5ms |
| Status endpoint p95 | < 10ms |
| Validation-only ops p99 | < 2ms |
| MI2 parser — simple stop event p95 | < 0.5ms |
| MI2 parser — 100-var result | < 5ms |
| MI2 parser — 1000 lines | < 100ms |
| Validation — all 38 ops | < 5ms total |
| Heap growth — 500 pings | < 5MB |

**Current status:** All benchmarks pass in unit suite.

### Gate S3: CI/CD Pipeline GREEN
- `quality-check.yml` runs on PR to master
- All 10 quality gates pass (see `.github/workflows/quality-check.yml`)
- VSIX artifact uploaded (7-day retention)

### Gate S4: Documentation Complete — **PASS**
- [x] All Beta B5 docs
- [x] `docs/ai/llm-guide.md` updated for threading + new operations
- [x] `docs/testing/test-matrix.html` reflects 38/38 operations
- [x] TSDoc on all public `IDebugBackend` methods (verified 2026-03-31)
- [ ] 6 PlantUML diagrams verified against current implementation (deferred post-release)

### Gate S5: Sign-Off
- [ ] Lead Architect review sign-off
- [ ] QA Engineer sign-off
- [ ] Product Owner sign-off
- [x] `docs/release/RELEASE_MANIFEST.md` created (2026-03-31)

---

## 4. Test Evidence Requirements

Each release must produce and archive:

```bash
# Required evidence artifacts (run before creating release tag)

# 1. Lint
npm run lint 2>&1 | tee evidence/lint-$(date +%Y%m%d).txt

# 2. Unit tests + performance + security benchmarks
npm test 2>&1 | tee evidence/unit-$(date +%Y%m%d).txt

# 3. Coverage (stable only)
npm run test:coverage 2>&1 | tee evidence/coverage-$(date +%Y%m%d).txt

# 4. E2E tests — 3x runs (regression proof)
for i in 1 2 3; do
  npm run test:e2e 2>&1 | tee evidence/e2e-run${i}-$(date +%Y%m%d).txt
done

# 5. Security audit
npm audit --audit-level=high 2>&1 | tee evidence/audit-$(date +%Y%m%d).txt

# 6. Build artifact
npm run compile && npm run package 2>&1 | tee evidence/build-$(date +%Y%m%d).txt
sha256sum *.vsix >> evidence/build-$(date +%Y%m%d).txt
```

---

## 5. Test Suite Summary

| Suite | Tests | Coverage Area |
|-------|-------|---------------|
| A — Session Lifecycle | 5 | launch, terminate, restart |
| B — Breakpoint Management | 7 | set/remove/temp breakpoints |
| C — Execution Control | 6 | step, continue, pause, until |
| D — Stack Navigation | 5 | stack_trace, goto_frame, up/down |
| E — Variable Inspection | 7 | evaluate, whatis, variables |
| F — Source Navigation | 3 | list_source, get_source, stop_info |
| G — Memory & Registers | 3 | read_memory, get_registers |
| H — Validation & Errors | 12 | negative cases, error handling |
| I — AI Workflow | 3 | end-to-end agent scenarios |
| J — Multi-Thread | 6 | list_threads, switch_thread |
| K — Extended Operations | 6 | get_args, globals, pretty_print, etc. |
| L — Remaining Operations | 3 | write_memory, terminate, attach |
| UC7-UC9 (legacy) | 3 | jump, interrupt, mutation |
| **Total E2E** | **69** | **100% operation coverage** |
| **Unit tests** | **207** | Protocol, validation, backend |
| **Security tests** | **10** | Injection, traversal, limits |
| **Performance tests** | **10** | Latency, throughput, memory |

---

## 6. Known Limitations (Beta)

| Item | Description | Target |
|------|-------------|--------|
| `attach` | Only negative path tested (missing processId). Full attach to running process requires external process setup. | Stable |
| Coverage measurement | `npm run test:coverage` not yet run to baseline numbers. | Stable |
| CI pipeline | `quality-check.yml` not yet triggered on this branch. | Stable (PR to master) |
| PlantUML diagrams | Not verified against v3.a1 changes (threading, new ops). | Stable |
