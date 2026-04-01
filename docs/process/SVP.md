# Software Verification Plan (SVP)

| Field | Value |
|-------|-------|
| Document ID | SVP-001 |
| Version | 1.0 |
| Project | AI Debug Proxy (`ai-debug-proxy`) |
| Status | Active |
| Last Updated | 2026-04-01 |
| Rigor Level | ASIL-D equivalent (Agile-adapted) |

---

## 1. Objectives

This plan defines how the `ai-debug-proxy` software is verified to meet its requirements. Verification ensures:

1. Every requirement has at least one passing test (traceability)
2. All production code paths are exercised (coverage)
3. The software builds and packages without error (integration)
4. No high-severity security vulnerabilities exist (security)
5. Static type safety is maintained (lint)

---

## 2. Scope of Verification

### 2.1 Modules in Scope (S1-gate — 100% coverage target)

| Module | Path | Responsibility |
|--------|------|---------------|
| `validation.ts` | `src/utils/validation.ts` | Input validation for all 40 API operations |
| `GDBBackend.ts` | `src/backend/GDBBackend.ts` | GDB/MI2 backend implementation |
| `router.ts` | `src/server/router.ts` | HTTP request routing and dispatch |
| `MI2.ts` | `src/protocol/mi2/MI2.ts` | MI2 protocol parser and command I/O |
| `mi_parse.ts` | `src/protocol/mi2/mi_parse.ts` | MI output parser |
| `errors.ts` | `src/utils/errors.ts` | Error type definitions |
| `BackendManager.ts` | `src/backend/BackendManager.ts` | Session lifecycle management |

### 2.2 Modules with Partial Coverage (>= 97% overall threshold)

| Module | Justification for Partial |
|--------|--------------------------|
| `logging.ts` | VS Code output channel; fallback mock reduces testable surface |
| `SubagentOrchestrator.ts` | Real process spawning; integration-level paths covered |
| `prompts.ts` | Pure string constant; no logic branches |

### 2.3 Excluded from Coverage Measurement

| Module | Justification |
|--------|---------------|
| `src/vscode/**` | Requires VS Code extension host runtime |
| `src/protocol/dap/DebugAdapter.ts` | Extends VS Code DAP session; requires runtime |
| `src/server/HttpServer.ts` | Integration-level (requires real TCP socket) |
| `src/server/routes/**` | Integration-level routes |
| `src/core/IDebugBackend.ts` | Pure TypeScript interface; no executable statements |
| `src/core/types.ts` | Pure type definitions |
| `src/test/**` | Test infrastructure |

---

## 3. Test Strategy

### 3.1 Test Levels

| Level | Framework | Location | Purpose |
|-------|-----------|----------|---------|
| **Unit** | Vitest | `src/test/unit/` | Isolated module testing with mocks |
| **E2E (VS Code)** | Mocha | `src/test/suite/` | Integration with VS Code runtime (manual/local) |
| **MCP Server** | pytest | `mcp-debug-server/` | Python MCP server API testing |

### 3.2 Unit Test Requirements

Each unit test must:
- Be deterministic (no real timers, no real network)
- Reference at least one Requirement ID in the form `[REQ-XXX-nnn]` (in `describe` or `it` description)
- Test both the happy path and at least one error/edge path per function
- Not share mutable state between tests (`beforeEach` resets state)

### 3.3 Test Independence

Unit tests must not depend on:
- External processes (all I/O mocked)
- File system writes (mocked via `vi.mock('fs', ...)`)
- VS Code API (mocked via `vi.mock('vscode', ...)`)
- Network connectivity
- Test execution order

---

## 4. Coverage Requirements

Coverage is measured using **Vitest v8** on every CI run. Coverage thresholds block the CI if not met.

### 4.1 Thresholds (enforced in CI)

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Statement | ≥ 97% | ASIL-D equivalent; allows documented exclusions |
| Line | ≥ 97% | Equivalent to statement for TS |
| Branch | ≥ 97% | Critical for conditional path verification |
| Function | ≥ 97% | All public APIs must be called in tests |

### 4.2 S1-gate Target (100%)

All modules listed in §2.1 must maintain **100% statement and branch coverage**. Any regression to <100% on an S1-gate module is treated as a High-severity problem (see SDP §8).

### 4.3 Justified Exclusions

Uncovered branches in S1-gate modules are allowed only with `/* v8 ignore next N */` directives AND a comment explaining why the branch is unreachable. Current justified exclusions:

| File | Lines | Justification |
|------|-------|---------------|
| `mi_parse.ts` | 3 defensive throw blocks | `parseString` called only with valid `parseCString` output |
| `router.ts` | `launch` case + `default` case | `launch` handled before switch; validation blocks unknown ops |

---

## 5. Static Analysis

| Tool | Configuration | Threshold |
|------|---------------|-----------|
| `tsc --noEmit` | `tsconfig.json` (strict mode) | 0 errors |
| `npm audit --production --audit-level=high` | npm default | 0 high/critical CVEs |

---

## 6. CI Qualification Gate

The CI pipeline (`ci.yml`) constitutes the automated qualification evidence. A run is **QUALIFIED** when:

```
lint        → PASS  (0 TypeScript errors)
unit-tests  → PASS  (all tests pass + coverage thresholds met)
mcp-tests   → PASS  (all pytest tests pass)
build       → PASS  (compile + VSIX packaging succeeds)  [depends on lint + unit-tests]
security    → PASS  (no high-severity npm vulnerabilities)
ci-gate     → PASS  (all of the above)
```

The dashboard artifact (`ci-dashboard.html`) produced by the `dashboard` job provides a human-readable qualification report showing: verdict (PASS/FAIL), per-job status, coverage bars, test summary.

---

## 7. Test Environment

| Item | Value |
|------|-------|
| OS | ubuntu-latest (GitHub Actions) |
| Node.js | 20 (LTS) |
| Python | 3.11 |
| Test runner | Vitest 3.x |
| Coverage provider | @vitest/coverage-v8 |
| TypeScript | 5.x (strict mode) |

All dependencies are pinned via `package-lock.json`. Tests do not require network access or external services.

---

## 8. Qualification Evidence Package

For each release, the following artifacts constitute the qualification evidence:

| Artifact | Source | Retention |
|----------|--------|-----------|
| Test execution report (`junit.xml`) | CI `unit-tests` job | 7 days |
| Coverage report (`coverage/`) | CI `unit-tests` job | 7 days |
| VSIX package (`*.vsix`) | CI `build` job | 30 days |
| Dashboard HTML (`dashboard.html`) | CI `dashboard` job | 7 days |
| CI run log | GitHub Actions | 90 days |
| Traceability matrix | `docs/process/TRACEABILITY.md` | Git history |

To claim qualification for a specific release, reference the GitHub Actions run ID and the associated git tag.

---

## 9. Traceability

All tests must trace to requirements. The traceability matrix is maintained in [`TRACEABILITY.md`](TRACEABILITY.md). A PR that adds functionality without updating TRACEABILITY.md will be rejected at review.

---

*This document is part of the qualification package for `ai-debug-proxy`. Changes to coverage thresholds or exclusion justifications require Safety Lead approval.*
