# Coding Guidelines

**Document ID:** `DOC-CG-001`  
**Version:** 1.0.0  
**Last Updated:** 2026-03-12  
**Applicable To:** All production code in this repository  
**Owner:** Engineering Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [Code Formatting Rules](#3-code-formatting-rules)
4. [Naming Conventions](#4-naming-conventions)
5. [File and Directory Organization](#5-file-and-directory-organization)
6. [Function Design Rules](#6-function-design-rules)
7. [Class Design Guidelines](#7-class-design-guidelines)
8. [Error Handling Rules](#8-error-handling-rules)
9. [Logging Standards](#9-logging-standards)
10. [Dependency Management](#10-dependency-management)
11. [Import and Module Rules](#11-import-and-module-rules)
12. [Documentation Standards](#12-documentation-standards)
13. [Public Interface Requirements](#13-public-interface-requirements)
14. [Architecture Traceability](#14-architecture-traceability)
15. [Code Review Guidelines](#15-code-review-guidelines)
16. [Refactoring Principles](#16-refactoring-principles)
17. [Anti-Patterns to Avoid](#17-anti-patterns-to-avoid)
18. [Continuous Integration Enforcement](#18-continuous-integration-enforcement)
19. [Summary of Key Rules](#19-summary-of-key-rules)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the coding standards and best practices for all software development within this repository. Adherence to these guidelines ensures:

- **Code Consistency:** Uniform style across all modules and contributors
- **Maintainability:** Code that is easy to understand, modify, and extend
- **Scalability:** Architecture that supports team growth and codebase expansion
- **Quality Assurance:** Reduced defect rates through disciplined practices
- **Architecture Traceability:** Clear linkage between code and architectural requirements

### 1.2 Scope

These guidelines apply to:

- All production code (TypeScript/JavaScript, Node.js)
- All test code (unit, integration, E2E)
- All build and deployment scripts
- All documentation accompanying code

### 1.3 Compliance Levels

| Level | Description | Enforcement |
|-------|-------------|-------------|
| **MUST** | Mandatory requirement | Enforced by CI/linters |
| **SHOULD** | Strong recommendation | Enforced by code review |
| **MAY** | Optional guidance | Developer discretion |

### 1.4 Document Maintenance

This is a living document. Propose changes via pull request with:
- Clear rationale for the change
- Examples demonstrating the improvement
- Impact analysis on existing code

---

## 2. Design Principles

### 2.1 SOLID Principles

#### 2.1.1 Single Responsibility Principle (SRP)

**Rule:** Each module, class, or function must have exactly one reason to change.

**Reasoning:** Isolates concerns, reduces coupling, and simplifies testing.

**Example:**

```typescript
// ❌ BAD: Multiple responsibilities
class UserService {
  async createUser(data: UserData): Promise<User> {
    // Validation logic
    if (!data.email.includes('@')) throw new Error('Invalid email');
    
    // Database logic
    const user = await db.users.insert(data);
    
    // Email logic
    await emailService.sendWelcome(user.email);
    
    // Logging logic
    logger.info(`User created: ${user.id}`);
    
    return user;
  }
}

// ✅ GOOD: Separated responsibilities
class UserValidator {
  validate(data: UserData): void {
    if (!data.email.includes('@')) throw new ValidationError('Invalid email');
  }
}

class UserRepository {
  async create(data: UserData): Promise<User> {
    return db.users.insert(data);
  }
}

class UserService {
  constructor(
    private validator: UserValidator,
    private repository: UserRepository,
    private notifier: UserNotifier
  ) {}
  
  async createUser(data: UserData): Promise<User> {
    this.validator.validate(data);
    const user = await this.repository.create(data);
    await this.notifier.sendWelcome(user);
    return user;
  }
}
```

#### 2.1.2 Open/Closed Principle (OCP)

**Rule:** Software entities must be open for extension but closed for modification.

**Reasoning:** Enables adding new functionality without risking existing behavior.

**Example:**

```typescript
// ❌ BAD: Requires modification for new types
class PaymentProcessor {
  process(payment: Payment, type: string): void {
    if (type === 'credit') {
      this.processCredit(payment);
    } else if (type === 'paypal') {
      this.processPaypal(payment);
    }
    // Must modify this class to add new payment types
  }
}

// ✅ GOOD: Extension without modification
interface PaymentHandler {
  canHandle(type: string): boolean;
  handle(payment: Payment): void;
}

class PaymentProcessor {
  constructor(private handlers: PaymentHandler[]) {}
  
  process(payment: Payment): void {
    const handler = this.handlers.find(h => h.canHandle(payment.type));
    if (!handler) throw new Error('Unsupported payment type');
    handler.handle(payment);
  }
}
```

#### 2.1.3 Liskov Substitution Principle (LSP)

**Rule:** Subtypes must be substitutable for their base types without altering correctness.

**Reasoning:** Ensures polymorphism works correctly and prevents surprising behavior.

**Example:**

```typescript
// ❌ BAD: Violates LSP - Square is not a Rectangle
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  getArea(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  constructor(side: number) { super(side, side); }
  setWidth(w: number): void { this.width = this.height = w; }
  setHeight(h: number): void { this.width = this.height = h; }
}

// Client code breaks:
const shapes: Rectangle[] = [new Rectangle(2, 3), new Square(2)];
shapes.forEach(s => { s.setWidth(4); console.log(s.getArea()); });
// Rectangle: 12, Square: 16 (expected 8 if truly substitutable)

// ✅ GOOD: Composition over inheritance
interface Shape {
  getArea(): number;
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  getArea(): number { return this.width * this.height; }
}

class Square implements Shape {
  constructor(private side: number) {}
  getArea(): number { return this.side * this.side; }
}
```

#### 2.1.4 Interface Segregation Principle (ISP)

**Rule:** Clients must not be forced to depend on interfaces they do not use.

**Reasoning:** Prevents bloated interfaces and reduces unnecessary coupling.

**Example:**

```typescript
// ❌ BAD: Fat interface forces unused implementations
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class Robot implements Worker {
  work(): void { /* ... */ }
  eat(): void { throw new Error('Robots do not eat'); }
  sleep(): void { throw new Error('Robots do not sleep'); }
}

// ✅ GOOD: Segregated interfaces
interface Workable {
  work(): void;
}

interface Feedable {
  eat(): void;
}

interface Restable {
  sleep(): void;
}

class Human implements Workable, Feedable, Restable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}

class Robot implements Workable {
  work(): void { /* ... */ }
}
```

#### 2.1.5 Dependency Inversion Principle (DIP)

**Rule:** High-level modules must not depend on low-level modules. Both must depend on abstractions.

**Reasoning:** Decouples business logic from infrastructure, enabling testing and flexibility.

**Example:**

```typescript
// ❌ BAD: High-level depends on low-level
class OrderService {
  private mysqlDB = new MySQLDatabase();
  
  async placeOrder(order: Order): Promise<void> {
    await this.mysqlDB.save(order);
  }
}

// ✅ GOOD: Both depend on abstraction
interface Database {
  save(order: Order): Promise<void>;
}

class OrderService {
  constructor(private db: Database) {}
  
  async placeOrder(order: Order): Promise<void> {
    await this.db.save(order);
  }
}

// Concrete implementation injected at composition root
const orderService = new OrderService(new MySQLDatabase());
```

### 2.2 Additional Design Principles

#### 2.2.1 DRY (Don't Repeat Yourself)

**Rule:** Every piece of knowledge must have a single, unambiguous, authoritative representation.

**Reasoning:** Reduces duplication, ensuring changes propagate correctly.

**Caveat:** Avoid over-abstraction. Duplication is better than wrong abstraction.

#### 2.2.2 KISS (Keep It Simple, Stupid)

**Rule:** Prefer the simplest solution that meets requirements.

**Reasoning:** Simple code is easier to understand, test, and maintain.

#### 2.2.3 YAGNI (You Ain't Gonna Need It)

**Rule:** Do not add functionality until it is necessary.

**Reasoning:** Prevents wasted effort on unused features and reduces complexity.

---

## 3. Code Formatting Rules

### 3.1 General Formatting

#### 3.1.1 Indentation

**Rule:** Use 4 spaces for indentation. Never use tabs.

**Reasoning:** Consistent indentation improves readability across editors and platforms.

```typescript
// ✅ GOOD
function calculateTotal(items: Item[]): number {
    return items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);
}

// ❌ BAD (tabs)
function calculateTotal(items: Item[]): number {
	return items.reduce((sum, item) => {
		return sum + item.price * item.quantity;
	}, 0);
}
```

#### 3.1.2 Line Length

**Rule:** Maximum line length is 100 characters.

**Reasoning:** Ensures code is readable without horizontal scrolling.

```typescript
// ❌ BAD: Line too long
const veryLongVariableNameThatExceedsTheMaximumLineLengthAndMakesCodeHardToRead = someFunction();

// ✅ GOOD: Broken into readable lines
const veryLongVariableNameThatExceedsTheMaximumLineLength = 
    someFunction();
```

#### 3.1.3 Trailing Whitespace

**Rule:** No trailing whitespace at end of lines. Files must end with a single newline.

**Reasoning:** Reduces noise in diffs and maintains clean version control history.

#### 3.1.4 Semicolons

**Rule:** Always use semicolons at the end of statements.

**Reasoning:** Prevents automatic semicolon insertion edge cases.

```typescript
// ✅ GOOD
const value = 42;
const result = compute(value);

// ❌ BAD
const value = 42
const result = compute(value)
```

### 3.2 Braces and Spacing

#### 3.2.1 Brace Style

**Rule:** Use K&R (One True Brace) style for all blocks.

**Reasoning:** Consistent visual structure across the codebase.

```typescript
// ✅ GOOD
if (condition) {
    doSomething();
}

function myFunction() {
    return result;
}

class MyClass {
    constructor() {}
}

// ❌ BAD
if (condition)
{
    doSomething();
}

function myFunction()
{
    return result;
}
```

#### 3.2.2 Space Usage

**Rule:** 
- Add space after keywords (`if`, `for`, `while`, `function`)
- Add space around binary operators
- No space after unary operators
- Add space after commas

```typescript
// ✅ GOOD
if (isValid && count > 0) {
    result = value + 1;
    --count;
    process(a, b, c);
}

// ❌ BAD
if(isValid&& count > 0) {
    result=value + 1;
    -- count;
    process(a,b,c);
}
```

#### 3.2.3 Object Literals

**Rule:** Use trailing commas in multi-line object literals and arrays.

**Reasoning:** Reduces diff noise when adding new items.

```typescript
// ✅ GOOD
const config = {
    host: 'localhost',
    port: 3000,
    timeout: 5000,
};

const items = [
    'apple',
    'banana',
    'cherry',
];

// ❌ BAD
const config = {
    host: 'localhost',
    port: 3000,
    timeout: 5000
};
```

### 3.3 TypeScript-Specific Formatting

#### 3.3.1 Type Annotations

**Rule:** Add space before type annotation. Use interface for object types.

```typescript
// ✅ GOOD
const user: User = { id: 1, name: 'John' };
function greet(person: Person): string {
    return `Hello, ${person.name}`;
}

// ❌ BAD
const user:User = { id: 1, name: 'John' };
function greet(person:Person):string {
    return `Hello, ${person.name}`;
}
```

#### 3.3.2 Generic Types

**Rule:** No spaces inside generic angle brackets.

```typescript
// ✅ GOOD
const map: Map<string, number> = new Map();
const promise: Promise<User[]> = fetchUsers();

// ❌ BAD
const map: Map< string, number > = new Map();
```

---

## 4. Naming Conventions

### 4.1 General Naming Rules

#### 4.1.1 Descriptive Names

**Rule:** Names must reveal intent. Avoid abbreviations unless universally understood.

**Reasoning:** Code is read more often than written. Clear names reduce cognitive load.

```typescript
// ❌ BAD: Unclear abbreviations
const usrLst: User[] = [];
function calcTtl(itms: Item[]): number { return 0; }

// ✅ GOOD: Clear intent
const userList: User[] = [];
function calculateTotal(items: Item[]): number { return 0; }

// ✅ ACCEPTABLE: Universal abbreviations
const config: Config;
const maxRetries = 3;
const httpTimeout = 5000;
```

#### 4.1.2 Boolean Names

**Rule:** Prefix boolean variables and functions with `is`, `has`, `can`, `should`, or `will`.

**Reasoning:** Makes boolean nature explicit at call sites.

```typescript
// ❌ BAD
const ready = true;
const error = false;
function admin(user: User): boolean { return false; }

// ✅ GOOD
const isReady = true;
const hasError = false;
function isAdmin(user: User): boolean { return false; }
```

#### 4.1.3 Number Constants

**Rule:** Named constants for magic numbers (except 0, 1, 2).

```typescript
// ❌ BAD
setTimeout(() => {}, 5000);
const maxUsers = 100;

// ✅ GOOD
const REQUEST_TIMEOUT_MS = 5000;
const MAX_CONCURRENT_USERS = 100;

setTimeout(() => {}, REQUEST_TIMEOUT_MS);
```

### 4.2 Naming by Entity Type

| Entity Type | Convention | Example |
|-------------|------------|---------|
| Variables | `camelCase` | `userCount`, `totalAmount` |
| Functions | `camelCase` | `getUserById`, `calculateTotal` |
| Classes | `PascalCase` | `UserService`, `OrderController` |
| Interfaces | `PascalCase` | `User`, `Orderable` |
| Type Aliases | `PascalCase` | `UserId`, `OrderStatus` |
| Enums | `PascalCase` | `OrderStatus`, `UserRole` |
| Enum Members | `PascalCase` | `Pending`, `Completed` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `API_VERSION` |
| Private Members | `camelCase` with `#` | `#internalState` |
| Test Files | `*.test.ts` | `UserService.test.ts` |

### 4.3 File Naming

**Rule:** 
- Match file name to primary exported class/function
- Use `PascalCase` for class files
- Use `camelCase` for utility modules

```
✅ GOOD:
- UserService.ts      (exports UserService class)
- userController.ts   (exports functions)
- utils.ts            (utility functions)
- UserService.test.ts (tests for UserService)

❌ BAD:
- user_service.ts     (inconsistent with TypeScript conventions)
- UserServiceTest.ts  (use .test.ts suffix)
```

---

## 5. File and Directory Organization

### 5.1 Project Structure

**Rule:** Organize by feature/domain, not by file type.

**Reasoning:** Co-located related code is easier to navigate and maintain.

```
✅ GOOD (Feature-based):
src/
├── users/
│   ├── UserService.ts
│   ├── UserRepository.ts
│   ├── UserValidator.ts
│   └── __tests__/
│       └── UserService.test.ts
├── orders/
│   ├── OrderService.ts
│   ├── OrderRepository.ts
│   └── __tests__/
└── shared/
    ├── types.ts
    └── utils.ts

❌ BAD (Type-based):
src/
├── services/
│   ├── UserService.ts
│   └── OrderService.ts
├── repositories/
│   ├── UserRepository.ts
│   └── OrderRepository.ts
└── tests/
    ├── UserService.test.ts
    └── OrderService.test.ts
```

### 5.2 Module Boundaries

**Rule:** Each module must have a clear public API via `index.ts`.

```typescript
// users/index.ts
export { UserService } from './UserService';
export { UserRepository } from './UserRepository';
export type { User, UserData } from './types';

// Internal files not exported
// users/UserValidator.ts (internal)
```

### 5.3 Test File Placement

**Rule:** Place tests adjacent to source files in `__tests__/` subdirectories.

**Reasoning:** Tests travel with code during refactoring.

```
src/
├── UserService.ts
└── __tests__/
    └── UserService.test.ts
```

### 5.4 Barrel Exports

**Rule:** Use `index.ts` for barrel exports. Limit re-export depth to prevent circular dependencies.

```typescript
// ✅ GOOD: Explicit exports
export { UserService } from './UserService';
export type { User } from './types';

// ❌ BAD: Blind re-exports
export * from './UserService';
export * from './types';
export * from './utils';
```

---

## 6. Function Design Rules

### 6.1 Function Size

#### 6.1.1 Line Count

**Rule:** Functions should not exceed 40 lines.

**Reasoning:** Small functions are easier to understand, test, and reuse.

```typescript
// ❌ BAD: Too long, multiple responsibilities
async function processOrder(order: Order): Promise<OrderResult> {
    // 80 lines of code doing validation, payment, inventory, shipping, notification...
}

// ✅ GOOD: Decomposed into focused functions
async function processOrder(order: Order): Promise<OrderResult> {
    validateOrder(order);
    const payment = await processPayment(order);
    await updateInventory(order.items);
    await scheduleShipping(order);
    await sendConfirmation(order);
    return { success: true, orderId: order.id };
}
```

#### 6.1.2 Cyclomatic Complexity

**Rule:** Maximum cyclomatic complexity is 10.

**Reasoning:** Complex functions are error-prone and difficult to test.

```typescript
// ❌ BAD: High complexity (many branches)
function calculateDiscount(user: User, cart: Cart, promo: Promo): number {
    let discount = 0;
    if (user.isPremium) {
        if (cart.total > 100) {
            if (promo.code === 'SAVE20') { /* ... */ }
            else if (promo.code === 'SAVE30') { /* ... */ }
            // Many more nested conditions
        }
    }
    return discount;
}

// ✅ GOOD: Extracted into strategy pattern
function calculateDiscount(user: User, cart: Cart, promo: Promo): number {
    const strategy = DiscountStrategyFactory.create(promo.code);
    return strategy.calculate(user, cart);
}
```

### 6.2 Function Parameters

#### 6.2.1 Parameter Count

**Rule:** Maximum 4 parameters. Use object parameter for more.

**Reasoning:** Too many parameters indicate too many responsibilities.

```typescript
// ❌ BAD: Too many parameters
function createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    age: number,
    phone: string,
    address: string
): User { }

// ✅ GOOD: Object parameter
interface CreateUserParams {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    age?: number;
    phone?: string;
    address?: string;
}

function createUser(params: CreateUserParams): User { }
```

#### 6.2.2 Default Parameters

**Rule:** Use default parameters instead of `undefined` checks.

```typescript
// ❌ BAD
function greet(name?: string): string {
    const actualName = name === undefined ? 'Guest' : name;
    return `Hello, ${actualName}`;
}

// ✅ GOOD
function greet(name: string = 'Guest'): string {
    return `Hello, ${name}`;
}
```

### 6.3 Return Values

#### 6.3.1 Consistent Return Types

**Rule:** Always return the same type. Use `null`/`undefined` consistently.

```typescript
// ❌ BAD: Inconsistent returns
function findUser(id: string): User | null | undefined {
    if (!id) return null;
    const user = db.find(id);
    return user || undefined;
}

// ✅ GOOD: Consistent return
function findUser(id: string): User | null {
    if (!id) return null;
    return db.find(id) ?? null;
}
```

#### 6.3.2 Early Returns

**Rule:** Use guard clauses to avoid deep nesting.

```typescript
// ❌ BAD: Deep nesting
function processOrder(order: Order): void {
    if (order !== null) {
        if (order.items.length > 0) {
            if (order.payment.isValid) {
                // Process order
            }
        }
    }
}

// ✅ GOOD: Guard clauses
function processOrder(order: Order): void {
    if (order === null) return;
    if (order.items.length === 0) return;
    if (!order.payment.isValid) return;
    
    // Process order
}
```

---

## 7. Class Design Guidelines

### 7.1 Class Size

**Rule:** Classes should not exceed 300 lines. Prefer composition over inheritance.

**Reasoning:** Large classes violate SRP and are difficult to maintain.

### 7.2 Constructor Rules

#### 7.2.1 Constructor Work

**Rule:** Constructors must not perform async operations or complex logic.

**Reasoning:** Constructors should only initialize state. Complex initialization obscures errors.

```typescript
// ❌ BAD: Async work in constructor
class DatabaseService {
    connection: Connection;
    
    constructor(config: Config) {
        this.connection = await connect(config); // Cannot await in constructor!
    }
}

// ✅ GOOD: Separate initialization
class DatabaseService {
    private connection?: Connection;
    
    async initialize(config: Config): Promise<void> {
        this.connection = await connect(config);
    }
}
```

#### 7.2.2 Dependency Injection

**Rule:** Inject dependencies via constructor. Never instantiate dependencies internally.

```typescript
// ❌ BAD: Hard-coded dependency
class UserService {
    private repository = new UserRepository();
    private logger = new Logger();
}

// ✅ GOOD: Injected dependencies
class UserService {
    constructor(
        private repository: UserRepository,
        private logger: Logger
    ) {}
}
```

### 7.3 Member Visibility

**Rule:** Use the most restrictive visibility possible.

| Visibility | Use Case |
|------------|----------|
| `private` | Internal state, helper methods |
| `protected` | Members needed by subclasses |
| `public` | Public API only |

```typescript
class OrderProcessor {
    // Private: internal state
    private #processedIds: Set<string> = new Set();
    
    // Protected: for subclasses
    protected validateOrder(order: Order): boolean {
        return order.items.length > 0;
    }
    
    // Public: API
    async process(order: Order): Promise<void> {
        if (!this.validateOrder(order)) {
            throw new Error('Invalid order');
        }
        // Processing logic
    }
}
```

### 7.4 Getters and Setters

**Rule:** Use getters for computed properties. Avoid setters; prefer explicit methods.

```typescript
// ❌ BAD: Unnecessary setter
class User {
    private _fullName: string = '';
    
    set fullName(name: string) {
        this._fullName = name;
    }
}

// ✅ GOOD: Explicit method
class User {
    private _fullName: string = '';
    
    setName(first: string, last: string): void {
        this._fullName = `${first} ${last}`;
    }
    
    get fullName(): string {
        return this._fullName;
    }
}
```

---

## 8. Error Handling Rules

### 8.1 Error Types

**Rule:** Use specific error types. Never throw generic `Error` for expected failures.

```typescript
// ❌ BAD: Generic error
throw new Error('User not found');

// ✅ GOOD: Specific error types
class NotFoundError extends Error {
    constructor(resource: string, id: string) {
        super(`${resource} with id ${id} not found`);
        this.name = 'NotFoundError';
    }
}

throw new NotFoundError('User', userId);
```

### 8.2 Error Propagation

**Rule:** Catch errors only where you can handle them. Otherwise, let them propagate.

```typescript
// ❌ BAD: Swallowing errors
async function getUser(id: string): Promise<User | null> {
    try {
        return await db.find(id);
    } catch (e) {
        return null; // Hides the actual error
    }
}

// ✅ GOOD: Propagate or handle meaningfully
async function getUser(id: string): Promise<User> {
    try {
        return await db.find(id);
    } catch (e) {
        logger.error('Failed to fetch user', { id, error: e });
        throw new DatabaseError('Failed to fetch user', { cause: e });
    }
}
```

### 8.3 Error Boundaries

**Rule:** Define error boundaries at system edges (API handlers, CLI entry points).

```typescript
// API Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Request failed', { error: err });
    
    if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
        return res.status(404).json({ error: err.message });
    }
    
    // Default: internal server error
    return res.status(500).json({ error: 'Internal server error' });
});
```

### 8.4 Try-Catch-Finally

**Rule:** Use `finally` for cleanup. Use `try-finally` when error propagation is desired.

```typescript
let connection: Connection | null = null;
try {
    connection = await createConnection();
    await doWork(connection);
} catch (e) {
    logger.error('Work failed', e);
    throw; // Re-throw after logging
} finally {
    if (connection) {
        await connection.close(); // Always cleanup
    }
}
```

### 8.5 Promise Error Handling

**Rule:** Always handle promise rejections. Use `await` with try-catch or `.catch()`.

```typescript
// ❌ BAD: Unhandled promise
fireAndForget();

// ✅ GOOD: Proper handling
async function safeExecution(): Promise<void> {
    try {
        await fireAndForget();
    } catch (e) {
        logger.error('Async operation failed', e);
    }
}
```

---

## 9. Logging Standards

### 9.1 Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `ERROR` | Action failed, requires attention | Database connection lost |
| `WARN` | Unexpected but handled | Retry attempt 2 of 3 |
| `INFO` | Normal business operations | User created, Order shipped |
| `DEBUG` | Detailed diagnostic info | SQL query executed |
| `TRACE` | Fine-grained tracing | Entering function X |

### 9.2 Log Structure

**Rule:** Use structured logging with consistent fields.

```typescript
// ❌ BAD: Unstructured log
logger.info('User logged in: ' + userId);

// ✅ GOOD: Structured log
logger.info('user.login', {
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip
});
```

### 9.3 Sensitive Data

**Rule:** Never log sensitive data (passwords, tokens, PII).

```typescript
// ❌ BAD: Logging sensitive data
logger.info('Auth attempt', { password: credentials.password });

// ✅ GOOD: Sanitized log
logger.info('auth.attempt', {
    userId: credentials.userId,
    success: result.success
});
```

### 9.4 Performance Logging

**Rule:** Log operation duration for performance-critical paths.

```typescript
async function processBatch(items: Item[]): Promise<void> {
    const startTime = performance.now();
    
    try {
        await processItems(items);
        const duration = performance.now() - startTime;
        logger.info('batch.processed', { 
            count: items.length, 
            durationMs: duration 
        });
    } catch (e) {
        const duration = performance.now() - startTime;
        logger.error('batch.failed', { 
            count: items.length, 
            durationMs: duration,
            error: e 
        });
        throw;
    }
}
```

---

## 10. Dependency Management

### 10.1 Dependency Declaration

**Rule:** All dependencies must be explicitly declared in `package.json`.

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typeorm": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

### 10.2 Version Pinning

**Rule:** Use caret (`^`) for minor updates. Use exact version for critical dependencies.

```json
// ✅ GOOD
"dependencies": {
  "express": "^4.18.0",    // Allow minor/patch updates
  "lodash": "4.17.21"      // Exact version for stability
}

// ❌ BAD
"dependencies": {
  "express": "*",          // Any version - dangerous
  "lodash": "latest"       // Unpinned
}
```

### 10.3 Dependency Audit

**Rule:** Run `npm audit` in CI. Address high/critical vulnerabilities within 48 hours.

### 10.4 Dependency Minimization

**Rule:** Minimize dependencies. Evaluate before adding:
- Is the dependency actively maintained?
- Is the bundle size acceptable?
- Are there security concerns?
- Can this be implemented with standard library?

---

## 11. Import and Module Rules

### 11.1 Import Order

**Rule:** Group imports in this order:
1. Node.js built-in modules
2. Third-party packages
3. Internal modules (by proximity)

```typescript
// ✅ GOOD: Organized imports
import { EventEmitter } from 'events';
import * as path from 'path';

import express from 'express';
import _ from 'lodash';

import { UserService } from '../users/UserService';
import { Logger } from '../../shared/Logger';
import { Config } from '@/config';

// ❌ BAD: Mixed imports
import express from 'express';
import { UserService } from '../users/UserService';
import * as path from 'path';
import { Logger } from '../../shared/Logger';
import _ from 'lodash';
```

### 11.2 Default vs Named Exports

**Rule:** Prefer named exports. Use default export only for single-purpose modules.

```typescript
// ✅ GOOD: Named exports
// utils.ts
export function formatDate(date: Date): string { }
export function parseDate(str: string): Date { }

// Import
import { formatDate, parseDate } from './utils';

// ✅ ACCEPTABLE: Default for single export
// UserService.ts
export default class UserService { }

// Import
import UserService from './UserService';
```

### 11.3 Circular Dependencies

**Rule:** Avoid circular dependencies. Use dependency injection or event emitters to break cycles.

```typescript
// ❌ BAD: Circular dependency
// File A imports B, File B imports A

// ✅ GOOD: Break cycle with interface
interface EventDispatcher {
    emit(event: string, data: any): void;
}

class ServiceA {
    constructor(private dispatcher: EventDispatcher) {}
}
```

### 11.4 Dynamic Imports

**Rule:** Use dynamic imports for code splitting and lazy loading.

```typescript
// Lazy load heavy module
async function loadAnalytics(): Promise<AnalyticsModule> {
    return import('./analytics/AnalyticsModule');
}
```

---

## 12. Documentation Standards

### 12.1 Code Comments

**Rule:** Comments explain **why**, not **what**. Code should be self-documenting.

```typescript
// ❌ BAD: Redundant comment
// Increment counter by 1
counter++;

// ✅ GOOD: Explains intent
// Retry count for exponential backoff
retryCount++;
```

### 12.2 TODO Comments

**Rule:** Use standardized TODO format with author and date.

```typescript
// TODO(datdang, 2026-03-12): Refactor to use strategy pattern
// FIXME: Memory leak in large batch processing
// HACK: Temporary workaround for API v1 limitation
// NOTE: Important - do not optimize this query
```

### 12.3 Complex Logic Documentation

**Rule:** Document non-obvious algorithms and business rules.

```typescript
/**
 * Calculates shipping cost using zone-based pricing.
 * 
 * Algorithm:
 * 1. Determine origin and destination zones
 * 2. Calculate base rate from zone matrix
 * 3. Apply weight surcharge if > 5kg
 * 4. Apply fuel surcharge (current rate: 15%)
 * 
 * @see https://internal.wiki/shipping-pricing
 */
function calculateShippingCost(origin: Zone, destination: Zone, weight: number): number {
    // Implementation
}
```

---

## 13. Public Interface Requirements

### 13.1 Documentation Block Format

**Rule:** Every public interface MUST have a documentation block with `$DD` identifier and `$ARCH` traceability.

```typescript
/**
 * $DD USR-001
 * @brief Creates a new user account with validation
 *
 * [Satisfies $ARCH-USR-001, $ARCH-SEC-003]
 *
 * This function validates the user data, checks for existing
 * accounts, and persists the new user to the database.
 *
 * @param [in] userData
 *     Complete user registration data including email and password
 *
 * @param [in] options
 *     Optional settings for account creation
 *
 * @returns
 *     Promise resolving to the created user with generated ID
 *
 * @throws {ValidationError}
 *     If userData fails validation checks
 *
 * @throws {DuplicateError}
 *     If email already exists in the system
 *
 * @example
 * ```typescript
 * const user = await createUser({
 *     email: 'user@example.com',
 *     password: 'securePassword123'
 * });
 * ```
 */
public async createUser(
    userData: CreateUserDTO,
    options: CreateOptions = {}
): Promise<User> {
    // Implementation
}
```

### 13.2 $DD Identifier

**Purpose:** The `$DD` (Detail Design) identifier uniquely identifies each public interface in the design documentation system.

**Format:** `$DD <MODULE>-<NUMBER>` (e.g., `$DD USR-001`, `$DD ORD-042`)

**Requirements:**
- Every public class, method, and function MUST have a `$DD`
- Each `$DD` must be unique within the codebase
- `$DD` identifiers must be tracked in the design documentation

### 13.3 $ARCH Traceability

**Purpose:** The `$ARCH` identifier links code to architectural requirements, ensuring implementation satisfies system design.

**Format:** `$ARCH-<MODULE>-<NUMBER>` (e.g., `$ARCH-USR-001`, `$ARCH-SEC-003`)

**Requirements:**
- Every `$DD` MUST satisfy at least one `$ARCH` requirement
- Multiple `$ARCH` references allowed for cross-cutting concerns
- Internal helper functions MUST NOT use `$DD` or `$ARCH`

### 13.4 Internal vs Public

**Rule:** Internal helpers must not have documentation blocks with `$DD`.

```typescript
/**
 * $DD USR-002
 * @brief Public API for user retrieval
 *
 * [Satisfies $ARCH-USR-002]
 */
public async getUserById(id: string): Promise<User | null> {
    return this.#findById(id);
}

// Internal helper - no $DD block
async #findById(id: string): Promise<User | null> {
    // Implementation details
}
```

---

## 14. Architecture Traceability

### 14.1 Traceability Matrix

**Rule:** Maintain traceability between:
- Architecture requirements (`$ARCH`)
- Detail design (`$DD`)
- Implementation (code)
- Tests

```
$ARCH-USR-001 (User Registration)
    └── $DD USR-001 (createUser function)
        └── src/users/UserService.ts:createUser()
            └── src/users/__tests__/UserService.test.ts
```

### 14.2 Cross-Reference Comments

**Rule:** Use reference comments for non-obvious architectural decisions.

```typescript
// [ARCH-DECISION-003] Using event sourcing for audit trail
// See: docs/architecture/decisions/003-event-sourcing.md
class AuditLog {
    // Implementation
}
```

### 14.3 Module Dependency Graph

**Rule:** Document module dependencies. Changes to the graph require architecture review.

```
┌─────────────┐     ┌─────────────┐
│   API Layer │ ──► │  Services   │
└─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Repositories│
                    └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Database   │
                    └─────────────┘
```

---

## 15. Code Review Guidelines

### 15.1 Review Checklist

**Rule:** Every PR must be reviewed against this checklist:

| Category | Check |
|----------|-------|
| **Functionality** | Does the code do what it's supposed to? |
| **Testing** | Are there adequate tests? Do they pass? |
| **Documentation** | Are public interfaces documented with `$DD`? |
| **Architecture** | Does it follow architectural patterns? |
| **Style** | Does it follow these coding guidelines? |
| **Security** | Any security concerns? |
| **Performance** | Any performance implications? |

### 15.2 Review Response Time

**Rule:** 
- Initial review within 24 hours
- Address feedback within 48 hours
- Re-review within 12 hours

### 15.3 Review Comments

**Rule:** Provide constructive, specific feedback.

```
❌ BAD: "This is wrong"
✅ GOOD: "This function has cyclomatic complexity of 15. Consider extracting 
         the validation logic into a separate method to reduce complexity 
         and improve testability."
```

### 15.4 Approval Requirements

| Change Type | Approvals Required |
|-------------|-------------------|
| Bug fix | 1 reviewer |
| Feature | 2 reviewers |
| Architecture change | 2 reviewers + architect |
| Security-related | Security team + 2 reviewers |

---

## 16. Refactoring Principles

### 16.1 Refactoring Triggers

**Rule:** Refactor when:
- Adding a feature requires modifying the same code in multiple places
- Function/class exceeds size limits
- Test coverage is below 80%
- Code smells are identified in review

### 16.2 Refactoring Safety

**Rule:** 
1. Ensure tests exist before refactoring
2. Refactor in small, commitable steps
3. Run tests after each step
4. Never refactor and add features in the same commit

### 16.3 Boy Scout Rule

**Rule:** Leave the code cleaner than you found it.

```typescript
// When adding a feature to a file:
// 1. Fix naming issues you encounter
// 2. Extract long functions you see
// 3. Add missing documentation
// 4. Improve test coverage

// But: Keep refactoring separate from feature commits
```

---

## 17. Anti-Patterns to Avoid

### 17.1 God Object

**Description:** A class that knows too much or does too much.

**Symptoms:**
- Class exceeds 300 lines
- More than 10 public methods
- Dependencies on many other classes

**Solution:** Extract responsibilities into separate classes.

### 17.2 Spaghetti Code

**Description:** Unstructured, difficult-to-follow control flow.

**Symptoms:**
- Deep nesting (>4 levels)
- Excessive use of `goto`-like patterns
- Tight coupling between modules

**Solution:** Apply structured programming, extract functions.

### 17.3 Magic Numbers

**Description:** Unexplained numeric literals in code.

```typescript
// ❌ BAD
if (status === 3) { /* ... */ }
setTimeout(callback, 5000);

// ✅ GOOD
const STATUS_COMPLETED = 3;
const REQUEST_TIMEOUT_MS = 5000;

if (status === STATUS_COMPLETED) { /* ... */ }
setTimeout(callback, REQUEST_TIMEOUT_MS);
```

### 17.4 Premature Optimization

**Description:** Optimizing before measuring performance.

**Symptoms:**
- Complex caching without profiling
- Micro-optimizations hurting readability
- "Just in case" performance code

**Solution:** Measure first, optimize bottlenecks only.

### 17.5 Cargo Cult Programming

**Description:** Using patterns without understanding why.

**Symptoms:**
- Copy-pasted code from StackOverflow
- Over-engineering simple problems
- Using frameworks without need

**Solution:** Understand before implementing. Prefer simplicity.

### 17.6 Error Swallowing

**Description:** Catching errors without handling them.

```typescript
// ❌ BAD
try {
    riskyOperation();
} catch (e) {
    // Silent failure
}

// ✅ GOOD
try {
    riskyOperation();
} catch (e) {
    logger.error('Operation failed', e);
    throw new OperationError('Failed to complete', { cause: e });
}
```

### 17.7 Feature Envy

**Description:** A method that uses more features from other classes than its own.

```typescript
// ❌ BAD: Order envies Customer
class Order {
    getCustomerRegion(customer: Customer): string {
        return customer.address.state.region.name;
    }
}

// ✅ GOOD: Move to Customer
class Customer {
    getRegion(): string {
        return this.address.state.region.name;
    }
}
```

---

## 18. Continuous Integration Enforcement

### 18.1 CI Pipeline Requirements

**Rule:** All PRs must pass:

| Check | Tool | Enforcement |
|-------|------|-------------|
| Type checking | `tsc --noEmit` | MUST pass |
| Linting | `eslint` | MUST pass |
| Formatting | `prettier --check` | MUST pass |
| Unit tests | `jest` | MUST pass |
| E2E tests | `jest --config e2e` | MUST pass |
| Coverage | `jest --coverage` | ≥80% required |
| Security audit | `npm audit` | No high/critical |

### 18.2 Pre-commit Hooks

**Rule:** Use Husky for pre-commit checks.

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:ci"
    }
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write", "git add"]
  }
}
```

### 18.3 Branch Protection

**Rule:** Protect main branches:
- Require PR review
- Require CI passage
- Require up-to-date branch
- No force pushes

### 18.4 Automated Enforcement

**Rule:** Automate enforcement where possible:
- ESLint rules for style violations
- TypeScript strict mode for type safety
- Size limits for functions/classes (tslint rules)
- Dependency vulnerability scanning

---

## 19. Summary of Key Rules

### 19.1 Must-Remember Rules

| # | Rule | Priority |
|---|------|----------|
| 1 | Every public interface must have `$DD` and `$ARCH` | MUST |
| 2 | Functions ≤40 lines, classes ≤300 lines | MUST |
| 3 | Maximum 4 function parameters | MUST |
| 4 | No trailing whitespace, 4-space indent | MUST |
| 5 | All dependencies explicitly declared | MUST |
| 6 | Catch errors only where you can handle them | MUST |
| 7 | Never log sensitive data | MUST |
| 8 | Tests adjacent to source in `__tests__/` | MUST |
| 9 | CI must pass before merge | MUST |
| 10 | Leave code cleaner than you found it | SHOULD |

### 19.2 Quick Reference

```
Naming:
- camelCase: variables, functions
- PascalCase: classes, interfaces
- UPPER_SNAKE: constants

Formatting:
- 4 spaces, no tabs
- 100 char max line
- Semicolons always
- Trailing commas in multi-line

Design:
- SOLID principles
- Composition over inheritance
- Dependency injection
- Single responsibility

Documentation:
- $DD for public interfaces
- $ARCH for traceability
- Comments explain why, not what

Testing:
- 80% coverage minimum
- Tests travel with code
- Test behavior, not implementation
```

### 19.3 Violation Consequences

| Violation Type | Consequence |
|----------------|-------------|
| Formatting | Auto-fix by linter |
| Naming | Code review feedback |
| Missing $DD | PR blocked |
| Low test coverage | CI failure |
| Security issue | Immediate fix required |

---

## Appendix A: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-12 | Engineering Team | Initial release |

## Appendix B: Related Documents

- `docs/ARCHITECTURE.md` - System architecture overview
- `docs/SECURITY.md` - Security guidelines
- `docs/TESTING.md` - Testing standards
- `AGENTS.md` - Repository organization

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| `$DD` | Detail Design identifier for public interfaces |
| `$ARCH` | Architecture requirement identifier |
| SRP | Single Responsibility Principle |
| OCP | Open/Closed Principle |
| LSP | Liskov Substitution Principle |
| ISP | Interface Segregation Principle |
| DIP | Dependency Inversion Principle |

---

*This document is a living guideline. Propose changes via pull request with clear rationale and examples.*
