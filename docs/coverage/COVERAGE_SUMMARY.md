# Coverage Qualification Evidence

| Field | Value |
|-------|-------|
| Document ID | COV-001 |
| Version | 1.0 |
| Project | AI Debug Proxy (`ai-debug-proxy`) |
| Generated | 2026-04-01 |
| Tool | Vitest v8 provider |
| Baseline Tag | v1.0.0-audit-baseline |

---

## Summary

| Metric | Result | Threshold | Status |
|--------|--------|-----------|--------|
| Statements | **100%** | 100% | PASS |
| Branches | **100%** | 100% | PASS |
| Functions | **100%** | 100% | PASS |
| Lines | **100%** | 100% | PASS |

Total tests: **529 passed, 0 failed**

---

## Per-Module Coverage

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `agent/SubagentOrchestrator.ts` | 100% | 100% | 100% | 100% |
| `agent/prompts.ts` | 100% | 100% | 100% | 100% |
| `backend/BackendManager.ts` | 100% | 100% | 100% | 100% |
| `backend/GDBBackend.ts` | 100% | 100% | 100% | 100% |
| `protocol/mi2/MI2.ts` | 100% | 100% | 100% | 100% |
| `protocol/mi2/mi_parse.ts` | 100% | 100% | 100% | 100% |
| `server/router.ts` | 100% | 100% | 100% | 100% |
| `utils/errors.ts` | 100% | 100% | 100% | 100% |
| `utils/logging.ts` | 100% | 100% | 100% | 100% |
| `utils/validation.ts` | 100% | 100% | 100% | 100% |

---

## Excluded Modules (with justification)

| Module | Reason |
|--------|--------|
| `vscode/**` | VS Code extension host — requires VS Code runtime, cannot be unit-tested |
| `protocol/dap/DebugAdapter.ts` | Extends LoggingDebugSession, requires VS Code DAP runtime |
| `server/HttpServer.ts` | Integration-level only (requires real socket) |
| `server/routes/**` | Integration-level only |
| `core/IDebugBackend.ts` | Pure TypeScript interface — no executable statements |
| `core/types.ts` | Pure TypeScript interface — no executable statements |

---

## Coverage Artifact

Raw LCOV data: `lcov.info` (this directory)

The `lcov.info` file can be loaded into any LCOV-compatible viewer:
```
genhtml lcov.info --output-directory coverage-html
```

---

## Thresholds Configuration

Thresholds are enforced in `ai-debug-proxy/vitest.config.ts`:

```typescript
thresholds: {
  statements: 100,
  lines: 100,
  branches: 100,
  functions: 100,
}
```

The CI pipeline (`unit-tests` job) enforces these thresholds on every push.
Build is blocked if any threshold is not met.

---

## Notes on Branch Coverage Strategy

100% branch coverage was achieved through a combination of:

1. **Test cases for genuinely reachable branches** — tests exercise each conditional path,
   including null-guard throws, fallback `||` values, and alternative code paths.

2. **`/* v8 ignore next N */` directives for defensive dead-code branches** — applied
   to branches that are structurally unreachable due to invariants guaranteed by the
   calling code (e.g., `parseMI` always returns `MINode`, never `null`; `this.once()`
   prevents double-fire of the ready event). Each directive includes a comment explaining
   the invariant.

This approach is consistent with IEC 61508-3 guidance on structural coverage justification
for unreachable code paths.
