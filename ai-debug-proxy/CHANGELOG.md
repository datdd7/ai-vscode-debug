# Changelog

All notable changes to the AI Debug Proxy extension are documented here.

## [1.0.0] — 2026-03-14

### 🎉 Stable Release

First stable release of AI Debug Proxy, featuring comprehensive AI-first debugging capabilities.

### Key Features

- **33 Debug Operations** - Full DAP coverage via REST API
- **AI-Native Design** - Optimized for LLM agent consumption
- **Batch Operations** - Parallel execution support
- **LSP Integration** - Code intelligence (symbols, references, call hierarchy)
- **Subagent Orchestration** - Concurrent CLI task spawning
- **Structured Errors** - Actionable error messages with suggestions
- **Security** - Approval system for destructive operations

### New in v1.0.0 (from v0.1.b6)

#### Commands
- `ai_frame` - Compact frame info (reduces token cost)
- `ai_up` / `ai_down` / `ai_goto` - Frame navigation
- `ai_watch` - Variable watchpoints with GDB fallback

#### API Operations
- `set_breakpoints` - Batch breakpoint creation (AIVS-005)
- `watch` - Data breakpoints on variables

#### Bug Fixes
- `ai_args` null on cppdbg → Locals fallback
- `watch` validation → Added missing operation case
- `watch` VariableReference → Use scope ref, not variable ref
- Version "unknown" → Read from package.json

### Quality Metrics

- ✅ 256 unit tests (100% pass)
- ✅ Type-safe (TypeScript strict mode)
- ✅ Zero lint warnings
- ✅ GitHub Actions CI/CD

---

## [0.1.b6] (Technical: 0.1.6) — 2026-03-14

### Added

- **`ai_frame` command** — Returns compact JSON for the current top frame (`function`, `file`, `path`, `line`). Strips full function signatures — ~80 chars instead of ~6000. Reduces token cost for AI agents that call it after every step.
- **`ai_up` / `ai_down` / `ai_goto <frameId>` commands** — Frame navigation wrappers for `up`, `down`, `goto_frame` server operations. Enable call-stack traversal and cross-frame `ai_eval` without GUI.
- **`ai_watch <var> [read|write|readWrite]` command** — Sets a data breakpoint (watchpoint) on a named variable. Falls back to GDB `watch`/`rwatch`/`awatch` via repl when DAP `vscode.DataBreakpoint` API is unavailable. Default access: `write`.
- **`set_breakpoints` operation** — Batch API to set multiple breakpoints in one file atomically.
- **`ai_pretty` struct expansion** — Returns `{name, type, value, fields:[{name, type, value}]}` with one level of child fields expanded via DAP `variables` request.
- **`installCLI` to PATH** — Installs to `~/.local/lib/ai-debug-proxy/ai-debug.sh` and appends `source` to `~/.bashrc` / `~/.zshrc`. Idempotent.
- **AI-First Design Principles** — New section in `README.md` with 5 guiding constraints for AI-agent use.

### Changed

- **`ai_launch` active session warning** — Prints stop location before replacing an existing session.
- **`ai_bp` duplicate detection** — Skips and warns if identical file:line breakpoint already exists.
- **`ai_bps` condition output** — Condition strings unescaped before display (no more `\\!` leakage).
- **Error reason propagation** — All 20 failure paths in `ai-debug.sh` append the API error reason: `✗ Failed to X — <reason>`.
- **Scope filtering** — `ai_vars` returns Locals only; `ai_args` returns Arguments only with Locals fallback for cppdbg.
- **Version string** — `/api/ping` and `/api/status` read version dynamically from `package.json`.

### Fixed

- **`ai_args` returning `null`** — Added Locals fallback when no dedicated Arguments scope exists (cppdbg behaviour).
- **`watch` "Unknown operation"** — Added `watch` case to `validateOperationArgs()`.
- **`watch` "Invalid VariableReference"** — `dataBreakpointInfo` now receives scope's `variablesReference` (container), not the variable's own.
- **`watch` constructor error** — `vscode.DataBreakpoint` unavailable; GDB fallback via raw `session.customRequest`.
- **Version "unknown"** — Corrected `package.json` path in `router.ts` from `../../` to `../`.

## [0.1.b3] (Technical: 0.1.5) — 2026-03-13

### Added

- **Structured Error Handling (AIVS-002)** — New `DebugError` class with error codes, suggestions, and detailed context for better error messages.
- **Batch Breakpoint API (AIVS-005)** — New `set_breakpoints` operation to set multiple breakpoints in a single API call.
- **ErrorInfo Interface** — New structured error response format with `code`, `message`, `suggestion`, and `details`.

### Changed

- **Version Bump** — Updated to 0.1.5 (technical) for bugfix release.
- **Error Response Format** — Router now returns structured error responses with error codes and suggestions.
- **LaunchParams Interface** — Added `miDebuggerPath` and `MIMode` fields for better debugger configuration.

### Fixed

- **AIVS-006: Multi-window Targeting** — Added `workspacePath` parameter support to target specific workspace when multiple VSCode windows are open.
- **AIVS-002: Unclear Error Messages** — Implemented comprehensive error codes (`BINARY_NOT_FOUND`, `GDB_NOT_FOUND`, `WORKSPACE_NOT_FOUND`, etc.) with actionable suggestions.
- **AIVS-005: No Batch Breakpoint API** — Added `set_breakpoints` operation for efficient batch breakpoint setting.
- **Validation Layer** — Added validation for binary existence, GDB path, and workspace path before launching debug session.

## [0.1.b2] (Technical: 0.1.4) — 2026-03-13

### Added

