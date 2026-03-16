# 🤖 AI Debug Agent Definition

**Version:** 1.0.0  
**Role:** Collaborative Debugging Assistant  
**Interface:** CLI via `ai-debug.sh`  

---

## 🎯 **AGENT PURPOSE**

AI Agent collaborates with **Human developers** to debug software through:

1. **Direct Debug Control** - Launch, step, continue via CLI
2. **Real-time Analysis** - Analyze code, variables, stack traces
3. **Proactive Detection** - Find bugs, anomalies, suggest fixes
4. **Shared Context** - Same debug session as Human

---

## 🏗️ **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│  Human Developer (VSCode)                                   │
│  - Sets breakpoints (click)                                 │
│  - Controls execution (toolbar)                             │
│  - Asks questions (chat)                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │ Shared Debug Session
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Debug Proxy Server (Port 9999)                          │
│  - HTTP API for debug operations                            │
│  - Syncs with VSCode debug state                            │
│  - Routes AI ↔ Human commands                               │
└───────────────────┬─────────────────────────────────────────┘
                    │ ai-debug.sh CLI
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Agent (Qwen CLI)                                        │
│  - Executes debug commands                                  │
│  - Analyzes program state                                   │
│  - Reports findings to Human                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **CLI TOOL INTERFACE**

### **Available Commands:**

```bash
# Source the CLI helper
source /path/to/ai-debug.sh

# Session Management
ai_launch <binary> [pauseOnEntry]    # Start debug session
ai_restart                           # Restart session
ai_quit                              # End session
ai_status                            # Check server status

# Breakpoints
ai_bp <file> <line> [condition]      # Set breakpoint
ai_tbp <file> <line>                 # Set temp breakpoint
ai_bps                               # List breakpoints
ai_clear_bps                         # Clear all breakpoints

# Execution Control
ai_continue                          # Continue (F5)
ai_next                              # Step over (F10)
ai_step_in                           # Step into (F11)
ai_step_out                          # Step out (Shift+F11)
ai_until <line>                      # Run until line

# Inspection
ai_stack                             # Call stack
ai_vars                              # Local variables
ai_eval <expr>                       # Evaluate expression
ai_pretty <var>                      # Pretty print variable
ai_type <expr>                       # Get type
ai_source [lines]                    # Show source code

# Navigation
ai_up                                # Frame up
ai_down                              # Frame down
ai_frame <n>                         # Select frame
ai_goto <file>:<line>                # Go to location

# Advanced
ai_last_stop                         # Last stop reason
ai_bps                               # Active breakpoints
```

---

## 🤖 **AI AGENT CAPABILITIES**

### **1. Debug Session Management**

```python
async def launch_debug_session(binary_path: str):
    """Launch debug session for binary"""
    result = await cli.ai_launch(binary_path, pause_on_entry=True)
    if result.success:
        await agent.report(f"✅ Debug session started: {binary_path}")
        await agent.suggest_breakpoints(binary_path)
    else:
        await agent.report(f"❌ Failed: {result.error}")
```

### **2. Proactive Bug Detection**

```python
async def analyze_on_stop():
    """Analyze program state when stopped"""
    stack = await cli.ai_stack()
    vars = await cli.ai_vars()
    source = await cli.ai_source(10)
    
    bugs = await detect_bugs(stack, vars, source)
    if bugs:
        await agent.report("🔍 Found potential issues:")
        for bug in bugs:
            await agent.report(f"  • {bug}")
```

### **3. Variable Analysis**

```python
async def check_suspicious_vars():
    """Check for suspicious variable values"""
    vars = await cli.ai_vars()
    
    suspicious = []
    for var in vars:
        if var.value == "0" and "ptr" in var.name.lower():
            suspicious.append(f"⚠️ {var.name} is NULL")
        if var.value == "0xffffffff":
            suspicious.append(f"⚠️ {var.name} is -1 (error code?)")
        if var.type == "std::string" and var.value == '""':
            suspicious.append(f"⚠️ {var.name} is empty")
    
    return suspicious
```

### **4. Stack Trace Analysis**

```python
async def analyze_crash():
    """Analyze crash from stack trace"""
    stack = await cli.ai_stack()
    stop_info = await cli.ai_last_stop()
    
    if stop_info.reason in ["exception", "signal"]:
        await agent.report("💥 CRASH DETECTED!")
        await agent.report(f"Reason: {stop_info.description}")
        await agent.report("Stack trace:")
        for frame in stack.frames:
            await agent.report(f"  #{frame.id} {frame.function} at {frame.location}")
        
        fix = await suggest_fix(stack, stop_info)
        await agent.report(f"💡 Suggested fix: {fix}")
```

### **5. Collaborative Workflow**

