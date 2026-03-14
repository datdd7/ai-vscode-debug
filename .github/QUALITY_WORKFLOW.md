# 🎯 GitHub Actions Quality Checks - Documentation

## Overview

This project uses GitHub Actions for comprehensive quality assurance with **10 quality gates** that run on every PR and push to master.

## Quality Gates

### 1. 🔍 Lint & Code Style
- **Tool:** ESLint + TypeScript
- **Command:** `npm run lint`
- **Checks:** Code style, best practices, type safety
- **Fails on:** Any linting error

### 2. 📘 Type Safety
- **Tool:** TypeScript Compiler
- **Command:** `npx tsc --noEmit --pretty`
- **Checks:** Type errors, interface compliance
- **Fails on:** Any type error

### 3. 🧪 Unit Tests
- **Tool:** Jest
- **Command:** `npm test -- --coverage`
- **Checks:** 256+ unit tests
- **Fails on:** Any test failure
- **Artifacts:** Coverage report (JSON)

### 4. 🔨 Build & Package
- **Tool:** esbuild + @vscode/vsce
- **Commands:** 
  - `npm run compile` (build)
  - `npm run package` (VSIX)
- **Checks:** Build succeeds, VSIX created
- **Fails on:** Build error
- **Artifacts:** `.vsix` file (7 days)

### 5. 🎭 E2E Tests
- **Tool:** Playwright
- **Command:** `npm run test:e2e`
- **Checks:** End-to-end browser tests
- **Fails on:** Test failure (non-blocking)
- **Artifacts:** Playwright report

### 6. 🤝 Contract Tests
- **Tool:** Pact
- **Command:** `npm run test:pact:consumer`
- **Checks:** API contract compliance
- **Fails on:** Contract violation (non-blocking)
- **Artifacts:** Pact pacts

### 7. 🔒 Security Audit
- **Tool:** npm audit
- **Commands:**
  - `npm audit --audit-level=moderate`
  - `npm audit --production --audit-level=high`
- **Checks:** Known vulnerabilities
- **Fails on:** High severity in production

### 8. 📦 Dependency Check
- **Commands:**
  - `npm outdated`
  - `npm ls --all`
- **Checks:** 
  - Outdated dependencies
  - Lock file integrity
- **Status:** Informational

### 9. 📚 Documentation Check
- **Checks:**
  - README.md exists
  - CHANGELOG.md exists
  - Basic markdown validation
- **Status:** Informational

### 10. 📊 Coverage Threshold
- **Tool:** Jest + Istanbul
- **Threshold:** 50% minimum line coverage
- **Current:** ~95% (256 tests)
- **Fails on:** Below threshold

## Workflow Triggers

```yaml
on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]
```

## Artifacts

| Artifact | Retention | Description |
|----------|-----------|-------------|
| `ai-debug-proxy-vsix` | 7 days | Packaged VS Code extension |
| `coverage-report` | 7 days | Jest coverage summary |
| `playwright-report` | 7 days | E2E test HTML report |
| `pact-pacts` | 7 days | Pact contract files |

## Quality Summary

All jobs report to a **Quality Summary** job that:
- Aggregates results from all 10 gates
- Posts to GitHub Step Summary
- Fails CI if critical gates fail

### Critical Gates (Must Pass)
- ✅ Lint
- ✅ Type Check
- ✅ Unit Tests
- ✅ Build

### Non-Critical (Informational)
- ℹ️ E2E Tests
- ℹ️ Contract Tests
- ℹ️ Security Audit
- ℹ️ Dependency Check
- ℹ️ Documentation

## Running Locally

### Full Quality Check
```bash
cd ai-debug-proxy

# Install dependencies
npm install --legacy-peer-deps

# Run all checks
npm run lint          # Lint
npm test              # Unit tests
npm run compile       # Build
npm run package       # Package
npm run test:e2e      # E2E tests
npm run test:pact:consumer  # Contract tests
npm audit             # Security audit
```

### Quick Check (Pre-commit)
```bash
npm run lint && npm test
```

## Badges

Add these badges to your README:

```markdown
[![Quality Check](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/quality-check.yml/badge.svg)](https://github.com/datdang-dev/ai-vscode-debug/actions/workflows/quality-check.yml)
```

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules out
npm install
npm run compile
```

### Tests Fail
```bash
# Run specific test
npm test -- --testNamePattern="your test name"

# Run with verbose output
npm test -- --verbose
```

### Type Errors
```bash
# Check types with details
npx tsc --noEmit --pretty --explainFiles
```

### Security Audit Fails
```bash
# Fix vulnerabilities
npm audit fix
npm audit fix --force  # Use with caution
```

## Configuration

Workflow config: `.github/workflows/quality-check.yml`

Key settings:
- **Node Version:** 20
- **Working Directory:** `./ai-debug-proxy`
- **Cache:** npm (package-lock.json)
- **OS:** ubuntu-latest

## Adding New Checks

To add a new quality gate:

1. Add new job in `quality-check.yml`
2. Define steps with `uses` or `run`
3. Add to `needs:` in `quality-summary` job
4. Update summary table

Example:
```yaml
new-check:
  name: 🆕 New Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: echo "Running check"
```

## Coverage Reports

Coverage data is collected and uploaded:

```bash
# View coverage summary
cat coverage/coverage-summary.json | jq '.total.lines.pct'

# Expected: >50%
```

## VSIX Distribution

On push to master:
1. VSIX is built automatically
2. Uploaded as artifact
3. Available for 7 days
4. Download and install:
   ```bash
   code --install-extension ai-debug-proxy-v1.0.0.vsix
   ```

---

**Last Updated:** March 14, 2026  
**Workflow Version:** 2.0 (Comprehensive)
