# Coding Guidelines - AI Debug Proxy v3.0

**Document ID:** `DOC-CG-001`  
**Version:** 3.0.0  
**Last Updated:** 2026-03-29  
**Applicable To:** All TypeScript/JavaScript code in ai-vscode-debug  
**Owner:** Engineering Team  
**Enforcement:** Strict Auditor Mode ✅

---

## 🎯 OVERVIEW

This document defines **mandatory** coding standards for AI Debug Proxy v3.0. These guidelines are **enforced by automated tools and code review**.

### Compliance Levels

| Level | Description | Enforcement | Consequence |
|-------|-------------|-------------|-------------|
| **MUST** | Mandatory requirement | CI/linters block merge | PR rejected |
| **SHOULD** | Strong recommendation | Code review enforced | Requires justification |
| **MAY** | Optional guidance | Developer discretion | N/A |

---

## 📋 TABLE OF CONTENTS

1. [TypeScript Best Practices](#1-typescript-best-practices)
2. [Code Formatting](#2-code-formatting)
4. [Error Handling](#4-error-handling)
5. [Logging Standards](#5-logging-standards)
6. [Testing Requirements](#6-testing-requirements)
7. [Documentation Standards](#7-documentation-standards)
8. [Security Rules](#8-security-rules)
9. [Performance Guidelines](#9-performance-guidelines)
10. [Code Review Checklist](#10-code-review-checklist)

---

## 1. TYPESCRIPT BEST PRACTICES

### 1.1 Type Safety

**RULE 1.1.1:** No `any` type without explicit justification

```typescript
// ❌ BAD: Lazy any
function process(data: any): any {
    return data.result;
}

// ✅ GOOD: Specific types
interface ProcessResult {
    result: string;
    error?: string;
}

function process(data: InputData): ProcessResult {
    return { result: 'success' };
}

// ✅ ACCEPTABLE: With justification comment
// Legacy API returns unknown structure - TODO: Type in v4.0
function legacyAdapter(response: any): AdaptedResponse {
    // ...
}
```

**RULE 1.1.2:** Use `unknown` instead of `any` for uncertain types

```typescript
// ❌ BAD
function parseJson(json: string): any {
    return JSON.parse(json);
}

// ✅ GOOD
function parseJson(json: string): unknown {
    return JSON.parse(json);
}

// Then narrow type
const data = parseJson(json);
if (typeof data === 'object' && data !== null && 'id' in data) {
    console.log((data as { id: number }).id);
}
```

**RULE 1.1.3:** Prefer `interface` over `type` for object shapes

```typescript
// ✅ GOOD: interface for objects
interface User {
    id: number;
    name: string;
}

// ✅ GOOD: type for unions
type Status = 'pending' | 'active' | 'closed';
type Result = Success | Failure;
```

### 1.2 Null Safety

**RULE 1.2.1:** Use optional chaining (`?.`) and nullish coalescing (`??`)

```typescript
// ❌ BAD
const userName = user && user.profile && user.profile.name ? user.profile.name : 'Guest';

// ✅ GOOD
const userName = user?.profile?.name ?? 'Guest';
```

**RULE 1.2.2:** Avoid non-null assertion (`!`) unless certain

```typescript
// ❌ BAD: Unsafe assertion
const element = document.getElementById('myId')!;

// ✅ GOOD: Safe check
const element = document.getElementById('myId');
if (element) {
    element.focus();
}
```

### 1.3 Async/Await

**RULE 1.3.1:** Always use `async/await` over `.then()`

```typescript
// ❌ BAD
function getUser(id: string): Promise<User> {
    return fetchUser(id).then(user => {
        return validateUser(user).then(valid => {
            return user;
        });
    });
}

// ✅ GOOD
async function getUser(id: string): Promise<User> {
    const user = await fetchUser(id);
    await validateUser(user);
    return user;
}
```

**RULE 1.3.2:** Handle all promise rejections

```typescript
// ❌ BAD: Unhandled rejection
async function process() {
    fetchData(); // Forgotten await
    doSomething();
}

// ✅ GOOD
async function process() {
    try {
        await fetchData();
        await doSomething();
    } catch (error) {
        logger.error('Process failed', { error });
        throw error;
    }
}
```

**RULE 1.3.3:** Use `Promise.all()` for parallel operations

```typescript
// ❌ BAD: Sequential when parallel possible
async function getAllUsers(ids: string[]): Promise<User[]> {
    const users: User[] = [];
    for (const id of ids) {
        users.push(await fetchUser(id)); // Sequential
    }
    return users;
}

// ✅ GOOD: Parallel
async function getAllUsers(ids: string[]): Promise<User[]> {
    return Promise.all(ids.map(id => fetchUser(id)));
}
```

---

## 2. CODE FORMATTING

### 2.1 Indentation & Spacing

**RULE 2.1.1:** 4 spaces, no tabs

```typescript
// ✅ GOOD
function calculate(): number {
    return items.reduce((sum, item) => {
        return sum + item.price;
    }, 0);
}

// ❌ BAD (tabs)
function calculate(): number {
	return items.reduce((sum, item) => {
		return sum + item.price;
	}, 0);
}
```

**RULE 2.1.2:** Max line length: 100 characters

```typescript
// ❌ BAD: 120+ characters
const veryLongVariableNameThatExceedsTheMaximumLineLengthAndMakesCodeHardToReadWithoutHorizontalScrolling = getValue();

// ✅ GOOD
const veryLongVariableNameThatExceedsTheMaximumLineLength =
    getValue();
```

### 2.2 Semicolons

**RULE 2.2.1:** Always use semicolons

```typescript
// ✅ GOOD
const value = 42;
const result = compute(value);

// ❌ BAD
const value = 42
const result = compute(value)
```

### 2.3 Imports

**RULE 2.3.1:** Import order: Node modules → Local modules → Type imports

```typescript
// ✅ GOOD: Organized imports
import * as path from 'path';
import { EventEmitter } from 'events';

import { BackendManager } from '../backend/BackendManager';
import { IDebugBackend } from '../backend/IDebugBackend';

import type { BackendConfig } from '../backend/IDebugBackend';
import type { MIResult } from '../mi2/MI2';

// ❌ BAD: Mixed imports
import { BackendManager } from '../backend/BackendManager';
import * as path from 'path';
import type { MIResult } from '../mi2/MI2';
import { EventEmitter } from 'events';
```

**RULE 2.3.2:** No unused imports

```typescript
// ❌ BAD: Unused import
import { unusedFunction } from './utils';
import { usedFunction } from './utils';

// ✅ GOOD
import { usedFunction } from './utils';
```

---

## 3. NAMING CONVENTIONS

### 3.1 General Rules

**RULE 3.1.1:** camelCase for variables/functions, PascalCase for classes/types

```typescript
// ✅ GOOD
const userCount = 10;
function calculateTotal(): number { return 0; }
class UserService { }
interface UserData { }
type OrderStatus = 'pending' | 'shipped';

// ❌ BAD
const user_count = 10; // snake_case
function CalculateTotal(): number { return 0; } // PascalCase function
class userService { } // camelCase class
```

### 3.2 Boolean Names

**RULE 3.2.1:** Prefix booleans with `is`, `has`, `can`, `should`, `will`

```typescript
// ✅ GOOD
const isValid = true;
const hasPermission = false;
function canExecute(): boolean { return true; }

// ❌ BAD
const valid = true;
const permission = false;
function execute(): boolean { return true; }
```

### 3.3 Constants

**RULE 3.3.1:** UPPER_SNAKE_CASE for module-level constants

```typescript
// ✅ GOOD
const MAX_RETRY_COUNT = 3;
const API_TIMEOUT_MS = 5000;
const DEFAULT_PORT = 9999;

// ❌ BAD
const maxRetryCount = 3;
const ApiTimeout = 5000;
```

### 3.4 File Names

**RULE 3.4.1:** Match file name to primary export

```
✅ GOOD:
- UserService.ts      (exports UserService)
- validation.ts       (exports validation functions)
- IDebugBackend.ts    (exports IDebugBackend interface)
- UserService.test.ts (tests for UserService)

❌ BAD:
- user_service.ts     (snake_case)
- UserServiceTest.ts  (should be .test.ts)
- utils_test.ts       (should be .test.ts suffix)
```

---

## 4. ERROR HANDLING

### 4.1 Error Types

**RULE 4.1.1:** Use specific error classes

```typescript
// ❌ BAD: Generic Error
throw new Error('User not found');

// ✅ GOOD: Specific error
export class NotFoundError extends Error {
    constructor(resource: string, id: string) {
        super(`${resource} with id ${id} not found`);
        this.name = 'NotFoundError';
    }
}

throw new NotFoundError('User', userId);
```

**RULE 4.1.2:** Create domain-specific errors

```typescript
// ai-debug-proxy/src/utils/errors.ts
export class DebugError extends Error {
    constructor(
        message: string,
        public code: string,
        public suggestion?: string
    ) {
        super(message);
        this.name = 'DebugError';
    }
}

export class GDBError extends DebugError {
    constructor(message: string, public gdbErrorCode?: number) {
        super(message, 'GDB_ERROR');
        this.name = 'GDBError';
    }
}
```

### 4.2 Error Propagation

**RULE 4.2.1:** Catch only where you can handle

```typescript
// ❌ BAD: Swallowing errors
async function getUser(id: string): Promise<User | null> {
    try {
        return await db.find(id);
    } catch (e) {
        return null; // Hides error
    }
}

// ✅ GOOD: Handle or propagate
async function getUser(id: string): Promise<User> {
    try {
        return await db.find(id);
    } catch (e) {
        logger.error('Failed to fetch user', { id, error: e });
        throw new DatabaseError('Failed to fetch user', { cause: e });
    }
}
```

**RULE 4.2.2:** Use error boundaries at system edges

```typescript
// ✅ GOOD: API error boundary
router.post('/api/debug', async (req, res) => {
    try {
        const result = await handleDebugOperation(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('API error', { error });
        
        if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
        } else if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
```

---

## 5. LOGGING STANDARDS

### 5.1 Log Levels

**RULE 5.1.1:** Use appropriate log level

| Level | When to Use | Example |
|-------|-------------|---------|
| `ERROR` | Action failed, needs attention | GDB process crashed |
| `WARN` | Unexpected but handled | Retry attempt 2/3 |
| `INFO` | Normal operations | Debug session started |
| `DEBUG` | Diagnostic info | MI command sent |
| `TRACE` | Fine-grained tracing | Entering function X |

### 5.2 Structured Logging

**RULE 5.2.1:** Use structured logging

```typescript
// ❌ BAD: String concatenation
logger.info('User ' + userId + ' launched ' + program);

// ✅ GOOD: Structured
logger.info('debug.session.launch', {
    userId,
    program,
    timestamp: new Date().toISOString()
});
```

**RULE 5.2.2:** Include context in logs

```typescript
// ✅ GOOD: With context
class GDBBackend {
    async launch(params: LaunchParams): Promise<void> {
        logger.info('[GDBBackend] Launching program', {
            program: params.program,
            cwd: params.cwd,
            stopOnEntry: params.stopOnEntry
        });
        // ...
    }
}
```

### 5.3 Sensitive Data

**RULE 5.3.1:** Never log sensitive data

```typescript
// ❌ BAD: Logging credentials
logger.info('GDB auth', { password: gdbConfig.password });

// ✅ GOOD: Sanitized
logger.info('GDB auth', {
    gdbPath: gdbConfig.path,
    authenticated: true
});
```

---

## 6. TESTING REQUIREMENTS

### 6.1 Test Coverage

**RULE 6.1.1:** Minimum coverage thresholds

| Module Type | Coverage | Enforcement |
|-------------|----------|-------------|
| Core (MI2, Backend) | 80%+ | CI blocks <80% |
| Business Logic | 70%+ | Code review |
| Utilities | 90%+ | CI blocks <90% |
| UI/Adapter | 60%+ | Code review |

**RULE 6.1.2:** Test critical paths first

```typescript
// P0: Must test
- MI parser (mi_parse.ts)
- Backend operations (GDBBackend.ts)
- Router operations (router.ts)

// P1: Should test
- DebugAdapter.ts
- Validation (validation.ts)

// P2: Nice to have
- Extension entry (extension.ts)
```

### 6.2 Test Structure

**RULE 6.2.1:** Follow Arrange-Act-Assert pattern

```typescript
// ✅ GOOD: AAA pattern
it('should parse stopped event', () => {
    // Arrange
    const miOutput = '*stopped,reason="breakpoint-hit"';
    
    // Act
    const result = parseMI(miOutput);
    
    // Assert
    expect(result?.outOfBandRecord?.[0].asyncClass).toBe('stopped');
    expect(result?.outOfBandRecord?.[0].output.find(o => o[0] === 'reason')?.[1]).toBe('breakpoint-hit');
});
```

**RULE 6.2.2:** Use descriptive test names

```typescript
// ❌ BAD
it('should work', () => { });

// ✅ GOOD
it('should parse stopped event with breakpoint-hit reason', () => { });
it('should return undefined for empty input', () => { });
it('should throw GDBError when GDB process fails to start', () => { });
```

### 6.3 Test Independence

**RULE 6.3.1:** Tests must be isolated

```typescript
// ❌ BAD: Shared state
let backend: GDBBackend;

beforeEach(() => {
    backend = new GDBBackend(); // Shared across tests
});

// ✅ GOOD: Fresh instance per test
let backend: GDBBackend;

beforeEach(() => {
    backend = new GDBBackend(); // Fresh for each test
});

afterEach(() => {
    backend.terminate(); // Cleanup
});
```

---

## 7. DOCUMENTATION STANDARDS

### 7.1 JSDoc Comments

**RULE 7.1.1:** Document all public APIs

```typescript
/**
 * Launches a debug session for the specified program.
 *
 * @param params - Launch parameters including program path and options
 * @returns Promise that resolves when debug session is initialized
 * @throws {GDBError} If GDB process fails to start
 * @throws {ValidationError} If parameters are invalid
 *
 * @example
 * ```typescript
 * await backend.launch({
 *     program: '/path/to/binary',
 *     stopOnEntry: true
 * });
 * ```
 */
async launch(params: LaunchParams): Promise<void> {
    // ...
}
```

**RULE 7.1.2:** Use $DD traceability blocks for architecture

```typescript
/**
 * $DD DBG-001
 * @brief Launches a debug session
 *
 * [Satisfies $ARCH-DAP-001]
 * [Implements UC1: Context Gathering]
 *
 * @param [in] program
 *     Absolute path to the binary
 *
 * @returns
 *     Session ID and stop reason
 */
export async function launch(program: string): Promise<LaunchResult> {
    // ...
}
```

### 7.2 Inline Comments

**RULE 7.2.1:** Comment WHY, not WHAT

```typescript
// ❌ BAD: What
i++; // Increment i

// ✅ GOOD: Why
i++; // Skip header byte (per protocol spec v2.1)
```

**RULE 7.2.2:** Use TODO/FIXME/HACK tags

```typescript
// TODO(v4.0): Replace with proper type when API is stable
function legacyAdapter(response: any): AdaptedResponse { }

// FIXME: Race condition when GDB exits during step operation
async stepIn(): Promise<void> { }

// HACK: Workaround for GDB 9.x bug - remove when we drop support
if (gdbVersion.startsWith('9.')) { }
```

---

## 8. SECURITY RULES

### 8.1 Input Validation

**RULE 8.1.1:** Validate ALL external inputs

```typescript
// ✅ GOOD: Validate before use
async function handleDebugOperation(body: any): Promise<any> {
    // Validate operation
    if (typeof body.operation !== 'string') {
        throw new ValidationError('Invalid operation');
    }
    
    // Validate program path
    if (body.params?.program && !path.isAbsolute(body.params.program)) {
        throw new ValidationError('Program path must be absolute');
    }
    
    // Validate expression (no assignment operators)
    if (body.params?.expression?.includes('=')) {
        throw new SecurityError('Expression cannot contain assignment');
    }
}
```

**RULE 8.1.2:** Sanitize file paths

```typescript
// ❌ BAD: Unsanitized path
const filePath = path.join(BASE_DIR, userInput);

// ✅ GOOD: Sanitized
const sanitizedInput = path.basename(userInput); // Remove directory traversal
const filePath = path.join(BASE_DIR, sanitizedInput);

// Verify still within BASE_DIR
if (!filePath.startsWith(BASE_DIR)) {
    throw new SecurityError('Invalid path');
}
```

### 8.2 Command Injection

**RULE 8.2.1:** Never concatenate user input into commands

```typescript
// ❌ BAD: Command injection risk
const expression = userInput; // "1; rm -rf /"
await gdb.sendCommand(`-data-evaluate-expression ${expression}`);

// ✅ GOOD: Proper escaping
const expression = userInput;
await gdb.sendCommand(`-data-evaluate-expression "${expression.replace(/"/g, '\\"')}"`);
```

---

## 9. PERFORMANCE GUIDELINES

### 9.1 Async Operations

**RULE 9.1.1:** Don't block event loop

```typescript
// ❌ BAD: Blocking
function processLargeFile(data: string): string {
    return data.split('\n').map(line => {
        return heavyComputation(line); // Blocks event loop
    }).join('\n');
}

// ✅ GOOD: Non-blocking
async function processLargeFile(data: string): Promise<string> {
    const lines = data.split('\n');
    const results: string[] = [];
    
    for (let i = 0; i < lines.length; i += 100) {
        const batch = lines.slice(i, i + 100);
        const batchResults = await Promise.all(
            batch.map(line => heavyComputationAsync(line))
        );
        results.push(...batchResults);
        
        // Yield to event loop
        await new Promise(resolve => setImmediate(resolve));
    }
    
    return results.join('\n');
}
```

### 9.2 Memory Management

**RULE 9.2.1:** Clean up resources

```typescript
class DebugSession {
    private resources: Disposable[] = [];
    
    async terminate(): Promise<void> {
        // Cleanup all resources
        for (const resource of this.resources) {
            await resource.dispose();
        }
        this.resources = [];
    }
}
```

---

## 10. CODE REVIEW CHECKLIST

### Pre-Submission Checklist

Before submitting PR, verify:

- [ ] **Tests:** All new code has tests (80%+ coverage)
- [ ] **Types:** No `any` without justification
- [ ] **Errors:** Proper error handling and logging
- [ ] **Docs:** JSDoc comments for public APIs
- [ ] **Formatting:** Passes `npm run lint`
- [ ] **Security:** Input validation for external data
- [ ] **Performance:** No blocking operations

### Reviewer Checklist

Reviewers must verify:

- [ ] **Architecture:** Follows project structure
- [ ] **SOLID:** Adheres to design principles
- [ ] **Testing:** Tests cover edge cases
- [ ] **Security:** No injection vulnerabilities
- [ ] **Logging:** Appropriate log levels and context
- [ ] **Documentation:** Clear and complete

---

## APPENDIX A: QUICK REFERENCE

### Do's and Don'ts

| Do | Don't |
|----|-------|
| Use specific types | Use `any` |
| Handle errors explicitly | Swallow errors silently |
| Write tests first | Skip tests |
| Document public APIs | Leave APIs undocumented |
| Validate inputs | Trust external data |
| Use async/await | Use `.then()` chains |
| Keep functions small (<40 lines) | Write monolithic functions |
| Use structured logging | Concatenate log strings |

### Common Patterns

```typescript
// Pattern 1: Safe async operation
async function safeOperation<T>(
    operation: () => Promise<T>,
    defaultValue: T
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        logger.error('Operation failed', { error });
        return defaultValue;
    }
}

// Pattern 2: Resource cleanup
async function withResource<T extends Disposable, R>(
    resource: T,
    fn: (r: T) => Promise<R>
): Promise<R> {
    try {
        return await fn(resource);
    } finally {
        await resource.dispose();
    }
}

// Pattern 3: Type guard
function isUser(obj: unknown): obj is User {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj
    );
}
```

---

*Last Updated: 2026-03-29*  
*Version: 3.0.0*  
*Enforcement: Strict Auditor Mode*
