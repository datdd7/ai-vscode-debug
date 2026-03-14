Architecture Decision Document
==============================

**Version:** 0.1.0 **Status:** Draft **Last Updated:** 2026-03-11

*This document builds collaboratively through step-by-step discovery.
Sections are appended as we work through each architectural decision
together.*

--------------

Project Context Analysis
------------------------

Requirements Overview
~~~~~~~~~~~~~~~~~~~~~

**Functional Requirements:** The AI Debug Proxy system provides HTTP API
exposure of VS Code Debug Adapter Protocol (DAP) operations. Key
functional areas include:

-  **Session Management** ($SW-FR-1): Launch, restart, terminate debug
   sessions
-  **Execution Control** ($SW-FR-2): Continue, step over/in/out, until,
   jump operations
-  **Breakpoint Management** ($SW-FR-3): Set, remove, enable/disable,
   condition breakpoints
-  **Inspection & Evaluation** ($SW-FR-4): Stack trace, variables,
   expressions, source listing
-  **Frame Navigation** ($SW-FR-5): Up/down frame movement, goto frame
-  **LSP Code Intelligence** ($SW-FR-6): Symbols, references, call
   hierarchy
-  **System Utilities** ($SW-FR-7): Health check, status, logging, CLI
   helper

-  **Performance** ($SW-NFR-1): API response <100ms (local), <500ms (debugger ops), startup <2s
-  **Reliability** ($SW-NFR-2): 99.9% availability, graceful error recovery, 100% state consistency
-  **Security** ($SW-NFR-3): Localhost-only binding, no external exposure, no sensitive logging
-  **Usability** ($SW-NFR-4): CLI helper, clear errors, API docs, WSL2 compatibility
-  **Compatibility** ($SW-NFR-5): VS Code API, Node.js 18+, DAP standard, full WSL2 support

**Scale & Complexity:** - **Project complexity:** Medium - Single VS
Code extension with embedded HTTP server - **Primary technical domain:**
VS Code Extension / Debug Tooling / API Gateway - **Estimated
architectural components:** 5 core components (Server, Debug Controller,
LSP, CLI, Config)

Technical Constraints & Dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Platform Constraints** ($SW-TC-1): - MUST run as VS Code extension -
MUST use Node.js runtime - MUST bind to localhost only - MUST support
WSL2 environment

**Protocol Constraints** ($SW-TC-2): - MUST use Debug Adapter Protocol
(DAP) - MUST support standard DAP operations - MUST maintain DAP session
state

**Integration Constraints** ($SW-TC-3): - MUST integrate with VS Code
debugger API - MUST support launch.json configurations - MUST support
LSP for code intelligence

Cross-Cutting Concerns Identified
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. **Error Handling:** Consistent error response format across all
   endpoints
2. **Logging:** Structured logging with configurable verbosity
3. **Configuration:** VS Code settings integration with defaults
4. **State Management:** DAP session state consistency across operations
5. **Security:** Localhost-only enforcement at all network layers

--------------

Starter Template Evaluation
---------------------------

Primary Technology Domain
~~~~~~~~~~~~~~~~~~~~~~~~~

**VS Code Extension (TypeScript)** based on project requirements
analysis

Selected Starter: VS Code Extension Generator
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Rationale for Selection:** - Official Microsoft yo generator for VS
Code extensions - Provides proper extension manifest structure
(package.json) - Includes TypeScript configuration and build tooling
(esbuild) - Pre-configured testing setup (Jest) - Aligns with existing
project structure

**Initialization Command:**

.. code:: bash

   # Already initialized - project exists
   npm install  # Install dependencies
   npm run compile  # Build with esbuild

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** - TypeScript 5.x with strict mode - Node.js 18+
runtime - ES2022 target with CommonJS modules

**Build Tooling:** - esbuild for fast bundling - npm scripts for
compile/watch/lint - VSIX packaging for distribution

**Code Organization:** - ``src/`` for source code - ``src/debug/`` for
debug controller - ``src/server/`` for HTTP server - ``src/lsp/`` for
language server integration - ``tests/`` for test files

**Development Experience:** - Hot reload via watch mode - VS Code
extension debugging (F5) - Jest for unit testing

--------------

