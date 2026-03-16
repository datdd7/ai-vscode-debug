# Axel - AI Debug Partner

**Version:** 1.0.0
**Status:** ✅ Complete
**Domain:** Embedded C/C++ Debugging

---

## 🎯 Overview

**Axel** là AI Debug Partner chuyên nghiệp cho embedded C/C++ developers. Không phải tool, không phải assistant - Axel là **đồng nghiệp debug** thông minh, chủ động phân tích code, đề xuất hypotheses, và colab với bạn trong cùng một debug session.

### Key Features

- 🧠 **Phân tích code thông minh** - Phát hiện bug patterns (ring buffer overflow, race conditions, stack overflow...)
- 🎯 **Chủ động debug** - Tự động set breakpoints, step qua code, inspect variables
- 🔄 **Session restore** - Tự động restart và restore vị trí khi breakpoint lố
- 💬 **Giao tiếp professional** - Ngắn gọn, strict, evidence-based (Vietnamese, technical terms English)
- 📚 **Embedded expertise** - 10+ bug patterns cho embedded C/C++

---

## 🚀 Quick Start

### 1. Install Required Extensions

```bash
# Install AI Debug Proxy extension
code --install-extension ai-debug-proxy-*.vsix --force
```

### 2. Start Debug Proxy

```bash
# In VS Code
# Command Palette → AI Debug Proxy: Start Server
```

### 3. Verify Proxy Running

```bash
curl http://localhost:9999/api/ping
```

### 4. Activate Axel

```
# In VS Code Chat or Terminal
/axel debug this file
```

---

## 📁 Skill Structure

```
axel-debug-partner/
├── SKILL.md                      # Agent definition
├── build-process.md              # 6-phase build process
├── quality-optimizer.md          # Quality validation
├── INDEX.md                      # Navigation index
│
├── prompts/
│   ├── system-prompt.md          # Persona & instructions
│   ├── debug-strategy.md         # Decision logic
│   ├── bug-patterns.md           # Bug knowledge base
│   └── interaction.md            # Communication style
│
├── capabilities/
│   ├── cli-client.md             # ai-debug.sh integration
│   ├── http-client.md            # HTTP API (LSP, subagents)
│   └── session-manager.md        # Session tracking
│
├── memory/
│   └── session-history.md        # Persistent storage
│
├── references/
│   ├── http-api-ref.md           # HTTP API reference
│   └── cli-commands-ref.md       # CLI commands reference
│
└── assets/
    └── quality-template.md       # Quality report template
```

---

## 💬 Usage Examples

### Example 1: Initial Analysis

```
User: /axel debug this file

Axel: Đã phân tích motor_control.c. Phát hiện 3 risk locations:
  - Dòng 45: PID calculation không check integer overflow
  - Dòng 78: Shared variable không có volatile
  - Dòng 102: Recursive call không có depth limit

  Đề xuất: Set breakpoint tại dòng 45 để kiểm tra PID overflow. OK?

User: OK

Axel: ✓ Breakpoint đã set tại motor_control.c:45
      Continuing execution...
```

### Example 2: Bug Investigation

```
Axel: Stopped tại motor_control.c:45. Inspecting variables...

      integral_term = 32767
      MAX_INTEGRAL = 32767

      ⚠ INTEGER SATURATION DETECTED

      Hypothesis: Integral windup do không clamp integral_term.

      Next step: Step vào hàm PID_calculate() để kiểm tra logic clamp. OK?
```

### Example 3: Session Restore

```
Axel: ⚠ Breakpoint lố rồi.

      Expected: main.c:42
      Actual: utils.c:15

      Tôi sẽ restart và quay lại vị trí của bạn.

      [Restarting session...]
      [Setting temp BP tại main.c:42]
      [Continuing...]

      ✓ Đã quay lại main.c:42
```

---

## 🐛 Supported Bug Patterns

### Critical (High Confidence)
- Ring Buffer Overflow
- Race Conditions (ISR vs main)
- Stack Overflow (recursion)
- Use-After-Free
- Integer Overflow

### High (Medium Confidence)
- Uninitialized Variables
- Missing Volatile
- Wrong Bitwise Operations
- Off-by-One Errors
- Wrong CRC/Checksum

---

## 🔧 Commands

### Debug Session
```
ai_launch "./build/app"      # Start debug
ai_restart                   # Restart session
ai_quit                      # End session
```

### Execution
```
ai_continue                  # Resume execution
ai_next                      # Step over
ai_step_in                   # Step into
ai_step_out                  # Step out
ai_until <line>              # Run until line
```

### Breakpoints
```
ai_bp "main.c" 42            # Set breakpoint
ai_tbp "main.c" 42           # Set temp breakpoint
ai_bps                       # List breakpoints
ai_clear_bps "main.c"        # Clear breakpoints
```

### Inspection
```
ai_stack                     # Get stack trace
ai_frame                     # Get current frame
ai_vars                      # Get variables
ai_eval "expression"         # Evaluate expression
ai_source                    # List source code
```

---

## 📊 Quality Status

| Dimension | Score | Status |
|-----------|-------|--------|
| Structure Compliance | 100% | ✅ |
| Prompt Craft | 100% | ✅ |
| Execution Efficiency | 100% | ✅ |
| Enhancement Opportunities | 100% | ✅ |

**Overall:** ✅ Pass (100/100)

---

## 🎯 Personality

### Professional
- No emojis
- No casual language
- Focus on task

### Concise
- Minimum words
- Direct statements
- No fluff

### Strict
- Evidence-based
- No guessing
- Data-driven

### Vietnamese
- Vietnamese communication
- Technical terms in English

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [SKILL.md](SKILL.md) | Complete agent definition |
| [INDEX.md](INDEX.md) | Navigation index |
| [build-process.md](build-process.md) | How Axel was built |
| [quality-optimizer.md](quality-optimizer.md) | Quality validation |

### Prompts
| Document | Purpose |
|----------|---------|
| [system-prompt.md](prompts/system-prompt.md) | Axel's persona |
| [debug-strategy.md](prompts/debug-strategy.md) | Decision logic |
| [bug-patterns.md](prompts/bug-patterns.md) | Bug knowledge |
| [interaction.md](prompts/interaction.md) | Communication style |

### Capabilities
| Document | Purpose |
|----------|---------|
| [cli-client.md](capabilities/cli-client.md) | CLI integration |
| [http-client.md](capabilities/http-client.md) | HTTP API |
| [session-manager.md](capabilities/session-manager.md) | Session tracking |

---

## 🛠️ Development

### Build Axel
```bash
# Follow build process
# See build-process.md for details
```

### Validate Quality
```bash
# Run quality scan
# See quality-optimizer.md for details
```

---

## 📞 Support

**Documentation:** This folder
**Issues:** Create GitHub issue
**Enhancements:** Add to backlog

---

## 📝 License

MIT License - Part of AI VSCode Debug project

---

## 🔗 Related Projects

- [AI Debug Proxy](../../ai-debug-proxy/README.md)
- [AI Agent Technical Guide](../../docs/guides/ai-agent-technical-guide.md)
- [BMad Agent Builder](../../.qwen/skills/bmad-agent-builder/SKILL.md)

---

*Axel - Your Professional AI Debug Partner for Embedded C/C++*
