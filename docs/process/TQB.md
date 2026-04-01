# Tool Qualification Brief

| Field | Value |
|-------|-------|
| Document ID | TQB-001 |
| Version | 1.0 |
| Project | AI Debug Proxy (`ai-debug-proxy`) |
| Date | 2026-04-01 |
| Author | Development Team |
| Status | Active |

---

## Purpose

This document establishes the qualification rationale for software development and
verification tools used in the AI Debug Proxy project. It is adapted from IEC 61508-3
Annex D (Software tool confidence level) applied in an Agile development context
without an automotive safety domain.

Tool qualification is required to justify that tool outputs can be trusted as evidence
of software quality. Each tool is assessed for:

- **TCL (Tool Confidence Level)**: 1 (low, manual verification sufficient) to 3 (high,
  tool must be validated)
- **Impact on evidence**: whether tool errors could undetected affect safety case
- **Mitigation**: how tool errors are detected or prevented

---

## Tools Under Qualification

### 1. TypeScript Compiler (tsc) v5.x

| Attribute | Detail |
|-----------|--------|
| Role | Static type checking and transpilation |
| Used for | Lint (`tsc --noEmit`), type safety enforcement |
| TCL | 1 |
| Version pinned | Yes — `package.json` `devDependencies` |

**Qualification rationale:**
`tsc` is a widely deployed industry-standard compiler with extensive community testing.
Type errors reported by `tsc` are independently verifiable by code review. The compiler
output (`out/extension.js`) is not relied upon as verification evidence — only `tsc
--noEmit` (static analysis) output matters for this project's safety case.

**Mitigation:** CI pipeline runs `tsc --noEmit` on every push. Type errors cause build
failure. Human review of TypeScript source provides independent validation.

---

### 2. Vitest v2.x (Test Runner)

| Attribute | Detail |
|-----------|--------|
| Role | Unit test execution |
| Used for | Running 529 unit tests, reporting pass/fail |
| TCL | 2 |
| Version pinned | Yes — `package.json` `devDependencies` |

**Qualification rationale:**
Vitest is a widely adopted test framework based on Vite, with extensive real-world usage.
Test results (pass/fail) are directly verifiable: each test asserts a concrete,
human-readable expectation. A vitest bug that silently passes a failing test would be
detected by the underlying assertion library (expect/chai). The test suite includes both
positive tests (correct behavior) and negative tests (error paths), reducing the chance
that a tool error masks a defect.

**Mitigation:** Tests are run in CI on every push. Test source is reviewed in PRs.
Critical assertions use strict equality (`toBe`, `toEqual`) rather than relaxed matchers.
Random/flaky test patterns are avoided.

---

### 3. V8 Coverage Provider (via Vitest)

| Attribute | Detail |
|-----------|--------|
| Role | Code coverage instrumentation and measurement |
| Used for | Branch, statement, function, line coverage metrics |
| TCL | 2 |
| Version pinned | Yes — `@vitest/coverage-v8` in `package.json` |

**Qualification rationale:**
V8 coverage is the native JavaScript engine's built-in coverage mechanism. It instruments
code at the bytecode level, making it more accurate than source-level instrumentation for
branch detection. V8 coverage accuracy is validated by Google's V8 team and used in
production Chrome DevTools.

**Limitation:** V8 does not implement MC/DC (Modified Condition/Decision Coverage)
required by IEC 61508 SIL 3/4. For this project's context (non-automotive Agile), 100%
branch coverage (as measured by V8) is accepted as the structural coverage criterion.

**Mitigation:** Coverage thresholds (100% all metrics) are enforced in `vitest.config.ts`.
CI fails if thresholds are not met. Dead-code branches excluded via `v8 ignore` directives
each carry an inline comment justifying the exclusion.

---

### 4. ESLint v9.x

| Attribute | Detail |
|-----------|--------|
| Role | Static analysis / linting |
| Used for | Code style and potential error detection |
| TCL | 1 |
| Version pinned | Yes — `package.json` `devDependencies` |

**Qualification rationale:**
ESLint rules are transparent and each rule violation is human-reviewable. ESLint is
not used as primary safety evidence — it complements `tsc` type checking. ESLint errors
cause CI failure in the `lint` job.

**Mitigation:** CI `lint` job runs `tsc --noEmit` (which is more comprehensive than
eslint for type safety). ESLint adds additional checks (unused variables, etc.).

---

### 5. esbuild (via npm run compile)

| Attribute | Detail |
|-----------|--------|
| Role | Bundler — compiles TypeScript to `out/extension.js` |
| Used for | Producing the deployable VS Code extension |
| TCL | 1 |
| Version pinned | Yes — `package.json` `devDependencies` |

**Qualification rationale:**
esbuild bundles TypeScript source that has already been type-checked by `tsc` and tested
by Vitest. The bundler output is not independently tested — its correctness is inferred
from the fact that the input sources are fully validated. esbuild is a widely deployed
production bundler with extensive community validation.

**Mitigation:** The `compile` step is blocked by both `lint` and `unit-tests` jobs in CI.
Build artifacts are not committed to git. The extension is installed and manually smoke-
tested before release.

---

## Tool Qualification Summary

| Tool | Version | TCL | CI Enforced | Notes |
|------|---------|-----|-------------|-------|
| tsc | 5.x | 1 | Yes (lint job) | Primary static analysis |
| Vitest | 2.x | 2 | Yes (unit-tests job) | Test runner |
| V8 coverage | native | 2 | Yes (unit-tests job) | Coverage measurement |
| ESLint | 9.x | 1 | Yes (lint job) | Supplementary linting |
| esbuild | latest | 1 | N/A (build job) | Bundler only |

---

## Acceptance Criteria

This Tool Qualification Brief is accepted when:

1. All tools are pinned to specific versions in `package.json`
2. CI pipeline enforces tool execution on every push
3. Tool failures cause CI to block the build job
4. This document is reviewed and signed off by the Safety Lead

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-01 | Development Team | Initial release |