Core Architectural Decisions
----------------------------

Decision Priority Analysis
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Critical Decisions (Block Implementation):**
1. HTTP Server Architecture ($ARCH-1)
2. Debug Controller Pattern ($ARCH-2)
3. Request/Response Protocol ($ARCH-3)
4. Session State Management ($ARCH-4)
5. Error Handling Strategy ($ARCH-5)

**Important Decisions (Shape Architecture):**
1. LSP Integration Approach ($ARCH-6)
2. Configuration Management ($ARCH-7)
3. Logging Architecture ($ARCH-8)
4. CLI Helper Design ($ARCH-9)

**Deferred Decisions (Post-MVP):**
1. Multi-session support ($SW-OQ-3)
2. Remote debugging ($SW-OQ-1)
3. Authentication ($SW-OQ-2 - Out of scope)

API & Communication Patterns
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: RESTful HTTP API over localhost** ($ARCH-3)

-  **Pattern:** Synchronous request/response over HTTP POST
-  **Base URL:** ``http://localhost:9999`` (configurable)
-  **Content-Type:** ``application/json``
-  **Port:** 9999 default, configurable via VS Code settings
-  **Rationale:** Simple, universal HTTP clients, aligns with AI agent
   workflows ($SW-US-1)
-  **Affects:** All endpoints ($SW-API-1 to $SW-API-3)

**API Response Format:**

.. code:: typescript

   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: any;
     };
     timestamp: string;
   }

Debug Controller Architecture
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: Facade Pattern for DAP Operations** ($ARCH-2)

-  **Pattern:** DebugController facade wrapping VS Code debug API
-  **Responsibility:** Translate HTTP requests → DAP operations → HTTP
   responses
-  **State Management:** Maintain active debug session state in-memory
-  **Session Model:** Single active session per workspace (MVP)
-  **Rationale:** Simplifies DAP complexity, provides clean abstraction
   for AI agents
-  **Affects:** All debug operations ($SW-FR-1 to $SW-FR-5)

**DebugController Interface ($DD-1):**

.. code:: typescript

   interface DebugController {
     // Session Management ($DD-1.1)
     launch(params: LaunchParams): Promise<SessionInfo>;
     restart(): Promise<void>;
     quit(): Promise<void>;
     
     // Execution Control ($DD-1.2)
     continue(): Promise<StopReason>;
     next(): Promise<StopReason>;
     stepIn(): Promise<StopReason>;
     stepOut(): Promise<StopReason>;
     until(line: number): Promise<StopReason>;
     jump(line: number): Promise<void>;
     
     // Breakpoint Management ($DD-1.3)
     setBreakpoint(bp: BreakpointSpec): Promise<BreakpointResult>;
     removeBreakpoint(id: string): Promise<void>;
     // ... more operations
   }

HTTP Server Architecture
~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: Embedded Express.js Server** ($ARCH-1)

-  **Framework:** Express.js (lightweight, minimal dependencies)
-  **Binding:** localhost only (127.0.0.1) - Security requirement
   ($SW-NFR-3)
-  **Lifecycle:** Start on VS Code extension activation, stop on
   deactivate
-  **Middleware:**

   -  JSON body parser
   -  Request logging (configurable)
   -  Error handler (global)
   -  CORS: Disabled (localhost only)

-  **Rationale:** Simple, well-understood, minimal overhead, aligns with
   Node.js constraint ($SW-TC-1)
-  **Affects:** All API endpoints ($SW-API-1 to $SW-API-3)

**Server Structure:**

::

   src/server/
   ├── HttpServer.ts          # Main server class
   ├── routes/
   │   ├── debug.routes.ts    # /api/debug endpoint
   │   ├── lsp.routes.ts      # /api/symbols, /api/references, /api/call-hierarchy
   │   ├── system.routes.ts   # /api/ping, /api/status
   │   └── subagents.routes.ts # /api/subagents
   ├── middleware/
   │   ├── logging.middleware.ts
   │   ├── error.middleware.ts
   │   └── validation.middleware.ts
   └── config/
       └── server.config.ts   # Port, bindings, etc.

Session State Management
~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: In-Memory Session Registry** ($ARCH-4)

