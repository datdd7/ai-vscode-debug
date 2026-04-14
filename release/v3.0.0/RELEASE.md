# AI Debug Proxy v3.0.0 — Stable Release

**Date:** 2026-04-14  
**Status:** Stable  
**Branch:** feature/v3-alpha-audit

---

## What's in This Package

```text
v3.0.0/
├── RELEASE.md                         This file
├── extension/
│   └── ai-debug-proxy-3.0.0.vsix     VS Code extension (985 KB)
├── mcp-server/
│   ├── debug_mcp.py                   MCP server — 38 tools via FastMCP
│   ├── requirements.txt               Python deps (mcp, httpx, pytest)
│   └── README.md                      MCP client setup guide
└── docs/
    ├── INDEX.md                       Documentation index (start here)
    ├── getting-started.md             Installation and first session
    ├── api-reference.md               All 38 HTTP operations
    ├── cli-debug-guide.md             Shell CLI reference (ai-debug.sh)
    ├── release-notes.md               Version history
    ├── ai/
    │   ├── ai-agent-technical-guide.md   Full LLM integration guide
    │   ├── llm-guide.md                  LLM usage patterns
    │   ├── llm-integration-examples.md   Python / shell / MCP examples
    │   ├── prompt-templates.md           Pre-built debugging prompts
    │   └── skills/
    │       └── cpp-debug/
    │           ├── SKILL.md              Overview + navigation
    │           ├── references/
    │           │   ├── mcp-tools.md      Full MCP tool table (38 tools)
    │           │   ├── workflows.md      Step-by-step debug workflows
    │           │   └── errors.md         Common errors and fixes
    │           └── scripts/
    │               ├── debug_mcp.py      MCP server (run to activate tools)
    │               └── requirements.txt
```

---

## Installation

### VS Code Extension

```bash
code --install-extension extension/ai-debug-proxy-3.0.0.vsix --force
# Reload VS Code: Developer: Reload Window
```

Verify:

```bash
curl http://localhost:9999/api/ping
# → {"success":true,"data":{"version":"3.0.0","operationCount":38,...}}
```

### MCP Server (Claude Code, LangChain, etc.)

```bash
cd mcp-server
pip install -r requirements.txt
python debug_mcp.py    # stdio transport
```

MCP client config:

```json
{
  "mcpServers": {
    "ai-debug-proxy": {
      "command": "python3",
      "args": ["/path/to/mcp-server/debug_mcp.py"],
      "env": { "DEBUG_PROXY_URL": "http://localhost:9999" }
    }
  }
}
```

---

## Release Criteria

| Gate | Result |
| --- | --- |
| Unit tests | 541/541 PASS (100% coverage) |
| E2E tests | 72/73 PASS (1 allowed skip — A3 restart, issue #42) |
| Regression suite | 11/11 PASS |
| npm audit (moderate+) | 0 vulnerabilities |
| TypeScript lint | 0 errors |
| Production console.log | 0 occurrences |

---

## Key Changes vs v3.0.0-alpha.1

- Replaced all `console.log` with structured `logger` across production files
- `frameDown()` at frame 0 now throws `DebugError(OPERATION_FAILED)` instead of silent no-op
- CI blocks on moderate+ npm audit findings
- Unit test count: 207 → 541 (100% coverage threshold enforced)

---

## SHA256 Checksums

```text
d60cb3e947cefbf1f3eff563586d02d74639eb558f14c33ad311a7fbac97c7fd  extension/ai-debug-proxy-3.0.0.vsix
b4bf087a802fe213d18bf6ef1118271016503a41c17e053c274514689ecead9a  mcp-server/debug_mcp.py
```

---

## Requirements

| Component | Version |
| --- | --- |
| VS Code | 1.88+ |
| Node.js | 18+ |
| GDB | 9+ |
| Python | 3.11+ (MCP server only) |
