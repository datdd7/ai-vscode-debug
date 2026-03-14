# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

- Build: `npm run compile` (uses esbuild.js)
- Watch: `npm run watch` (esbuild with --watch)
- Lint: `npm run lint` (tsc --noEmit)
- Unit tests: `npm test` (jest src)
- Run a single unit test: `npm test -- --testNamePattern="your test name"` or `npm test -- path/to/test.test.ts`
- E2E tests: `npm run test:e2e` (playwright test)
- Pact consumer tests: `npm run test:pact:consumer` (vitest run --config vitest.config.pact.ts)
- Package extension: `npm run package` (vsce package --no-dependencies)

## Code Style

- Indentation: 4 spaces (no tabs) - enforced by Prettier and ESLint
- Line length: max 100 characters
- Quotes: single quotes for strings
- Semicolons: required
- Import order:
  1. Built-in Node.js modules (fs, path, http, etc.)
  2. External libraries (axios, vscode, etc.)
  3. Internal modules (absolute imports using @/ prefix)
  4. Relative imports (when necessary)
  5. Type imports
- Absolute paths configured via tsconfig.json paths: @/_ maps to src/_
- File naming: kebab-case (e.g., http-server.ts)
- Class naming: PascalCase
- Function naming: camelCase
- Constants: UPPER_SNAKE_CASE
- Every public function must have explicit return type
- Use early returns to reduce nesting
- Error handling: never swallow errors; use specific error classes (ValidationError, NotFoundError, etc.)
- Logging: use structured logging with logger.debug/info/warn/error(component, message, data)
- Traceability: every public interface/class/function must have a $DD ID satisfying at least one $ARCH requirement

## Project-Specific Patterns

- Operation mapping: DebugController.ts builds an operation map in constructor for dispatching DAP operations via HTTP
- Validation: validateOperationArgs in src/utils/validation.ts centralizes parameter validation for all operations
- Logging system: src/utils/logging.ts provides synchronized logging to VS Code output channel and file (proxy.log)
- Router chaining: src/server/router.ts uses nullish coalescing to try route handlers in sequence (system → subagent → command → LSP → debug)
- CLI installation: ai-debug-proxy.installCLI command copies dbg.py from extension resources to workspace root
- Temp breakpoint tracking: DebugController tracks temporary breakpoints set via 'until' operation and auto-removes them on stop events
- Subagent orchestration: src/agent/SubagentOrchestrator.ts manages parallel execution with concurrency limits, output truncation (1MB), and timeout handling
- Configuration: extension reads aiDebugProxy.\* settings from workspace configuration (port, autoStart, logLevel, subagents.allowedCommands)
- CORS: HTTP server sets permissive CORS headers (\*) for local development access
- Error responses: API returns JSON with {success, error?, data?, timestamp} structure
- Port binding: server binds to 127.0.0.1 only (not 0.0.0.0) for security
- Body size limit: 1MB max request body enforced in HttpServer.readBody
- File logging: log file path is resolved relative to \_\_dirname (src/utils/proxy.log)
- Test mocks: jest.mock used extensively for fs and vscode modules in unit tests
- Test organization:
  - Unit tests: src/_/**tests**/\*\*/_.test.ts
  - E2E tests: tests/e2e/\*_/_.spec.ts
  - Pact contract tests: tests/contract/\*_/_.pacttest.ts
  - Integration tests: tests/itest/\*_/_.itest.ts
  - Utility tests: tests/utest/\*_/_.test.ts