-  **Storage:** In-memory Map<SessionId, SessionState>
-  **SessionId:** UUID v4 per debug session
-  **SessionState:**

   -  sessionId, workspacePath, configName
   -  threadId, stackFrameId, currentLine
   -  activeBreakpoints[], lastStopReason

-  **Lifecycle:** Created on launch, cleared on quit/restart
-  **Persistence:** None (MVP) - lost on VS Code restart
-  **Rationale:** Simple, fast, sufficient for single-session MVP
-  **Affects:** Session management ($SW-FR-1), Inspection ($SW-FR-4)

**Session State Model ($DD-2):**

.. code:: typescript

   interface SessionState {
     sessionId: string;
     workspacePath: string;
     configName?: string;
     threadId?: number;
     currentFrameId?: number;
     currentLine?: number;
     activeBreakpoints: Breakpoint[];
     lastStopReason?: StopReason;
     createdAt: number;
     lastActivityAt: number;
   }

Error Handling Strategy
~~~~~~~~~~~~~~~~~~~~~~~

**Decision: Structured Error Responses with Error Codes** ($ARCH-5)

-  **Format:** Consistent error object in ApiResponse
-  **Error Codes:** Hierarchical (e.g., ``SESSION_NOT_FOUND``,
   ``BP_SET_FAILED``)
-  **HTTP Status:** 200 for all (application-level errors in body)
-  **Logging:** All errors logged with context (request, params, session
   state)
-  **User Messages:** Clear, actionable error messages
-  **Rationale:** AI agents need structured errors for programmatic
   handling
-  **Affects:** All endpoints ($SW-NFR-2, $SW-NFR-4)

**Error Code Categories:**

::

   SESSION_*     - Session management errors
   EXEC_*        - Execution control errors
   BP_*          - Breakpoint management errors
   INSPECT_*     - Inspection/evaluation errors
   LSP_*         - LSP integration errors
   SERVER_*      - HTTP server errors
   CONFIG_*      - Configuration errors

LSP Integration Approach
~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: VS Code Language Features API** ($ARCH-6)

-  **API:** ``vscode.languages.*`` namespace
-  **Operations:**

   -  ``getDocumentSymbols()`` → ``/api/symbols``
   -  ``getReferencesAtPosition()`` → ``/api/references``
   -  ``getCallHierarchy()`` → ``/api/call-hierarchy``

-  **Session Independence:** LSP ops work without active debug session
-  **File-based:** Operate on file URIs, not debug state
-  **Rationale:** Leverages VS Code’s built-in language servers
-  **Affects:** LSP endpoints ($SW-FR-6)

Configuration Management
~~~~~~~~~~~~~~~~~~~~~~~~

**Decision: VS Code Settings + Launch.json Integration** ($ARCH-7)

-  **Extension Settings:** ``aiDebugProxy.*`` namespace

   -  ``aiDebugProxy.port``: HTTP server port (default: 9999)
   -  ``aiDebugProxy.autoStart``: Auto-start on activation (default:
      true)
   -  ``aiDebugProxy.logLevel``: Logging verbosity (default: “info”)

-  **Launch Configs:** Read from ``.vscode/launch.json``

   -  Support launch by config name
   -  Support launch by program path

-  **Environment:** ``.env`` file support for server config
-  **Rationale:** Native VS Code integration, familiar to users
-  **Affects:** Configuration ($SW-CFG-1, $SW-CFG-2)

Logging Architecture
~~~~~~~~~~~~~~~~~~~~

**Decision: Winston Logger with File + Console Output** ($ARCH-8)

-  **Library:** Winston (standard for Node.js)
-  **Outputs:**

   -  File: ``${workspace}/.ai-debug-proxy/server.log``
   -  Console: VS Code Output Channel

-  **Levels:** error, warn, info, debug
-  **Format:** JSON structured logging
-  **Rotation:** Daily rotation, 7-day retention
-  **View Command:** “Show Log” in Command Palette ($SW-US-2.2)
-  **Rationale:** Production-grade logging, easy troubleshooting
-  **Affects:** Logging ($SW-FR-7.4, $SW-NFR-4)

CLI Helper Design
~~~~~~~~~~~~~~~~~

**Decision: Python CLI Wrapper (dbg.py)** ($ARCH-9)

