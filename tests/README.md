# AI Debug Proxy — Test Framework

## Overview

This project uses **Playwright** for E2E API testing and **Pact** for consumer contract testing of the `ai-debug-proxy` VS Code extension's HTTP server.

## Quick Start

```bash
cd ai-debug-proxy

# Install test dependencies
npm install

# Run unit tests (Jest)
npm test

# Run E2E API tests (Playwright — requires proxy running on localhost:9999)
npm run test:e2e

# Run consumer contract tests (Vitest + Pact)
npm run test:pact:consumer
```

## Directory Structure

```
ai-debug-proxy/
├── playwright.config.ts          # Playwright config (API mode, baseURL=localhost:9999)
├── vitest.config.pact.ts         # Pact consumer Vitest config
├── tests/
│   ├── e2e/                      # Playwright E2E API tests
│   │   ├── ping.spec.ts          # Health check tests
│   │   └── debug-operations.spec.ts  # Debug operation validation tests
│   ├── support/
│   │   ├── fixtures/
│   │   │   └── merged-fixtures.ts    # Merged playwright-utils fixtures
│   │   └── helpers/
│   │       └── debug-api.ts          # Typed API client helpers
│   └── contract/
│       ├── consumer/             # Pact consumer tests (.pacttest.ts)
│       │   └── ping.pacttest.ts
│       └── support/              # Pact config + helpers
│           ├── pact-config.ts
│           ├── provider-states.ts
│           └── consumer-helpers.ts   # Local shim (swap for @seontechnologies/pactjs-utils)

scripts/                          # Pact broker shell scripts (project root)
├── env-setup.sh
├── publish-pact.sh
├── can-i-deploy.sh
└── record-deployment.sh

.github/
├── actions/detect-breaking-change/   # Pact breaking change detection
└── workflows/contract-test-consumer.yml
```

## Framework Details

### E2E Tests (Playwright)

- **Target**: HTTP REST API on `localhost:9999`
- **Mode**: API-only (no browser)
- **Library**: `@seontechnologies/playwright-utils` — typed `apiRequest` fixture with auto-retry
- **Config**: `playwright.config.ts`

**Environment variables:**

| Variable   | Default                  | Description             |
|------------|--------------------------|-------------------------|
| `BASE_URL` | `http://localhost:9999`  | Proxy server URL        |

Copy `.env.example` to `.env` and adjust as needed.

### Contract Tests (Pact)

- **Pattern**: Consumer-Driven Contract (CDC) testing
- **Runner**: Vitest (separate from Jest unit tests)
- **Extension**: `.pacttest.ts`
- **Provider**: `ai-debug-proxy` HTTP server
- **Consumer**: `ai-debug-proxy-consumer`

**Required packages** (add to devDependencies):

```bash
npm install -D @pact-foundation/pact vitest @seontechnologies/pactjs-utils
```

**Pact broker scripts** (require `PACT_BROKER_BASE_URL` + `PACT_BROKER_TOKEN` in `.env`):

```bash
npm run publish:pact             # Publish pact files to PactFlow
npm run can:i:deploy:consumer    # Check deployment safety
npm run record:consumer:deployment  # Record deployment after merge
```

### Unit Tests (Jest — existing)

```bash
npm test                         # Runs jest src/
```

## Running Tests

### Local Development

```bash
# E2E tests — interactive mode (shows request/response trace)
npx playwright test --reporter=list

# E2E tests — filter by test name
npx playwright test -g "Health Check"

# E2E tests — debug mode (step through)
npx playwright test --debug

# Run a single file
npx playwright test tests/e2e/ping.spec.ts
```

### CI Mode

```bash
# Full E2E suite with retries and JUnit report
CI=true npm run test:e2e

# All test layers
npm test && npm run test:e2e && npm run test:pact:consumer
```

## Best Practices

### Test Isolation

- Each test must be independent — no shared state between tests
- Use `test.beforeEach` to reset any state that tests modify
- The debug proxy state (breakpoints, session) persists between requests; test defensively

### API Testing Patterns

- Use `merged-fixtures.ts` as the single import point — never mix direct and fixture imports
- Use typed helpers from `debug-api.ts` for consistent request building
- Check `body.success` before asserting on `body.data` — the proxy always wraps responses
- Tests that require an active debug session should be in a separate `test.describe` block with a `test.skip` guard when no session is available

### Contract Testing

- Consumer tests call **real consumer code** (an actual HTTP client), not raw `fetch()` — see `pact-consumer-framework-setup.md`
- Request bodies use exact values (no matchers) — Postel's Law: be strict in what you send
- Matchers (`like()`, `string()`, `integer()`) apply only in `willRespondWith()` (responses)
- Use `uponReceiving()` names that follow: `"a request to <action> <resource>"`

### Cleanup

- Auto-cleanup is handled by the proxy itself (temp breakpoints auto-remove on hit)
- No test should leave a running debug session — always `quit` in `afterEach` if launching

## CI Integration

The GitHub Actions workflow `.github/workflows/contract-test-consumer.yml` runs:

1. Detect Pact breaking change (reads PR body checkbox)
2. Install dependencies
3. `npm run test:pact:consumer` — generate pact files
4. `npm run publish:pact` — publish to PactFlow
5. (Provider verification runs via webhook — external)
6. `can-i-deploy` check on main branch only
7. `record:consumer:deployment` on main branch

For the E2E tests, add a separate workflow job that:
1. Starts the VS Code extension host with the proxy
2. Runs `npm run test:e2e`
3. Uploads the HTML report as an artifact

## Stack Summary

| Layer          | Tool                     | Command              |
|----------------|--------------------------|----------------------|
| Unit tests     | Jest + ts-jest           | `npm test`           |
| E2E API tests  | Playwright (API mode)    | `npm run test:e2e`   |
| Contract tests | Vitest + Pact            | `npm run test:pact:consumer` |

## Knowledge Base References

These TEA knowledge fragments informed the framework setup:

- `overview.md` — `@seontechnologies/playwright-utils` design principles and installation
- `api-request.md` — Typed HTTP client, schema validation, retry configuration
- `fixtures-composition.md` — `mergeTests` patterns for combining fixtures
- `pact-consumer-framework-setup.md` — Canonical Pact CDC directory structure and CI patterns
- `pactjs-utils-consumer-helpers.md` — `createProviderState`, `setJsonContent`, `setJsonBody` API
- `contract-testing.md` — CDC testing fundamentals and resilience coverage
- `pact-mcp.md` — PactFlow MCP server for AI-assisted contract generation