- **LSP Service** — New `LspService.ts` providing enhanced Language Server Protocol integration for code intelligence features.
- **Hardware Debug Support** — New `hardware.ts` module enabling hardware-level debugging capabilities.
- **Subagent Routes** — Dedicated `subagents.routes.ts` for cleaner subagent API endpoint handling.

### Changed

- **CLI Helper Improvements** — Enhanced `ai-debug.sh` with better workspace variable resolution and error handling.
- **Subagent Orchestrator** — Refactored `SubagentOrchestrator.ts` with improved concurrency control and output truncation.
- **Debug Controller** — Enhanced session management and temporary breakpoint tracking.
- **HTTP Server** — Improved request routing and error response handling.
- **Documentation Status** — Updated description from "alpha" to "beta" reflecting improved stability.

### Fixed

- **CLI Inspection Bugs** — Fixed workspace variable resolution in inspection commands (`inspection.ts`).
- **Session Management** — Fixed session lifecycle handling in `session.ts` to prevent stale session references.
- **Command Handler** — Fixed macro command execution edge cases.
- **Validation** — Enhanced parameter validation with better error messages.
- **Logging** — Fixed synchronized logging to prevent race conditions in output channel writes.

### Documentation

- Added comprehensive AI agent technical guide
- Updated API reference with all 33 endpoints
- Added CLI debug guide for `ai-debug.sh`
- Enhanced troubleshooting guide with common issues

## [0.1.b0] (Technical: 0.1.3) — 2026-03-12

### Changed

- **Major Architectural Refactoring** — Codebase overhauled to meet strict coding guidelines. Improved error handling (custom `OperationError`), simplified function signatures (options objects), and standardized structured logging across all core components.
- **Documentation Reorganization** — Restructured `docs/` directory into subfolders (`arch/`, `guides/`, `guidelines/`, `release/`, `internal/`) for better maintainability. Updated documentation index and fixed formatting issues.
- **Project Structure Cleanup** — Relocated `dbg.py` to `cli/` and `ARCHITECTURE.rst` to `docs/arch/`. Removed legacy POC artifacts, temporary logs, and unused metadata directories.

### Fixed

- **Traceability Audit** — Achieved 100% compliance with V-Model tracing standards. All core component headers and JSDoc blocks now correctly satisfy PRD and Architectural requirements.
- **Test Integrity** — Fixed all regressions in the test suite caused by architectural changes. Current pass rate: 100% (251 tests).

## [0.1.1-alpha] — 2026-03-11

### Added

- **`dbg.py` CLI helper** — thin Python wrapper for the proxy API. Replaces verbose `curl` commands with `python3 dbg.py <operation> [json_params]`. No external dependencies (stdlib only).
- **`AI Debug Proxy: Install Debug CLI (dbg.py)` command** — copies `dbg.py` from the extension bundle to the current workspace root. Access via Command Palette after reload.

### Fixed

- **`list_source` cross-workspace double-path** (`inspection.ts`): `asRelativePath` returns the original absolute path unchanged when the source file is outside the open VS Code workspace. Joining workspace URI with an absolute path produced a double-prefix (`/workspace/home/.../file.c`). Now detects this case and uses `vscode.Uri.file(fsPath)` directly.

### Removed

- **`ApprovalInterceptor`** — removed entirely. All user approval dialogs for `evaluate` and `/api/subagents` are gone. AI agents can now run uninterrupted without modal popups blocking execution.

---

## [0.1.0-alpha] — 2026-03-11

First public alpha release.

### Added (0.1.0)

- 31 debug operations via `POST /api/debug`: session management, execution control, breakpoints, inspection
- `GET /api/ping` — health check with operation discovery
- `GET /api/status` — active session info
- `POST /api/subagents` — concurrent CLI task spawning
- `POST /api/commands` — macro commands
- `GET /api/symbols`, `GET /api/references`, `GET /api/call-hierarchy` — LSP code intelligence
- Unit test suite: 193 tests, C0/C1 coverage across all modules
- Comprehensive documentation in `docs/`

### Fixed (0.1.0)

- **BUG-1** (`session.ts`): Named launch config (`configName`) now found even when the project folder is not open in VS Code. Fallback scans `.vscode/launch.json` from filesystem using `fs.promises.readFile` (not `vscode.workspace.fs`) and substitutes `${workspaceFolder}` before launching. New `workspacePath` param pins the project root explicitly.
- **BUG-2** (`HttpServer.ts`): HTTP error handler guards `res.headersSent` + `res.destroyed` before writing. JSON error body always returned; no more silent stream-close on early requests.
- **BUG-3** (`session.ts` + `events.ts`): `_lastSession` retains the launched session reference between requests. `clearLastSession()` called on `onDidTerminateDebugSession` to prevent stale session leaks.
- **Logging path** (`logging.ts`): Log file path is now relative to the extension directory (`path.join(__dirname, "..", "proxy.log")`) instead of a hardcoded developer machine path.
- **`list_source` URI** (`inspection.ts`): `vscode-remote://` paths decoded via `vscode.Uri.parse()` and resolved relative to workspace via `asRelativePath` + `Uri.joinPath` to prevent double-encoding.

### Known issues (0.1.0)

- `configName` launch requires `workspacePath` when the project is not open in VS Code.
- `/api/status` does not yet return binary path, workspace root, or stop reason (planned for next release).
- WSL2: "Developer: Reload Window" does not restart the WSL2 extension host — kill the `extensionHost` process manually after installing an update.

## [2.0.0] — 2026-03-10 (internal)

Internal development milestone. Added unit test infrastructure, BMAD architecture review, initial bug fixes.

## [1.x] — 2026-02 (internal)

Initial prototype.