-  **Language:** Python 3.x (universal, no compilation needed)
-  **Location:** Workspace root (user-configurable)
-  **Installation:** Command Palette → “Install Debug CLI” ($SW-US-2.1)
-  **Commands:**

   -  ``dbg.py launch <program>`` or ``dbg.py launch --config <name>``
   -  ``dbg.py continue``, ``dbg.py next``, ``dbg.py step_in``, etc.
   -  ``dbg.py bp set <file>:<line>``, ``dbg.py bp remove <id>``
   -  ``dbg.py eval <expression>``, ``dbg.py vars``, ``dbg.py stack``

-  **Output:** JSON (machine-readable) or pretty-print (human-readable)
-  **Rationale:** Simplifies API calls for AI agents, single-file
   deployment
-  **Affects:** CLI helper ($SW-US-2.1, $SW-FR-7.5)

--------------

Implementation Patterns & Consistency Rules
-------------------------------------------

Pattern Categories Defined
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Critical Conflict Points Identified:** 8 areas where AI agents could
make different choices

Naming Patterns
~~~~~~~~~~~~~~~

**API Endpoint Naming:** - All endpoints: lowercase kebab-case
(``/api/debug``, ``/api/call-hierarchy``) - Operations: snake_case in
request body (``operation: "set_breakpoint"``) - Response fields:
camelCase (``sessionId``, ``stopReason``)

**Error Code Naming:** - Format: ``UPPER_SNAKE_CASE`` with category
prefix - Examples: ``SESSION_NOT_FOUND``, ``BP_SET_FAILED``,
``LSP_SYMBOLS_ERROR``

**File Naming:** - TypeScript: PascalCase for classes
(``HttpServer.ts``, ``DebugController.ts``) - Routes: kebab-case with
``.routes.ts`` suffix (``debug.routes.ts``) - Tests: ``*.test.ts``
alongside source or in ``tests/`` folder

Structure Patterns
~~~~~~~~~~~~~~~~~~

**Project Organization:**

::

   ai-debug-proxy/
   ├── src/
   │   ├── extension.ts         # Extension entry point
   │   ├── server/              # HTTP server module
   │   │   ├── HttpServer.ts
   │   │   ├── routes/
   │   │   ├── middleware/
   │   │   └── config/
   │   ├── debug/               # Debug controller module
   │   │   ├── DebugController.ts
   │   │   ├── SessionManager.ts
   │   │   └── __tests__/
   │   ├── lsp/                 # LSP integration module
   │   │   └── LspService.ts
   │   ├── cli/                 # CLI helper generator
   │   │   └── dbg.py.template
   │   └── utils/               # Shared utilities
   │       ├── logger.ts
   │       └── config.ts
   ├── tests/
   │   ├── e2e/                 # End-to-end tests
   │   └── fixtures/
   ├── package.json
   ├── tsconfig.json
   ├── esbuild.js
   └── README.md

