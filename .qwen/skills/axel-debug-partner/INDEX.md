# Axel - AI Debug Partner Skill Index

**Version:** 1.0.0
**Status:** Complete
**Last Updated:** 2026-03-17

---

## 🎯 Quick Navigation

### Core Files
| File | Purpose | Status |
|------|---------|--------|
| [SKILL.md](../SKILL.md) | Agent definition | ✅ Complete |
| [build-process.md](build-process.md) | Build workflow | ✅ Complete |
| [quality-optimizer.md](quality-optimizer.md) | Quality validation | ✅ Complete |

---

## 📁 File Structure

```
axel-debug-partner/
├── SKILL.md                      # Agent definition
├── build-process.md              # 6-phase build process
├── quality-optimizer.md          # Quality validation workflow
│
├── prompts/
│   ├── system-prompt.md          # Axel persona & core instructions
│   ├── debug-strategy.md         # Debug planning & decision logic
│   ├── bug-patterns.md           # Embedded C/C++ bug knowledge base
│   └── interaction.md            # User communication guidelines
│
├── capabilities/
│   ├── cli-client.md             # ai-debug.sh integration spec
│   ├── http-client.md            # HTTP API for LSP/subagents
│   └── session-manager.md        # Session tracking & restore
│
├── memory/
│   └── session-history.md        # Session persistence spec
│
├── references/
│   ├── http-api-ref.md           # HTTP API quick reference
│   └── cli-commands-ref.md       # CLI commands quick reference
│
└── assets/
    └── quality-template.md       # Quality report template
```

---

## 📊 Document Summary

### SKILL.md
**Purpose:** Complete agent definition
**Contents:**
- Vision and identity
- Memory system (4 categories)
- Capabilities (internal/external)
- Autonomous modes
- Interaction style
- File structure
- Quality dimensions
- Traceability

### prompts/system-prompt.md
**Purpose:** Define Axel's persona and behavior
**Contents:**
- Core identity
- Knowledge base (bug patterns)
- Debug philosophy
- Communication guidelines
- Workflow patterns
- Context awareness
- Quality standards

### prompts/debug-strategy.md
**Purpose:** Debug decision logic
**Contents:**
- Decision flow (6 phases)
- Decision rules (when to X)
- Bug pattern decision trees
- Session restore logic
- Quality gates

### prompts/bug-patterns.md
**Purpose:** Embedded C/C++ bug knowledge
**Contents:**
- 10+ critical bug patterns
- Symptoms and causes
- Detection strategies
- Investigation steps
- Fix patterns

### capabilities/cli-client.md
**Purpose:** ai-debug.sh integration
**Contents:**
- Session management ops
- Execution control ops
- Breakpoint management
- State inspection ops
- Advanced operations
- Error handling

### capabilities/http-client.md
**Purpose:** HTTP API for LSP/subagents
**Contents:**
- System endpoints
- LSP endpoints
- Subagent endpoint
- Error handling
- Implementation template

### capabilities/session-manager.md
**Purpose:** Session tracking & restore
**Contents:**
- State structure
- Save/restore operations
- Position tracking
- Session guardian mode
- Persistence

### memory/session-history.md
**Purpose:** Persistent session storage
**Contents:**
- Data structure
- Save/load operations
- File storage
- Usage patterns
- Privacy & cleanup

### references/http-api-ref.md
**Purpose:** HTTP API quick reference
**Contents:**
- System endpoints
- LSP endpoints
- Debug operations
- Error responses
- Performance notes

### references/cli-commands-ref.md
**Purpose:** CLI commands quick reference
**Contents:**
- Session management
- Execution control
- Breakpoint ops
- State inspection
- Advanced ops

### assets/quality-template.md
**Purpose:** Quality report template
**Contents:**
- Executive summary
- Quality scores
- Issues found
- Action plan
- Trends

---

## 🎯 Usage

### For Building Axel
1. Start with [SKILL.md](SKILL.md)
2. Follow [build-process.md](build-process.md)
3. Reference [prompts/](prompts/) for persona
4. Implement [capabilities/](capabilities/)
5. Setup [memory/](memory/) system
6. Validate with [quality-optimizer.md](quality-optimizer.md)

### For Using Axel
1. Read [SKILL.md](SKILL.md) for overview
2. Check [interaction.md](prompts/interaction.md) for communication style
3. Reference [cli-commands-ref.md](references/cli-commands-ref.md) for commands
4. Use [http-api-ref.md](references/http-api-ref.md) for API details

### For Quality Validation
1. Run [quality-optimizer.md](quality-optimizer.md)
2. Use [quality-template.md](assets/quality-template.md) for reports
3. Follow remediation workflows
4. Track improvements

---

## 📋 Traceability

**Satisfies:**
- $ARCH-HTTP-001: HTTP REST API integration
- $ARCH-DAP-001: Debug Adapter Protocol support
- $ARCH-AGT-001: AI Agent orchestration
- $SW SW-5: Subagent Orchestrator
- $SW SW-6: Parallel Execution

**References:**
- AI Debug Proxy Technical Guide
- ai-debug.sh CLI Reference
- BMad Agent Builder Standards

---

## 🚀 Getting Started

### Quick Start (5 minutes)
1. Read [SKILL.md](SKILL.md) - Agent overview
2. Review [system-prompt.md](prompts/system-prompt.md) - Persona
3. Check [cli-commands-ref.md](references/cli-commands-ref.md) - Commands

### Deep Dive (1 hour)
1. Read all [prompts/](prompts/) files
2. Study [capabilities/](capabilities/) implementations
3. Understand [memory/](memory/) system

### Implementation (1 day)
1. Follow [build-process.md](build-process.md)
2. Implement each capability
3. Test with [quality-optimizer.md](quality-optimizer.md)

---

## 📞 Support

**Documentation Issues:**
- Missing information? → Create issue
- Unclear section? → Suggest edit
- Found error? → Report bug

**Agent Issues:**
- Bug in Axel? → Debug with Axel
- Enhancement idea? → Add to backlog
- Quality concern? → Run quality scan

---

*Index for Axel AI Debug Partner Skill - Your professional debug companion*
