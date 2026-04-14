# AI Debug Proxy v3.0.0 — Documentation

**Version:** 3.0.0 | **Date:** 2026-04-14

---

## Start Here

| Document | Description |
| --- | --- |
| [getting-started.md](getting-started.md) | Installation, first debug session, verify setup |

## Reference

| Document | Description |
| --- | --- |
| [api-reference.md](api-reference.md) | All 38 HTTP operations — request/response examples |
| [cli-debug-guide.md](cli-debug-guide.md) | Shell CLI (`ai-debug.sh`) command reference |
| [release-notes.md](release-notes.md) | Version history and changelog |

## For AI Agent Developers

| Document | Description |
| --- | --- |
| [ai/ai-agent-technical-guide.md](ai/ai-agent-technical-guide.md) | Complete integration guide for LLM agents |
| [ai/llm-guide.md](ai/llm-guide.md) | LLM usage patterns and workflows |
| [ai/llm-integration-examples.md](ai/llm-integration-examples.md) | Code examples — Python, shell, MCP |
| [ai/prompt-templates.md](ai/prompt-templates.md) | Pre-built prompts for debugging tasks |

## Claude Code Skills

Drop these into your Claude Code skills folder (`~/.claude/skills/`) to give Claude autonomous debugging capability.

| Skill | Description |
| --- | --- |
| [ai/skills/cpp-debug/SKILL.md](ai/skills/cpp-debug/SKILL.md) | Debug C/C++ applications via GDB/AI Debug Proxy |

---

## Quick Reference

**Health check:**

```bash
curl http://localhost:9999/api/ping
```

**Launch a debug session:**

```bash
curl -X POST http://localhost:9999/api/debug \
  -H "Content-Type: application/json" \
  -d '{"operation":"launch","params":{"program":"/path/to/binary","stopOnEntry":true}}'
```

**MCP server** (Claude Code, LangChain, etc.):

```bash
cd ../mcp-server
pip install -r requirements.txt
python debug_mcp.py
```
