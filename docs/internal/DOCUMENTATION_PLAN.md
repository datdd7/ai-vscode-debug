# Documentation Plan

**Document ID:** `DOC-PLAN-001`
**Version:** 3.0.0
**Last Updated:** 2026-03-12
**Owner:** Tech Writer Agent (`AGENT-TW-001`)

---

## Overview

This document outlines the documentation strategy for the AI VSCode Debug project. It identifies current documentation gaps and provides a roadmap for completing the documentation suite.

---

## Current Documentation Status

### ✅ Completed Documents

#### User Guides
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [README.md](../README.md) | ✅ Complete | 2026-03-12 | AI-First README |
| [docs/index.md](./index.md) | ✅ Complete | 2026-03-11 | Documentation hub |
| [docs/guides/getting-started.md](./guides/getting-started.md) | ✅ Complete | 2026-03-11 | Installation & setup |
| [docs/guides/api-reference.md](./guides/api-reference.md) | ✅ Complete | 2026-03-11 | All HTTP endpoints |
| [docs/guides/debugging-guide.md](./guides/debugging-guide.md) | ✅ Complete | 2026-03-11 | Training bugs & workflows |
| [docs/guides/troubleshooting.md](./troubleshooting.md) | ✅ Complete | 2026-03-12 | Common issues & solutions |
| [docs/guides/wsl2-setup.md](./wsl2-setup.md) | ✅ Complete | 2026-03-12 | WSL2 setup guide |
| [docs/guides/ai-agent-technical-guide.md](./ai-agent-technical-guide.md) | ✅ Complete | 2026-03-12 | 🆕 AI Agent API guide |
| [docs/guides/cli-debug-guide.md](./cli-debug-guide.md) | ✅ Complete | 2026-03-12 | 🆕 CLI debugging workflows |

#### Architecture & Design
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [docs/arch/architecture.md](./arch/architecture.md) | ✅ Complete | 2026-03-11 | System design |
| [docs/arch/ARCHITECTURE.rst](./ARCHITECTURE.rst) | ✅ Complete | - | RST format |

#### Guidelines & Standards
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [docs/guidelines/CODING_GUIDELINES.md](./guidelines/CODING_GUIDELINES.md) | ✅ Complete | 2026-03-12 | 19-section standards |
| [docs/guidelines/CODING_GUIDELINES_AuthorKilo.md](./CODING_GUIDELINES_AuthorKilo.md) | ✅ Complete | - | Alternative version |

#### AI Agent Documentation
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [docs/ai/prompt-templates.md](./ai/prompt-templates.md) | ✅ Complete | 2026-03-12 | 🆕 Prompt templates |
| [docs/ai/llm-integration-examples.md](./llm-integration-examples.md) | ✅ Complete | 2026-03-12 | 🆕 LLM integrations |

#### Release & Contributing
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [docs/release/release-notes.md](./release/release-notes.md) | ✅ Complete | 2026-03-11 | Changelog |
| [docs/contributing.md](./contributing.md) | ✅ Complete | 2026-03-12 | Contribution guide |

#### Internal Documentation
| Document | Status | Last Updated | Notes |
|----------|--------|--------------|-------|
| [docs/internal/DOCUMENTATION_PLAN.md](./DOCUMENTATION_PLAN.md) | ✅ Complete | 2026-03-12 | This plan |
| [docs/internal/project-scan-report.json](./project-scan-report.json) | ✅ Complete | - | Scan results |
| [_bmad/bmm/agents/tech-writer/tech-writer.md](../../_bmad/bmm/agents/tech-writer/tech-writer.md) | ✅ Complete | 2026-03-12 | Tech Writer Agent |

### ⚠️ Documents Needing Updates

| Document | Issue | Priority |
|----------|-------|----------|
| [guides/api-reference.md](./guides/api-reference.md) | Missing $DD blocks in examples | Medium |
| [arch/architecture.md](./arch/architecture.md) | Missing $ARCH traceability | High |

### ❌ Missing Documents

| Document | Description | Priority |
|----------|-------------|----------|
| `docs/security.md` | Security model and approvals | Low |
| `docs/guides/advanced-debugging.md` | Advanced debugging techniques | Low |

---

## Documentation Architecture

### Document Hierarchy

```
docs/
├── index.md                        # Documentation hub
│
├── guides/                         # User guides
│   ├── getting-started.md          # Quick start (5 min)
│   ├── api-reference.md            # Complete API docs
│   ├── debugging-guide.md          # Training project guide
│   ├── troubleshooting.md          # (TODO) Common issues
│   ├── wsl2-setup.md               # (TODO) WSL2 setup
│   └── advanced-debugging.md       # (TODO) Advanced techniques
│
├── arch/                           # Architecture documentation
│   ├── architecture.md             # System design & modules
│   └── ARCHITECTURE.rst            # Alternative format
│
├── guidelines/                     # Standards & guidelines
│   ├── CODING_GUIDELINES.md        # Coding standards (19 sections)
│   └── CODING_GUIDELINES_AuthorKilo.md # Alternative version
│
├── release/                        # Release documentation
│   └── release-notes.md            # Changelog & known issues
│
└── internal/                       # Internal documentation
    ├── DOCUMENTATION_PLAN.md       # This plan
    ├── project-scan-report.json    # Project scan results
    └── templates/                  # Documentation templates
        └── template_typescript/
            └── development_template.ts
```

