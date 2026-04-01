# Contributing to AI VSCode Debug

**Version:** 3.0.0-b1
**Last Updated:** 2026-03-30

---

## Overview

This guide explains how to contribute to the AI VScode Debug project. We welcome contributions from the community!

[Satisfies $ARCH-HTTP-001]

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Coding Standards](#coding-standards)
4. [Documentation Requirements](#documentation-requirements)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Code Review](#code-review)
8. [Release Process](#release-process)

---

## Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub to create your copy
# Then clone your fork:
git clone https://github.com/YOUR_USERNAME/ai-vscode-debug.git
cd ai-vscode-debug
```

### 2. Add Upstream Remote

```bash
git remote add upstream https://github.com/datdang-dev/ai-vscode-debug.git
git fetch upstream
```

### 3. Create a Branch

```bash
# Always branch from main
git checkout -b feature/your-feature-name upstream/main
```

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Extension runtime |
| npm | 9+ | Package manager |
| TypeScript | 5.3+ | Type checking |
| VS Code | 1.85+ | Development IDE |
| GCC | 9+ | For playground project |
| Make | 4+ | Build system |

### Install Dependencies

```bash
# Extension dependencies
cd ai-debug-proxy
npm install

# Verify installation
npm run compile
npm test
```

### Development Workflow

```bash
# 1. Start watch mode (auto-rebuild on changes)
npm run watch

# 2. Open extension in VS Code
code .

# 3. Press F5 to launch Extension Development Host
# 4. Test your changes in the new VS Code window
```

---

## Coding Standards

### TypeScript Guidelines

Follow our [Coding Guidelines](./guidelines/CODING_GUIDELINES.md):

- **Indentation:** 4 spaces
- **Naming:** `PascalCase` for classes, `camelCase` for functions
- **Line Length:** Max 100 characters
- **Semicolons:** Always use them

### Documentation Blocks

All public interfaces MUST have `$DD` blocks:

```typescript
/**
 * $DD DBG-001
 * @brief Launches a debug session
 *
 * [Satisfies $ARCH-DAP-001]
 *
 * @param [in] program
 *     Absolute path to the binary
 *
 * @returns
 *     Session ID and stop reason
 */
export async function launch(program: string): Promise<LaunchResult> {
    // Implementation
}
```

### Error Handling

```typescript
// ✅ GOOD: Specific error types
throw new ValidationError('Invalid path', { path });

// ❌ BAD: Generic errors
throw new Error('Something went wrong');
```

---

## Documentation Requirements

### When to Update Documentation

Update documentation when:

- Adding new API endpoints
- Changing existing behavior
- Fixing bugs that affect users
- Adding new configuration options

### Documentation Checklist

For code changes:

- [ ] Add `$DD` block to public interfaces
- [ ] Reference `$ARCH` requirements
- [ ] Update API reference if endpoints changed
- [ ] Add/update code examples
- [ ] Update changelog

For documentation changes:

- [ ] Follow markdown style guide
- [ ] Add document ID and version
- [ ] Include code examples
- [ ] Test all code snippets
- [ ] Update related document links

---

## Testing

### Unit Tests

```bash
cd ai-debug-proxy

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- UserService.test.ts
```

### Test Requirements

- **Coverage Target:** ≥80%
- **All tests must pass** before PR
- **New features require tests**

### Writing Tests

```typescript
// Example test structure
describe('DebugController', () => {
    describe('launch', () => {
        it('should launch debug session with valid program path', async () => {
            // Arrange
            const program = '/path/to/binary';
            
            // Act
            const result = await controller.launch({ program });
            
            // Assert
            expect(result.success).toBe(true);
            expect(result.sessionId).toBeDefined();
        });
        
        it('should reject invalid program path', async () => {
            // Arrange
            const program = '/nonexistent/path';
            
            // Act & Assert
            await expect(controller.launch({ program }))
                .rejects
                .toThrow(ValidationError);
        });
    });
});
```

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e

# Run benchmark
python ../test_benchmark.py
```

---

## Pull Request Process

### 1. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add conditional breakpoint support

- Add condition parameter to set_breakpoint operation
- Update API reference documentation
- Add tests for conditional breakpoints

Fixes #123"
```

### Commit Message Format

```
<type>: <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/config changes

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select branch: `feature/your-feature-name` → `datdang-dev/ai-vscode-debug:main`
4. Fill in PR template

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test update

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Coverage ≥80%

## Documentation
- [ ] $DD blocks added/updated
- [ ] API reference updated
- [ ] User guides updated

## Related Issues
Fixes #123
```

---

## Code Review

### Review Checklist

Reviewers will check:

| Category | Criteria |
|----------|----------|
| **Functionality** | Code works as intended |
| **Testing** | Adequate test coverage |
| **Documentation** | $DD blocks, API docs updated |
| **Architecture** | Follows design patterns |
| **Style** | Follows coding guidelines |
| **Security** | No security issues |
| **Performance** | No performance regressions |

### Review Response Time

- **Initial review:** Within 48 hours
- **Address feedback:** Within 1 week
- **Re-review:** Within 24 hours

### Making Changes After Review

```bash
# Make requested changes
# Commit as fixup if minor:
git commit --fixup=abc123

# Or as regular commit:
git commit -m "Address review: fix variable naming"

# Push to same branch
git push origin feature/your-feature-name
```

---

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     └─ Bug fixes (backwards compatible)
  |     └─────── New features (backwards compatible)
  └───────────── Breaking changes
```

### Release Checklist

For maintainers:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Create .vsix package
- [ ] Create GitHub release
- [ ] Publish to VS Code Marketplace

### Creating a Release

```bash
# Update version in package.json
npm version 0.2.0

# Build release
npm run package

# Create git tag
git tag -a v0.2.0 -m "Release 0.2.0"
git push origin v0.2.0
```

---

## Architecture Decision Records (ADRs)

For significant architectural changes, create an ADR:

```markdown
# ADR-001: Operation Map Pattern

## Status
Accepted

## Context
Why we need this pattern.

## Decision
What we decided to do.

## Consequences
Trade-offs and implications.
```

Store ADRs in `docs/arch/decisions/`.

---

## Getting Help

- **Documentation:** [docs/](./index.md)
- **Issues:** [GitHub Issues](https://github.com/datdang-dev/ai-vscode-debug/issues)
- **Discussions:** [GitHub Discussions](https://github.com/datdang-dev/ai-vscode-debug/discussions)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Expected Behavior

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information

### Reporting

Report violations to: [maintainer email]

---

## Related Documents

- [Coding Guidelines](./guidelines/CODING_GUIDELINES.md)
- [Architecture](./arch/architecture.md)
- [API Reference](./guides/api-reference.md)
- [Troubleshooting](./guides/troubleshooting.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