**Test Organization:** - Unit tests: ``src/**/__tests__/*.test.ts`` -
E2E tests: ``tests/e2e/*.test.ts`` - Fixtures: ``tests/fixtures/``

Format Patterns
~~~~~~~~~~~~~~~

**API Request Format:**

.. code:: json

   {
     "operation": "<operation_name>",
     "params": {
       "key": "value"
     }
   }

**API Response Format:**

.. code:: json

   {
     "success": true,
     "data": { ... },
     "timestamp": "2026-03-11T10:30:00.000Z"
   }

**Error Response Format:**

.. code:: json

   {
     "success": false,
     "error": {
       "code": "SESSION_NOT_FOUND",
       "message": "No active debug session found",
       "details": { "sessionId": "abc123" }
     },
     "timestamp": "2026-03-11T10:30:00.000Z"
   }

Communication Patterns
~~~~~~~~~~~~~~~~~~~~~~

**Event System (Internal):** - Debug events: Emitted via VS Code
``vscode.debug`` API - Server events: Internal EventEmitter for session
lifecycle - Event naming: ``session:launched``, ``session:terminated``,
``bp:hit``

**State Management:** - Immutable updates to SessionState - Single
source of truth: SessionManager - All state changes logged

Process Patterns
~~~~~~~~~~~~~~~~

**Error Handling:** - Try-catch at route handler level - All errors
logged with context (operation, params, session state) - User-facing
messages: Clear, actionable, no stack traces - Error codes: Consistent
categorization

**Request Validation:** - Validate operation exists before execution -
Validate required params for each operation - Return
``VALIDATION_ERROR`` with missing/invalid fields

--------------

Project Structure & Boundaries
------------------------------

Complete Project Directory Structure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

::

   ai-debug-proxy/
   ├── README.md
   ├── CHANGELOG.md
   ├── package.json
   ├── package-lock.json
   ├── tsconfig.json
   ├── esbuild.js
   ├── jest.config.js
   ├── .vscodeignore
   ├── .nvmrc
   ├── .gitignore
   ├── .github/
   │   └── workflows/
   │       └── ci.yml
   ├── src/
   │   ├── extension.ts              # Main extension entry ($SW-FR-1.1)
   │   ├── server/                   # HTTP Server Module ($ARCH-1)
   │   │   ├── HttpServer.ts         # Express server wrapper
   │   │   ├── routes/
   │   │   │   ├── debug.routes.ts   # /api/debug ($SW-FR-1 to FR-5)
   │   │   │   ├── lsp.routes.ts     # /api/symbols, references, call-hierarchy ($SW-FR-6)
   │   │   │   ├── system.routes.ts  # /api/ping, /api/status ($SW-FR-7)
   │   │   │   └── subagents.routes.ts # /api/subagents ($SW-FR-7.3)
   │   │   ├── middleware/
   │   │   │   ├── logging.middleware.ts
   │   │   │   ├── error.middleware.ts
   │   │   │   └── validation.middleware.ts
   │   │   └── config/
   │   │       └── server.config.ts  # Port, bindings ($SW-CFG-1)
   │   ├── debug/                    # Debug Controller Module ($ARCH-2)
   │   │   ├── DebugController.ts    # DAP facade
   │   │   ├── SessionManager.ts     # Session state ($ARCH-4)
   │   │   ├── BreakpointManager.ts  # Breakpoint ops ($SW-FR-3)
   │   │   ├── ExecutionController.ts # Step/continue ops ($SW-FR-2)
   │   │   ├── Inspector.ts          # Variable inspection ($SW-FR-4)
   │   │   └── __tests__/
   │   │       ├── DebugController.test.ts
   │   │       └── SessionManager.test.ts
   │   ├── lsp/                      # LSP Integration Module ($ARCH-6)
   │   │   └── LspService.ts         # Language features wrapper
   │   ├── cli/                      # CLI Helper Module ($ARCH-9)
   │   │   ├── dbg.py.template       # Python CLI template
   │   │   └── installCli.ts         # Installation command
   │   ├── config/                   # Configuration Module ($ARCH-7)
   │   │   ├── ExtensionConfig.ts    # VS Code settings wrapper
   │   │   └── LaunchConfig.ts       # launch.json reader
   │   └── utils/                    # Shared Utilities
   │       ├── logger.ts             # Winston logger ($ARCH-8)
   │       ├── errors.ts             # Error classes & codes ($ARCH-5)
   │       └── types.ts              # Shared TypeScript types
   ├── tests/
   │   ├── e2e/                      # End-to-end tests ($SW-TEST-2)
   │   │   ├── session.test.ts
   │   │   ├── breakpoints.test.ts
   │   │   └── execution.test.ts
   │   └── fixtures/                 # Test fixtures
   │       └── sample-project/
   └── docs/
       ├── api-reference.md          # API documentation ($SW-DOC-1)
       ├── cli-usage.md              # CLI guide ($SW-DOC-1)
       └── wsl2-guide.md             # WSL2 troubleshooting ($SW-NFR-4.4)

Architectural Boundaries
~~~~~~~~~~~~~~~~~~~~~~~~

**API Boundaries:** - **External:** HTTP POST to
``localhost:9999/api/*`` - **Internal:** Route handlers →
DebugController/LspService → VS Code API - **Auth:** None
(localhost-only, $SW-NFR-3)

**Component Boundaries:** - **HttpServer:** Handles HTTP lifecycle,
routing, middleware - **DebugController:** DAP operations abstraction,
session state - **LspService:** Language features, file-based operations
- **SessionManager:** In-memory session registry

**Data Boundaries:** - **Session State:** In-memory only, no persistence
(MVP) - **Logs:** File + VS Code Output Channel - **Config:** VS Code
Settings API + launch.json

Requirements to Structure Mapping
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Session Management ($SW-FR-1):** - ``src/debug/DebugController.ts``:
launch(), restart(), quit() - ``src/debug/SessionManager.ts``: Session
lifecycle - ``src/server/routes/debug.routes.ts``: /api/debug endpoint

**Execution Control ($SW-FR-2):** -
``src/debug/ExecutionController.ts``: continue(), next(), stepIn(),
stepOut() - ``src/debug/DebugController.ts``: Execution facade

**Breakpoint Management ($SW-FR-3):** -
``src/debug/BreakpointManager.ts``: All BP operations -
``src/debug/DebugController.ts``: BP facade

**Inspection ($SW-FR-4):** - ``src/debug/Inspector.ts``: Variables,
evaluate, stack trace - ``src/debug/DebugController.ts``: Inspection
facade

**LSP ($SW-FR-6):** - ``src/lsp/LspService.ts``: symbols, references,
call-hierarchy

**System Utilities ($SW-FR-7):** -
``src/server/routes/system.routes.ts``: ping, status -
``src/cli/installCli.ts``: CLI installation - ``src/utils/logger.ts``:
Log viewing

Integration Points
~~~~~~~~~~~~~~~~~~

**Internal Communication:** - Extension → HttpServer (activation) -
HttpServer → DebugController (request handling) - DebugController → VS
Code debug API (DAP) - LspService → VS Code language API (LSP)

**External Integrations:** - VS Code Debugger API (DAP) - VS Code
Language Server API (LSP) - File System (launch.json, source files)

**Data Flow:**

::

   AI Agent → HTTP POST → HttpServer → DebugController → VS Code DAP → Debugger
   Debugger Event → VS Code API → DebugController → SessionManager → HTTP Response

--------------

Architecture Traceability Matrix
--------------------------------

========================= ============================= ========
Architecture Decision     Related PRD Requirements      Status
========================= ============================= ========
$ARCH-1: HTTP Server      $SW-FR-1, $SW-NFR-3, $SW-TC-1 Approved
$ARCH-2: Debug Controller $SW-FR-1 to FR-5, $SW-TC-2    Approved
$ARCH-3: API Protocol     $SW-API-1 to API-3, $SW-US-1  Approved
$ARCH-4: Session State    $SW-FR-1, $SW-NFR-2           Approved
$ARCH-5: Error Handling   $SW-NFR-2, $SW-NFR-4          Approved
$ARCH-6: LSP Integration  $SW-FR-6, $SW-TC-3            Approved
$ARCH-7: Configuration    $SW-CFG-1, $SW-CFG-2          Approved
$ARCH-8: Logging          $SW-FR-7.4, $SW-NFR-4         Approved
$ARCH-9: CLI Helper       $SW-US-2.1, $SW-FR-7.5        Approved
========================= ============================= ========

--------------

Appendix: Deferred Decisions
----------------------------

+------------+------------+---------------------+---------------------+
| Decision   | Description| Reason for Deferral | Future              |
| ID         |            |                     | Consideration       |
+============+============+=====================+=====================+
| $ARCH-D1   | Support    | Out of MVP scope    | Post-beta,          |
|            | multi-sess | ($SW-OQ-3)          | requires            |
|            | ion        |                     | session             |
|            |            |                     | routing             |
+------------+------------+---------------------+---------------------+
| $ARCH-D2   | Remote     | Security concerns   | Requires            |
|            | Debug      | ($SW-OQ-1)          | auth/token          |
|            |            |                     | mechanism           |
+------------+------------+---------------------+---------------------+
| $ARCH-D3   | Auth       | Localhost-only scope| If remote           |
|            |            | ($SW-OQ-2)          | support             |
|            |            |                     | added               |
+------------+------------+---------------------+---------------------+

--------------

**Next Steps:** 1. Review architecture with stakeholders 2. Create
DETAILED_DESIGN.md with component-level specifications 3. Begin
implementation following architectural decisions