### Document Types

| Type | Location | Purpose |
|------|----------|---------|
| **Guides** | `guides/` | Step-by-step tutorials, API reference |
| **Architecture** | `arch/` | System design, module documentation |
| **Guidelines** | `guidelines/` | Coding standards, best practices |
| **Release** | `release/` | Changelog, migration guides |
| **Internal** | `internal/` | Planning, templates, reports |

### Document Types

| Type | Purpose | Template |
|------|---------|----------|
| **Reference** | API docs, configuration | `api-reference.md` |
| **Guide** | Step-by-step tutorials | `getting-started.md` |
| **Concept** | Architecture, design | `architecture.md` |
| **Release** | Changelog, migration | `release-notes.md` |

---

## $DD and $ARCH Traceability

### Current Status

The codebase currently has **incomplete** `$DD` and `$ARCH` traceability. This plan outlines the work needed to achieve 100% coverage.

### Target Coverage

| Component | Target | Current | Gap |
|-----------|--------|---------|-----|
| Public HTTP APIs | 100% $DD | 0% | 33 endpoints |
| Debug Operations | 100% $DD | 0% | 31 operations |
| Architecture Modules | 100% $ARCH | 0% | 8 modules |

### $DD Assignment Plan

| Module | $DD Range | Owner |
|--------|-----------|-------|
| HTTP Server | $DD-SRV-001 to $DD-SRV-010 | Tech Writer |
| Debug Controller | $DD-DBG-001 to $DD-DBG-031 | Tech Writer |
| LSP Client | $DD-LSP-001 to $DD-LSP-010 | Tech Writer |
| Subagent Orchestrator | $DD-AGT-001 to $DD-AGT-010 | Tech Writer |

### $ARCH Requirement Map

| Architecture ID | Requirement | Satisfied By |
|-----------------|-------------|--------------|
| $ARCH-HTTP-001 | HTTP server on localhost | HttpServer.ts |
| $ARCH-DAP-001 | DAP protocol bridge | DebugController.ts |
| $ARCH-SEC-001 | User approval for destructive ops | ApprovalInterceptor.ts |
| $ARCH-LSP-001 | LSP code intelligence | LspClient.ts |
| $ARCH-AGT-001 | Concurrent subagent spawning | SubagentOrchestrator.ts |

---

## Action Items

### Phase 1: Foundation (Week 1)

- [ ] Add $DD blocks to all public HTTP API handlers
- [ ] Add $DD blocks to all DebugController operations
- [ ] Create $ARCH traceability matrix
- [ ] Update architecture.md with $ARCH references

### Phase 2: Guides (Week 2)

- [ ] Create `docs/guides/troubleshooting.md`
- [ ] Create `docs/guides/wsl2-setup.md`
- [ ] Create `docs/contributing.md`
- [ ] Add code examples to all API endpoints

### Phase 3: Completion (Week 3)

- [ ] Verify 100% $DD coverage on public interfaces
- [ ] Verify 100% $ARCH traceability
- [ ] Add security documentation
- [ ] Create documentation index with search

---

## Templates

### New Guide Template

```markdown
# <Guide Title>

**$DD DOC-<ID>**

[Satisfies $ARCH-<ID>]

## Overview

What this guide covers and prerequisites.

## Steps

### Step 1: ...

### Step 2: ...

## Troubleshooting

Common issues and solutions.

## Related Documents

- [Link](./related.md)
```

### API Endpoint Template

```markdown
## `<METHOD> <path>`

**$DD <ID>**

[Satisfies $ARCH-<ID>]

### Description

Purpose of the endpoint.

### Request

```json
{ ... }
```

### Response

```json
{ ... }
```

### Example

```bash
curl ...
```
```

---

## Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Document Coverage | 100% of features | Feature audit |
| $DD Coverage | 100% of public interfaces | Grep scan |
| $ARCH Traceability | 100% of $DD blocks | Manual review |
| Example Accuracy | 100% tested | CI validation |
| Link Validity | 100% working links | Link checker |

---

## Review Schedule

| Review Type | Frequency | Owner |
|-------------|-----------|-------|
| Content Accuracy | Per release | Tech Lead |
| $DD/$ARCH Compliance | Per PR | Tech Writer |
| Link Validation | Weekly | CI |
| Example Testing | Per release | QA |

---

## Related Documents

- [Coding Guidelines](./CODING_GUIDELINES.md)
- [Architecture](./architecture.md)
- [Tech Writer Agent](../_bmad/bmm/agents/tech-writer/tech-writer.md)

---

*This document follows the coding guidelines in DOC-CG-001.*
