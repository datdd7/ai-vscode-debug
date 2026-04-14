# AI Debug Proxy — Documentation Index

**Version:** 3.0.0
**Date:** 2026-04-14
**Project:** ai-vscode-debug

---

## Overview

This repository provides tools for AI agents to control VS Code debugging programmatically via HTTP REST APIs.

| Component | Description |
| --- | --- |
| [ai-debug-proxy](../ai-debug-proxy/) | VS Code extension exposing DAP operations via HTTP on `localhost:9999` |
| [playground](../playground/) | AUTOSAR-style C project with 10 intentional bugs for AI debugging training |
| [ai-debug.sh](../ai-debug-proxy/resources/ai-debug.sh) | Shell CLI helper for proxy interaction |

---

## Documentation

| Document | Description |
| --- | --- |
| [Getting Started](./guides/getting-started.md) | Installation, setup, first debug session |
| [API Reference](./guides/api-reference.md) | All 38 HTTP debug operations (v3) |
| [LLM Integration Guide](./ai/llm-guide.md) | AI agent usage patterns, threading workflows |
| [Architecture](./arch/architecture.md) | Extension internals, data flow, module design |
| [Debugging Guide](./guides/debugging-guide.md) | Embedded training bugs and debugging workflows |
| [CLI Guide](./guides/cli-debug-guide.md) | Shell CLI command reference |
| [Release Notes](./release/release-notes.md) | Changelog and known issues |
| [Release Criteria](./release/release-criteria.md) | Beta/Stable gate definitions |
| [Testing Framework](./testing_framework/qualification_guide.md) | E2E Qualification & Safety Framework |

## Project READMEs

| File | Description |
| --- | --- |
| [README.md](../README.md) | Repository overview and quick usage |
| [ai-debug-proxy/CHANGELOG.md](../ai-debug-proxy/CHANGELOG.md) | Extension version history |
| [playground/README.md](../playground/README.md) | Training project overview and build instructions |
| [playground/debug_scenarios.md](../playground/debug_scenarios.md) | Detailed scenarios for each of the 10 intentional bugs |
| [tests/README.md](../tests/README.md) | E2E test suite documentation |

---

## Quick Start

```bash
# 1. Build and install extension
cd ai-debug-proxy && npm run compile && npm run package
code --install-extension ai-debug-proxy-3.0.0.vsix

# 2. Verify proxy is running
curl http://localhost:9999/api/ping

# 3. Launch a debug session
curl -X POST http://localhost:9999/api/debug/execute_operation \
  -H "Content-Type: application/json" \
  -d '{"operation":"launch","params":{"program":"/path/to/binary","stopOnEntry":true}}'

# 4. Step through code
curl -X POST http://localhost:9999/api/debug/execute_operation \
  -d '{"operation":"next"}'
```

---

## Support

- Issues: [github.com/datdang-dev/ai-vscode-debug](https://github.com/datdang-dev/ai-vscode-debug)
- Status: Beta — 38 operations, 100% coverage, production-ready quality gates in progress