```python
async def collaborate_with_human():
    """Main collaboration loop"""
    while debug_session.active:
        # Wait for Human action or AI initiative
        event = await wait_for_event()
        
        if event.type == "human_question":
            answer = await analyze_and_answer(event.question)
            await agent.report(answer)
        
        elif event.type == "program_stopped":
            await analyze_on_stop()
        
        elif event.type == "crash_detected":
            await analyze_crash()
        
        elif event.type == "breakpoint_hit":
            await check_breakpoint_context(event.breakpoint)
```

---

## 📋 **AI AGENT WORKFLOWS**

### **Workflow 1: Initial Analysis**

```python
async def initial_analysis(binary_path: str):
    """When Human starts debugging"""
    
    # 1. Launch session
    await cli.ai_launch(binary_path, pause_on_entry=True)
    
    # 2. Analyze entry point
    source = await cli.ai_source(20)
    await agent.report("📍 Program entry point:")
    await agent.report(source)
    
    # 3. Suggest breakpoints
    await agent.report("💡 Suggested breakpoints:")
    suggestions = await find_interesting_locations(source)
    for loc in suggestions:
        await agent.report(f"  • {loc.file}:{loc.line} - {loc.reason}")
    
    # 4. Wait for Human decision
    await agent.ask("Where should we set breakpoints?")
```

### **Workflow 2: Breakpoint Collaboration**

```python
async def breakpoint_collaboration():
    """When Human sets a breakpoint"""
    
    # Wait for Human to set BP
    await wait_for_breakpoint_set()
    
    # Analyze BP location
    source = await cli.ai_source(10)
    vars_at_bp = await cli.ai_vars()
    
    await agent.report(f"📍 Breakpoint at {bp.location}")
    await agent.report("Context:")
    await agent.report(f"  Variables: {vars_at_bp}")
    await agent.report(f"  Code: {source}")
    
    # Suggest what to check
    await agent.report("💡 When you continue, watch for:")
    checks = await suggest_checks(source, vars_at_bp)
    for check in checks:
        await agent.report(f"  • {check}")
```

### **Workflow 3: Crash Analysis**

```python
async def crash_analysis():
    """When program crashes"""
    
    # Get crash info
    stop_info = await cli.ai_last_stop()
    stack = await cli.ai_stack()
    
    if stop_info.reason == "exception":
        await agent.report("💥 EXCEPTION CAUGHT!")
        await agent.report(f"Type: {stop_info.description}")
        
        # Get exception details
        if stop_info.text:
            await agent.report(f"Message: {stop_info.text}")
        
        # Analyze stack trace
        await agent.report("Call stack:")
        for i, frame in enumerate(stack.frames[:5]):
            await agent.report(f"  #{i} {frame.function}() at {frame.location}")
        
        # Suggest fix
        root_cause = await find_root_cause(stack)
        await agent.report(f"🔍 Root cause: {root_cause}")
        
        fix = await suggest_fix(stack, stop_info)
        await agent.report(f"💡 Fix: {fix}")
```

### **Workflow 4: Variable Investigation**

```python
async def investigate_variable(var_name: str):
    """When Human asks about a variable"""
    
    # Get variable value
    result = await cli.ai_eval(var_name)
    
    if result.success:
        await agent.report(f"📊 {var_name} = {result.value}")
        
        # Get type info
        type_info = await cli.ai_type(var_name)
        await agent.report(f"Type: {type_info}")
        
        # Check if suspicious
        if is_suspicious(result.value, type_info):
            await agent.report("⚠️ This value looks suspicious!")
            await agent.report(f"Reason: {why_suspicious(result.value)}")
        
        # Suggest related checks
        await agent.report("💡 Related checks:")
        for related in await find_related_vars(var_name):
            await agent.report(f"  • Check {related}")
    else:
        await agent.report(f"❌ Cannot evaluate: {result.error}")
```

---

## 🎯 **AI BEHAVIOR GUIDELINES**

### **DO:**

✅ **Be proactive** - Analyze without being asked  
✅ **Be specific** - Give exact line numbers, values  
✅ **Explain why** - Not just what, but why it's a bug  
✅ **Suggest fixes** - Always propose solutions  
✅ **Ask clarifying questions** - When Human request is vague  
✅ **Respect Human control** - Suggest, don't command  

### **DON'T:**

❌ **Wait passively** - Don't just wait for commands  
❌ **Be vague** - "Something's wrong" is useless  
❌ **Overwhelm** - Don't spam with too much info  
❌ **Take control** - Human decides where to breakpoint  
❌ **Assume** - Ask if unsure about Human's intent  

---

## 📝 **EXAMPLE INTERACTION**

### **Scenario: Debugging Segmentation Fault**

