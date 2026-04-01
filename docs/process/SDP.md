# Software Development Plan (SDP)

| Field | Value |
|-------|-------|
| Document ID | SDP-001 |
| Version | 1.0 |
| Project | AI Debug Proxy (`ai-debug-proxy`) |
| Status | Active |
| Last Updated | 2026-04-01 |
| Rigor Level | ASIL-D equivalent (Agile-adapted) |

---

## 1. Scope

This document defines the development process for the `ai-debug-proxy` VS Code extension. The extension exposes the VS Code Debug Adapter Protocol (DAP) as a REST API, enabling AI agents to control debug sessions programmatically.

**In-scope:** Extension source (`ai-debug-proxy/src/`), test suite, CI pipeline, dashboard.
**Out-of-scope:** MCP server (`mcp-debug-server/`), binary under test.

---

## 2. Process Overview

Development follows **Agile sprints** with continuous integration. Each sprint delivers a releasable increment. The process applies ASIL-D-level rigor to verification and qualification without requiring formal external certification.

```
Requirements → Design → Implementation → Verification → Integration → Release
     ↑                                                                    |
     └────────────────── Feedback & Change Management ───────────────────┘
```

---

## 3. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| **Developer** | Implements features, writes unit tests, ensures coverage thresholds |
| **Reviewer** | Reviews PRs against the Definition of Done checklist; must be independent from the author |
| **Safety Lead** | Maintains SDP/SVP, approves changes to qualification criteria, signs off releases |
| **CI System** | Enforces all automated quality gates on every push and PR |

---

## 4. Branching Strategy

```
master (protected)
  └─ feature/<ticket-or-topic>    ← all development work
  └─ fix/<issue-id>               ← bug fixes
  └─ release/<version>            ← release preparation (optional)
```

**Rules:**
- `master` is the single source of truth; only merges via approved PR
- No direct pushes to `master`
- PR requires at least one review approval + all CI gates green
- Feature branches are short-lived (deleted after merge)
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`)

---

## 5. Definition of Done

A task or user story is **Done** when ALL of the following are satisfied:

| # | Criterion | Enforcement |
|---|-----------|-------------|
| D1 | All unit tests pass (0 failures) | CI: `unit-tests` job |
| D2 | Statement coverage ≥ 97% | CI: vitest threshold |
| D3 | Branch coverage ≥ 97% | CI: vitest threshold |
| D4 | Function coverage ≥ 97% | CI: vitest threshold |
| D5 | TypeScript lint passes (0 errors) | CI: `lint` job |
| D6 | `npm audit` clean at `--audit-level=high` | CI: `security` job |
| D7 | Build and VSIX packaging succeeds | CI: `build` job (blocked on D1) |
| D8 | Every new function/method has a corresponding test | Code review |
| D9 | New test cases are tagged with REQ-IDs (see TRACEABILITY.md) | Code review |
| D10 | PR reviewed and approved by independent reviewer | GitHub PR required approval |

---

## 6. Change Management

All changes follow this lifecycle:

1. **GitHub Issue** created with description, impact, and affected modules
2. **Feature branch** created from `master`
3. **Implementation** with tests (D1–D9)
4. **PR opened** — template auto-populates checklist
5. **Review** — reviewer checks DoD and TRACEABILITY.md is updated
6. **CI gate** — all jobs must be green
7. **Merge** — squash or merge commit, issue closed
8. **Changelog** updated in `ai-debug-proxy/CHANGELOG.md`

**Change impact on qualification:** Any change to a module in the S1-gate (see SVP §4) requires re-running coverage verification before merge.

---

## 7. Configuration Management

| Item | Tool | Strategy |
|------|------|----------|
| Source code | Git | All changes tracked; no force-push to `master` |
| Versioning | Semantic Versioning (SemVer) | `MAJOR.MINOR.PATCH` in `package.json` |
| Releases | Git tag + GitHub Release | Tagged on `master` after all gates pass |
| Build artifacts | GitHub Actions artifacts | VSIX archived for 30 days per run |
| Dependencies | `package-lock.json` committed | Locked versions; updates via explicit PR |
| VSIX packages | Not committed to repo | Produced by CI, attached to GitHub Release |

---

## 8. Problem Resolution

| Severity | Definition | Response Target |
|----------|-----------|-----------------|
| **Critical** | CI gate blocks merge; runtime crash in released version | Fix in current sprint |
| **High** | Coverage regression; security vulnerability | Fix within 2 sprints |
| **Medium** | Test gap identified; non-blocking CI warning | Fix within 3 sprints |
| **Low** | Documentation gap; style inconsistency | Backlog |

All problems tracked as GitHub Issues with labels: `bug`, `coverage-gap`, `security`, `documentation`.

---

## 9. Static Analysis

Static analysis is executed on every push:

| Tool | Scope | Threshold |
|------|-------|-----------|
| `tsc --noEmit` | Full TypeScript type checking | 0 errors (blocks CI) |
| ESLint (planned Sprint 2) | Code quality rules | 0 errors, warnings as info |
| `npm audit` | Dependency vulnerability scan | 0 high-severity CVEs |

---

## 10. Review Process

Each PR must pass a structured review:

```markdown
## PR Review Checklist
- [ ] Code compiles cleanly (tsc)
- [ ] All new functions have unit tests
- [ ] Tests tagged with REQ-IDs in TRACEABILITY.md
- [ ] No coverage regression (D2–D4)
- [ ] Error paths and edge cases tested
- [ ] No hardcoded credentials or secrets
- [ ] CHANGELOG updated if user-facing change
- [ ] Breaking changes documented
```

Reviewer must be different from the author (independence requirement).

---

*This document is part of the qualification package for `ai-debug-proxy`. Changes to this document require Safety Lead approval.*