```
👤 Human: ai_launch ./build/ehsm_host true

🤖 AI: ✅ Debug session launched
       📍 Stopped at entry point (main.cpp:60)
       💡 Suggested breakpoints:
         • main.cpp:77 - Before error handling
         • hsm_api_impl.cpp:138 - Potential null dereference
         • crypto_service.cpp:62 - Key validation

👤 Human: (Sets breakpoint at main.cpp:77 via VSCode UI)
👤 Human: ai_continue

🤖 AI: 🏃 Running to breakpoint...
       📍 Stopped at main.cpp:77
       📊 Context:
         • status = EHSM_STATUS_OK
         • sessionId = 1
       ✅ All looks good so far

👤 Human: ai_continue

🤖 AI: 🏃 Running...
       💥 CRASH DETECTED!
       Reason: SIGSEGV (Segmentation fault)
       Location: hsm_api_impl.cpp:138
       
       📊 Stack trace:
         #0 HsmApiImpl::encrypt() at hsm_api_impl.cpp:138
         #1 runEncryptDecryptDemo() at main.cpp:164
         #2 main() at main.cpp:118
       
       🔍 Root cause:
         keystoreService_ is NULL when calling getSlotInfo()
       
       💡 Fix:
         Initialize keystoreService_ before encrypt():
         ```cpp
         // Line 135
         if (!keystoreService_) {
             return Status::ERROR_NULLPTR;
         }
         ```

👤 Human: ai_eval "keystoreService_"

🤖 AI: 📊 keystoreService_ = 0x0 (NULL)
       ⚠️ This confirms the bug!
       💡 Initialize in constructor or check before use
```

---

## 🔧 **IMPLEMENTATION TEMPLATE**

### **Python Agent Class:**

```python
class AIDebugAgent:
    def __init__(self, cli_path: str):
        self.cli = AIDebugCLI(cli_path)
        self.session_active = False
    
    async def collaborate(self, binary_path: str):
        """Main collaboration loop"""
        print(f"🤖 AI Debug Agent ready for: {binary_path}")
        
        # Launch session
        await self.cli.ai_launch(binary_path, pause_on_entry=True)
        self.session_active = True
        
        # Initial analysis
        await self.analyze_entry_point()
        
        # Collaboration loop
        while self.session_active:
            event = await self.wait_for_event()
            await self.handle_event(event)
    
    async def handle_event(self, event: DebugEvent):
        """Handle debug events"""
        if event.type == "breakpoint_hit":
            await self.on_breakpoint(event)
        elif event.type == "crash":
            await self.on_crash(event)
        elif event.type == "human_question":
            await self.answer_question(event)
        elif event.type == "human_request":
            await self.execute_request(event)
    
    async def on_breakpoint(self, event):
        """Analyze state at breakpoint"""
        vars = await self.cli.ai_vars()
        stack = await self.cli.ai_stack()
        source = await self.cli.ai_source(10)
        
        print(f"📍 Breakpoint at {event.location}")
        print(f"📊 Variables: {vars}")
        
        # Proactive analysis
        anomalies = self.detect_anomalies(vars, stack)
        if anomalies:
            print("⚠️ Anomalies detected:")
            for a in anomalies:
                print(f"  • {a}")
    
    async def on_crash(self, event):
        """Analyze crash"""
        stop_info = await self.cli.ai_last_stop()
        stack = await self.cli.ai_stack()
        
        print("💥 CRASH!")
        print(f"Reason: {stop_info.description}")
        print(f"Location: {event.location}")
        
        # Auto-suggest fix
        fix = await self.suggest_fix(stack, stop_info)
        print(f"💡 Suggested fix: {fix}")
```

---

## 🚀 **QUICK START**

### **1. Create Agent Script:**

```bash
cat > debug-agent.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import sys

class AIDebugAgent:
    # ... (implementation from template above)
    pass

async def main():
    if len(sys.argv) < 2:
        print("Usage: debug-agent.py <binary>")
        sys.exit(1)
    
    agent = AIDebugAgent("/path/to/ai-debug.sh")
    await agent.collaborate(sys.argv[1])

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x debug-agent.py
```

### **2. Run Agent:**

```bash
cd /home/datdang/working/common_dev/embedded_hsm
./debug-agent.py ./build/ehsm_host
```

### **3. Collaborate:**

- Human sets breakpoints in VSCode
- AI analyzes and suggests
- Both debug together!

---

## 📚 **REFERENCES**

- [ai-debug.sh CLI Reference](./ai-debug.sh)
- [Debug Proxy API](./API.md)
- [VSCode Debug Extension](https://code.visualstudio.com/api/extension-guides/debugger-extension)

---

**Version:** 1.0.0  
**Last Updated:** March 16, 2026  
**Status:** ✅ Ready for Implementation
